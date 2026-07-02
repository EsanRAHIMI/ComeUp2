import type { FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';
import { z } from 'zod';
import { HabitLog } from '../models/HabitLog.js';
import { MealLog } from '../models/MealLog.js';
import { NutritionGeneratedPlate } from '../models/NutritionGeneratedPlate.js';
import { NutritionPlatePhoto } from '../models/NutritionPlatePhoto.js';
import { NutritionTarget } from '../models/NutritionTarget.js';
import { NutritionWeighLog } from '../models/NutritionWeighLog.js';
import { User } from '../models/User.js';
import { scoreDay, summarizeRange, type ScoreTargetInput } from '../services/nutritionScore.js';
import { generateNutritionTarget } from '../services/nutritionTargetEngine.js';
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

const gramRangeSchema = z
  .object({ min: z.number().min(0).max(2000), max: z.number().min(0).max(2000) })
  .refine((r) => r.min <= r.max, { message: 'min must be <= max' });

const targetMealSlotSchema = z.object({
  mealSlot: z.enum(MEAL_SLOT_IDS),
  label: z.string().min(1).max(60),
  proteinGRange: gramRangeSchema,
  carbsGRange: gramRangeSchema,
  fatGRange: gramRangeSchema,
  caloriesEstimate: z.number().min(0).max(3000).optional(),
  timingNote: z.string().max(200).optional(),
  guidanceNote: z.string().max(200).optional(),
});

const targetPatchSchema = z.object({
  dailyProteinG: z.number().min(0).max(500).optional(),
  dailyCarbsG: z.number().min(0).max(1000).optional(),
  dailyFatG: z.number().min(0).max(400).optional(),
  dailyCaloriesEstimate: z.number().min(0).max(10_000).nullable().optional(),
  waterTargetMl: z.number().int().min(250).max(10_000).optional(),
  mealSlots: z.array(targetMealSlotSchema).min(1).max(8).optional(),
  supplementPlan: z
    .array(z.object({ name: z.string().min(1).max(60), timingNote: z.string().max(200).optional() }))
    .max(20)
    .optional(),
  timingNotes: z.array(z.string().max(300)).max(10).optional(),
});

const mealLogUpsertSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealSlot: z.enum(MEAL_SLOT_IDS),
  status: z.enum(['done', 'heavier', 'lighter', 'off_plan', 'skipped']),
  proteinG: z.number().min(0).max(500).optional(),
  carbsG: z.number().min(0).max(1000).optional(),
  fatG: z.number().min(0).max(400).optional(),
  grams: z.number().min(0).max(10_000).optional(),
  note: z.string().max(500).optional(),
});

const habitPutSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  waterMl: z.number().int().min(0).max(20_000).optional(),
  supplementsTaken: z.array(z.string().max(60)).max(30).optional(),
  drinks: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        amountMl: z.number().min(0).max(5000).optional(),
        note: z.string().max(200).optional(),
      }),
    )
    .max(20)
    .optional(),
  note: z.string().max(500).optional(),
});

function serializeTarget(doc: any) {
  return {
    id: doc._id.toString(),
    status: doc.status,
    source: doc.source,
    goalSnapshot: doc.goalSnapshot,
    dailyCaloriesEstimate: doc.dailyCaloriesEstimate ?? null,
    dailyProteinG: doc.dailyProteinG,
    dailyCarbsG: doc.dailyCarbsG,
    dailyFatG: doc.dailyFatG,
    waterTargetMl: doc.waterTargetMl,
    mealSlots: doc.mealSlots,
    supplementPlan: doc.supplementPlan ?? [],
    timingNotes: doc.timingNotes ?? [],
    missingInputs: doc.missingInputs ?? [],
    confidence: doc.confidence,
    createdAt: doc.createdAt?.toISOString(),
    updatedAt: doc.updatedAt?.toISOString(),
  };
}

function serializeMealLog(doc: any) {
  return {
    id: doc._id.toString(),
    date: doc.date,
    mealSlot: doc.mealSlot,
    status: doc.status,
    proteinG: doc.proteinG ?? null,
    carbsG: doc.carbsG ?? null,
    fatG: doc.fatG ?? null,
    grams: doc.grams ?? null,
    note: doc.note ?? '',
    loggedAt: doc.loggedAt?.toISOString(),
  };
}

function serializeHabit(doc: any) {
  return {
    id: doc._id.toString(),
    date: doc.date,
    waterMl: doc.waterMl ?? 0,
    supplementsTaken: doc.supplementsTaken ?? [],
    drinks: doc.drinks ?? [],
    note: doc.note ?? '',
  };
}

function targetToScoreInput(doc: any): ScoreTargetInput {
  return {
    goal: doc.goalSnapshot?.goal ?? 'General Fitness',
    mealSlots: (doc.mealSlots ?? []).map((s: any) => ({
      mealSlot: s.mealSlot,
      label: s.label,
      proteinGRange: { min: s.proteinGRange?.min ?? 0, max: s.proteinGRange?.max ?? 0 },
    })),
    waterTargetMl: doc.waterTargetMl,
    supplementPlan: (doc.supplementPlan ?? []).map((s: any) => ({ name: s.name })),
  };
}

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

  // ------- Nutrition target (Phase 6): deterministic, one doc per user -------

  app.get('/nutrition/target', { preHandler: [app.authenticate] }, async (request) => {
    const target = await NutritionTarget.findOne({ userId: request.user.sub });
    return { target: target ? serializeTarget(target) : null };
  });

  app.post('/nutrition/target/generate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = await User.findById(request.user.sub);
    if (!user) return reply.code(404).send({ message: 'User not found' });

    const generated = generateNutritionTarget({
      goal: user.goal,
      weight: user.weight ?? undefined,
      targetWeight: user.targetWeight ?? undefined,
      height: user.height ?? undefined,
      age: user.age ?? undefined,
      gender: user.gender ?? undefined,
      workoutDaysPerWeek: user.workoutDaysPerWeek ?? undefined,
      nutritionPreference: user.nutritionPreference ?? undefined,
      waterTargetMl: user.waterTargetMl ?? undefined,
      supplements: user.supplements ?? [],
    });

    // Regeneration replaces the proposal; the user re-accepts explicitly.
    const target = await NutritionTarget.findOneAndUpdate(
      { userId: request.user.sub },
      { ...generated, status: 'proposed', userId: request.user.sub },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    return reply.code(201).send({ target: serializeTarget(target) });
  });

  app.patch('/nutrition/target', { preHandler: [app.authenticate] }, async (request, reply) => {
    const input = parseBody(targetPatchSchema, request.body);
    const $set: Record<string, unknown> = {};
    const $unset: Record<string, 1> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value === undefined) continue;
      if (value === null) $unset[key] = 1;
      else $set[key] = value;
    }
    const update: Record<string, unknown> = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($unset).length) update.$unset = $unset;
    const target = await NutritionTarget.findOneAndUpdate({ userId: request.user.sub }, update, {
      new: true,
      runValidators: true,
    });
    if (!target) return reply.code(404).send({ message: 'No nutrition target yet — generate one first' });
    return { target: serializeTarget(target) };
  });

  app.post('/nutrition/target/accept', { preHandler: [app.authenticate] }, async (request, reply) => {
    const target = await NutritionTarget.findOneAndUpdate(
      { userId: request.user.sub },
      { status: 'accepted' },
      { new: true },
    );
    if (!target) return reply.code(404).send({ message: 'No nutrition target yet — generate one first' });
    return { target: serializeTarget(target) };
  });

  // ------- Meal logs (Phase 6): one per user/date/slot, upserted -------

  app.get('/nutrition/meal-logs', { preHandler: [app.authenticate] }, async (request) => {
    const query = parseBody(z.object({ date: isoDateSchema }), request.query);
    const logs = await MealLog.find({ userId: request.user.sub, date: query.date }).sort({ loggedAt: 1 });
    return { logs: logs.map(serializeMealLog) };
  });

  app.post('/nutrition/meal-logs', { preHandler: [app.authenticate] }, async (request, reply) => {
    const input = parseBody(mealLogUpsertSchema, request.body);
    // Quick actions replace the previous status for the same slot (no dupes).
    const log = await MealLog.findOneAndUpdate(
      { userId: request.user.sub, date: input.date, mealSlot: input.mealSlot },
      {
        $set: {
          status: input.status,
          proteinG: input.proteinG,
          carbsG: input.carbsG,
          fatG: input.fatG,
          grams: input.grams,
          note: input.note ?? '',
          loggedAt: new Date(),
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    return reply.code(201).send({ log: serializeMealLog(log) });
  });

  app.delete('/nutrition/meal-logs/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = parseBody(z.object({ id: objectIdSchema }), request.params);
    const deleted = await MealLog.findOneAndDelete({ _id: params.id, userId: request.user.sub });
    if (!deleted) return reply.code(404).send({ message: 'Meal log not found' });
    return { ok: true };
  });

  // ------- Habits (Phase 6): water/supplements/drinks, one doc per day -------

  app.get('/nutrition/habits', { preHandler: [app.authenticate] }, async (request) => {
    const query = parseBody(z.object({ date: isoDateSchema }), request.query);
    const habit = await HabitLog.findOne({ userId: request.user.sub, date: query.date });
    return { habit: habit ? serializeHabit(habit) : null };
  });

  app.put('/nutrition/habits', { preHandler: [app.authenticate] }, async (request, reply) => {
    const input = parseBody(habitPutSchema, request.body);
    const $set: Record<string, unknown> = {};
    if (input.waterMl !== undefined) $set.waterMl = input.waterMl;
    if (input.supplementsTaken !== undefined) $set.supplementsTaken = input.supplementsTaken;
    if (input.drinks !== undefined) $set.drinks = input.drinks;
    if (input.note !== undefined) $set.note = input.note;
    const habit = await HabitLog.findOneAndUpdate(
      { userId: request.user.sub, date: input.date },
      { $set },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    return reply.code(200).send({ habit: serializeHabit(habit) });
  });

  // ------- Daily/weekly adherence score (Phase 6): deterministic -------

  app.get('/nutrition/score', { preHandler: [app.authenticate] }, async (request, reply) => {
    const query = parseBody(
      z
        .object({ from: isoDateSchema, to: isoDateSchema })
        .refine((v) => v.from <= v.to, { message: 'from must be on or before to' }),
      request.query,
    );
    // Cap the window so payloads stay small (a month + margin).
    const fromMs = Date.parse(`${query.from}T00:00:00Z`);
    const toMs = Date.parse(`${query.to}T00:00:00Z`);
    const dayCount = Math.round((toMs - fromMs) / 86_400_000) + 1;
    if (dayCount > 35) return reply.code(400).send({ message: 'Range too large — max 35 days' });

    const target = await NutritionTarget.findOne({ userId: request.user.sub, status: 'accepted' });
    if (!target) {
      return { days: [], summary: null, reason: 'no_accepted_target' };
    }

    const [mealLogs, habits] = await Promise.all([
      MealLog.find({ userId: request.user.sub, date: { $gte: query.from, $lte: query.to } }),
      HabitLog.find({ userId: request.user.sub, date: { $gte: query.from, $lte: query.to } }),
    ]);
    const mealsByDate = new Map<string, Array<(typeof mealLogs)[number]>>();
    for (const log of mealLogs) {
      (mealsByDate.get(log.date) ?? mealsByDate.set(log.date, []).get(log.date))!.push(log);
    }
    const habitByDate = new Map(habits.map((h) => [h.date, h]));
    const scoreTarget = targetToScoreInput(target);

    const days = [] as ReturnType<typeof scoreDay>[];
    for (let i = 0; i < dayCount; i += 1) {
      const date = new Date(fromMs + i * 86_400_000).toISOString().slice(0, 10);
      const habit = habitByDate.get(date);
      days.push(
        scoreDay({
          date,
          target: scoreTarget,
          mealLogs: (mealsByDate.get(date) ?? []).map((l) => ({
            mealSlot: String(l.mealSlot),
            status: l.status as 'done' | 'heavier' | 'lighter' | 'off_plan' | 'skipped',
            proteinG: l.proteinG ?? undefined,
            carbsG: l.carbsG ?? undefined,
            fatG: l.fatG ?? undefined,
          })),
          habit: habit
            ? { waterMl: habit.waterMl ?? 0, supplementsTaken: habit.supplementsTaken ?? [] }
            : null,
        }),
      );
    }

    return { days, summary: summarizeRange(days), reason: null };
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
