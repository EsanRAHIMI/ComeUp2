import mongoose, { InferSchemaType } from 'mongoose';
import { MEAL_SLOT_IDS } from '../types/nutrition.js';

const nutritionWeighLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, trim: true },
    mealSlot: { type: String, enum: MEAL_SLOT_IDS, required: true },
    foodName: { type: String, required: true, trim: true },
    weightGrams: { type: Number, required: true, min: 0, max: 10_000 },
    note: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

nutritionWeighLogSchema.index({ userId: 1, date: 1, createdAt: 1 });

export type NutritionWeighLogDocument = InferSchemaType<typeof nutritionWeighLogSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const NutritionWeighLog = mongoose.model('NutritionWeighLog', nutritionWeighLogSchema);
