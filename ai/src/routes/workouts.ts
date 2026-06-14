import type { FastifyPluginAsync } from 'fastify';
import { generateWorkout, workoutGenerationSchema } from '../services/workoutGenerator.js';

export const workoutRoutes: FastifyPluginAsync = async (app) => {
  app.post('/workouts/generate', async (request) => {
    const input = workoutGenerationSchema.parse(request.body);
    return { program: generateWorkout(input) };
  });
};
