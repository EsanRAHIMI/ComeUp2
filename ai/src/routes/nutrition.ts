import type { FastifyPluginAsync } from 'fastify';
import { MEAL_SLOT_IDS } from '@comeup/domain';
import { z } from 'zod';
import {
  generateNutritionPlateImage,
  isPlateImageGenConfigured,
} from '../services/nutritionPlateImage.js';

const generateSchema = z.object({
  mealSlot: z.enum(MEAL_SLOT_IDS),
  items: z
    .array(
      z.object({
        foodName: z.string().min(1).max(200),
        weightGrams: z.number().min(1).max(10_000),
      }),
    )
    .min(1)
    .max(50),
  referenceImages: z.array(z.string()).max(3).optional(),
});

function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  return schema.parse(body);
}

export const nutritionRoutes: FastifyPluginAsync = async (app) => {
  app.post('/nutrition/plates/generate', async (request, reply) => {
    if (!isPlateImageGenConfigured()) {
      return reply.code(503).send({
        message:
          'Image generation is not configured — set IMAGE_GEN_API_KEY or GPT_API_KEY in the ai service.',
      });
    }

    const body = parseBody(generateSchema, request.body);
    try {
      const result = await generateNutritionPlateImage(body);
      return result;
    } catch (error) {
      if (error instanceof Error && error.message === 'NO_ITEMS') {
        return reply.code(400).send({
          message: 'No weighed items provided — log the plate first.',
        });
      }
      if (error instanceof Error && error.message === 'IMAGE_NOT_CONFIGURED') {
        return reply.code(503).send({ message: 'Image generation is not configured' });
      }
      request.log.error({ err: error }, 'Plate image generation failed');
      return reply.code(502).send({
        message: error instanceof Error ? error.message : 'Image generation failed',
      });
    }
  });
};
