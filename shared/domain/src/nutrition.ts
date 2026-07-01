export type DayOfWeek =
  | 'saturday'
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday';

export type MealSlotId = 'breakfast' | 'snack_am' | 'lunch' | 'snack_pm' | 'dinner' | 'before_bed';

export type FoodLine = {
  name: string;
  amount: string;
};

export type MealOption = {
  label?: string;
  items: FoodLine[];
};

export type MealSlot = {
  id: MealSlotId;
  title: string;
  time: string;
  options?: MealOption[];
  byDay?: Partial<Record<DayOfWeek, MealOption>>;
};

export type DailyRule = {
  label: string;
  value: string;
};

/** Structured weekly meal plan content (template or assigned copy). */
export type WeeklyPlanContent = {
  slots: MealSlot[];
  vegetableChoices: string[];
  dailyRules: DailyRule[];
  proteinRotation: Record<DayOfWeek, { lunch: string; dinner: string }>;
  cheatMeal: string;
};

export type NutritionPlan = WeeklyPlanContent & {
  id: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type NutritionWeighLog = {
  id: string;
  date: string;
  mealSlot: MealSlotId;
  foodName: string;
  weightGrams: number;
  note?: string;
  createdAt?: string;
};

export type NutritionPlatePhoto = {
  id: string;
  date: string;
  mealSlot: MealSlotId;
  caption?: string;
  mimeType: string;
  url: string;
  createdAt?: string;
};

export type NutritionGeneratedPlate = {
  id: string;
  date: string;
  mealSlot: MealSlotId;
  prompt: string;
  url: string;
  createdAt?: string;
};

export const MEAL_SLOT_IDS = [
  'breakfast',
  'snack_am',
  'lunch',
  'snack_pm',
  'dinner',
  'before_bed',
] as const satisfies readonly MealSlotId[];

export const DAY_ORDER: DayOfWeek[] = [
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
];

export const DAY_LABELS_FA: Record<DayOfWeek, string> = {
  saturday: 'شنبه',
  sunday: 'یکشنبه',
  monday: 'دوشنبه',
  tuesday: 'سه‌شنبه',
  wednesday: 'چهارشنبه',
  thursday: 'پنجشنبه',
  friday: 'جمعه',
};

export const MEAL_SLOT_LABELS_FA: Record<MealSlotId, string> = {
  breakfast: 'صبحانه',
  snack_am: 'میان‌وعده صبح',
  lunch: 'ناهار',
  snack_pm: 'میان‌وعده عصر',
  dinner: 'شام',
  before_bed: 'قبل خواب',
};

/** JS getDay(): 0=Sun … 6=Sat — plan week starts Saturday. */
export function todayPlanDay(): DayOfWeek {
  const order: DayOfWeek[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return order[new Date().getDay()]!;
}
