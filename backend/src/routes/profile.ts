import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { User } from '../models/User.js';
import { parseBody } from '../utils/schemas.js';

const profileUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  age: z.number().int().min(12).max(100).optional(),
  height: z.number().min(80).max(260).optional(),
  weight: z.number().min(25).max(350).optional(),
  goal: z.enum(['Weight Loss', 'Muscle Gain', 'General Fitness', 'Strength']).optional(),
  fitnessLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
  workoutDaysPerWeek: z.number().int().min(1).max(7).optional(),
  preferences: z
    .object({
      voiceFeedback: z.boolean().optional(),
      formCorrection: z.boolean().optional(),
      notifications: z.boolean().optional(),
      autoRestTimer: z.boolean().optional(),
      preferredCamera: z.enum(['front', 'back']).optional(),
    })
    .optional(),
});

export const profileRoutes: FastifyPluginAsync = async (app) => {
  app.patch('/profile', { preHandler: [app.authenticate] }, async (request, reply) => {
    const input = parseBody(profileUpdateSchema, request.body);
    const user = await User.findByIdAndUpdate(request.user.sub, input, { new: true });
    if (!user) return reply.code(404).send({ message: 'User not found' });
    return { user };
  });
};
