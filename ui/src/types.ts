export type Goal = 'Weight Loss' | 'Muscle Gain' | 'General Fitness' | 'Strength';
export type FitnessLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type Difficulty = FitnessLevel;

export type User = {
  id: string;
  name: string;
  email: string;
  goal: Goal;
  fitnessLevel: FitnessLevel;
  workoutDaysPerWeek: number;
};

export type Exercise = {
  _id?: string;
  name: string;
  sets: number;
  reps: number;
  repRange?: string;
  restTime: number;
  instructions: string;
  notes?: string;
  muscleGroups: string[];
  difficulty?: Difficulty;
  equipment?: string[];
  thumbnailUrl?: string;
  videoUrl?: string;
  category?: 'Strength' | 'Cardio' | 'Flexibility' | 'Balance';
  trackingType?: 'reps' | 'time';
};

export type ScheduleEntry = {
  week: number;
  day: number;
  title: string;
  startsAt: string;
  duration: number;
  focus?: string;
  exerciseNames: string[];
};

export type Program = {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  duration: number;
  exercises: Exercise[];
  daysPerWeek: number;
  isActive?: boolean;
  isPublic?: boolean;
  shareCode?: string;
  tags: string[];
  totalCalories: number;
  sourceText?: string;
  executionRules?: string[];
  nutrition?: {
    calories?: string;
    protein?: string;
    mealRule?: string;
    notes?: string[];
  };
  supplements?: string[];
  longTermGoal?: string;
  schedule?: ScheduleEntry[];
};

export type ExerciseMedia = {
  exerciseKey: string;
  exerciseName: string;
  imageUrl: string;
};

export type SessionSet = {
  setNumber: number;
  repsCompleted: number;
  weight?: number;
  restTime: number;
  completedAt: string;
};

export type SessionExercise = {
  exerciseId: string;
  exerciseName: string;
  sets: SessionSet[];
};

export type WorkoutSession = {
  _id: string;
  userId: string;
  programId: string;
  startTime: string;
  endTime?: string;
  exercises: SessionExercise[];
  totalDuration: number;
  caloriesBurned: number;
  averageFormScore: number;
  status: 'active' | 'completed' | 'paused';
  createdAt?: string;
  updatedAt?: string;
};

export type AuthMode = 'login' | 'register';
export type ViewKey = 'dashboard' | 'programs' | 'workout' | 'history' | 'profile';
