import { z } from 'zod';

export const recommendationSchema = z.object({
  recentWorkouts: z
    .array(
      z.object({
        name: z.string(),
        duration: z.number().min(0),
        averageFormScore: z.number().min(0).max(100).optional(),
        completedAt: z.string().optional(),
      }),
    )
    .default([]),
  goal: z.enum(['Weight Loss', 'Muscle Gain', 'General Fitness', 'Strength']).default('General Fitness'),
  soreness: z.array(z.string()).default([]),
});

export function createRecommendations(input: z.infer<typeof recommendationSchema>) {
  const workoutCount = input.recentWorkouts.length;
  const averageForm =
    workoutCount === 0
      ? null
      : Math.round(
          input.recentWorkouts.reduce((sum, workout) => sum + (workout.averageFormScore ?? 85), 0) /
            workoutCount,
        );

  const recommendations = [];

  if (workoutCount < 2) {
    recommendations.push('Start with three consistent sessions this week before increasing intensity.');
  }

  if (averageForm !== null && averageForm < 80) {
    recommendations.push('Reduce load by 10-15% and focus on controlled tempo until form score improves.');
  }

  if (input.soreness.length > 0) {
    recommendations.push(`Avoid heavy direct work for: ${input.soreness.join(', ')}. Use mobility and light cardio today.`);
  }

  if (input.goal === 'Muscle Gain') {
    recommendations.push('Keep most working sets 1-3 reps away from failure and prioritize protein after training.');
  } else if (input.goal === 'Weight Loss') {
    recommendations.push('Add 10-15 minutes of low-intensity cardio after strength work for extra calorie burn.');
  } else if (input.goal === 'Strength') {
    recommendations.push('Use longer rest windows on compound lifts and track top-set performance each week.');
  }

  return {
    averageForm,
    recommendations: recommendations.slice(0, 4),
    generatedAt: new Date().toISOString(),
  };
}
