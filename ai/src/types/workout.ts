export type FitnessGoal = 'Weight Loss' | 'Muscle Gain' | 'General Fitness' | 'Strength';
export type FitnessLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface ExerciseTemplate {
  name: string;
  category: 'Strength' | 'Cardio' | 'Flexibility' | 'Balance';
  muscleGroups: string[];
  difficulty: FitnessLevel;
  equipment: string[];
  instructions: string;
  videoUrl: string;
  thumbnailUrl: string;
  trackingType: 'reps' | 'time';
}

export interface GeneratedExercise extends ExerciseTemplate {
  sets: number;
  reps: number;
  restTime: number;
}
