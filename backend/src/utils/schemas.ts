import { z } from 'zod';

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const exerciseInputSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(300),
  repRange: z.string().default(''),
  restTime: z.number().int().min(0).max(900),
  instructions: z.string().default(''),
  notes: z.string().default(''),
  muscleGroups: z.array(z.string()).default([]),
  videoUrl: z.string().url().or(z.literal('')).default(''),
  thumbnailUrl: z.string().url().or(z.literal('')).default(''),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner'),
  equipment: z.array(z.string()).default([]),
  category: z.enum(['Strength', 'Cardio', 'Flexibility', 'Balance']).default('Strength'),
  trackingType: z.enum(['reps', 'time']).default('reps'),
});

export const programInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).default(''),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner'),
  duration: z.number().int().min(1).max(300),
  exercises: z.array(exerciseInputSchema).min(1),
  daysPerWeek: z.number().int().min(1).max(7).default(3),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  totalCalories: z.number().int().min(0).default(0),
  sourceText: z.string().default(''),
  executionRules: z.array(z.string()).default([]),
  nutrition: z
    .object({
      calories: z.string().default(''),
      protein: z.string().default(''),
      mealRule: z.string().default(''),
      notes: z.array(z.string()).default([]),
    })
    .default({ calories: '', protein: '', mealRule: '', notes: [] }),
  supplements: z.array(z.string()).default([]),
  longTermGoal: z.string().default(''),
  schedule: z
    .array(
      z.object({
        week: z.number().int().min(1),
        day: z.number().int().min(1),
        title: z.string(),
        startsAt: z.string().datetime(),
        duration: z.number().int().min(1),
        focus: z.string().default(''),
        exerciseNames: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});

export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  return schema.parse(body);
}
