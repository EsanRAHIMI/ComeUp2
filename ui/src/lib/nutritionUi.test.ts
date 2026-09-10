import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  confidenceLabel,
  gramRangeText,
  MEAL_STATUS_META,
  nextUnloggedSlot,
  scoreLabel,
  scoreTone,
  slotMacroSummary,
  waterPct,
} from './nutritionUi.ts';

describe('scoreTone / scoreLabel', () => {
  it('maps score bands to tones and labels', () => {
    assert.equal(scoreTone(92), 'good');
    assert.equal(scoreTone(80), 'good');
    assert.equal(scoreTone(65), 'ok');
    assert.equal(scoreTone(30), 'low');
    assert.equal(scoreTone(null), 'none');
    assert.equal(scoreLabel(92), 'روی برنامه');
    assert.equal(scoreLabel(65), 'نزدیک به هدف');
    assert.equal(scoreLabel(10), 'امروز خارج از برنامه');
    assert.equal(scoreLabel(undefined), 'هنوز داده‌ای نیست');
  });
});

describe('waterPct', () => {
  it('clamps between 0 and 100 and handles zero target', () => {
    assert.equal(waterPct(1500, 2000), 75);
    assert.equal(waterPct(3000, 2000), 100);
    assert.equal(waterPct(0, 2000), 0);
    assert.equal(waterPct(500, 0), 0);
  });
});

describe('gramRangeText / slotMacroSummary', () => {
  it('formats ranges and collapses equal bounds', () => {
    assert.equal(gramRangeText({ min: 30, max: 45 }), '30–45 g');
    assert.equal(gramRangeText({ min: 20, max: 20 }), '20 g');
  });

  it('builds a compact macro line', () => {
    const text = slotMacroSummary({
      proteinGRange: { min: 30, max: 45 },
      carbsGRange: { min: 55, max: 80 },
      fatGRange: { min: 12, max: 12 },
    });
    assert.equal(text, 'P 30–45 · C 55–80 · F 12 g');
  });
});

describe('nextUnloggedSlot', () => {
  const slots = [{ mealSlot: 'breakfast' }, { mealSlot: 'lunch' }, { mealSlot: 'dinner' }];

  it('returns the first slot without a log', () => {
    assert.equal(nextUnloggedSlot(slots, ['breakfast'])?.mealSlot, 'lunch');
    assert.equal(nextUnloggedSlot(slots, [])?.mealSlot, 'breakfast');
  });

  it('returns null when everything is logged', () => {
    assert.equal(nextUnloggedSlot(slots, ['breakfast', 'lunch', 'dinner']), null);
  });
});

describe('status + confidence labels', () => {
  it('covers every meal status', () => {
    assert.equal(MEAL_STATUS_META.done.label, 'انجام شد');
    assert.equal(MEAL_STATUS_META.off_plan.tone, 'bad');
    assert.equal(MEAL_STATUS_META.skipped.tone, 'muted');
  });

  it('labels confidence honestly', () => {
    assert.equal(confidenceLabel('low'), 'تخمین تقریبی');
    assert.equal(confidenceLabel('high'), 'اطمینان بالا');
  });
});
