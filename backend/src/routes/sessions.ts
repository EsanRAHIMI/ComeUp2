import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Program } from '../models/Program.js';
import { WorkoutSession } from '../models/WorkoutSession.js';
import { objectIdSchema, parseBody } from '../utils/schemas.js';

const completeSessionSchema = z.object({
  endTime: z.string().datetime().optional(),
  exercises: z.array(z.any()).default([]),
  totalDuration: z.number().int().min(0).default(0),
  caloriesBurned: z.number().int().min(0).default(0),
  averageFormScore: z.number().min(0).max(100).default(0),
});

export const sessionRoutes: FastifyPluginAsync = async (app) => {
  app.post('/sessions/start', { preHandler: [app.authenticate] }, async (request, reply) => {
    const input = parseBody(z.object({ programId: objectIdSchema }), request.body);
    const program = await Program.findOne({ _id: input.programId, ownerId: request.user.sub });
    if (!program) return reply.code(404).send({ message: 'Program not found' });

    const session = await WorkoutSession.create({
      userId: request.user.sub,
      programId: program._id,
      exercises: program.exercises.map((exercise) => ({
        exerciseId: exercise._id?.toString(),
        exerciseName: exercise.name,
        sets: [],
        formScores: [],
      })),
    });

    return reply.code(201).send({ session });
  });

  app.patch('/sessions/:id/complete', { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = parseBody(z.object({ id: objectIdSchema }), request.params);
    const input = parseBody(completeSessionSchema, request.body);
    const session = await WorkoutSession.findOneAndUpdate(
      { _id: params.id, userId: request.user.sub },
      { ...input, endTime: input.endTime ? new Date(input.endTime) : new Date(), status: 'completed' },
      { new: true },
    );
    if (!session) return reply.code(404).send({ message: 'Session not found' });
    return { session };
  });

  app.get('/sessions', { preHandler: [app.authenticate] }, async (request) => ({
    sessions: await WorkoutSession.find({ userId: request.user.sub }).sort({ startTime: -1 }).limit(50),
  }));
};
