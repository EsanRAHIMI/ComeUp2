import type { Exercise, Program, ScheduleEntry } from '../types';
import { getLocale, getT, localeToBcp47 } from '../i18n';

export function localDayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateInputValue(date = new Date()) {
  return localDayKey(date);
}

export function nextScheduledSession(program: Program | null, now: number): ScheduleEntry | null {
  if (!program?.schedule?.length) return null;
  return (
    program.schedule.find((item) => new Date(item.startsAt).getTime() >= now) ??
    program.schedule[program.schedule.length - 1]
  );
}

function bcp47() {
  return localeToBcp47(getLocale());
}

export function formatSessionDate(value: string | number | Date) {
  return new Intl.DateTimeFormat(bcp47(), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatDate(value: string | number | Date) {
  return new Intl.DateTimeFormat(bcp47(), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatDuration(totalSeconds: number) {
  const t = getT();
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} ${t.common.minutes}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const locale = getLocale();
  if (locale === 'en') {
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
  }
  if (locale === 'ar') {
    return rest ? `${hours}س ${rest}د` : `${hours}س`;
  }
  return rest ? `${hours}س ${rest}د` : `${hours}س`;
}

export function getPersistedProgramId(program: Program) {
  return typeof program._id === 'string' && /^[a-f\d]{24}$/i.test(program._id) ? program._id : null;
}

export function isSameLocalDay(a: Date, b: Date) {
  return localDayKey(a) === localDayKey(b);
}

export function sessionExercisesForSchedule(program: Program, session: ScheduleEntry | null): Exercise[] {
  if (!session?.exerciseNames.length) return program.exercises;
  const names = session.exerciseNames.map((n) => n.toLowerCase());
  const matched = program.exercises.filter((ex) => names.includes(ex.name.toLowerCase()));
  return matched.length ? matched : program.exercises;
}

export function estimateSessionMinutes(exercises: Exercise[], fallback = 60) {
  if (!exercises.length) return fallback;
  const seconds = exercises.reduce((sum, ex) => {
    const workPerSet = ex.trackingType === 'time' ? ex.reps : 45;
    const rest = ex.restTime > 0 ? ex.restTime : 60;
    return sum + ex.sets * workPerSet + Math.max(0, ex.sets - 1) * rest;
  }, 0);
  return Math.max(15, Math.round(seconds / 60));
}

export function formatCountdown(totalSeconds: number) {
  const t = getT();
  const safe = Math.max(0, Math.round(totalSeconds));
  if (safe <= 0) return t.common.now;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const locale = getLocale();
  if (locale === 'en') {
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes} ${t.common.min}`;
    return `${safe}s`;
  }
  if (hours > 0) return `${hours}س ${minutes}د`;
  if (minutes > 0) return `${minutes} ${t.common.minutes}`;
  return `${safe}ث`;
}

export function formatCountdownLong(totalSeconds: number) {
  const t = getT();
  const safe = Math.max(0, Math.round(totalSeconds));
  if (safe <= 0) return t.common.readyToStart;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const parts: string[] = [];
  if (hours) parts.push(`${hours} ${hours === 1 ? t.common.hour : t.common.hours}`);
  if (minutes) parts.push(`${minutes} ${minutes === 1 ? t.common.minute : t.common.minutes}`);
  if (parts.length) return parts.join(` ${t.listAnd} `);
  return `${safe} ${t.common.seconds}`;
}

export function resolveRestSeconds(exercise: Exercise, defaultRestSeconds = 60, autoRestTimer = true) {
  if (!autoRestTimer) return 0;
  // Profile setting is the single source of truth for rest duration.
  return defaultRestSeconds;
}

export function formatHeaderTime(date: Date) {
  return new Intl.DateTimeFormat(bcp47(), { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function formatHeaderWeekday(date: Date) {
  return new Intl.DateTimeFormat(bcp47(), { weekday: 'long' }).format(date);
}

export function formatHeaderDate(date: Date) {
  return new Intl.DateTimeFormat(bcp47(), { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}
