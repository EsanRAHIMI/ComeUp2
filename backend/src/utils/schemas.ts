import { z } from 'zod';

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const exerciseInputSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(300),
  restTime: z.number().int().min(0).max(900),
  instructions: z.string().default(''),
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
});

export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  return schema.parse(body);
}
