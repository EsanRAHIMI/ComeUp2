import { z } from 'zod';
import { buildSchedule } from './scheduleBuilder.js';

// Mirror of the GPT program contract, validated before persisting.
const gptExerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(300),
  repRange: z.string().optional().default(''),
  restTime: z.number().int().min(0).max(900),
  instructions: z.string().optional().default(''),
  muscleGroups: z.array(z.string()).default([]),
  equipment: z.array(z.string()).optional().default([]),
});

const gptDaySchema = z.object({
  day: z.number().int().min(1),
  title: z.string(),
  focus: z.string().optional().default(''),
  exercises: z.array(gptExerciseSchema).min(1),
});

export const gptProgramSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Intermediate'),
  goal: z.string().optional().default(''),
  daysPerWeek: z.number().int().min(1).max(7),
  sessionDuration: z.number().int().min(20).max(180).default(60),
  days: z.array(gptDaySchema).min(1),
  nutrition: z
    .object({
      calories: z.string().optional().default(''),
      protein: z.string().optional().default(''),
      mealRule: z.string().optional().default(''),
      notes: z.array(z.string()).optional().default([]),
    })
    .optional(),
  supplements: z.array(z.string()).optional().default([]),
  executionRules: z.array(z.string()).optional().default([]),
  longTermGoal: z.string().optional().default(''),
});

export type GptProgram = z.infer<typeof gptProgramSchema>;

export type NormalizeOptions = {
  startDate: string;
  workoutTime: string;
  weeks: number;
  preferredDays?: number[];
};

/** Convert a validated GPT draft into a Program.create() input, with a dated schedule. */
export function normalizeGptProgram(raw: unknown, opts: NormalizeOptions) {
  const gpt = gptProgramSchema.parse(raw);

  // Flatten exercises (dedupe by name); per-day order is preserved in the schedule.
  const seen = new Set<string>();
  const exercises = [];
  for (const day of gpt.days) {
    for (const ex of day.exercises) {
      const key = ex.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      exercises.push({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        repRange: ex.repRange ?? '',
        restTime: ex.restTime,
        instructions: ex.instructions ?? '',
        notes: '',
        muscleGroups: ex.muscleGroups,
        difficulty: gpt.difficulty,
        equipment: ex.equipment ?? [],
        category: 'Strength' as const,
        trackingType: 'reps' as const,
      });
    }
  }

  const schedule = buildSchedule(
    gpt.days.map((day) => ({
      day: day.day,
      title: day.title,
      focus: day.focus,
      exerciseNames: day.exercises.map((ex) => ex.name),
    })),
    {
      startDate: opts.startDate,
      workoutTime: opts.workoutTime,
      weeks: opts.weeks,
      sessionDuration: gpt.sessionDuration,
      preferredDays: opts.preferredDays,
    },
  );

  return {
    name: gpt.name,
    description: gpt.description || 'Personalized program generated with GPT.',
    difficulty: gpt.difficulty,
    duration: gpt.sessionDuration,
    exercises,
    daysPerWeek: gpt.daysPerWeek,
    isActive: false,
    isPublic: false,
    tags: ['gpt', 'personalized', gpt.goal ? gpt.goal.toLowerCase() : 'custom'],
    totalCalories: gpt.sessionDuration * 6,
    sourceText: '',
    executionRules: gpt.executionRules ?? [],
    nutrition: gpt.nutrition ?? { calories: '', protein: '', mealRule: '', notes: [] },
    supplements: gpt.supplements ?? [],
    longTermGoal: gpt.longTermGoal ?? '',
    schedule,
  };
}
