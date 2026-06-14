import mongoose, { InferSchemaType } from 'mongoose';

const setSessionSchema = new mongoose.Schema(
  {
    setNumber: { type: Number, required: true },
    repsCompleted: { type: Number, default: 0 },
    weight: { type: Number },
    restTime: { type: Number, default: 0 },
    formScore: { type: Number, min: 0, max: 100, default: 0 },
    completedAt: { type: Date },
  },
  { _id: false },
);

const exerciseSessionSchema = new mongoose.Schema(
  {
    exerciseId: { type: String, required: true },
    exerciseName: { type: String, required: true },
    sets: { type: [setSessionSchema], default: [] },
    formScores: [{ type: Number, min: 0, max: 100 }],
    notes: { type: String, default: '' },
  },
  { _id: false },
);

const workoutSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date },
    exercises: { type: [exerciseSessionSchema], default: [] },
    totalDuration: { type: Number, default: 0 },
    caloriesBurned: { type: Number, default: 0 },
    averageFormScore: { type: Number, min: 0, max: 100, default: 0 },
    status: { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
  },
  { timestamps: true },
);

export type WorkoutSessionDocument = InferSchemaType<typeof workoutSessionSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const WorkoutSession = mongoose.model('WorkoutSession', workoutSessionSchema);
