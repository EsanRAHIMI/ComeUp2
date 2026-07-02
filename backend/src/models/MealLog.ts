import mongoose, { InferSchemaType } from 'mongoose';
import { MEAL_SLOT_IDS } from '@comeup/domain';

/**
 * One meal confirmation per user/date/slot (upserted — quick actions replace
 * the previous status instead of duplicating). Supports both one-tap statuses
 * and optional detailed macros. Coexists with the legacy NutritionWeighLog.
 */
const mealLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    mealSlot: { type: String, enum: MEAL_SLOT_IDS, required: true },
    status: {
      type: String,
      enum: ['done', 'heavier', 'lighter', 'off_plan', 'skipped'],
      required: true,
    },
    proteinG: { type: Number, min: 0, max: 500 },
    carbsG: { type: Number, min: 0, max: 1000 },
    fatG: { type: Number, min: 0, max: 400 },
    grams: { type: Number, min: 0, max: 10_000 },
    note: { type: String, default: '', maxlength: 500 },
    loggedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

mealLogSchema.index({ userId: 1, date: 1, mealSlot: 1 }, { unique: true });

export type MealLogDocument = InferSchemaType<typeof mealLogSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const MealLog = mongoose.model('MealLog', mealLogSchema);
