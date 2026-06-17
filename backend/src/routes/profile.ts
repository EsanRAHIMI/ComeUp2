import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { User } from '../models/User.js';
import { publicUser } from '../utils/publicUser.js';
import { parseBody } from '../utils/schemas.js';

const profileUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  age: z.number().int().min(12).max(100).optional(),
  height: z.number().min(80).max(260).optional(),
  weight: z.number().min(25).max(350).optional(),
  gender: z.enum(['male', 'female', 'other', 'undisclosed']).optional(),
  injuries: z.array(z.string().max(80)).max(20).optional(),
  availableEquipment: z.array(z.string().max(40)).max(30).optional(),
  preferredDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  sessionDuration: z.number().int().min(20).max(180).optional(),
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
    return { user: publicUser(user) };
  });
};
