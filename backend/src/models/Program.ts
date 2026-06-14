import mongoose, { InferSchemaType } from 'mongoose';

const exerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sets: { type: Number, required: true, min: 1, max: 20 },
    reps: { type: Number, required: true, min: 1, max: 300 },
    restTime: { type: Number, required: true, min: 0, max: 900 },
    instructions: { type: String, default: '' },
    muscleGroups: [{ type: String, trim: true }],
    videoUrl: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
    equipment: [{ type: String, trim: true }],
    category: { type: String, enum: ['Strength', 'Cardio', 'Flexibility', 'Balance'], default: 'Strength' },
    trackingType: { type: String, enum: ['reps', 'time'], default: 'reps' },
  },
  { _id: true },
);

const programSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
    duration: { type: Number, min: 1, default: 30 },
    exercises: { type: [exerciseSchema], default: [] },
    daysPerWeek: { type: Number, min: 1, max: 7, default: 3 },
    isActive: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: false },
    shareCode: { type: String, unique: true, sparse: true },
    tags: [{ type: String, trim: true }],
    totalCalories: { type: Number, default: 0 },
  },
  { timestamps: true },
);

programSchema.index({ ownerId: 1, isActive: 1 });
programSchema.index({ isPublic: 1, tags: 1 });

export type ProgramDocument = InferSchemaType<typeof programSchema> & { _id: mongoose.Types.ObjectId };
export const Program = mongoose.model('Program', programSchema);
