import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { missingProfileHints, profilePromptText } from './profileHints.ts';
import type { User } from '../types.ts';

const base: User = {
  id: 'u1',
  name: 'Masi',
  email: 'm@example.com',
  goal: 'Weight Loss',
  fitnessLevel: 'Beginner',
  workoutDaysPerWeek: 3,
};

describe('missingProfileHints', () => {
  it('lists all important gaps for a bare profile', () => {
    const ids = missingProfileHints(base).map((h) => h.id);
    assert.deepEqual(ids, ['weight', 'height', 'age', 'preferredDays']);
  });

  it('returns nothing when the profile is complete', () => {
    const full: User = { ...base, weight: 70, height: 170, age: 30, preferredDays: [1, 3, 5] };
    assert.deepEqual(missingProfileHints(full), []);
  });

  it('handles a null user', () => {
    assert.deepEqual(missingProfileHints(null), []);
  });
});

describe('profilePromptText', () => {
  it('is null when nothing is missing', () => {
    assert.equal(profilePromptText([]), null);
  });

  it('joins up to three labels naturally', () => {
    const text = profilePromptText([
      { id: 'weight', label: 'وزن فعلی' },
      { id: 'height', label: 'قد' },
    ]);
    assert.equal(text, 'برای پیشنهادهای دقیق‌تر، وزن فعلی و قد را اضافه کن.');
  });
});
