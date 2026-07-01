import type { FastifyPluginAsync } from 'fastify';
import mongoose from 'mongoose';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
    const mongoConnected = mongoose.connection.readyState === 1;
    return {
      ok: mongoConnected,
      service: 'comeup-backend',
      mongo: mongoConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  });
};
