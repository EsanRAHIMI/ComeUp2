export type ScheduleDayInput = {
  day: number;
  title: string;
  focus?: string;
  exerciseNames: string[];
};

export type ScheduleOptions = {
  startDate: string; // YYYY-MM-DD
  workoutTime: string; // HH:mm
  weeks: number;
  sessionDuration: number;
  preferredDays?: number[]; // 0 (Sun) – 6 (Sat)
};

export type ScheduleEntry = {
  week: number;
  day: number;
  title: string;
  startsAt: string;
  duration: number;
  focus: string;
  exerciseNames: string[];
};

/**
 * Expand a list of training days across `weeks`. If `preferredDays` is given,
 * each session is placed on its matching weekday; otherwise sessions fall on
 * consecutive days from the start date.
 */
export function buildSchedule(days: ScheduleDayInput[], opts: ScheduleOptions): ScheduleEntry[] {
  const start = new Date(`${opts.startDate}T${opts.workoutTime}:00`);
  if (Number.isNaN(start.getTime()) || days.length === 0) return [];
  const startWeekday = start.getDay();
  const usePreferred = (opts.preferredDays?.length ?? 0) >= days.length;

  const entries: ScheduleEntry[] = [];
  for (let week = 0; week < opts.weeks; week += 1) {
    days.forEach((day, index) => {
      let offsetDays: number;
      if (usePreferred && opts.preferredDays) {
        const target = opts.preferredDays[index % opts.preferredDays.length];
        let delta = target - startWeekday;
        if (delta < 0) delta += 7;
        offsetDays = week * 7 + delta;
      } else {
        offsetDays = week * 7 + index;
      }
      const date = new Date(start);
      date.setDate(start.getDate() + offsetDays);
      entries.push({
        week: week + 1,
        day: day.day,
        title: day.title,
        startsAt: date.toISOString(),
        duration: opts.sessionDuration,
        focus: day.focus ?? day.title,
        exerciseNames: day.exerciseNames,
      });
    });
  }
  return entries;
}
