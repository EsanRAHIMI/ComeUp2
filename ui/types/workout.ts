export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  restTime: number;
  instructions?: string;
  muscleGroups: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  equipment: string[];
  category: 'Strength' | 'Cardio' | 'Flexibility' | 'Balance';
  trackingType: 'reps' | 'time';
}

export interface WorkoutProgram {
  id: string;
  name: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: number;
  exercises: Exercise[];
  daysPerWeek: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  isPublic: boolean;
  shareCode?: string;
  tags: string[];
  totalCalories: number;
}

export interface WorkoutSession {
  id: string;
  programId: string;
  startTime: string;
  endTime?: string;
  exercises: ExerciseSession[];
  totalDuration: number;
  caloriesBurned: number;
  averageFormScore: number;
  status: 'active' | 'completed' | 'paused';
}

export interface ExerciseSession {
  exerciseId: string;
  sets: SetSession[];
  formScores: number[];
  notes?: string;
}

export interface SetSession {
  setNumber: number;
  repsCompleted: number;
  weight?: number;
  restTime: number;
  formScore: number;
  completedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  age: number;
  height: number;
  weight: number;
  goal: 'Weight Loss' | 'Muscle Gain' | 'General Fitness' | 'Strength';
  fitnessLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  workoutDaysPerWeek: number;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  voiceFeedback: boolean;
  formCorrection: boolean;
  notifications: boolean;
  autoRestTimer: boolean;
  reminderTime?: string;
  preferredCamera: 'front' | 'back';
}

export interface FormFeedback {
  exerciseId: string;
  timestamp: string;
  score: number;
  issues: string[];
  suggestions: string[];
}

export interface ProgressMetrics {
  date: string;
  workoutsCompleted: number;
  totalDuration: number;
  averageFormScore: number;
  caloriesBurned: number;
  personalRecords: PersonalRecord[];
}

export interface PersonalRecord {
  exerciseId: string;
  type: 'reps' | 'weight' | 'duration';
  value: number;
  achievedAt: string;
}