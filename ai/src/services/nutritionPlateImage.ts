import type { MealSlotId } from '@comeup/domain';
import { MEAL_SLOT_LABELS_FA } from '@comeup/domain';
import { env } from '../config/env.js';

export type PlateImageItem = {
  foodName: string;
  weightGrams: number;
};

function imageApiKey() {
  return env.IMAGE_GEN_API_KEY?.trim() || env.GPT_API_KEY?.trim() || '';
}

export function isPlateImageGenConfigured() {
  return imageApiKey().length > 0;
}

export function buildPlatePrompt(items: PlateImageItem[], mealSlot: MealSlotId) {
  const label = MEAL_SLOT_LABELS_FA[mealSlot] ?? mealSlot;
  const desc = items.map((item) => `${Math.round(item.weightGrams)}g ${item.foodName}`).join(', ');
  return (
    `Top-down photo of a single home-cooked meal plate for ${label}, ` +
    `realistic portions matching: ${desc}. Natural lighting, simple white plate, ` +
    `minimal styling, photographed like a personal meal-prep log photo, not a magazine shoot.`
  );
}

async function callImageProvider(prompt: string) {
  const apiKey = imageApiKey();
  if (!apiKey) throw new Error('IMAGE_NOT_CONFIGURED');

  const response = await fetch(`${env.GPT_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: env.IMAGE_GEN_MODEL,
      prompt,
      size: '1024x1024',
      response_format: 'b64_json',
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Image generation failed: ${response.status} ${detail}`);
  }

  const data = (await response.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image returned from provider');
  return b64;
}

/** Build prompt from meal data and generate a plate image. Keys stay in this service only. */
export async function generateNutritionPlateImage(input: {
  mealSlot: MealSlotId;
  items: PlateImageItem[];
  referenceImages?: string[];
}) {
  if (!input.items.length) {
    throw new Error('NO_ITEMS');
  }

  const prompt = buildPlatePrompt(input.items, input.mealSlot);
  // Reference images reserved for a future edits/variation endpoint; provider call is text-only today.
  void input.referenceImages;

  const imageBase64 = await callImageProvider(prompt);
  return { imageBase64, prompt };
}
