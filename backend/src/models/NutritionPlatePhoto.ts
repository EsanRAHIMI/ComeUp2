import mongoose, { InferSchemaType } from 'mongoose';
import { MEAL_SLOT_IDS } from '../types/nutrition.js';

const nutritionPlatePhotoSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, trim: true },
    mealSlot: { type: String, enum: MEAL_SLOT_IDS, required: true },
    storageKey: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    caption: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

nutritionPlatePhotoSchema.index({ userId: 1, date: 1, createdAt: -1 });
nutritionPlatePhotoSchema.index({ userId: 1, mealSlot: 1, createdAt: -1 });

export type NutritionPlatePhotoDocument = InferSchemaType<typeof nutritionPlatePhotoSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const NutritionPlatePhoto = mongoose.model('NutritionPlatePhoto', nutritionPlatePhotoSchema);
