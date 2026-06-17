import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { parseBody } from '../utils/schemas.js';

const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(120),
  goal: z.enum(['Weight Loss', 'Muscle Gain', 'General Fitness', 'Strength']).optional(),
  fitnessLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
  gender: z.enum(['male', 'female', 'other', 'undisclosed']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function publicUser(user: any) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    age: user.age,
    height: user.height,
    weight: user.weight,
    gender: user.gender,
    injuries: user.injuries ?? [],
    availableEquipment: user.availableEquipment ?? [],
    preferredDays: user.preferredDays ?? [],
    goal: user.goal,
    fitnessLevel: user.fitnessLevel,
    workoutDaysPerWeek: user.workoutDaysPerWeek,
    preferences: user.preferences,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/register', async (request, reply) => {
    const input = parseBody(registerSchema, request.body);
    const existing = await User.exists({ email: input.email.toLowerCase() });
    if (existing) {
      return reply.code(409).send({ message: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await User.create({ ...input, email: input.email.toLowerCase(), passwordHash });
    const token = app.jwt.sign({ sub: user._id.toString(), email: user.email });

    return reply.code(201).send({ token, user: publicUser(user) });
  });

  app.post('/auth/login', async (request, reply) => {
    const input = parseBody(loginSchema, request.body);
    const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return reply.code(401).send({ message: 'Invalid email or password' });
    }

    const token = app.jwt.sign({ sub: user._id.toString(), email: user.email });
    return { token, user: publicUser(user) };
  });

  app.get('/auth/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = await User.findById(request.user.sub);
    if (!user) return reply.code(404).send({ message: 'User not found' });
    return { user: publicUser(user) };
  });
};
