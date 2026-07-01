import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { corsOrigins } from './config/env.js';
import { authPlugin } from './plugins/auth.js';
import { adminRoutes } from './routes/admin.js';
import { aiRoutes } from './routes/ai.js';
import { authRoutes } from './routes/auth.js';
import { exerciseMediaRoutes } from './routes/exerciseMedia.js';
import { healthRoutes } from './routes/health.js';
import { measurementRoutes } from './routes/measurements.js';
import { nutritionRoutes } from './routes/nutrition.js';
import { profileRoutes } from './routes/profile.js';
import { programChatRoutes } from './routes/programChat.js';
import { programRoutes } from './routes/programs.js';
import { reportRoutes } from './routes/reports.js';
import { sessionRoutes } from './routes/sessions.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(helmet);
  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  await app.register(authPlugin);

  await app.register(healthRoutes);
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api/v1' });
  await app.register(exerciseMediaRoutes, { prefix: '/api/v1' });
  await app.register(profileRoutes, { prefix: '/api/v1' });
  await app.register(programRoutes, { prefix: '/api/v1' });
  await app.register(programChatRoutes, { prefix: '/api/v1' });
  await app.register(reportRoutes, { prefix: '/api/v1' });
  await app.register(measurementRoutes, { prefix: '/api/v1' });
  await app.register(nutritionRoutes, { prefix: '/api/v1' });
  await app.register(sessionRoutes, { prefix: '/api/v1' });
  await app.register(aiRoutes, { prefix: '/api/v1' });
  await app.register(adminRoutes, { prefix: '/api/v1' });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ message: 'Validation failed', issues: error.issues });
    }
    if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
      return reply.code(413).send({ message: 'File too large — maximum 8 MB.' });
    }
    app.log.error(error);
    return reply.code(500).send({ message: 'Internal server error' });
  });

  return app;
}
