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
    // --- Phase 3 additions: all optional, additive, no migration needed ---
    targetWeight: { type: Number, min: 25, max: 350 },
    goalDeadline: { type: Date },
    muscleFocus: [{ type: String, trim: true }],
    physicalLimitations: [{ type: String, trim: true }],
    nutritionPreference: {
      type: String,
      enum: ['no_preference', 'high_protein', 'low_carb', 'vegetarian', 'vegan', 'keto'],
    },
    supplements: [{ type: String, trim: true }],
    waterTargetMl: { type: Number, min: 250, max: 10_000 },
    walkingTarget: {
      type: new mongoose.Schema(
        {
          metric: { type: String, enum: ['steps', 'minutes', 'distanceKm'], required: true },
          value: { type: Number, min: 1, max: 100_000, required: true },
        },
        { _id: false },
      ),
      default: undefined,
    },
    /**
     * What happens when a scheduled workout is missed. Derived logic only
     * (services/dayStatus.ts) — stored Program.schedule dates are never mutated.
     * Existing users have no value stored; readers must fall back to 'shift'.
     */
    missedWorkoutBehavior: { type: String, enum: ['shift', 'skip'], default: 'shift' },
    fitnessLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner',
    },
    workoutDaysPerWeek: { type: Number, min: 1, max: 7, default: 3 },
    preferences: {
      voiceFeedback: { type: Boolean, default: false },
      formCorrection: { type: Boolean, default: false },
      notifications: { type: Boolean, default: false },
      autoRestTimer: { type: Boolean, default: true },
      defaultRestSeconds: { type: Number, min: 0, max: 900, default: 60 },
      preferredCamera: { type: String, enum: ['front', 'back'], default: 'front' },
      /** Three soft beeps in the final 3 s of rest (Train page). */
      restCountdownSound: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };
export const User = mongoose.model('User', userSchema);
