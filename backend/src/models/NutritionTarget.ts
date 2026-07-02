import mongoose, { InferSchemaType } from 'mongoose';
import { MEAL_SLOT_IDS } from '@comeup/domain';

/**
 * The user's daily nutrition target — one document per user.
 * Generated deterministically (services/nutritionTargetEngine.ts), optionally
 * edited by the user, then accepted. Never produced by raw AI output.
 */
const gramRangeSchema = new mongoose.Schema(
  {
    min: { type: Number, min: 0, max: 2000, required: true },
    max: { type: Number, min: 0, max: 2000, required: true },
  },
  { _id: false },
);

const targetMealSlotSchema = new mongoose.Schema(
  {
    mealSlot: { type: String, enum: MEAL_SLOT_IDS, required: true },
    label: { type: String, required: true, trim: true },
    proteinGRange: { type: gramRangeSchema, required: true },
    carbsGRange: { type: gramRangeSchema, required: true },
    fatGRange: { type: gramRangeSchema, required: true },
    caloriesEstimate: { type: Number, min: 0, max: 3000 },
    timingNote: { type: String, default: '' },
    guidanceNote: { type: String, default: '' },
  },
  { _id: false },
);

const supplementPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    timingNote: { type: String, default: '' },
  },
  { _id: false },
);

const goalSnapshotSchema = new mongoose.Schema(
  {
    goal: { type: String, default: '' },
    currentWeight: { type: Number },
    targetWeight: { type: Number },
    height: { type: Number },
    age: { type: Number },
    gender: { type: String, default: '' },
    workoutDaysPerWeek: { type: Number },
    nutritionPreference: { type: String, default: '' },
    waterTargetMl: { type: Number },
    supplements: { type: [String], default: [] },
  },
  { _id: false },
);

const nutritionTargetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: { type: String, enum: ['proposed', 'accepted'], default: 'proposed' },
    source: { type: String, enum: ['rules', 'ai'], default: 'rules' },
    goalSnapshot: { type: goalSnapshotSchema, required: true },
    dailyCaloriesEstimate: { type: Number, min: 0, max: 10_000 },
    dailyProteinG: { type: Number, min: 0, max: 500, required: true },
    dailyCarbsG: { type: Number, min: 0, max: 1000, required: true },
    dailyFatG: { type: Number, min: 0, max: 400, required: true },
    waterTargetMl: { type: Number, min: 250, max: 10_000, required: true },
    mealSlots: { type: [targetMealSlotSchema], required: true },
    supplementPlan: { type: [supplementPlanSchema], default: [] },
    timingNotes: { type: [String], default: [] },
    missingInputs: { type: [String], default: [] },
    confidence: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  },
  { timestamps: true },
);

export type NutritionTargetDocument = InferSchemaType<typeof nutritionTargetSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const NutritionTarget = mongoose.model('NutritionTarget', nutritionTargetSchema);
