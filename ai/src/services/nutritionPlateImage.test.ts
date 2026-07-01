import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPlatePrompt } from './nutritionPlateImage.ts';

test('buildPlatePrompt includes meal slot label and weighed items', () => {
  const prompt = buildPlatePrompt(
    [
      { foodName: 'Cooked Rice', weightGrams: 100 },
      { foodName: 'Chicken Breast', weightGrams: 150 },
    ],
    'lunch',
  );
  assert.match(prompt, /ناهار|lunch/i);
  assert.match(prompt, /100g Cooked Rice/);
  assert.match(prompt, /150g Chicken Breast/);
});
