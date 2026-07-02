import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { NutritionWeighLog } from '../models/NutritionWeighLog.js';
import { Program } from '../models/Program.js';
import { User } from '../models/User.js';
import { WorkoutSession } from '../models/WorkoutSession.js';
import { computeDayStatuses, dayKeyFrom } from '../services/dayStatus.js';
import { startOfWeek } from '../services/gptQuota.js';
import { getActivePlanForUser } from '../services/nutritionPlanService.js';
import { parseBody } from '../utils/schemas.js';

const dailyQuerySchema = z.object({
  /** Client-local calendar date (YYYY-MM-DD). Falls back to server-local today. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Client Date.prototype.getTimezoneOffset() value, minutes (Tehran = -210). */
  tzOffset: z.coerce.number().int().min(-840).max(840).optional(),
});

type SessionLike = {
  startTime: Date;
  endTime?: Date | null;
  totalDuration: number;
  caloriesBurned: number;
  exercises: Array<{ sets: unknown[] }>;
  status: string;
};

type ExerciseLike = { name: string; sets: number };

function dayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfLocalDay(date = new Date()) {
  const d = startOfLocalDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

function isSameLocalDay(a: Date, b: Date) {
  return dayKey(a) === dayKey(b);
}

function countSets(session: SessionLike) {
  return session.exercises.reduce((sum, ex) => sum + (ex.sets?.length ?? 0), 0);
}

function sessionExercises(program: any, exerciseNames: string[] | undefined): ExerciseLike[] {
  const all = (program?.exercises ?? []) as ExerciseLike[];
  if (!exerciseNames?.length) return all;
  const names = exerciseNames.map((n) => n.toLowerCase());
  const matched = all.filter((ex) => names.includes(ex.name.toLowerCase()));
  return matched.length ? matched : all;
}

function plannedSetCount(exercises: ExerciseLike[]) {
  return exercises.reduce((sum, ex) => sum + (ex.sets ?? 0), 0);
}

function estimateSessionMinutes(exercises: ExerciseLike[], fallback = 60) {
  if (!exercises.length) return fallback;
  const seconds = exercises.reduce((sum, ex) => {
    const rest = 60;
    const workPerSet = 45;
    return sum + ex.sets * workPerSet + Math.max(0, ex.sets - 1) * rest;
  }, 0);
  return Math.max(15, Math.round(seconds / 60));
}

/** Current consecutive-day training streak ending today or yesterday. */
function computeStreak(days: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
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

  app.get('/reports/daily', { preHandler: [app.authenticate] }, async (request) => {
    const query = parseBody(dailyQuerySchema, request.query ?? {});
    const now = new Date();
    const todayStart = startOfLocalDay(now);
    const todayEnd = endOfLocalDay(now);
    // Client-local "today" for the new schedule-status fields; legacy fields
    // below keep their original server-local behavior for compatibility.
    const clientTodayKey = query.date ?? dayKeyFrom(now, query.tzOffset);

    const allCompleted = (await WorkoutSession.find({
      userId: request.user.sub,
      status: 'completed',
    }).sort({ startTime: -1 })) as unknown as SessionLike[];

    const dayKeys = new Set(allCompleted.map((s) => dayKey(new Date(s.startTime))));
    const streakDays = computeStreak(dayKeys);

    const todaySessions = allCompleted.filter((s) => {
      const t = new Date(s.startTime);
      return t >= todayStart && t < todayEnd;
    });

    const activeProgram = await Program.findOne({ ownerId: request.user.sub, isActive: true });
    const schedule = activeProgram?.schedule ?? [];
    const nowMs = now.getTime();

    const todaySchedule =
      schedule.find((s) => isSameLocalDay(new Date(s.startsAt), now)) ?? null;
    const nextSchedule =
      schedule.find((s) => new Date(s.startsAt).getTime() >= nowMs) ??
      (schedule.length ? schedule[schedule.length - 1] : null);

    const focusSchedule = todaySchedule ?? nextSchedule;
    const sessionExs = activeProgram
      ? sessionExercises(activeProgram, focusSchedule?.exerciseNames as string[] | undefined)
      : [];
    const plannedSets = plannedSetCount(sessionExs);
    const estimatedMinutes = focusSchedule?.duration ?? estimateSessionMinutes(sessionExs, activeProgram?.duration ?? 60);

    const todaySets = todaySessions.reduce((sum, s) => sum + countSets(s), 0);
    const todayMinutes = Math.round(todaySessions.reduce((sum, s) => sum + (s.totalDuration ?? 0), 0) / 60);
    const todayCalories = todaySessions.reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0);

    const workoutDone = todaySessions.length > 0;
    const setsDone = workoutDone && (plannedSets === 0 ? todaySets > 0 : todaySets >= plannedSets);
    const streakAlive = workoutDone && streakDays >= 1;

    let secondsUntilWorkout: number | null = null;
    if (focusSchedule && !workoutDone) {
      const startMs = new Date(focusSchedule.startsAt).getTime();
      if (startMs > nowMs) secondsUntilWorkout = Math.round((startMs - nowMs) / 1000);
      else if (todaySchedule) secondsUntilWorkout = 0;
    }

    // --- Schedule-derived status (shift/skip aware, client-local day keys) ---
    const reportUser = await User.findById(request.user.sub).select('missedWorkoutBehavior');
    const behavior: 'shift' | 'skip' =
      reportUser?.missedWorkoutBehavior === 'skip' ? 'skip' : 'shift';
    const orderedSchedule = [...schedule].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
    const dayStatus = computeDayStatuses({
      entryDayKeys: orderedSchedule.map((s) => dayKeyFrom(new Date(s.startsAt), query.tzOffset)),
      completedDayKeys: allCompleted.map((s) => dayKeyFrom(new Date(s.startTime), query.tzOffset)),
      todayKey: clientTodayKey,
      behavior,
    });
    const nextEntry = dayStatus.nextIndex !== null ? orderedSchedule[dayStatus.nextIndex] : null;
    const nextEntryKey = nextEntry ? dayKeyFrom(new Date(nextEntry.startsAt), query.tzOffset) : null;
    const todayStatus = activeProgram
      ? dayStatus.todayStatus === 'none' && workoutDone
        ? 'completed'
        : dayStatus.todayStatus
      : 'none';

    // --- Nutrition snapshot for the Home card (never fails the report) ---
    let nutrition: {
      date: string;
      slotCount: number;
      loggedSlotIds: string[];
      nextSlot: { id: string; title: string; time: string } | null;
    } | null = null;
    try {
      const plan = await getActivePlanForUser(request.user.sub);
      const logs = await NutritionWeighLog.find({ userId: request.user.sub, date: clientTodayKey });
      const loggedSlotIds: string[] = [...new Set(logs.map((log) => String(log.mealSlot)))];
      const slots = (plan.slots ?? []) as Array<{ id: string; title: string; time: string }>;
      const next = slots.find((slot) => !loggedSlotIds.includes(slot.id)) ?? null;
      nutrition = {
        date: clientTodayKey,
        slotCount: slots.length,
        loggedSlotIds,
        nextSlot: next ? { id: next.id, title: next.title, time: next.time } : null,
      };
    } catch (error) {
      request.log.warn({ err: error }, 'daily report: nutrition snapshot unavailable');
    }

    return {
      todayStatus,
      nextWorkout: nextEntry
        ? {
            title: nextEntry.title || activeProgram?.name || 'Workout',
            startsAt: nextEntry.startsAt,
            duration: nextEntry.duration,
            isToday: nextEntryKey === clientTodayKey,
            shifted: Boolean(nextEntryKey && nextEntryKey < clientTodayKey),
          }
        : null,
      nutrition,
      dayKey: dayKey(now),
      completedToday: workoutDone,
      streakDays,
      secondsUntilWorkout,
      estimatedMinutes,
      plannedSets,
      exerciseCount: sessionExs.length,
      todayStats: workoutDone
        ? { sessions: todaySessions.length, sets: todaySets, minutes: todayMinutes, calories: todayCalories }
        : null,
      medals: [
        {
          id: 'workout',
          label: 'Workout',
          subtitle: workoutDone ? 'Session complete' : 'Finish today’s training',
          earned: workoutDone,
        },
        {
          id: 'volume',
          label: 'All sets',
          subtitle: setsDone
            ? `${todaySets}/${plannedSets || todaySets} sets`
            : plannedSets
              ? `${todaySets}/${plannedSets} sets`
              : 'Hit your set target',
          earned: setsDone,
        },
        {
          id: 'streak',
          label: 'Streak',
          subtitle: streakAlive ? `${streakDays} day${streakDays === 1 ? '' : 's'}` : 'Keep the chain alive',
          earned: streakAlive,
        },
      ],
      focusSession: focusSchedule
        ? {
            title: focusSchedule.title,
            startsAt: focusSchedule.startsAt,
            duration: focusSchedule.duration,
            isToday: Boolean(todaySchedule),
          }
        : null,
    };
  });
};
