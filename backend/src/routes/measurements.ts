import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { BodyMeasurement } from '../models/BodyMeasurement.js';
import { objectIdSchema, parseBody } from '../utils/schemas.js';

const measurementSchema = z.object({
  measuredAt: z.string().datetime().optional(),
  weight: z.number().min(25).max(350).optional(),
  bodyFat: z.number().min(2).max(70).optional(),
  chest: z.number().min(30).max(200).optional(),
  waist: z.number().min(30).max(200).optional(),
  hips: z.number().min(30).max(200).optional(),
  arms: z.number().min(10).max(100).optional(),
  thighs: z.number().min(20).max(120).optional(),
  notes: z.string().max(500).optional(),
});

export const measurementRoutes: FastifyPluginAsync = async (app) => {
  app.get('/measurements', { preHandler: [app.authenticate] }, async (request) => ({
    measurements: await BodyMeasurement.find({ userId: request.user.sub }).sort({ measuredAt: -1 }).limit(200),
  }));

  app.post('/measurements', { preHandler: [app.authenticate] }, async (request, reply) => {
    const input = parseBody(measurementSchema, request.body);
    const measurement = await BodyMeasurement.create({
      ...input,
      measuredAt: input.measuredAt ? new Date(input.measuredAt) : new Date(),
      userId: request.user.sub,
    });
    return reply.code(201).send({ measurement });
  });

  app.delete('/measurements/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = parseBody(z.object({ id: objectIdSchema }), request.params);
    const result = await BodyMeasurement.deleteOne({ _id: params.id, userId: request.user.sub });
    if (!result.deletedCount) return reply.code(404).send({ message: 'Measurement not found' });
    return reply.code(204).send();
  });
};
