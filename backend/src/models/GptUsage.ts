import mongoose, { InferSchemaType } from 'mongoose';

/**
 * Per-user weekly GPT quota. Source of truth for the 5-messages-per-week limit.
 * One document per user; the count resets when a new ISO week starts.
 */
const gptUsageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    weekStartDate: { type: Date, required: true },
    messageCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

export type GptUsageDocument = InferSchemaType<typeof gptUsageSchema> & { _id: mongoose.Types.ObjectId };
export const GptUsage = mongoose.model('GptUsage', gptUsageSchema);
