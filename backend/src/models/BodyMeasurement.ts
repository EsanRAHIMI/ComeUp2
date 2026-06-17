import mongoose, { InferSchemaType } from 'mongoose';

/** A point-in-time body metric entry for progress tracking (stored in Atlas). */
const bodyMeasurementSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    measuredAt: { type: Date, required: true, default: Date.now },
    weight: { type: Number, min: 25, max: 350 },
    bodyFat: { type: Number, min: 2, max: 70 },
    chest: { type: Number, min: 30, max: 200 },
    waist: { type: Number, min: 30, max: 200 },
    hips: { type: Number, min: 30, max: 200 },
    arms: { type: Number, min: 10, max: 100 },
    thighs: { type: Number, min: 20, max: 120 },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

bodyMeasurementSchema.index({ userId: 1, measuredAt: -1 });

export type BodyMeasurementDocument = InferSchemaType<typeof bodyMeasurementSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const BodyMeasurement = mongoose.model('BodyMeasurement', bodyMeasurementSchema);
