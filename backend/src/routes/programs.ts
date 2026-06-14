import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Program } from '../models/Program.js';
import { createShareCode } from '../services/shareCodes.js';
import { objectIdSchema, parseBody, programInputSchema } from '../utils/schemas.js';

export const programRoutes: FastifyPluginAsync = async (app) => {
  app.get('/programs', { preHandler: [app.authenticate] }, async (request) => {
    return {
      programs: await Program.find({ ownerId: request.user.sub }).sort({ updatedAt: -1 }),
    };
  });

  app.post('/programs', { preHandler: [app.authenticate] }, async (request, reply) => {
    const input = parseBody(programInputSchema, request.body);
    const program = await Program.create({ ...input, ownerId: request.user.sub });
    return reply.code(201).send({ program });
  });

  app.get('/programs/active', { preHandler: [app.authenticate] }, async (request, reply) => {
    const program = await Program.findOne({ ownerId: request.user.sub, isActive: true });
    if (!program) return reply.code(404).send({ message: 'No active program' });
    return { program };
  });

  app.patch('/programs/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = parseBody(z.object({ id: objectIdSchema }), request.params);
    const input = parseBody(programInputSchema.partial(), request.body);
    const program = await Program.findOneAndUpdate(
      { _id: params.id, ownerId: request.user.sub },
      input,
      { new: true },
    );
    if (!program) return reply.code(404).send({ message: 'Program not found' });
    return { program };
  });

  app.post('/programs/:id/activate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = parseBody(z.object({ id: objectIdSchema }), request.params);
    const program = await Program.findOne({ _id: params.id, ownerId: request.user.sub });
    if (!program) return reply.code(404).send({ message: 'Program not found' });

    await Program.updateMany({ ownerId: request.user.sub }, { isActive: false });
    program.isActive = true;
    await program.save();
    return { program };
  });

  app.delete('/programs/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = parseBody(z.object({ id: objectIdSchema }), request.params);
    const result = await Program.deleteOne({ _id: params.id, ownerId: request.user.sub });
    if (!result.deletedCount) return reply.code(404).send({ message: 'Program not found' });
    return reply.code(204).send();
  });

  app.post('/programs/:id/share', { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = parseBody(z.object({ id: objectIdSchema }), request.params);
    const program = await Program.findOne({ _id: params.id, ownerId: request.user.sub });
    if (!program) return reply.code(404).send({ message: 'Program not found' });

    program.isPublic = true;
    program.shareCode = program.shareCode || createShareCode();
    await program.save();
    return { shareCode: program.shareCode, program };
  });

  app.post('/programs/import/:shareCode', { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = parseBody(z.object({ shareCode: z.string().min(3) }), request.params);
    const publicProgram = await Program.findOne({ shareCode: params.shareCode.toUpperCase(), isPublic: true });
    if (!publicProgram) return reply.code(404).send({ message: 'Shared program not found' });

    const program = await Program.create({
      ownerId: request.user.sub,
      name: publicProgram.name,
      description: publicProgram.description,
      difficulty: publicProgram.difficulty,
      duration: publicProgram.duration,
      exercises: publicProgram.exercises,
      daysPerWeek: publicProgram.daysPerWeek,
      tags: publicProgram.tags,
      totalCalories: publicProgram.totalCalories,
      isActive: false,
      isPublic: false,
    });
    return reply.code(201).send({ program });
  });
};
