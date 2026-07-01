import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { requestPasswordReset, resetPasswordWithToken } from '../services/passwordReset.js';
import { publicUser } from '../utils/publicUser.js';
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

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

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

  app.post(
    '/auth/forgot-password',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
        },
      },
    },
    async (request) => {
      const input = parseBody(forgotPasswordSchema, request.body);
      try {
        await requestPasswordReset(input.email);
      } catch (error) {
        request.log.error({ err: error }, 'Failed to send password reset email');
      }
      return {
        message:
          'If an account exists for that email, we sent a link to reset your password.',
      };
    },
  );

  app.post('/auth/reset-password', async (request, reply) => {
    const input = parseBody(resetPasswordSchema, request.body);
    try {
      await resetPasswordWithToken(input.token, input.password);
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_OR_EXPIRED_TOKEN') {
        return reply.code(400).send({
          message: 'Invalid or expired reset link. Please request a new one.',
        });
      }
      throw error;
    }
    return { message: 'Password updated. You can sign in with your new password.' };
  });
};
