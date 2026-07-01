import mongoose, { InferSchemaType } from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    age: { type: Number, min: 12, max: 100 },
    height: { type: Number, min: 80, max: 260 },
    weight: { type: Number, min: 25, max: 350 },
    gender: { type: String, enum: ['male', 'female', 'other', 'undisclosed'], default: 'undisclosed' },
    injuries: [{ type: String, trim: true }],
    availableEquipment: [{ type: String, trim: true }],
    // Preferred training weekdays, 0 (Sun) – 6 (Sat).
    preferredDays: [{ type: Number, min: 0, max: 6 }],
    sessionDuration: { type: Number, min: 20, max: 180, default: 60 },
    goal: {
      type: String,
      enum: ['Weight Loss', 'Muscle Gain', 'General Fitness', 'Strength'],
      default: 'General Fitness',
    },
    fitnessLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner',
    },
    workoutDaysPerWeek: { type: Number, min: 1, max: 7, default: 3 },
    preferences: {
      voiceFeedback: { type: Boolean, default: true },
      formCorrection: { type: Boolean, default: true },
      notifications: { type: Boolean, default: true },
      autoRestTimer: { type: Boolean, default: true },
      defaultRestSeconds: { type: Number, min: 0, max: 900, default: 60 },
      preferredCamera: { type: String, enum: ['front', 'back'], default: 'front' },
    },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };
export const User = mongoose.model('User', userSchema);
