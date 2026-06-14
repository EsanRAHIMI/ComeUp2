import type { FastifyPluginAsync } from 'fastify';
import { createRecommendations, recommendationSchema } from '../services/recommendations.js';

export const recommendationRoutes: FastifyPluginAsync = async (app) => {
  app.post('/recommendations', async (request) => {
    const input = recommendationSchema.parse(request.body);
    return createRecommendations(input);
  });
};
