import type { FastifyPluginAsync } from 'fastify';
import mongoose from 'mongoose';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => ({
    ok: true,
    service: 'comeup-backend',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  }));
};
