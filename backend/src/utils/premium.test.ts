import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FREE_WEEKLY_GPT_LIMIT, selectWeeklyGptLimit, userIsPremium } from './premium.js';

describe('userIsPremium', () => {
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);

  it('is false for missing user / none status', () => {
    assert.equal(userIsPremium(null), false);
    assert.equal(userIsPremium({ subscriptionStatus: 'none', subscriptionExpiresAt: future }), false);
  });

  it('is true for active/grace with future expiry', () => {
    assert.equal(userIsPremium({ subscriptionStatus: 'active', subscriptionExpiresAt: future }), true);
    assert.equal(userIsPremium({ subscriptionStatus: 'grace', subscriptionExpiresAt: future }), true);
  });

  it('is false when expired, revoked, or past expiry', () => {
    assert.equal(userIsPremium({ subscriptionStatus: 'active', subscriptionExpiresAt: past }), false);
    assert.equal(userIsPremium({ subscriptionStatus: 'expired', subscriptionExpiresAt: future }), false);
    assert.equal(userIsPremium({ subscriptionStatus: 'revoked', subscriptionExpiresAt: future }), false);
    assert.equal(userIsPremium({ subscriptionStatus: 'active' }), false);
  });
});

describe('selectWeeklyGptLimit', () => {
  it('picks free vs premium caps', () => {
    assert.equal(selectWeeklyGptLimit(false, 50), FREE_WEEKLY_GPT_LIMIT);
    assert.equal(selectWeeklyGptLimit(true, 50), 50);
  });
});
