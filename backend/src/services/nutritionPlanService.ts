import { defaultMealPlanContent } from '../data/defaultMealPlan.js';
import { NutritionPlan } from '../models/NutritionPlan.js';

export async function ensureDefaultNutritionTemplate() {
  const existing = await NutritionPlan.findOne({ isTemplate: true, isDefault: true });
  if (existing) return existing;

  return NutritionPlan.create({
    userId: null,
    isTemplate: true,
    isDefault: true,
    isActive: false,
    name: 'Default Weekly Plan',
    ...defaultMealPlanContent,
  });
}

export async function getActivePlanForUser(userId: string) {
  await ensureDefaultNutritionTemplate();

  let plan = await NutritionPlan.findOne({ userId, isActive: true });
  if (plan) return plan;

  const template = await NutritionPlan.findOne({ isTemplate: true, isDefault: true });
  if (!template) {
    throw new Error('Default nutrition template is missing');
  }

  plan = await NutritionPlan.create({
    userId,
    isTemplate: false,
    isDefault: false,
    isActive: true,
    name: template.name,
    slots: template.slots,
    vegetableChoices: template.vegetableChoices,
    dailyRules: template.dailyRules,
    proteinRotation: template.proteinRotation,
    cheatMeal: template.cheatMeal,
  });

  return plan;
}

export function serializeNutritionPlan(plan: {
  _id: { toString(): string };
  name: string;
  slots: unknown;
  vegetableChoices: string[];
  dailyRules: unknown;
  proteinRotation: unknown;
  cheatMeal?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: plan._id.toString(),
    name: plan.name,
    slots: plan.slots,
    vegetableChoices: plan.vegetableChoices,
    dailyRules: plan.dailyRules,
    proteinRotation: plan.proteinRotation,
    cheatMeal: plan.cheatMeal ?? '',
    isActive: plan.isActive ?? false,
    createdAt: plan.createdAt?.toISOString(),
    updatedAt: plan.updatedAt?.toISOString(),
  };
}
