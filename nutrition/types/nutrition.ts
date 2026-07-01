// ─────────────────────────────────────────────────────────────
// types/nutrition.ts
// Shared types for the Nutrition module (meal plan, logging, photos)
// ─────────────────────────────────────────────────────────────

export type DayOfWeek =
  | "saturday"
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday";

export type MealSlotId = "breakfast" | "snack_am" | "lunch" | "snack_pm" | "dinner" | "before_bed";

export interface FoodLine {
  name: string;      // e.g. "Eggs", "تخم‌مرغ"
  amount: string;    // free-text amount as written in the plan, e.g. "150 g", "2"
}

export interface MealOption {
  label?: string;     // "Option 1" / "Saturday" etc — optional, used for fixed daily meals
  items: FoodLine[];
}

export interface MealSlot {
  id: MealSlotId;
  title: string;      // "Breakfast"
  time: string;        // "08:00"
  // Either a fixed set of options (breakfast/snacks) or a per-day table (lunch/dinner)
  options?: MealOption[];
  byDay?: Partial<Record<DayOfWeek, MealOption>>;
}

export interface DailyRule {
  label: string;
  value: string;
}

export interface WeeklyPlan {
  slots: MealSlot[];
  vegetableChoices: string[];
  dailyRules: DailyRule[];
  proteinRotation: Record<DayOfWeek, { lunch: string; dinner: string }>;
  cheatMeal: string;
}

// ── Logging ──────────────────────────────────────────────────

export interface WeighLogEntry {
  id?: number;
  date: string;          // ISO date, "2026-07-01"
  mealSlot: MealSlotId;
  foodName: string;
  weightGrams: number;
  note?: string;
  createdAt?: string;
}

export interface PlatePhoto {
  id?: number;
  date: string;
  mealSlot: MealSlotId;
  filePath: string;
  caption?: string;
  createdAt?: string;
}

export interface GeneratedPlate {
  id?: number;
  date: string;
  mealSlot: MealSlotId;
  prompt: string;
  imagePath: string;
  createdAt?: string;
}
