import type { FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';
import { z } from 'zod';
import { NutritionGeneratedPlate } from '../models/NutritionGeneratedPlate.js';
import { NutritionPlatePhoto } from '../models/NutritionPlatePhoto.js';
import { NutritionWeighLog } from '../models/NutritionWeighLog.js';
import {
  getActivePlanForUser,
  serializeNutritionPlan,
} from '../services/nutritionPlanService.js';
import {
  generateNutritionPlate,
  NutritionPlateError,
  serializeGeneratedPlate,
} from '../services/nutritionPlateGenerate.js';
import {
  deleteNutritionFile,
  guessMimeFromStorageKey,
  isAllowedNutritionMime,
  readNutritionFile,
  saveNutritionPhoto,
} from '../services/nutritionStorage.js';
import { MEAL_SLOT_IDS } from '@comeup/domain';
import { objectIdSchema, parseBody } from '../utils/schemas.js';

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const weighLogSchema = z.object({
  date: isoDateSchema,
  mealSlot: z.enum(MEAL_SLOT_IDS),
  foodName: z.string().min(1).max(200),
  weightGrams: z.number().min(1).max(10_000),
  note: z.string().max(500).optional(),
});

export const nutritionRoutes: FastifyPluginAsync = async (app) => {
  await app.register(multipart, {
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  });

  app.get('/nutrition/plan/active', { preHandler: [app.authenticate] }, async (request) => {
    const plan = await getActivePlanForUser(request.user.sub);
    return { plan: serializeNutritionPlan(plan) };
  });

  app.get('/nutrition/logs', { preHandler: [app.authenticate] }, async (request, reply) => {
    const query = parseBody(z.object({ date: isoDateSchema }), request.query);
    const logs = await NutritionWeighLog.find({ userId: request.user.sub, date: query.date }).sort({
      createdAt: 1,
    });
    return {
      logs: logs.map((log) => ({
        id: log._id.toString(),
        date: log.date,
        mealSlot: log.mealSlot,
        foodName: log.foodName,
        weightGrams: log.weightGrams,
        note: log.note,
        createdAt: log.createdAt?.toISOString(),
      })),
    };
  });

  app.post('/nutrition/logs', { preHandler: [app.authenticate] }, async (request, reply) => {
    const input = parseBody(weighLogSchema, request.body);
    const log = await NutritionWeighLog.create({ ...input, userId: request.user.sub });
    return reply.code(201).send({
      log: {
        id: log._id.toString(),
        date: log.date,
        mealSlot: log.mealSlot,
        foodName: log.foodName,
        weightGrams: log.weightGrams,
        note: log.note,
        createdAt: log.createdAt?.toISOString(),
      },
    });
  });

  app.delete('/nutrition/logs/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = parseBody(z.object({ id: objectIdSchema }), request.params);
    const deleted = await NutritionWeighLog.findOneAndDelete({
      _id: params.id,
      userId: request.user.sub,
    });
    if (!deleted) return reply.code(404).send({ message: 'Log not found' });
    return { ok: true };
  });

  app.get('/nutrition/logs/summary', { preHandler: [app.authenticate] }, async (request) => {
    const query = parseBody(
      z
        .object({ from: isoDateSchema, to: isoDateSchema })
        .refine((value) => value.from <= value.to, { message: 'from must be on or before to' }),
      request.query,
    );
    const rows = await NutritionWeighLog.find({
      userId: request.user.sub,
      date: { $gte: query.from, $lte: query.to },
    }).sort({ date: 1, createdAt: 1 });

    const byDate: Record<
      string,
      Array<{ mealSlot: string; foodName: string; weightGrams: number }>
    > = {};
    for (const row of rows) {
      (byDate[row.date] ??= []).push({
        mealSlot: row.mealSlot,
        foodName: row.foodName,
        weightGrams: row.weightGrams,
      });
    }

    const dailyTotals: Record<string, Record<string, number>> = {};
    for (const [date, entries] of Object.entries(byDate)) {
      const totals: Record<string, number> = {};
      for (const entry of entries) {
        totals[entry.foodName] = (totals[entry.foodName] ?? 0) + entry.weightGrams;
      }
      dailyTotals[date] = totals;
    }

    return { byDate, dailyTotals };
  });

  app.get('/nutrition/photos', { preHandler: [app.authenticate] }, async (request) => {
    const query = parseBody(z.object({ date: isoDateSchema.optional() }), request.query);
    const filter = query.date
      ? { userId: request.user.sub, date: query.date }
      : { userId: request.user.sub };
    const photos = await NutritionPlatePhoto.find(filter).sort({ createdAt: -1 }).limit(100);
    return {
      photos: photos.map((photo) => ({
        id: photo._id.toString(),
        date: photo.date,
        mealSlot: photo.mealSlot,
        caption: photo.caption,
        mimeType: photo.mimeType,
        url: `/api/v1/nutrition/media/${photo._id.toString()}`,
        createdAt: photo.createdAt?.toISOString(),
      })),
    };
  });

  app.post('/nutrition/photos', { preHandler: [app.authenticate] }, async (request, reply) => {
    const part = await request.file();
    if (!part) return reply.code(400).send({ message: 'file is required' });

    const date = part.fields.date;
    const mealSlot = part.fields.mealSlot;
    const captionField = part.fields.caption;

    const dateValue =
      typeof date === 'object' && date !== null && 'value' in date
        ? String(date.value)
        : undefined;
    const mealSlotValue =
      typeof mealSlot === 'object' && mealSlot !== null && 'value' in mealSlot
        ? String(mealSlot.value)
        : undefined;
    const captionValue =
      typeof captionField === 'object' && captionField !== null && 'value' in captionField
        ? String(captionField.value)
        : undefined;

    const parsed = weighLogSchema
      .pick({ date: true, mealSlot: true })
      .safeParse({ date: dateValue, mealSlot: mealSlotValue });
    if (!parsed.success) {
      return reply.code(400).send({ message: 'date and mealSlot are required' });
    }

    const mimeType = part.mimetype || 'application/octet-stream';
    if (!isAllowedNutritionMime(mimeType)) {
      return reply.code(400).send({ message: 'Unsupported image type' });
    }

    const buffer = await part.toBuffer();
    const storageKey = await saveNutritionPhoto({
      userId: request.user.sub,
      date: parsed.data.date,
      mealSlot: parsed.data.mealSlot,
      buffer,
      mimeType,
    });

    let photo;
    try {
      photo = await NutritionPlatePhoto.create({
        userId: request.user.sub,
        date: parsed.data.date,
        mealSlot: parsed.data.mealSlot,
        storageKey,
        mimeType,
        caption: captionValue?.slice(0, 500) ?? '',
      });
    } catch (error) {
      await deleteNutritionFile(storageKey).catch(() => undefined);
      throw error;
    }

    return reply.code(201).send({
      photo: {
        id: photo._id.toString(),
        date: photo.date,
        mealSlot: photo.mealSlot,
        caption: photo.caption,
        mimeType: photo.mimeType,
        url: `/api/v1/nutrition/media/${photo._id.toString()}`,
        createdAt: photo.createdAt?.toISOString(),
      },
    });
  });

  app.get('/nutrition/plates', { preHandler: [app.authenticate] }, async (request) => {
    const query = parseBody(z.object({ date: isoDateSchema.optional() }), request.query);
    const filter = query.date
      ? { userId: request.user.sub, date: query.date }
      : { userId: request.user.sub };
    const plates = await NutritionGeneratedPlate.find(filter).sort({ createdAt: -1 }).limit(50);
    return {
      plates: plates.map((plate) => serializeGeneratedPlate(plate)),
    };
  });

  app.post(
    '/nutrition/plates/generate',
    {
      preHandler: [app.authenticate],
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '15 minutes',
          hook: 'preHandler',
          keyGenerator: (request) => request.user.sub,
        },
      },
    },
    async (request, reply) => {
      const body = parseBody(
        z.object({ date: isoDateSchema, mealSlot: z.enum(MEAL_SLOT_IDS) }),
        request.body,
      );

      try {
        const plate = await generateNutritionPlate(request.user.sub, body.date, body.mealSlot);
        return reply.code(201).send({ plate: serializeGeneratedPlate(plate), prompt: plate.prompt });
      } catch (error) {
        if (error instanceof NutritionPlateError) {
          return reply.code(error.status).send({ message: error.message });
        }
        throw error;
      }
    },
  );

  app.get('/nutrition/media/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = parseBody(z.object({ id: objectIdSchema }), request.params);
    const photo = await NutritionPlatePhoto.findOne({ _id: params.id, userId: request.user.sub });
    if (!photo) return reply.code(404).send({ message: 'Photo not found' });

    try {
      const bytes = await readNutritionFile(photo.storageKey);
      return reply.type(photo.mimeType).send(bytes);
    } catch {
      return reply.code(404).send({ message: 'Photo file is missing' });
    }
  });

  app.get(
    '/nutrition/media/generated/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const params = parseBody(z.object({ id: objectIdSchema }), request.params);
      const plate = await NutritionGeneratedPlate.findOne({
        _id: params.id,
        userId: request.user.sub,
      });
      if (!plate) return reply.code(404).send({ message: 'Generated plate not found' });

      try {
        const bytes = await readNutritionFile(plate.storageKey);
        return reply.type(plate.mimeType || guessMimeFromStorageKey(plate.storageKey)).send(bytes);
      } catch {
        return reply.code(404).send({ message: 'Generated plate file is missing' });
      }
    },
  );
};
