import mongoose, { InferSchemaType } from 'mongoose';
import { MEAL_SLOT_IDS } from '@comeup/domain';

const foodLineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: String, default: '' },
  },
  { _id: false },
);

const mealOptionSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    items: { type: [foodLineSchema], default: [] },
  },
  { _id: false },
);

const mealSlotSchema = new mongoose.Schema(
  {
    id: { type: String, enum: MEAL_SLOT_IDS, required: true },
    title: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    options: { type: [mealOptionSchema], default: undefined },
    byDay: { type: mongoose.Schema.Types.Mixed, default: undefined },
  },
  { _id: false },
);

const dailyRuleSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const nutritionPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    isTemplate: { type: Boolean, default: false, index: true },
    isDefault: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: false, index: true },
    name: { type: String, required: true, trim: true },
    slots: { type: [mealSlotSchema], required: true },
    vegetableChoices: { type: [String], default: [] },
    dailyRules: { type: [dailyRuleSchema], default: [] },
    proteinRotation: { type: mongoose.Schema.Types.Mixed, required: true },
    cheatMeal: { type: String, default: '' },
  },
  { timestamps: true },
);

nutritionPlanSchema.index({ userId: 1, isActive: 1 });
nutritionPlanSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true, isTemplate: false, userId: { $type: 'objectId' } },
  },
);
nutritionPlanSchema.index(
  { isTemplate: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isTemplate: true, isDefault: true } },
);

export type NutritionPlanDocument = InferSchemaType<typeof nutritionPlanSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const NutritionPlan = mongoose.model('NutritionPlan', nutritionPlanSchema);
