// Pure month-calendar composition for the History page.
//
// Combines the shift/skip-aware schedule statuses (services/dayStatus.ts)
// with actual training days and nutrition logging into a compact per-day map.
// Everything operates on YYYY-MM-DD day keys — timezone conversion is the
// caller's job (dayKeyFrom), which keeps this module trivially testable.
//
// Key semantics:
// - `sessions`/`stats` reflect days the user ACTUALLY trained.
// - `workout` reflects the schedule entry originally dated on that day, with
//   its derived status. Under 'shift' behavior a past entry can be 'pending'
//   (due now) or 'shifted' (queued) — stored schedule dates are never mutated.
// - Days with no entry, no sessions, and no nutrition are omitted (rest days).
// - Future days can only be 'pending' (today) or 'upcoming' — never 'missed'.

import {
  computeDayStatuses,
  type MissedWorkoutBehavior,
  type ScheduleEntryStatus,
} from './dayStatus.js';

export type CalendarSessionInput = {
  dayKey: string;
  sets: number;
  durationSec: number;
  calories: number;
};

export type CalendarEntryInput = {
  dayKey: string;
  title: string;
};

export type CalendarDay = {
  workout?: { status: ScheduleEntryStatus; title: string };
  sessions?: number;
  stats?: { sets: number; minutes: number; calories: number };
  nutrition?: { loggedSlots: number; slotCount: number };
};

export type CalendarMonth = {
  month: string;
  todayKey: string;
  behavior: MissedWorkoutBehavior;
  days: Record<string, CalendarDay>;
};

const MONTH_RE = /^\d{4}-\d{2}$/;

export function isMonthKey(value: string): boolean {
  return MONTH_RE.test(value);
}

/** Rank so the most informative status wins if two entries share a day. */
const STATUS_RANK: Record<ScheduleEntryStatus, number> = {
  completed: 5,
  pending: 4,
  shifted: 3,
  missed: 2,
  upcoming: 1,
};

export function buildCalendarMonth(args: {
  month: string; // YYYY-MM
  todayKey: string;
  behavior: MissedWorkoutBehavior;
  /** Full active-program schedule in order (not just this month). */
  entries: CalendarEntryInput[];
  /** All completed sessions (full history — shift consumption needs them all). */
  completed: CalendarSessionInput[];
  /** date -> number of distinct logged meal slots. */
  nutritionByDay?: Record<string, number>;
  nutritionSlotCount?: number;
}): CalendarMonth {
  const { month, todayKey, behavior } = args;
  const days: Record<string, CalendarDay> = {};
  const inMonth = (key: string) => key.startsWith(`${month}-`);
  const day = (key: string) => (days[key] ??= {});

  // Schedule statuses are derived over the FULL schedule so shift consumption
  // and ordering are correct, then filtered down to the requested month.
  const { entryStatuses } = computeDayStatuses({
    entryDayKeys: args.entries.map((e) => e.dayKey),
    completedDayKeys: args.completed.map((s) => s.dayKey),
    todayKey,
    behavior,
  });

  args.entries.forEach((entry, i) => {
    if (!inMonth(entry.dayKey)) return;
    const status = entryStatuses[i];
    const existing = days[entry.dayKey]?.workout;
    if (existing && STATUS_RANK[existing.status] >= STATUS_RANK[status]) return;
    day(entry.dayKey).workout = { status, title: entry.title };
  });

  // Actual training days (may include unscheduled days).
  for (const session of args.completed) {
    if (!inMonth(session.dayKey)) continue;
    const d = day(session.dayKey);
    d.sessions = (d.sessions ?? 0) + 1;
    const stats = (d.stats ??= { sets: 0, minutes: 0, calories: 0 });
    stats.sets += session.sets;
    stats.minutes += Math.round(session.durationSec / 60);
    stats.calories += session.calories;
  }

  // Nutrition markers (optional; caller may omit entirely on failure).
  const slotCount = args.nutritionSlotCount ?? 0;
  if (args.nutritionByDay && slotCount > 0) {
    for (const [date, loggedSlots] of Object.entries(args.nutritionByDay)) {
      if (!inMonth(date) || loggedSlots <= 0) continue;
      day(date).nutrition = { loggedSlots: Math.min(loggedSlots, slotCount), slotCount };
    }
  }

  return { month, todayKey, behavior, days };
}
