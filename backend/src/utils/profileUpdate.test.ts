import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildProfileUpdate, profileUpdateSchema } from './profileUpdate.js';

describe('profileUpdateSchema — Phase 3 fields', () => {
  it('accepts a full new-fields payload', () => {
    const result = profileUpdateSchema.safeParse({
      targetWeight: 72,
      goalDeadline: '2026-12-01',
      muscleFocus: ['chest', 'back'],
      physicalLimitations: ['knee pain'],
      nutritionPreference: 'high_protein',
      supplements: ['creatine', 'whey'],
      waterTargetMl: 2500,
      walkingTarget: { metric: 'steps', value: 8000 },
      missedWorkoutBehavior: 'skip',
      preferences: { restCountdownSound: false },
    });
    assert.equal(result.success, true);
  });

  it('still accepts a legacy payload (old cached bundles)', () => {
    const result = profileUpdateSchema.safeParse({
      name: 'Masi',
      weight: 70,
      preferences: { autoRestTimer: true, defaultRestSeconds: 60 },
    });
    assert.equal(result.success, true);
  });

  it('enforces per-metric walking maximums', () => {
    assert.equal(
      profileUpdateSchema.safeParse({ walkingTarget: { metric: 'minutes', value: 800 } }).success,
      false,
    );
    assert.equal(
      profileUpdateSchema.safeParse({ walkingTarget: { metric: 'distanceKm', value: 150 } }).success,
      false,
    );
    assert.equal(
      profileUpdateSchema.safeParse({ walkingTarget: { metric: 'steps', value: 8000 } }).success,
      true,
    );
  });

  it('rejects unknown behavior and bad deadline formats', () => {
    assert.equal(profileUpdateSchema.safeParse({ missedWorkoutBehavior: 'pause' }).success, false);
    assert.equal(profileUpdateSchema.safeParse({ goalDeadline: '01-12-2026' }).success, false);
  });
});

describe('buildProfileUpdate', () => {
  it('flattens preferences to dotted paths so partial patches merge', () => {
    const { $set, $unset } = buildProfileUpdate({
      preferences: { autoRestTimer: false, defaultRestSeconds: 90 },
    });
    assert.deepEqual($set, {
      'preferences.autoRestTimer': false,
      'preferences.defaultRestSeconds': 90,
    });
    assert.deepEqual($unset, {});
  });

  it('turns nulls into $unset (clearing optional fields)', () => {
    const { $set, $unset } = buildProfileUpdate({
      targetWeight: null,
      goalDeadline: null,
      walkingTarget: null,
      waterTargetMl: 3000,
    });
    assert.deepEqual($unset, { targetWeight: 1, goalDeadline: 1, walkingTarget: 1 });
    assert.deepEqual($set, { waterTargetMl: 3000 });
  });

  it('converts goalDeadline to a UTC-midnight Date', () => {
    const { $set } = buildProfileUpdate({ goalDeadline: '2026-12-01' });
    assert.ok($set.goalDeadline instanceof Date);
    assert.equal(($set.goalDeadline as Date).toISOString(), '2026-12-01T00:00:00.000Z');
  });

  it('passes plain fields through and skips undefined', () => {
    const { $set, $unset } = buildProfileUpdate({ missedWorkoutBehavior: 'skip' });
    assert.deepEqual($set, { missedWorkoutBehavior: 'skip' });
    assert.deepEqual($unset, {});
  });
});
