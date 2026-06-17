export type Goal = 'Weight Loss' | 'Muscle Gain' | 'General Fitness' | 'Strength';
export type FitnessLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type Difficulty = FitnessLevel;

export type Gender = 'male' | 'female' | 'other' | 'undisclosed';

export type User = {
  id: string;
  name: string;
  email: string;
  goal: Goal;
  fitnessLevel: FitnessLevel;
  workoutDaysPerWeek: number;
  gender?: Gender;
  age?: number;
  height?: number;
  weight?: number;
  injuries?: string[];
  availableEquipment?: string[];
  preferredDays?: number[];
};

export type GptQuota = {
  limit: number;
  used: number;
  remaining: number;
  weekStartDate: string;
};

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  createdAt?: string;
};

export type AiConversation = {
  _id: string;
  messages: ChatMessage[];
  draftProgram: GptDraftProgram | null;
  status: 'draft' | 'converted' | 'saved';
  generatedProgramId?: string | null;
};

export type GptDraftProgram = {
  name: string;
  description?: string;
  difficulty: Difficulty;
  goal?: string;
  daysPerWeek: number;
  sessionDuration: number;
  days: Array<{
    day: number;
    title: string;
    focus?: string;
    exercises: Array<{
      name: string;
      sets: number;
      reps: number;
      repRange?: string;
      restTime: number;
      instructions?: string;
      muscleGroups: string[];
      equipment?: string[];
    }>;
  }>;
  nutrition?: { calories?: string; protein?: string; mealRule?: string; notes?: string[] };
  supplements?: string[];
  executionRules?: string[];
  longTermGoal?: string;
};

export type WeeklyReport = {
  weekStartDate: string;
  completedSessions: number;
  totalMinutes: number;
  totalCalories: number;
  totalSets: number;
  scheduledThisWeek: number;
  adherencePct: number | null;
};

export type ReportOverview = {
  weeks: Array<{ weekStartDate: string; sessions: number; minutes: number; calories: number; sets: number }>;
  totalSessions: number;
  streakDays: number;
};

export type ImportReviewItem = {
  day: number;
  dayTitle: string;
  name: string;
  sets: number;
  reps: number;
  repRange: string;
  restTime: number;
  muscleGroups: string[];
  needsReview: boolean;
  reason?: string;
};

export type Measurement = {
  _id: string;
  measuredAt: string;
  weight?: number;
  bodyFat?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  arms?: number;
  thighs?: number;
  notes?: string;
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
