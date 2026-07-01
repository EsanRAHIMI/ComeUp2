import type { MealSlotId } from '@comeup/domain';
import { NutritionGeneratedPlate } from '../models/NutritionGeneratedPlate.js';
import { NutritionWeighLog } from '../models/NutritionWeighLog.js';
import { AiServiceError, callAiService } from './aiClient.js';
import { deleteNutritionFile, saveGeneratedPlate } from './nutritionStorage.js';

export class NutritionPlateError extends Error {
  code: 'NO_LOGS' | 'AI_UNAVAILABLE' | 'IN_PROGRESS';
  status: number;

  constructor(
    code: 'NO_LOGS' | 'AI_UNAVAILABLE' | 'IN_PROGRESS',
    message: string,
    status: number,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'NutritionPlateError';
  }
}

const inFlightGenerations = new Map<string, Promise<{ imageBase64: string; prompt: string }>>();

function generationKey(userId: string, date: string, mealSlot: MealSlotId) {
  return `${userId}:${date}:${mealSlot}`;
}

export async function generateNutritionPlate(userId: string, date: string, mealSlot: MealSlotId) {
  const logs = await NutritionWeighLog.find({ userId, date, mealSlot }).sort({ createdAt: 1 });
  if (!logs.length) {
    throw new NutritionPlateError(
      'NO_LOGS',
      'No weigh-in logs for this date/meal yet — log the plate first.',
      400,
    );
  }

  const key = generationKey(userId, date, mealSlot);
  const existing = inFlightGenerations.get(key);
  if (existing) {
    throw new NutritionPlateError(
      'IN_PROGRESS',
      'Plate image generation is already in progress — please wait.',
      409,
    );
  }

  const generation = (async () => {
    try {
      return await callAiService<{ imageBase64: string; prompt: string }>(
        '/nutrition/plates/generate',
        {
          mealSlot,
          items: logs.map((log) => ({
            foodName: log.foodName,
            weightGrams: log.weightGrams,
          })),
        },
      );
    } catch (error) {
      if (error instanceof AiServiceError) {
        throw new NutritionPlateError(
          'AI_UNAVAILABLE',
          error.message,
          error.status === 503 || error.status === 504 ? error.status : 502,
        );
      }
      throw error;
    }
  })();

  inFlightGenerations.set(key, generation);
  let aiResult: { imageBase64: string; prompt: string };
  try {
    aiResult = await generation;
  } finally {
    inFlightGenerations.delete(key);
  }

  const buffer = Buffer.from(aiResult.imageBase64, 'base64');
  const storageKey = await saveGeneratedPlate({ userId, date, mealSlot, buffer });
  try {
    const plate = await NutritionGeneratedPlate.create({
      userId,
      date,
      mealSlot,
      prompt: aiResult.prompt,
      storageKey,
      mimeType: 'image/png',
    });
    return plate;
  } catch (error) {
    await deleteNutritionFile(storageKey).catch(() => undefined);
    throw error;
  }
}

export function serializeGeneratedPlate(plate: {
  _id: { toString(): string };
  date: string;
  mealSlot: string;
  prompt: string;
  createdAt?: Date;
}) {
  return {
    id: plate._id.toString(),
    date: plate.date,
    mealSlot: plate.mealSlot,
    prompt: plate.prompt,
    url: `/api/v1/nutrition/media/generated/${plate._id.toString()}`,
    createdAt: plate.createdAt?.toISOString(),
  };
}
