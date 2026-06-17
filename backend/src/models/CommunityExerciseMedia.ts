import mongoose, { InferSchemaType } from 'mongoose';

const communityExerciseMediaSchema = new mongoose.Schema(
  {
    exerciseKey: { type: String, required: true, trim: true, unique: true },
    exerciseName: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true, trim: true },
    contributedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export type CommunityExerciseMediaDocument = InferSchemaType<typeof communityExerciseMediaSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const CommunityExerciseMedia = mongoose.model('CommunityExerciseMedia', communityExerciseMediaSchema);
