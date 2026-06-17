import type { Program, ScheduleEntry } from '../types';

export function dateInputValue(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function nextScheduledSession(program: Program | null, now: number): ScheduleEntry | null {
  if (!program?.schedule?.length) return null;
  return (
    program.schedule.find((item) => new Date(item.startsAt).getTime() >= now) ??
    program.schedule[program.schedule.length - 1]
  );
}

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatSessionDate(value: string | number | Date) {
  return dateTimeFormat.format(new Date(value));
}

const dateOnlyFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

export function formatDate(value: string | number | Date) {
  return dateOnlyFormat.format(new Date(value));
}

export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatDuration(totalSeconds: number) {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function getPersistedProgramId(program: Program) {
  return typeof program._id === 'string' && /^[a-f\d]{24}$/i.test(program._id) ? program._id : null;
}
