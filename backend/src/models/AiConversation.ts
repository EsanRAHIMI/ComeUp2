import mongoose, { InferSchemaType } from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['system', 'user', 'assistant'], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

/**
 * A GPT program-building conversation. Holds the full message history and the
 * latest generated draft program (stored in Atlas, reviewed before saving).
 */
const aiConversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'Personalized program' },
    messages: { type: [messageSchema], default: [] },
    // The structured draft returned by GPT (our Program shape, not yet persisted as a Program).
    draftProgram: { type: mongoose.Schema.Types.Mixed, default: null },
    status: { type: String, enum: ['draft', 'converted', 'saved'], default: 'draft' },
    generatedProgramId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', default: null },
  },
  { timestamps: true },
);

aiConversationSchema.index({ userId: 1, updatedAt: -1 });

export type AiConversationDocument = InferSchemaType<typeof aiConversationSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const AiConversation = mongoose.model('AiConversation', aiConversationSchema);
