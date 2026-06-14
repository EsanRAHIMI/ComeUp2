import { z } from 'zod';

const dayHeaderPattern = /(?:DAY|روز)\s*(\d+)\s*[—-]\s*(.+)/i;
const setRepPattern = /(\d+)\s*[×x]\s*([^\s]+)/i;

export const coachPlanImportSchema = z.object({
  text: z.string().min(40).max(20000),
  startDate: z.string().min(10),
  workoutTime: z.string().regex(/^\d{2}:\d{2}$/),
  weeks: z.number().int().min(1).max(24).default(12),
  sessionDuration: z.number().int().min(30).max(180).default(75),
});

type CoachPlanImportInput = z.output<typeof coachPlanImportSchema>;

type ParsedDay = {
  day: number;
  title: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: number;
    repRange: string;
    notes: string;
    muscleGroups: string[];
  }>;
};

function cleanLine(line: string) {
  return line
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferMuscles(title: string, name: string) {
  const text = `${title} ${name}`.toLowerCase();
  const groups: string[] = [];
  if (/chest|press|fly|سینه/.test(text)) groups.push('chest');
  if (/tri|triceps|push-up|پشت بازو/.test(text)) groups.push('triceps');
  if (/leg|quad|squat|lunge|calf|ران|پا|ساق/.test(text)) groups.push('legs');
  if (/hamstring|glute|deadlift|thrust|curl/.test(text)) groups.push('glutes');
  if (/back|row|pulldown|lat|لت|زیربغل/.test(text)) groups.push('back');
  if (/biceps|curl|بازو/.test(text)) groups.push('biceps');
  if (/shoulder|delt|سرشانه/.test(text)) groups.push('shoulders');
  return groups.length ? [...new Set(groups)] : ['full body'];
}

function normalizeReps(raw: string) {
  const normalized = raw.replace(/[–—]/g, '-').replace(/[^\d-]/g, '');
  const values = normalized
    .split('-')
    .map((value) => Number(value))
    .filter(Number.isFinite);
  if (!values.length) return 12;
  return Math.max(1, Math.round(values.reduce((sum, value) => sum + value, 0) / values.length));
}

function extractListAfterHeading(lines: string[], headingPattern: RegExp) {
  const start = lines.findIndex((line) => headingPattern.test(line));
  if (start === -1) return [];
  const items: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^(🍗|💊|📈|⚙️|🟥|🟦|🟩|🟨|🟧|DAY|روز)/i.test(line)) break;
    const item = cleanLine(line);
    if (item) items.push(item);
  }
  return items;
}

function parseDays(lines: string[]) {
  const days: ParsedDay[] = [];
  let current: ParsedDay | null = null;

  for (const rawLine of lines) {
    const line = cleanLine(rawLine);
    if (!line) continue;

    const dayMatch = line.match(dayHeaderPattern);
    if (dayMatch) {
      current = { day: Number(dayMatch[1]), title: dayMatch[2].trim(), exercises: [] };
      days.push(current);
      continue;
    }

    if (!current || /^(هر هفته|استراحت|کالری|پروتئین|کراتین|وی|آب|وزن|بازو|ران)/i.test(line)) continue;

    const setRepMatch = line.match(setRepPattern);
    if (!setRepMatch) continue;

    const [namePart, notePart = ''] = line.split(/[—-]\s*/);
    const name = namePart.replace(setRepPattern, '').trim();
    const sets = Number(setRepMatch[1]);
    const repRange = setRepMatch[2].replace(/[^\d–—\-تا]+/g, '') || setRepMatch[2];

    current.exercises.push({
      name: name || line.replace(setRepPattern, '').trim(),
      sets,
      reps: /ناتوانی/i.test(line) ? 20 : normalizeReps(repRange),
      repRange: /ناتوانی/i.test(line) ? 'to failure' : repRange.replace(/[–—]/g, '-'),
      notes: notePart.trim(),
      muscleGroups: inferMuscles(current.title, name),
    });
  }

  return days;
}

function parseNutrition(lines: string[]) {
  const calories = lines.find((line) => /کالری/i.test(line))?.replace(/^.*?:\s*/, '').trim() ?? '';
  const protein = lines.find((line) => /پروتئین/i.test(line))?.replace(/^.*?:\s*/, '').trim() ?? '';
  const mealRule = lines.find((line) => /هر وعده/i.test(line))?.replace(/^.*?:\s*/, '').trim() ?? '';
  return { calories, protein, mealRule, notes: extractListAfterHeading(lines, /🍗|تغذیه/i) };
}

function buildSchedule(days: ParsedDay[], input: CoachPlanImportInput) {
  const startsAt = new Date(`${input.startDate}T${input.workoutTime}:00`);
  return Array.from({ length: input.weeks }).flatMap((_, weekIndex) =>
    days.map((day, dayIndex) => {
      const date = new Date(startsAt);
      date.setDate(startsAt.getDate() + weekIndex * 7 + dayIndex);
      return {
        week: weekIndex + 1,
        day: day.day,
        title: day.title,
        startsAt: date.toISOString(),
        duration: input.sessionDuration,
        focus: day.title,
        exerciseNames: day.exercises.map((exercise) => exercise.name),
      };
    }),
  );
}

export function parseCoachPlan(input: CoachPlanImportInput) {
  const lines = input.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const days = parseDays(lines);
  const mainRest = Number(lines.find((line) => /حرکات اصلی/.test(line))?.match(/\d+/)?.[0] ?? 90);
  const accessoryRest = Number(lines.find((line) => /بقیه/.test(line))?.match(/\d+/)?.[0] ?? 60);
  const exercises = days.flatMap((day) =>
    day.exercises.map((exercise, index) => ({
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      repRange: exercise.repRange,
      restTime: index < 2 ? mainRest : accessoryRest,
      instructions: `${day.title}. ${exercise.notes || 'Controlled form and full range of motion.'}`,
      notes: exercise.notes,
      muscleGroups: exercise.muscleGroups,
      difficulty: 'Intermediate' as const,
      equipment: [],
      category: 'Strength' as const,
      trackingType: /failure|ناتوانی/i.test(exercise.repRange) ? ('reps' as const) : ('reps' as const),
    })),
  );

  const nutrition = parseNutrition(lines);
  const executionRules = extractListAfterHeading(lines, /⚙️|قوانین/i);
  const supplements = extractListAfterHeading(lines, /💊|مکمل/i);
  const goalLines = extractListAfterHeading(lines, /📈|هدف/i);
  const title = days.length ? `${days.length}-Day Coach Strength Plan` : 'Imported Coach Plan';

  return {
    name: title,
    description: `Imported from coach notes with ${days.length} training days, scheduled for ${input.weeks} weeks.`,
    difficulty: 'Intermediate' as const,
    duration: input.sessionDuration,
    exercises,
    daysPerWeek: Math.max(1, Math.min(7, days.length || 3)),
    isActive: false,
    isPublic: false,
    tags: ['coach-plan', 'imported', 'scheduled'],
    totalCalories: input.sessionDuration * 6,
    sourceText: input.text,
    executionRules,
    nutrition,
    supplements,
    longTermGoal: goalLines.join(' | '),
    schedule: buildSchedule(days, input),
  };
}
