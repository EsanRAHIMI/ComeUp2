// Run with: node --experimental-strip-types --test src/services/exerciseGifSearch.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pickBestGif, searchExerciseGifs } from './exerciseGifSearch.ts';
import { searchFitnessProgramer } from './fitnessProgramerSearch.ts';

test('pickBestGif rejects low-confidence meme results', () => {
  const candidates = [
    {
      url: 'https://example.com/meme.gif',
      previewUrl: 'https://example.com/meme.gif',
      title: 'funny cat reaction',
      source: 'giphy' as const,
      score: 30,
      professional: false,
    },
  ];
  assert.equal(pickBestGif(candidates), null);
});

test('pickBestGif accepts high-confidence professional results', () => {
  const candidates = [
    {
      url: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg',
      previewUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg',
      title: 'Leg Press',
      source: 'free-exercise-db' as const,
      score: 340,
      professional: true,
    },
  ];
  assert.equal(pickBestGif(candidates)?.source, 'free-exercise-db');
});

test('matches plural exercise names like Dumbbell Rows', async () => {
  const results = await searchExerciseGifs('Dumbbell Rows');
  assert.ok(results.length > 0);
  assert.match(results[0]?.title.toLowerCase() ?? '', /row/);
}, 30_000);

test('prefers fitnessprogramer GIF when available', async () => {
  const results = await searchExerciseGifs('Dumbbell Deadlift');
  assert.ok(results.length > 0);
  assert.equal(results[0]?.source, 'fitnessprogramer');
  assert.match(results[0]?.url ?? '', /fitnessprogramer\.com/);
}, 30_000);

test('finds standard push-up GIF from fitnessprogramer, not handstand photo', async () => {
  const results = await searchExerciseGifs('Push-ups');
  assert.ok(results.length > 0);
  assert.equal(results[0]?.source, 'fitnessprogramer');
  assert.match(results[0]?.url ?? '', /Push-Up\.gif/i);
  assert.doesNotMatch(results[0]?.url ?? '', /githubusercontent/);
}, 30_000);

test('finds lateral raise GIF for Lateral Raises', async () => {
  const results = await searchExerciseGifs('Lateral Raises');
  assert.ok(results.length > 0);
  assert.equal(results[0]?.source, 'fitnessprogramer');
  assert.match(results[0]?.url ?? '', /Lateral-Raise\.gif/i);
  assert.doesNotMatch(results[0]?.url ?? '', /githubusercontent/);
}, 30_000);

test('uses full-name fitnessprogramer match before partial fallbacks', async () => {
  const full = await searchFitnessProgramer('Dumbbell Deadlift');
  assert.ok(full.length > 0);
  assert.equal(full[0]?.matchTier, 'full');
}, 30_000);

test('finds triceps dips GIF from fitnessprogramer, not static github photo', async () => {
  const results = await searchExerciseGifs('Tricep Dips');
  assert.ok(results.length > 0);
  assert.equal(results[0]?.source, 'fitnessprogramer');
  assert.match(results[0]?.url ?? '', /fitnessprogramer\.com.*\.gif/i);
  assert.doesNotMatch(results[0]?.url ?? '', /githubusercontent/);
}, 30_000);
