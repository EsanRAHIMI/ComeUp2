import type { Exercise, Program, ScheduleEntry } from '../types';

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

const dateTimeFormat = new Intl.DateTimeFormat('fa-IR', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatSessionDate(value: string | number | Date) {
  return dateTimeFormat.format(new Date(value));
}

const dateOnlyFormat = new Intl.DateTimeFormat('fa-IR', {
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
  if (minutes < 60) return `${minutes} دقیقه`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
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
  const safe = Math.max(0, Math.round(totalSeconds));
  if (safe <= 0) return 'الان';
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours > 0) return `${hours}س ${minutes}د`;
  if (minutes > 0) return `${minutes} دقیقه`;
  return `${safe}ث`;
}

export function formatCountdownLong(totalSeconds: number) {
  const safe = Math.max(0, Math.round(totalSeconds));
  if (safe <= 0) return 'آماده شروع';
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const parts: string[] = [];
  if (hours) parts.push(`${hours} ساعت`);
  if (minutes) parts.push(`${minutes} دقیقه`);
  return parts.length ? parts.join(' و ') : `${safe} ثانیه`;
}

export function resolveRestSeconds(exercise: Exercise, defaultRestSeconds = 60, autoRestTimer = true) {
  if (!autoRestTimer) return 0;
  // Profile setting is the single source of truth for rest duration.
  return defaultRestSeconds;
}

export function formatHeaderTime(date: Date) {
  return new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function formatHeaderWeekday(date: Date) {
  return new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(date);
}

export function formatHeaderDate(date: Date) {
  return new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}
