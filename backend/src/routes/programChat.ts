import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AiConversation } from '../models/AiConversation.js';
import { Program } from '../models/Program.js';
import { User } from '../models/User.js';
import { AiServiceError, callAiService } from '../services/aiClient.js';
import { consumeQuota, getQuota } from '../services/gptQuota.js';
import { normalizeGptProgram } from '../services/programNormalizer.js';
import { objectIdSchema, parseBody } from '../utils/schemas.js';

type GptReply = { reply: string; program: unknown };

type ProfileSource = {
  name?: string | null;
  gender?: string | null;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  goal?: string | null;
  fitnessLevel?: string | null;
  workoutDaysPerWeek?: number | null;
  injuries?: string[] | null;
  availableEquipment?: string[] | null;
  preferredDays?: number[] | null;
};

function buildProfile(user: ProfileSource) {
  return {
    name: user.name ?? undefined,
    gender: user.gender ?? undefined,
    age: user.age ?? undefined,
    height: user.height ?? undefined,
    weight: user.weight ?? undefined,
    goal: user.goal ?? undefined,
    fitnessLevel: user.fitnessLevel ?? undefined,
    workoutDaysPerWeek: user.workoutDaysPerWeek ?? undefined,
    injuries: user.injuries ?? [],
    availableEquipment: user.availableEquipment ?? [],
    preferredDays: user.preferredDays ?? [],
  };
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export const programChatRoutes: FastifyPluginAsync = async (app) => {
  // Current weekly quota.
  app.get('/ai/program-chat/quota', { preHandler: [app.authenticate] }, async (request) => ({
    quota: await getQuota(request.user.sub),
  }));

  // Start a new conversation (does not consume quota).
  app.post('/ai/program-chat/start', { preHandler: [app.authenticate] }, async (request, reply) => {
    const conversation = await AiConversation.create({
      userId: request.user.sub,
      messages: [],
      status: 'draft',
    });
    return reply.code(201).send({ conversation, quota: await getQuota(request.user.sub) });
  });

  // Fetch a conversation.
  app.get('/ai/program-chat/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = parseBody(z.object({ id: objectIdSchema }), request.params);
    const conversation = await AiConversation.findOne({ _id: params.id, userId: request.user.sub });
    if (!conversation) return reply.code(404).send({ message: 'Conversation not found' });
    return { conversation, quota: await getQuota(request.user.sub) };
  });

  // Send a message / correction. Enforces the weekly quota on every message.
  app.post('/ai/program-chat/:id/message', { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = parseBody(z.object({ id: objectIdSchema }), request.params);
    const body = parseBody(z.object({ content: z.string().min(1).max(2000) }), request.body);

    const conversation = await AiConversation.findOne({ _id: params.id, userId: request.user.sub });
    if (!conversation) return reply.code(404).send({ message: 'Conversation not found' });

    // Check quota BEFORE calling GPT; only consume on a successful generation.
    const quota = await getQuota(request.user.sub);
    if (quota.remaining <= 0) {
      return reply.code(429).send({ message: 'Weekly GPT limit reached', quota });
    }

    const user = await User.findById(request.user.sub);
    if (!user) return reply.code(404).send({ message: 'User not found' });

    const history = conversation.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    let result: GptReply;
    try {
      result = await callAiService<GptReply>('/program/generate', {
        profile: buildProfile(user),
        messages: [...history, { role: 'user', content: body.content }],
        currentDraft: conversation.draftProgram ?? undefined,
      });
    } catch (error) {
      if (error instanceof AiServiceError) {
        return reply.code(error.status === 503 ? 503 : 502).send({ message: error.message });
      }
      request.log.error(error);
      return reply.code(502).send({ message: 'GPT generation failed' });
    }

    const now = new Date();
    conversation.messages.push({ role: 'user', content: body.content, createdAt: now });
    conversation.messages.push({ role: 'assistant', content: result.reply, createdAt: now });
    conversation.draftProgram = result.program;
    conversation.status = 'draft';
    await conversation.save();

    const { quota: updatedQuota } = await consumeQuota(request.user.sub);
    return {
      reply: result.reply,
      draftProgram: result.program,
      messages: conversation.messages,
      quota: updatedQuota,
    };
  });

  // Convert the current draft into a saved Program.
  app.post('/ai/program-chat/:id/convert-to-program', { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = parseBody(z.object({ id: objectIdSchema }), request.params);
    const body = parseBody(
      z.object({
        startDate: z.string().min(10).optional(),
        workoutTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        weeks: z.number().int().min(1).max(24).optional(),
        activate: z.boolean().optional(),
      }),
      request.body ?? {},
    );

    const conversation = await AiConversation.findOne({ _id: params.id, userId: request.user.sub });
    if (!conversation) return reply.code(404).send({ message: 'Conversation not found' });
    if (!conversation.draftProgram) {
      return reply.code(400).send({ message: 'No draft program to convert yet' });
    }

    const user = await User.findById(request.user.sub);
    const programInput = normalizeGptProgram(conversation.draftProgram, {
      startDate: body.startDate ?? todayDate(),
      workoutTime: body.workoutTime ?? '18:00',
      weeks: body.weeks ?? 8,
      preferredDays: user?.preferredDays ?? undefined,
    });

    const program = await Program.create({ ...programInput, ownerId: request.user.sub });

    if (body.activate) {
      await Program.updateMany({ ownerId: request.user.sub }, { isActive: false });
      program.isActive = true;
      await program.save();
    }

    conversation.status = 'saved';
    conversation.generatedProgramId = program._id;
    await conversation.save();

    return reply.code(201).send({ program });
  });
};
