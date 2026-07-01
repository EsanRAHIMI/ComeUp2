import type { FastifyPluginAsync } from 'fastify';
import { isPlateImageGenConfigured } from '../services/nutritionPlateImage.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => ({
    ok: true,
    service: 'comeup-ai',
    gpt: Boolean(process.env.GPT_API_KEY?.trim()),
    plateImageGen: isPlateImageGenConfigured(),
    timestamp: new Date().toISOString(),
  }));
};
