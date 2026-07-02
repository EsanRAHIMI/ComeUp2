import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { User } from './User.js';

// Document-level tests — no DB connection needed; defaults and validators
// run on instantiation / validateSync().

describe('User model — Phase 3 defaults', () => {
  it('defaults missedWorkoutBehavior to shift and restCountdownSound to true', () => {
    const user = new User({ name: 'Masi', email: 'm@example.com', passwordHash: 'x' });
    assert.equal(user.missedWorkoutBehavior, 'shift');
    assert.equal(user.preferences?.restCountdownSound, true);
    assert.equal(user.validateSync(), undefined);
  });

  it('leaves new optional fields unset by default', () => {
    const user = new User({ name: 'Masi', email: 'm@example.com', passwordHash: 'x' });
    assert.equal(user.targetWeight, undefined);
    assert.equal(user.goalDeadline, undefined);
    assert.equal(user.walkingTarget, undefined);
    assert.equal(user.waterTargetMl, undefined);
    assert.equal(user.nutritionPreference, undefined);
  });

  it('validates walkingTarget subdocument and behavior enum', () => {
    const good = new User({
      name: 'Masi',
      email: 'm@example.com',
      passwordHash: 'x',
      walkingTarget: { metric: 'minutes', value: 45 },
      missedWorkoutBehavior: 'skip',
    });
    assert.equal(good.validateSync(), undefined);
    assert.equal(good.walkingTarget?.metric, 'minutes');

    const bad = new User({
      name: 'Masi',
      email: 'm@example.com',
      passwordHash: 'x',
      missedWorkoutBehavior: 'pause',
    });
    assert.notEqual(bad.validateSync(), undefined);
  });

  it('keeps a legacy-shaped document valid (no new fields present)', () => {
    const user = new User({
      name: 'Old User',
      email: 'old@example.com',
      passwordHash: 'x',
      goal: 'Weight Loss',
      fitnessLevel: 'Intermediate',
      workoutDaysPerWeek: 4,
      preferences: { autoRestTimer: true, defaultRestSeconds: 45 },
    });
    assert.equal(user.validateSync(), undefined);
    assert.equal(user.goal, 'Weight Loss');
  });
});
