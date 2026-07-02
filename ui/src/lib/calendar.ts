// Pure month-grid helpers for the History calendar.
// All math uses UTC constructors on plain Y/M/D parts, so results are
// independent of the device timezone and DST — no off-by-one-day drift.

export type MonthKey = string; // YYYY-MM

const pad = (n: number) => String(n).padStart(2, '0');

/** Client-local YYYY-MM-DD for "today" (matches what we send the backend). */
export function todayDayKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Client-local YYYY-MM for the current month. */
export function currentMonthKey(date = new Date()): MonthKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function addMonths(month: MonthKey, delta: number): MonthKey {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const year = Math.floor(total / 12);
  return `${year}-${pad((total % 12 + 12) % 12 + 1)}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthLabel(month: MonthKey): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export type MonthCell = { dayKey: string; dayOfMonth: number } | null;

/**
 * Weeks (rows of 7 cells) for a month. Cells outside the month are null.
 * `weekStartsOn` uses JS getDay() indices (0 = Sunday).
 */
export function buildMonthGrid(month: MonthKey, weekStartsOn = 0): MonthCell[][] {
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const leading = (firstWeekday - weekStartsOn + 7) % 7;

  const cells: MonthCell[] = Array.from({ length: leading }, () => null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({ dayKey: `${month}-${pad(d)}`, dayOfMonth: d });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: MonthCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
