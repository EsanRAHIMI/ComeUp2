import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateNutritionTarget } from './nutritionTargetEngine.js';

const fullProfile = {
  goal: 'Weight Loss' as const,
  weight: 90,
  targetWeight: 78,
  height: 178,
  age: 32,
  gender: 'male' as const,
  workoutDaysPerWeek: 4,
  waterTargetMl: 2750,
  supplements: ['creatine', 'whey'],
};

describe('generateNutritionTarget — complete profile', () => {
  const t = generateNutritionTarget(fullProfile);

  it('is high confidence with no missing inputs', () => {
    assert.equal(t.confidence, 'high');
    assert.deepEqual(t.missingInputs, []);
  });

  it('estimates calories with a fat-loss deficit', () => {
    // BMR male 90/178/32 = 1857.5; ×1.55 activity ×0.85 goal ≈ 2447
    assert.ok(t.dailyCaloriesEstimate! > 2300 && t.dailyCaloriesEstimate! < 2600, String(t.dailyCaloriesEstimate));
  });

  it('sets protein from weight and goal (1.8 g/kg fat loss)', () => {
    assert.equal(t.dailyProteinG, 162);
  });

  it('respects the profile water target and lists only user supplements', () => {
    assert.equal(t.waterTargetMl, 2750);
    assert.deepEqual(t.supplementPlan.map((s) => s.name), ['creatine', 'whey']);
  });

  it('distributes across 5 slots for fat loss (no before_bed)', () => {
    assert.equal(t.mealSlots.length, 5);
    assert.ok(!t.mealSlots.some((s) => s.mealSlot === 'before_bed'));
    const lunch = t.mealSlots.find((s) => s.mealSlot === 'lunch')!;
    // Lunch = 30% share; protein mid ≈ 48.6 → range around it.
    assert.ok(lunch.proteinGRange.min < 49 && lunch.proteinGRange.max > 49);
    assert.ok(lunch.proteinGRange.min < lunch.proteinGRange.max);
  });

  it('slot calorie estimates roughly sum to the daily estimate', () => {
    const sum = t.mealSlots.reduce((s, x) => s + (x.caloriesEstimate ?? 0), 0);
    assert.ok(Math.abs(sum - t.dailyCaloriesEstimate!) < 60, `${sum} vs ${t.dailyCaloriesEstimate}`);
  });
});

describe('generateNutritionTarget — goals', () => {
  it('muscle gain adds a before_bed slot and a calorie surplus', () => {
    const t = generateNutritionTarget({ ...fullProfile, goal: 'Muscle Gain' });
    assert.ok(t.mealSlots.some((s) => s.mealSlot === 'before_bed'));
    const wl = generateNutritionTarget(fullProfile);
    assert.ok(t.dailyCaloriesEstimate! > wl.dailyCaloriesEstimate!);
  });

  it('general fitness uses moderate protein (1.4 g/kg)', () => {
    const t = generateNutritionTarget({ ...fullProfile, goal: 'General Fitness' });
    assert.equal(t.dailyProteinG, 126);
  });

  it('unknown goal falls back to General Fitness', () => {
    const t = generateNutritionTarget({ ...fullProfile, goal: 'Get Shredded' });
    assert.equal(t.goalSnapshot.goal, 'General Fitness');
  });
});

describe('generateNutritionTarget — incomplete profiles', () => {
  it('works with an empty profile: reference weight, low confidence, missing inputs listed', () => {
    const t = generateNutritionTarget({});
    assert.equal(t.confidence, 'low');
    assert.deepEqual(t.missingInputs.sort(), ['age', 'gender', 'height', 'weight']);
    assert.equal(t.dailyCaloriesEstimate, undefined); // never invented
    assert.ok(t.dailyProteinG > 0 && t.dailyCarbsG > 0 && t.dailyFatG > 0);
    assert.equal(t.waterTargetMl, 2000); // safe fallback
    assert.ok(t.timingNotes.some((n) => n.includes('reference weight')));
    assert.deepEqual(t.supplementPlan, []); // never invented
  });

  it('weight-only profile gets medium confidence and weight-based water', () => {
    const t = generateNutritionTarget({ weight: 80, height: 180, gender: 'female', age: undefined });
    assert.equal(t.confidence, 'medium'); // only age missing
    assert.equal(t.missingInputs.length, 1);
    assert.equal(t.waterTargetMl, 2750); // 80×35=2800 → rounded to 250 steps
    assert.equal(t.dailyCaloriesEstimate, undefined); // age missing → no formula
  });

  it('undisclosed gender still computes calories with the neutral constant', () => {
    const t = generateNutritionTarget({ weight: 70, height: 170, age: 30, gender: 'undisclosed' });
    assert.ok(t.dailyCaloriesEstimate != null);
    assert.equal(t.confidence, 'medium');
  });
});
