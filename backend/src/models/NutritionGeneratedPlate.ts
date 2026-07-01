import mongoose, { InferSchemaType } from 'mongoose';
import { MEAL_SLOT_IDS } from '@comeup/domain';

const nutritionGeneratedPlateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, trim: true },
    mealSlot: { type: String, enum: MEAL_SLOT_IDS, required: true },
    prompt: { type: String, required: true },
    storageKey: { type: String, required: true, trim: true },
    mimeType: { type: String, default: 'image/png', trim: true },
  },
  { timestamps: true },
);

nutritionGeneratedPlateSchema.index({ userId: 1, date: 1, createdAt: -1 });

export type NutritionGeneratedPlateDocument = InferSchemaType<typeof nutritionGeneratedPlateSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const NutritionGeneratedPlate = mongoose.model(
  'NutritionGeneratedPlate',
  nutritionGeneratedPlateSchema,
);
