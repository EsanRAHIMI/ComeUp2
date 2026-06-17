import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AiConversation } from '../models/AiConversation.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { AiServiceError, callAiService } from '../services/aiClient.js';
import { consumeQuota, getQuota } from '../services/gptQuota.js';
import {
  buildQuickGeneratePrompt,
  mergeProfile,
  type QuickGenerateOverrides,
} from '../services/gptShared.js';
import { parseBody } from '../utils/schemas.js';

type GptReply = { reply: string; program: unknown };

async function callLegacyAiService(path: string, body: unknown) {
  const response = await fetch(`${env.AI_SERVICE_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.AI_SERVICE_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`AI service failed with ${response.status}`);
  }

  return response.json();
}

const quickGenerateSchema = z.object({
  goal: z.enum(['Weight Loss', 'Muscle Gain', 'General Fitness', 'Strength']).optional(),
  fitnessLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
  duration: z.number().int().min(20).max(180).optional(),
  equipment: z.array(z.string()).optional(),
  focusAreas: z.array(z.string()).optional(),
  daysPerWeek: z.number().int().min(1).max(7).optional(),
  notes: z.string().max(500).optional(),
});

export const aiRoutes: FastifyPluginAsync = async (app) => {
  // GPT-powered quick generate — shares the weekly GPT quota with program-chat.
  app.post('/ai/workouts/generate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = parseBody(quickGenerateSchema, request.body ?? {});

    const quota = await getQuota(request.user.sub);
    if (quota.remaining <= 0) {
      return reply.code(429).send({ message: 'Weekly AI limit reached (5 per week)', quota });
    }

    const user = await User.findById(request.user.sub);
    if (!user) return reply.code(404).send({ message: 'User not found' });

    const overrides: QuickGenerateOverrides = body;
    const profile = mergeProfile(user, overrides);
    const prompt = buildQuickGeneratePrompt(overrides, profile);

    let result: GptReply;
    try {
      result = await callAiService<GptReply>('/program/generate', {
        profile,
        messages: [{ role: 'user', content: prompt }],
      });
    } catch (error) {
      if (error instanceof AiServiceError) {
        const status = error.status === 503 || error.status === 504 ? error.status : 502;
        return reply.code(status).send({ message: error.message, quota });
      }
      request.log.error(error);
      return reply.code(502).send({ message: 'AI program generation failed', quota });
    }

    const now = new Date();
    const conversation = await AiConversation.create({
      userId: request.user.sub,
      messages: [
        { role: 'user', content: prompt, createdAt: now },
        { role: 'assistant', content: result.reply, createdAt: now },
      ],
      draftProgram: result.program,
      status: 'draft',
    });

    const { quota: updatedQuota } = await consumeQuota(request.user.sub);

    return {
      reply: result.reply,
      draftProgram: result.program,
      conversationId: conversation._id,
      quota: updatedQuota,
    };
  });

  app.post('/ai/recommendations', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      return await callLegacyAiService('/recommendations', request.body);
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ message: 'AI service unavailable' });
    }
  });
};
