import type { FastifyPluginAsync } from 'fastify';
import { Program } from '../models/Program.js';
import { WorkoutSession } from '../models/WorkoutSession.js';
import { startOfWeek } from '../services/gptQuota.js';

type SessionLike = {
  startTime: Date;
  endTime?: Date | null;
  totalDuration: number;
  caloriesBurned: number;
  exercises: Array<{ sets: unknown[] }>;
  status: string;
};

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function countSets(session: SessionLike) {
  return session.exercises.reduce((sum, ex) => sum + (ex.sets?.length ?? 0), 0);
}

/** Current consecutive-day training streak ending today or yesterday. */
function computeStreak(days: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  // Allow the streak to count if today has no session yet but yesterday did.
  if (!days.has(dayKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export const reportRoutes: FastifyPluginAsync = async (app) => {
  app.get('/reports/weekly', { preHandler: [app.authenticate] }, async (request) => {
    const weekStart = startOfWeek();
    const sessions = (await WorkoutSession.find({
      userId: request.user.sub,
      status: 'completed',
      startTime: { $gte: weekStart },
    })) as unknown as SessionLike[];

    const completedSessions = sessions.length;
    const totalMinutes = Math.round(sessions.reduce((s, x) => s + (x.totalDuration ?? 0), 0) / 60);
    const totalCalories = sessions.reduce((s, x) => s + (x.caloriesBurned ?? 0), 0);
    const totalSets = sessions.reduce((s, x) => s + countSets(x), 0);

    // Adherence vs. the active program's sessions scheduled this week.
    const activeProgram = await Program.findOne({ ownerId: request.user.sub, isActive: true });
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
    const scheduledThisWeek =
      activeProgram?.schedule?.filter((s) => {
        const t = new Date(s.startsAt).getTime();
        return t >= weekStart.getTime() && t < weekEnd.getTime();
      }).length ?? 0;
    const adherencePct = scheduledThisWeek
      ? Math.min(100, Math.round((completedSessions / scheduledThisWeek) * 100))
      : null;

    return {
      weekStartDate: weekStart.toISOString(),
      completedSessions,
      totalMinutes,
      totalCalories,
      totalSets,
      scheduledThisWeek,
      adherencePct,
    };
  });

  // Weekly buckets for the last `weeks` weeks (progress-over-time charts).
  app.get('/reports/overview', { preHandler: [app.authenticate] }, async (request) => {
    const weeks = 6;
    const thisWeekStart = startOfWeek();
    const from = new Date(thisWeekStart);
    from.setUTCDate(from.getUTCDate() - (weeks - 1) * 7);

    const sessions = (await WorkoutSession.find({
      userId: request.user.sub,
      status: 'completed',
      startTime: { $gte: from },
    }).sort({ startTime: 1 })) as unknown as SessionLike[];

    const buckets = Array.from({ length: weeks }, (_, i) => {
      const start = new Date(from);
      start.setUTCDate(start.getUTCDate() + i * 7);
      return { weekStartDate: start.toISOString(), sessions: 0, minutes: 0, calories: 0, sets: 0 };
    });

    const dayKeys = new Set<string>();
    for (const s of sessions) {
      dayKeys.add(dayKey(new Date(s.startTime)));
      const idx = Math.floor((new Date(s.startTime).getTime() - from.getTime()) / (7 * 86_400_000));
      if (idx >= 0 && idx < buckets.length) {
        buckets[idx].sessions += 1;
        buckets[idx].minutes += Math.round((s.totalDuration ?? 0) / 60);
        buckets[idx].calories += s.caloriesBurned ?? 0;
        buckets[idx].sets += countSets(s);
      }
    }

    return {
      weeks: buckets,
      totalSessions: sessions.length,
      streakDays: computeStreak(dayKeys),
    };
  });
};
