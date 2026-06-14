import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ExerciseMedia } from '../models/ExerciseMedia.js';
import { parseBody } from '../utils/schemas.js';

const upsertExerciseMediaSchema = z.object({
  exerciseName: z.string().min(1).max(160),
  imageUrl: z.string().url().max(1200),
});

function exerciseKey(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, '-').replace(/^-|-$/g, '');
}

export const exerciseMediaRoutes: FastifyPluginAsync = async (app) => {
  app.get('/exercise-media', { preHandler: [app.authenticate] }, async (request) => {
    return {
      media: await ExerciseMedia.find({ ownerId: request.user.sub }).sort({ exerciseName: 1 }),
    };
  });

  app.put('/exercise-media', { preHandler: [app.authenticate] }, async (request) => {
    const input = parseBody(upsertExerciseMediaSchema, request.body);
    const media = await ExerciseMedia.findOneAndUpdate(
      { ownerId: request.user.sub, exerciseKey: exerciseKey(input.exerciseName) },
      {
        ownerId: request.user.sub,
        exerciseKey: exerciseKey(input.exerciseName),
        exerciseName: input.exerciseName,
        imageUrl: input.imageUrl,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return { media };
  });
};
