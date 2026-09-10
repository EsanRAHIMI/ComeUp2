// Profile PATCH validation + Mongo update construction.
// Pure module (zod only) so it is unit-testable without env/DB.
import { z } from 'zod';

const walkingTargetSchema = z
  .object({
    metric: z.enum(['steps', 'minutes', 'distanceKm']),
    value: z.number().positive(),
  })
  .superRefine((target, ctx) => {
    const max = { steps: 100_000, minutes: 720, distanceKm: 100 }[target.metric];
    if (target.value > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `value must be at most ${max} for ${target.metric}`,
        path: ['value'],
      });
    }
  });

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  age: z.number().int().min(12).max(100).optional(),
  height: z.number().min(80).max(260).optional(),
  weight: z.number().min(25).max(350).optional(),
  gender: z.enum(['male', 'female', 'other', 'undisclosed']).optional(),
  injuries: z.array(z.string().max(80)).max(20).optional(),
  availableEquipment: z.array(z.string().max(40)).max(30).optional(),
  preferredDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  sessionDuration: z.number().int().min(20).max(180).optional(),
  goal: z.enum(['Weight Loss', 'Muscle Gain', 'General Fitness', 'Strength']).optional(),
  fitnessLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
  workoutDaysPerWeek: z.number().int().min(1).max(7).optional(),
  // --- Phase 3 additions (null clears the stored value) ---
  targetWeight: z.number().min(25).max(350).nullable().optional(),
  goalDeadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  muscleFocus: z.array(z.string().max(40)).max(20).optional(),
  physicalLimitations: z.array(z.string().max(80)).max(20).optional(),
  nutritionPreference: z
    .enum(['no_preference', 'high_protein', 'low_carb', 'vegetarian', 'vegan', 'keto'])
    .optional(),
  supplements: z.array(z.string().max(60)).max(20).optional(),
  waterTargetMl: z.number().int().min(250).max(10_000).nullable().optional(),
  walkingTarget: walkingTargetSchema.nullable().optional(),
  missedWorkoutBehavior: z.enum(['shift', 'skip']).optional(),
  preferences: z
    .object({
      autoRestTimer: z.boolean().optional(),
      defaultRestSeconds: z.number().int().min(0).max(900).optional(),
      restCountdownSound: z.boolean().optional(),
    })
    .optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/**
 * Turn a validated patch into a Mongo update:
 * - `null` values become $unset (clear the optional field)
 * - `preferences` is flattened to dotted paths so partial preference patches
 *   merge instead of replacing the whole subdocument (keeps old cached PWA
 *   bundles from wiping newer preference fields)
 * - `goalDeadline` strings become Dates (UTC midnight)
 */
export function buildProfileUpdate(input: ProfileUpdateInput): {
  $set: Record<string, unknown>;
  $unset: Record<string, 1>;
} {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (key === 'preferences' && value && typeof value === 'object') {
      for (const [prefKey, prefValue] of Object.entries(value)) {
        if (prefValue !== undefined) $set[`preferences.${prefKey}`] = prefValue;
      }
      continue;
    }
    if (value === null) {
      $unset[key] = 1;
      continue;
    }
    if (key === 'goalDeadline' && typeof value === 'string') {
      $set[key] = new Date(`${value}T00:00:00.000Z`);
      continue;
    }
    $set[key] = value;
  }

  return { $set, $unset };
}
