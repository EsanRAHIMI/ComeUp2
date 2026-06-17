// Run with: node --experimental-strip-types --test src/services/exerciseDictionary.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyExercise, isValidExerciseName } from './exerciseDictionary.ts';

test('rejects incomplete / non-exercise names like "Close"', () => {
  assert.equal(isValidExerciseName('Close'), false);
  const c = classifyExercise('Close');
  assert.equal(c.valid, false);
  assert.equal(c.needsReview, true);
});

test('curls classify as biceps — never glutes/back', () => {
  for (const name of ['Dumbbell Curl', 'Incline Curl', 'Hammer Curl', 'Barbell Curl']) {
    const c = classifyExercise(name);
    assert.ok(c.groups.includes('biceps'), `${name} -> ${c.groups.join(',')}`);
    assert.ok(!c.groups.includes('glutes'), `${name} wrongly tagged glutes`);
    assert.ok(!c.groups.includes('back'), `${name} wrongly tagged back`);
    assert.equal(c.needsReview, false);
  }
});

test('leg exercises are never tagged triceps', () => {
  for (const name of ['Leg Press', 'Leg Extension', 'Back Squat', 'Walking Lunge', 'Leg Curl']) {
    const c = classifyExercise(name);
    assert.ok(!c.groups.includes('triceps'), `${name} wrongly tagged triceps -> ${c.groups.join(',')}`);
  }
});

test('hamstring curl is hamstrings, not biceps', () => {
  const c = classifyExercise('Lying Leg Curl');
  assert.ok(c.groups.includes('hamstrings'));
  assert.ok(!c.groups.includes('biceps'));
});

test('known movements classify with high confidence', () => {
  assert.deepEqual(classifyExercise('Bench Press').groups.includes('chest'), true);
  assert.deepEqual(classifyExercise('Lat Pulldown').groups.includes('back'), true);
  assert.deepEqual(classifyExercise('Lateral Raise').groups.includes('shoulders'), true);
  assert.deepEqual(classifyExercise('Triceps Pushdown').groups.includes('triceps'), true);
  assert.equal(classifyExercise('Bench Press').needsReview, false);
});

test('ambiguous bare "Press" is flagged for review, not guessed', () => {
  const c = classifyExercise('Press');
  assert.equal(c.needsReview, true);
  assert.equal(c.confidence, 'low');
});
