import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getResolvedExerciseMedia, upsertExerciseImage } from '../services/exerciseMediaResolver.js';
import { parseBody } from '../utils/schemas.js';

const upsertExerciseMediaSchema = z.object({
  exerciseName: z.string().min(1).max(160),
  imageUrl: z.string().url().max(1200),
});

export const exerciseMediaRoutes: FastifyPluginAsync = async (app) => {
  app.get('/exercise-media', { preHandler: [app.authenticate] }, async (request) => ({
    media: await getResolvedExerciseMedia(request.user.sub),
  }));

  app.put('/exercise-media', { preHandler: [app.authenticate] }, async (request) => {
    const input = parseBody(upsertExerciseMediaSchema, request.body);
    const media = await upsertExerciseImage(request.user.sub, input.exerciseName, input.imageUrl);
    return { media };
  });
};
