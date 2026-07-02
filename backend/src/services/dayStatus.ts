/**
 * Pure schedule-status derivation — the single source of truth for
 * "which workout is due, which was missed, which shifted forward".
 *
 * Works entirely on YYYY-MM-DD day keys so it is timezone-agnostic and
 * trivially unit-testable. Callers convert dates to keys (see dayKeyFrom).
 *
 * Behaviors (user preference, wired to the User model in a later phase):
 * - 'shift': completed sessions consume schedule entries in order; nothing is
 *   ever "missed" — unfinished workouts stay pending and the program shifts.
 * - 'skip': entries are matched to sessions by calendar day; an unmatched
 *   past entry is 'missed' and the program moves on to the next dated entry.
 */

export type MissedWorkoutBehavior = 'shift' | 'skip';

export type ScheduleEntryStatus = 'completed' | 'pending' | 'missed' | 'shifted' | 'upcoming';

export type TodayStatus = 'completed' | 'pending' | 'shifted' | 'rest' | 'none';

export type DayStatusResult = {
  /** Status per schedule entry, same order as the input. */
  entryStatuses: ScheduleEntryStatus[];
  /** Index of the next workout the user should do, or null when done. */
  nextIndex: number | null;
  /** What today looks like for the user. */
  todayStatus: TodayStatus;
};

/**
 * Convert a date to a YYYY-MM-DD key.
 * `tzOffsetMinutes` follows JS `Date.prototype.getTimezoneOffset()` semantics
 * (UTC minus local, e.g. Tehran = -210). When omitted, server-local parts are
 * used — the pre-existing behavior.
 */
export function dayKeyFrom(date: Date, tzOffsetMinutes?: number): string {
  if (typeof tzOffsetMinutes === 'number' && Number.isFinite(tzOffsetMinutes)) {
    const shifted = new Date(date.getTime() - tzOffsetMinutes * 60_000);
    const y = shifted.getUTCFullYear();
    const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
    const d = String(shifted.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function computeDayStatuses(args: {
  /** Day key per schedule entry, ascending (schedule order). */
  entryDayKeys: string[];
  /** Day key per completed session (duplicates allowed — one per session). */
  completedDayKeys: string[];
  todayKey: string;
  behavior: MissedWorkoutBehavior;
}): DayStatusResult {
  const { entryDayKeys, completedDayKeys, todayKey, behavior } = args;

  if (entryDayKeys.length === 0) {
    return { entryStatuses: [], nextIndex: null, todayStatus: 'none' };
  }

  const completedToday = completedDayKeys.includes(todayKey);

  if (behavior === 'shift') {
    // Each completed session consumes the earliest unfinished entry.
    const consumed = Math.min(completedDayKeys.length, entryDayKeys.length);
    const entryStatuses: ScheduleEntryStatus[] = entryDayKeys.map((key, i) => {
      if (i < consumed) return 'completed';
      if (i === consumed) return 'pending';
      return key <= todayKey ? 'shifted' : 'upcoming';
    });
    const nextIndex = consumed < entryDayKeys.length ? consumed : null;

    let todayStatus: TodayStatus;
    if (completedToday) todayStatus = 'completed';
    else if (nextIndex === null) todayStatus = 'rest';
    else if (entryDayKeys[nextIndex] === todayKey) todayStatus = 'pending';
    else if (entryDayKeys[nextIndex] < todayKey) todayStatus = 'shifted';
    else todayStatus = 'rest';

    return { entryStatuses, nextIndex, todayStatus };
  }

  // behavior === 'skip': match by calendar day, one session per entry.
  const pool = new Map<string, number>();
  for (const key of completedDayKeys) pool.set(key, (pool.get(key) ?? 0) + 1);

  const take = (key: string) => {
    const n = pool.get(key) ?? 0;
    if (n <= 0) return false;
    pool.set(key, n - 1);
    return true;
  };

  let nextIndex: number | null = null;
  const entryStatuses: ScheduleEntryStatus[] = entryDayKeys.map((key, i) => {
    if (key < todayKey) return take(key) ? 'completed' : 'missed';
    if (key === todayKey) {
      if (take(key)) return 'completed';
      if (nextIndex === null) nextIndex = i;
      return 'pending';
    }
    if (nextIndex === null) nextIndex = i;
    return 'upcoming';
  });

  let todayStatus: TodayStatus;
  if (completedToday) todayStatus = 'completed';
  else if (nextIndex !== null && entryDayKeys[nextIndex] === todayKey) todayStatus = 'pending';
  else todayStatus = 'rest';

  return { entryStatuses, nextIndex, todayStatus };
}
