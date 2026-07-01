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

export type WeeklyPlanContent = {
  slots: MealSlot[];
  vegetableChoices: string[];
  dailyRules: DailyRule[];
  proteinRotation: Record<DayOfWeek, { lunch: string; dinner: string }>;
  cheatMeal: string;
};

export const MEAL_SLOT_IDS = [
  'breakfast',
  'snack_am',
  'lunch',
  'snack_pm',
  'dinner',
  'before_bed',
] as const satisfies readonly MealSlotId[];
