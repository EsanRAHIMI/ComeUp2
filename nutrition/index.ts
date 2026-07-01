// index.ts — barrel export. In your host app you can do:
//   import { NutritionModule, mealPlan } from "@/nutrition-module";

export { default as NutritionModule } from "./components/nutrition/NutritionModule";
export { default as MealPlanView } from "./components/nutrition/MealPlanView";
export { default as WeighInLogger } from "./components/nutrition/WeighInLogger";
export { default as PlatePhotoArchive } from "./components/nutrition/PlatePhotoArchive";
export { mealPlan, DAY_ORDER, DAY_LABELS_FA, MEAL_SLOT_LABELS_FA } from "./data/meal-plan";
export * from "./types/nutrition";
