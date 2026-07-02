import mongoose, { InferSchemaType } from 'mongoose';

/** Daily nutrition habits — water, supplements, drinks. One doc per user/day. */
const drinkSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    amountMl: { type: Number, min: 0, max: 5000 },
    note: { type: String, default: '', maxlength: 200 },
  },
  { _id: false },
);

const habitLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    waterMl: { type: Number, min: 0, max: 20_000, default: 0 },
    supplementsTaken: { type: [String], default: [] },
    drinks: { type: [drinkSchema], default: [] },
    note: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true },
);

habitLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export type HabitLogDocument = InferSchemaType<typeof habitLogSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const HabitLog = mongoose.model('HabitLog', habitLogSchema);
