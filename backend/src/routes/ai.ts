import type { FastifyPluginAsync } from 'fastify';
import { env } from '../config/env.js';

async function callAiService(path: string, body: unknown) {
  const response = await fetch(`${env.AI_SERVICE_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.AI_SERVICE_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`AI service failed with ${response.status}`);
  }

  return response.json();
}

export const aiRoutes: FastifyPluginAsync = async (app) => {
  app.post('/ai/workouts/generate', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      return await callAiService('/workouts/generate', request.body);
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ message: 'AI service unavailable' });
    }
  });

  app.post('/ai/recommendations', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
      return await callAiService('/recommendations', request.body);
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ message: 'AI service unavailable' });
    }
  });
};
