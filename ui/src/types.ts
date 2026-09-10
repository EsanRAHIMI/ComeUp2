export type Goal = 'Weight Loss' | 'Muscle Gain' | 'General Fitness' | 'Strength';
export type FitnessLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type Difficulty = FitnessLevel;

export type Gender = 'male' | 'female' | 'other' | 'undisclosed';

export type UserPreferences = {
  autoRestTimer?: boolean;
  defaultRestSeconds?: number;
  /** Three soft beeps in the final 3 s of rest. */
  restCountdownSound?: boolean;
  /** UI language preference (synced when signed in). */
  locale?: 'en' | 'fa' | 'ar';
};

export type NutritionPreference =
  | 'no_preference'
  | 'high_protein'
  | 'low_carb'
  | 'vegetarian'
  | 'vegan'
  | 'keto';

export type WalkingTargetMetric = 'steps' | 'minutes' | 'distanceKm';

export type MissedWorkoutBehavior = 'shift' | 'skip';

export type User = {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
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
  sessionDuration?: number;
  preferences?: UserPreferences;
  // Phase 3 — all optional; `null` in a PATCH clears the stored value.
  targetWeight?: number | null;
  goalDeadline?: string | null;
  muscleFocus?: string[];
  physicalLimitations?: string[];
  nutritionPreference?: NutritionPreference;
  supplements?: string[];
  waterTargetMl?: number | null;
  walkingTarget?: { metric: WalkingTargetMetric; value: number } | null;
  missedWorkoutBehavior?: MissedWorkoutBehavior;
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

export type DailyMedal = {
  id: 'workout' | 'volume' | 'streak';
  label: string;
  subtitle: string;
  earned: boolean;
};

export type TodayStatus = 'completed' | 'pending' | 'shifted' | 'rest' | 'none';

export type DailyNutritionSnapshot = {
  date: string;
  slotCount: number;
  loggedSlotIds: string[];
  nextSlot: { id: string; title: string; time: string } | null;
  /** Present once the user has an accepted nutrition target (Phase 6). */
  score?: number | null;
  scoreConfidence?: 'low' | 'medium' | 'high';
  water?: { ml: number; targetMl: number; pct: number };
};

// --- Phase 6: goal-based nutrition system ---

export type GramRange = { min: number; max: number };

export type NutritionConfidence = 'low' | 'medium' | 'high';

export type TargetMealSlot = {
  mealSlot: string;
  label: string;
  proteinGRange: GramRange;
  carbsGRange: GramRange;
  fatGRange: GramRange;
  caloriesEstimate?: number | null;
  timingNote?: string;
  guidanceNote?: string;
};

export type NutritionTargetInfo = {
  id: string;
  status: 'proposed' | 'accepted';
  source: 'rules' | 'ai';
  goalSnapshot: {
    goal: string;
    currentWeight?: number;
    targetWeight?: number;
    height?: number;
    age?: number;
    gender?: string;
    workoutDaysPerWeek?: number;
    nutritionPreference?: string;
    waterTargetMl?: number;
    supplements?: string[];
  };
  dailyCaloriesEstimate: number | null;
  dailyProteinG: number;
  dailyCarbsG: number;
  dailyFatG: number;
  waterTargetMl: number;
  mealSlots: TargetMealSlot[];
  supplementPlan: Array<{ name: string; timingNote?: string }>;
  timingNotes: string[];
  missingInputs: string[];
  confidence: NutritionConfidence;
  createdAt?: string;
  updatedAt?: string;
};

export type MealLogStatus = 'done' | 'heavier' | 'lighter' | 'off_plan' | 'skipped';

export type MealLogEntry = {
  id: string;
  date: string;
  mealSlot: string;
  status: MealLogStatus;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  grams: number | null;
  note: string;
  loggedAt?: string;
};

export type HabitEntry = {
  id: string;
  date: string;
  waterMl: number;
  supplementsTaken: string[];
  drinks: Array<{ name: string; amountMl?: number; note?: string }>;
  note: string;
};

export type NutritionDayScore = {
  date: string;
  score: number | null;
  confidence: NutritionConfidence;
  mealBreakdown: Array<{
    mealSlot: string;
    label: string;
    status: MealLogStatus | 'unlogged';
    points: number | null;
    detailed: boolean;
  }>;
  waterStatus: { ml: number; targetMl: number; pct: number };
  supplementStatus: { taken: number; planned: number };
  positiveLabels: string[];
  negativeLabels: string[];
  nextAction: string;
  explanation: string;
};

export type NutritionScoreResponse = {
  days: NutritionDayScore[];
  summary: {
    averageScore: number | null;
    daysWithData: number;
    totalDays: number;
    bestDay: { date: string; score: number } | null;
    worstDay: { date: string; score: number } | null;
  } | null;
  reason: string | null;
};

export type DailyReport = {
  dayKey: string;
  completedToday: boolean;
  streakDays: number;
  secondsUntilWorkout: number | null;
  estimatedMinutes: number;
  plannedSets: number;
  exerciseCount: number;
  todayStats: { sessions: number; sets: number; minutes: number; calories: number } | null;
  medals: DailyMedal[];
  focusSession: {
    title: string;
    startsAt: string;
    duration: number;
    isToday: boolean;
  } | null;
  /** Schedule-derived status for the client-local day (shift/skip aware). */
  todayStatus?: TodayStatus;
  nextWorkout?: {
    title: string;
    startsAt: string;
    duration: number;
    isToday: boolean;
    shifted: boolean;
  } | null;
  nutrition?: DailyNutritionSnapshot | null;
};

export type CalendarWorkoutStatus = 'completed' | 'pending' | 'missed' | 'shifted' | 'upcoming';

export type CalendarDayData = {
  workout?: { status: CalendarWorkoutStatus; title: string };
  sessions?: number;
  stats?: { sets: number; minutes: number; calories: number };
  nutrition?: { loggedSlots: number; slotCount: number };
};

export type CalendarReport = {
  month: string;
  todayKey: string;
  behavior: 'shift' | 'skip';
  days: Record<string, CalendarDayData>;
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
  source?: 'personal' | 'community';
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

export type AuthMode = 'login' | 'register' | 'forgot' | 'reset';
export type ViewKey = 'dashboard' | 'programs' | 'workout' | 'history' | 'nutrition' | 'profile' | 'admin';
