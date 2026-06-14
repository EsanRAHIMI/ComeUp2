import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { healthRoutes } from './routes/health.js';
import { recommendationRoutes } from './routes/recommendations.js';
import { workoutRoutes } from './routes/workouts.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(helmet);
  await app.register(cors, { origin: false });

  app.addHook('preHandler', async (request, reply) => {
    if (request.url === '/health') return;
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (token !== env.AI_SERVICE_TOKEN) {
      return reply.code(401).send({ message: 'Unauthorized' });
    }
  });

  await app.register(healthRoutes);
  await app.register(workoutRoutes);
  await app.register(recommendationRoutes);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ message: 'Validation failed', issues: error.issues });
    }
    app.log.error(error);
    return reply.code(500).send({ message: 'Internal server error' });
  });

  return app;
}
