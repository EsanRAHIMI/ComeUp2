// Deterministic nutrition-target generation.
//
// Pure module: profile in → practical daily target out. No DB, no AI, no env.
// Conservative, explainable numbers (Mifflin-St Jeor + modest goal
// adjustments). Works with incomplete profiles: instead of blocking it falls
// back to a reference weight, reports `missingInputs`, and lowers confidence.

export type TargetGoal = 'Weight Loss' | 'Muscle Gain' | 'General Fitness' | 'Strength';

export type TargetProfileInput = {
  goal?: TargetGoal | string;
  weight?: number;
  targetWeight?: number;
  height?: number;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'undisclosed' | string;
  workoutDaysPerWeek?: number;
  nutritionPreference?: string;
  waterTargetMl?: number;
  supplements?: string[];
};

export type GramRange = { min: number; max: number };

export type TargetMealSlot = {
  mealSlot: string;
  label: string;
  proteinGRange: GramRange;
  carbsGRange: GramRange;
  fatGRange: GramRange;
  caloriesEstimate?: number;
  timingNote?: string;
  guidanceNote?: string;
};

export type GeneratedTarget = {
  source: 'rules';
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
    supplements: string[];
  };
  dailyCaloriesEstimate?: number;
  dailyProteinG: number;
  dailyCarbsG: number;
  dailyFatG: number;
  waterTargetMl: number;
  mealSlots: TargetMealSlot[];
  supplementPlan: Array<{ name: string; timingNote?: string }>;
  timingNotes: string[];
  missingInputs: string[];
  confidence: 'low' | 'medium' | 'high';
};

/** Used when weight is unknown so the product still works; flagged clearly. */
const REFERENCE_WEIGHT_KG = 70;

const PROTEIN_PER_KG: Record<TargetGoal, number> = {
  'Weight Loss': 1.8,
  'Muscle Gain': 1.8,
  Strength: 1.7,
  'General Fitness': 1.4,
};

const GOAL_CALORIE_FACTOR: Record<TargetGoal, number> = {
  'Weight Loss': 0.85,
  'Muscle Gain': 1.1,
  Strength: 1.05,
  'General Fitness': 1.0,
};

/** Base slot shares; before_bed only participates for muscle gain. */
const SLOT_PLAN: Array<{ mealSlot: string; label: string; share: number; timingNote?: string }> = [
  { mealSlot: 'breakfast', label: 'Breakfast', share: 0.25, timingNote: 'Within ~2 h of waking' },
  { mealSlot: 'snack_am', label: 'Morning snack', share: 0.1 },
  { mealSlot: 'lunch', label: 'Lunch', share: 0.3 },
  { mealSlot: 'snack_pm', label: 'Afternoon snack', share: 0.1, timingNote: 'Good pre-workout window' },
  { mealSlot: 'dinner', label: 'Dinner', share: 0.25 },
];

const BEFORE_BED_SLOT = {
  mealSlot: 'before_bed',
  label: 'Before bed',
  share: 0.1,
  timingNote: 'Slow protein supports overnight recovery',
};

function normalizeGoal(goal?: string): TargetGoal {
  const known: TargetGoal[] = ['Weight Loss', 'Muscle Gain', 'General Fitness', 'Strength'];
  return known.includes(goal as TargetGoal) ? (goal as TargetGoal) : 'General Fitness';
}

function activityFactor(daysPerWeek?: number): number {
  const d = daysPerWeek ?? 3;
  if (d <= 1) return 1.35;
  if (d <= 3) return 1.45;
  if (d <= 5) return 1.55;
  return 1.65;
}

function mifflinStJeor(weight: number, height: number, age: number, gender?: string): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  if (gender === 'male') return base + 5;
  if (gender === 'female') return base - 161;
  return base - 78; // neutral midpoint for other/undisclosed/missing
}

const round5 = (n: number) => Math.round(n / 5) * 5;
const roundInt = Math.round;

export function generateNutritionTarget(profile: TargetProfileInput): GeneratedTarget {
  const goal = normalizeGoal(profile.goal);
  const missingInputs: string[] = [];
  if (profile.weight == null) missingInputs.push('weight');
  if (profile.height == null) missingInputs.push('height');
  if (profile.age == null) missingInputs.push('age');
  if (!profile.gender || profile.gender === 'undisclosed') missingInputs.push('gender');

  const weightKnown = profile.weight != null;
  const weight = profile.weight ?? REFERENCE_WEIGHT_KG;

  // Calories only when the full formula is computable — never invented.
  let dailyCaloriesEstimate: number | undefined;
  if (profile.weight != null && profile.height != null && profile.age != null) {
    const bmr = mifflinStJeor(profile.weight, profile.height, profile.age, profile.gender);
    dailyCaloriesEstimate = round5(bmr * activityFactor(profile.workoutDaysPerWeek) * GOAL_CALORIE_FACTOR[goal]);
  }

  const dailyProteinG = Math.min(220, roundInt(weight * PROTEIN_PER_KG[goal]));
  const dailyFatG = Math.max(35, roundInt(weight * 0.9));

  let dailyCarbsG: number;
  if (dailyCaloriesEstimate != null) {
    const remaining = dailyCaloriesEstimate - dailyProteinG * 4 - dailyFatG * 9;
    dailyCarbsG = Math.max(60, round5(remaining / 4));
  } else {
    // g/kg fallback by goal + training volume, conservative.
    const trainHard = (profile.workoutDaysPerWeek ?? 3) >= 4;
    const perKg = goal === 'Weight Loss' ? 2.2 : goal === 'Muscle Gain' ? (trainHard ? 4.5 : 3.8) : 3.0;
    dailyCarbsG = round5(weight * perKg);
  }

  const waterTargetMl =
    profile.waterTargetMl ??
    (weightKnown ? Math.min(4000, Math.max(1500, Math.round((weight * 35) / 250) * 250)) : 2000);

  // --- Distribute across meal slots ---
  const slots = goal === 'Muscle Gain' ? [...SLOT_PLAN, BEFORE_BED_SLOT] : SLOT_PLAN;
  const totalShare = slots.reduce((s, x) => s + x.share, 0);
  const range = (total: number, share: number): GramRange => {
    const mid = (total * share) / totalShare;
    return { min: Math.max(0, roundInt(mid * 0.8)), max: roundInt(mid * 1.2) };
  };

  const mealSlots: TargetMealSlot[] = slots.map((slot) => ({
    mealSlot: slot.mealSlot,
    label: slot.label,
    proteinGRange: range(dailyProteinG, slot.share),
    carbsGRange: range(dailyCarbsG, slot.share),
    fatGRange: range(dailyFatG, slot.share),
    caloriesEstimate:
      dailyCaloriesEstimate != null ? round5((dailyCaloriesEstimate * slot.share) / totalShare) : undefined,
    timingNote: slot.timingNote ?? '',
    guidanceNote:
      slot.mealSlot === 'dinner' && goal === 'Weight Loss'
        ? 'Keep dinner lighter on carbs, protein high'
        : slot.mealSlot === 'lunch'
          ? 'Your largest meal — protein plus complex carbs'
          : '',
  }));

  // Only the user's own supplements — never invented.
  const supplementPlan = (profile.supplements ?? [])
    .filter((name) => name.trim().length > 0)
    .map((name) => ({ name: name.trim(), timingNote: '' }));

  const timingNotes: string[] = [
    'Spread protein across all meals rather than loading one meal.',
    'Drink water steadily through the day, not all at once.',
  ];
  if (goal === 'Weight Loss') timingNotes.push('Front-load carbs earlier in the day when possible.');
  if (goal === 'Muscle Gain') timingNotes.push('A protein-rich meal within 2 h after training helps recovery.');
  if (!weightKnown) {
    timingNotes.push('Targets use a reference weight — add your weight in Profile for accuracy.');
  }

  const confidence: GeneratedTarget['confidence'] = !weightKnown
    ? 'low'
    : missingInputs.length === 0
      ? 'high'
      : missingInputs.length <= 2
        ? 'medium'
        : 'low';

  return {
    source: 'rules',
    goalSnapshot: {
      goal,
      currentWeight: profile.weight,
      targetWeight: profile.targetWeight,
      height: profile.height,
      age: profile.age,
      gender: profile.gender,
      workoutDaysPerWeek: profile.workoutDaysPerWeek,
      nutritionPreference: profile.nutritionPreference,
      waterTargetMl: profile.waterTargetMl,
      supplements: profile.supplements ?? [],
    },
    dailyCaloriesEstimate,
    dailyProteinG,
    dailyCarbsG,
    dailyFatG,
    waterTargetMl,
    mealSlots,
    supplementPlan,
    timingNotes,
    missingInputs,
    confidence,
  };
}
