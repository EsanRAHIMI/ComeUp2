import { z } from 'zod';
import { exerciseLibrary } from './exerciseLibrary.js';
import type { ExerciseTemplate, FitnessGoal, FitnessLevel, GeneratedExercise } from '../types/workout.js';

export const workoutGenerationSchema = z.object({
  goal: z.enum(['Weight Loss', 'Muscle Gain', 'General Fitness', 'Strength']),
  fitnessLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  duration: z.number().int().min(15).max(120),
  equipment: z.array(z.string()).default([]),
  focusAreas: z.array(z.string()).default([]),
  limitations: z.array(z.string()).default([]),
  daysPerWeek: z.number().int().min(1).max(7).default(3),
});

type WorkoutGenerationInput = z.infer<typeof workoutGenerationSchema>;

const levelScore: Record<FitnessLevel, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
};

function pickVolume(goal: FitnessGoal, level: FitnessLevel, exercise: ExerciseTemplate) {
  const base = {
    Beginner: { sets: 2, reps: 10, restTime: 75 },
    Intermediate: { sets: 3, reps: 12, restTime: 60 },
    Advanced: { sets: 4, reps: 15, restTime: 45 },
  }[level];

  if (exercise.trackingType === 'time') {
    return { sets: base.sets, reps: level === 'Advanced' ? 60 : level === 'Intermediate' ? 45 : 30, restTime: 45 };
  }

  if (goal === 'Strength') return { sets: base.sets + 1, reps: Math.max(5, base.reps - 4), restTime: base.restTime + 45 };
  if (goal === 'Muscle Gain') return { sets: base.sets + 1, reps: base.reps, restTime: base.restTime + 15 };
  if (goal === 'Weight Loss') return { sets: base.sets, reps: base.reps + 4, restTime: Math.max(30, base.restTime - 20) };
  return base;
}

function matchesInput(exercise: ExerciseTemplate, input: WorkoutGenerationInput) {
  const availableEquipment = input.equipment.map((item) => item.toLowerCase());
  const focusAreas = input.focusAreas.map((item) => item.toLowerCase());
  const limitations = input.limitations.map((item) => item.toLowerCase());

  const equipmentOk =
    availableEquipment.length === 0 ||
    exercise.equipment.some((item) => availableEquipment.includes(item.toLowerCase())) ||
    exercise.equipment.includes('bodyweight');

  const focusOk =
    focusAreas.length === 0 ||
    exercise.muscleGroups.some((group) => focusAreas.includes(group.toLowerCase()));

  const difficultyOk = levelScore[exercise.difficulty] <= levelScore[input.fitnessLevel] + 1;
  const limitationOk = !limitations.some((limitation) =>
    exercise.muscleGroups.some((group) => group.toLowerCase().includes(limitation)),
  );

  return equipmentOk && focusOk && difficultyOk && limitationOk;
}

export function generateWorkout(input: WorkoutGenerationInput) {
  const filtered = exerciseLibrary.filter((exercise) => matchesInput(exercise, input));
  const candidates = filtered.length >= 3 ? filtered : exerciseLibrary.filter((exercise) => matchesInput(exercise, { ...input, focusAreas: [] }));
  const exerciseCount = Math.max(3, Math.min(8, Math.round(input.duration / 8)));

  const selected = candidates.slice(0, exerciseCount);
  const exercises: GeneratedExercise[] = selected.map((exercise) => ({
    ...exercise,
    ...pickVolume(input.goal, input.fitnessLevel, exercise),
  }));

  const totalCalories = Math.round(input.duration * (input.goal === 'Weight Loss' ? 8 : input.goal === 'Strength' ? 5 : 6));
  const focusName = input.focusAreas[0] ? input.focusAreas[0][0].toUpperCase() + input.focusAreas[0].slice(1) : 'Full Body';

  return {
    name: `${focusName} ${input.goal} Plan`,
    description: `A ${input.duration}-minute ${input.fitnessLevel.toLowerCase()} gym session built for ${input.goal.toLowerCase()}.`,
    difficulty: input.fitnessLevel,
    duration: input.duration,
    daysPerWeek: input.daysPerWeek,
    tags: [input.goal.toLowerCase().replace(/\s+/g, '-'), input.fitnessLevel.toLowerCase(), 'ai-generated'],
    totalCalories,
    exercises,
    coachingNotes: [
      'Warm up for 5 minutes before the first working set.',
      'Stop any movement that causes sharp pain.',
      'Use the final two reps of each set to judge whether the load is right.',
    ],
    postWorkoutNutrition: {
      proteinGrams: input.goal === 'Muscle Gain' ? 35 : 25,
      carbsGrams: input.goal === 'Weight Loss' ? 25 : 45,
      hydrationMl: 750,
    },
  };
}
