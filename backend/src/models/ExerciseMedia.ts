import mongoose, { InferSchemaType } from 'mongoose';

const exerciseMediaSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    exerciseKey: { type: String, required: true, trim: true },
    exerciseName: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true, trim: true },
    /** True when the user chose a different image than the shared community default. */
    isOverride: { type: Boolean, default: true },
  },
  { timestamps: true },
);

exerciseMediaSchema.index({ ownerId: 1, exerciseKey: 1 }, { unique: true });

export type ExerciseMediaDocument = InferSchemaType<typeof exerciseMediaSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ExerciseMedia = mongoose.model('ExerciseMedia', exerciseMediaSchema);
