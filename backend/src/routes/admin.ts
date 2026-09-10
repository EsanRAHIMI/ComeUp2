import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { hardDeleteUserAccount } from '../services/accountDeletion.js';
import { CommunityExerciseMedia } from '../models/CommunityExerciseMedia.js';
import { ExerciseMedia } from '../models/ExerciseMedia.js';
import { Program } from '../models/Program.js';
import { User } from '../models/User.js';
import { WorkoutSession } from '../models/WorkoutSession.js';
import { publicUser } from '../utils/publicUser.js';
import { exerciseKey } from '../utils/exerciseKey.js';
import { buildAdminExerciseCatalog } from '../services/adminExerciseCatalog.js';
import { pickBestGif, searchExerciseMedia } from '../services/exerciseGifSearch.js';
import { objectIdSchema, parseBody } from '../utils/schemas.js';

const userPatchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
  goal: z.enum(['Weight Loss', 'Muscle Gain', 'General Fitness', 'Strength']).optional(),
  fitnessLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
  workoutDaysPerWeek: z.number().int().min(1).max(7).optional(),
  sessionDuration: z.number().int().min(20).max(180).optional(),
});

const userCreateSchema = userPatchSchema.extend({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(120),
  goal: z.enum(['Weight Loss', 'Muscle Gain', 'General Fitness', 'Strength']).default('General Fitness'),
  fitnessLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner'),
});

const programPatchSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(4000).optional(),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
  duration: z.number().int().min(1).max(300).optional(),
  daysPerWeek: z.number().int().min(1).max(7).optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

const communityMediaSchema = z.object({
  exerciseName: z.string().min(1).max(160),
  imageUrl: z.string().url().max(1200),
});

export const adminRoutes: FastifyPluginAsync = async (app) => {
  const guard = { preHandler: [app.requireAdmin] };

  app.get('/admin/overview', guard, async () => {
    const [users, programs, communityMedia, personalMedia, sessions, completedSessions] = await Promise.all([
      User.countDocuments(),
      Program.countDocuments(),
      CommunityExerciseMedia.countDocuments(),
      ExerciseMedia.countDocuments({ isOverride: true }),
      WorkoutSession.countDocuments(),
      WorkoutSession.countDocuments({ status: 'completed' }),
    ]);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const sessionsThisWeek = await WorkoutSession.countDocuments({
      status: 'completed',
      startTime: { $gte: weekAgo },
    });

    return {
      users,
      programs,
      communityMedia,
      personalMedia,
      sessions,
      completedSessions,
      sessionsThisWeek,
    };
  });

  app.get('/admin/users', guard, async (request) => {
    const q = String((request.query as { q?: string }).q ?? '').trim().toLowerCase();
    const filter = q
      ? {
          $or: [
            { email: { $regex: q, $options: 'i' } },
            { name: { $regex: q, $options: 'i' } },
          ],
        }
      : {};
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(200);
    return { users: users.map(publicUser) };
  });

  app.post('/admin/users', guard, async (request, reply) => {
    const input = parseBody(userCreateSchema, request.body);
    const existing = await User.exists({ email: input.email.toLowerCase() });
    if (existing) return reply.code(409).send({ message: 'Email already registered' });

    const { password, ...profile } = input;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      ...profile,
      email: input.email.toLowerCase(),
      passwordHash,
    });
    return reply.code(201).send({ user: publicUser(user) });
  });

  app.patch('/admin/users/:id', guard, async (request, reply) => {
    const params = parseBody(z.object({ id: objectIdSchema }), request.params);
    const patch = parseBody(userPatchSchema, request.body);
    const update: Record<string, unknown> = { ...patch };
    if (patch.email) update.email = patch.email.toLowerCase();

    const user = await User.findByIdAndUpdate(params.id, update, { new: true });
    if (!user) return reply.code(404).send({ message: 'User not found' });
    return { user: publicUser(user) };
  });

  app.delete('/admin/users/:id', guard, async (request, reply) => {
    const params = parseBody(z.object({ id: objectIdSchema }), request.params);
    const deleted = await hardDeleteUserAccount(params.id);
    if (!deleted) return reply.code(404).send({ message: 'User not found' });
    return reply.code(204).send();
  });

  app.get('/admin/programs', guard, async (request) => {
    const ownerId = (request.query as { ownerId?: string }).ownerId;
    const filter = ownerId ? { ownerId } : {};
    const programs = await Program.find(filter).sort({ updatedAt: -1 }).limit(300).populate('ownerId', 'name email');
    return {
      programs: programs.map((p) => {
        const doc = p.toObject();
        const owner = p.ownerId as { _id?: { toString(): string }; name?: string; email?: string } | null;
        return {
          ...doc,
          owner: owner && typeof owner === 'object' && owner.email
            ? { id: owner._id?.toString(), name: owner.name, email: owner.email }
            : null,
        };
      }),
    };
  });

  app.patch('/admin/programs/:id', guard, async (request, reply) => {
    const params = parseBody(z.object({ id: objectIdSchema }), request.params);
    const patch = parseBody(programPatchSchema, request.body);
    const program = await Program.findByIdAndUpdate(params.id, patch, { new: true });
    if (!program) return reply.code(404).send({ message: 'Program not found' });
    return { program };
  });

  app.delete('/admin/programs/:id', guard, async (request, reply) => {
    const params = parseBody(z.object({ id: objectIdSchema }), request.params);
    const program = await Program.findByIdAndDelete(params.id);
    if (!program) return reply.code(404).send({ message: 'Program not found' });
    return reply.code(204).send();
  });

  app.get('/admin/exercise-media', guard, async () => buildAdminExerciseCatalog());

  app.get('/admin/exercise-media/find-gif', guard, async (request, reply) => {
    const exerciseName = String((request.query as { exerciseName?: string }).exerciseName ?? '').trim();
    if (!exerciseName) return reply.code(400).send({ message: 'exerciseName is required' });
    const { candidates, hints } = await searchExerciseMedia(exerciseName);
    if (!candidates.length) {
      return reply.code(404).send({
        message: hints.join(' ') || 'No verified exercise media found. Try a different name or paste a URL manually.',
        candidates: [],
        hints,
      });
    }
    return { exerciseName, candidates, best: pickBestGif(candidates), hints };
  });

  app.post('/admin/exercise-media/community/auto-gif', guard, async (request, reply) => {
    const input = parseBody(z.object({ exerciseName: z.string().min(1).max(160) }), request.body);
    const { candidates, hints } = await searchExerciseMedia(input.exerciseName);
    const best = pickBestGif(candidates);
    if (!best) {
      return reply.code(404).send({
        message:
          candidates.length > 0
            ? 'No confident match for Auto. Open Find media to review options or paste a URL manually.'
            : hints.join(' ') || 'No verified exercise media found. Try Find media or paste a URL manually.',
        hints,
      });
    }
    const key = exerciseKey(input.exerciseName);
    const media = await CommunityExerciseMedia.findOneAndUpdate(
      { exerciseKey: key },
      {
        exerciseKey: key,
        exerciseName: input.exerciseName,
        imageUrl: best.url,
        contributedBy: request.user.sub,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return reply.code(201).send({ media, candidate: best });
  });

  app.post('/admin/exercise-media/community', guard, async (request, reply) => {
    const input = parseBody(communityMediaSchema, request.body);
    const key = exerciseKey(input.exerciseName);
    const media = await CommunityExerciseMedia.findOneAndUpdate(
      { exerciseKey: key },
      {
        exerciseKey: key,
        exerciseName: input.exerciseName,
        imageUrl: input.imageUrl,
        contributedBy: request.user.sub,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return reply.code(201).send({ media });
  });

  app.patch('/admin/exercise-media/community/:id', guard, async (request, reply) => {
    const params = parseBody(z.object({ id: objectIdSchema }), request.params);
    const input = parseBody(communityMediaSchema.partial(), request.body);
    const patch: Record<string, unknown> = { ...input };
    if (input.exerciseName) patch.exerciseKey = exerciseKey(input.exerciseName);

    const media = await CommunityExerciseMedia.findByIdAndUpdate(params.id, patch, { new: true });
    if (!media) return reply.code(404).send({ message: 'Community media not found' });
    return { media };
  });

  app.delete('/admin/exercise-media/community/:id', guard, async (request, reply) => {
    const params = parseBody(z.object({ id: objectIdSchema }), request.params);
    const media = await CommunityExerciseMedia.findByIdAndDelete(params.id);
    if (!media) return reply.code(404).send({ message: 'Community media not found' });
    return reply.code(204).send();
  });

  app.delete('/admin/exercise-media/personal/:id', guard, async (request, reply) => {
    const params = parseBody(z.object({ id: objectIdSchema }), request.params);
    const media = await ExerciseMedia.findByIdAndDelete(params.id);
    if (!media) return reply.code(404).send({ message: 'Personal media not found' });
    return reply.code(204).send();
  });

  app.get('/admin/sessions', guard, async (request) => {
    const query = request.query as { userId?: string; limit?: string };
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
    const filter = query.userId ? { userId: query.userId } : {};
    const sessions = await WorkoutSession.find(filter)
      .sort({ startTime: -1 })
      .limit(limit)
      .populate('userId', 'name email')
      .populate('programId', 'name');

    return {
      sessions: sessions.map((s) => ({
        id: s._id.toString(),
        user: s.userId,
        program: s.programId,
        status: s.status,
        startTime: s.startTime,
        endTime: s.endTime,
        totalDuration: s.totalDuration,
        caloriesBurned: s.caloriesBurned,
        averageFormScore: s.averageFormScore,
        exerciseCount: s.exercises?.length ?? 0,
      })),
    };
  });
};
