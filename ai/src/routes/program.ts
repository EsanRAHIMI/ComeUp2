import type { FastifyPluginAsync } from 'fastify';
import { GptError, generateGptProgram, programGenerateSchema } from '../services/gptProgram.js';

export const programRoutes: FastifyPluginAsync = async (app) => {
  app.post('/program/generate', async (request, reply) => {
    const input = programGenerateSchema.parse(request.body);
    try {
      const result = await generateGptProgram(input);
      return result;
    } catch (error) {
      if (error instanceof GptError) {
        return reply.code(error.status).send({ message: error.message });
      }
      request.log.error(error);
      return reply.code(502).send({ message: 'GPT generation failed' });
    }
  });
};
