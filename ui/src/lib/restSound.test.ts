import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createRestBeepGate, shouldPlayRestBeep } from './restSound.ts';

const base = { enabled: true, hidden: false };

describe('shouldPlayRestBeep', () => {
  it('triggers exactly at 3, 2 and 1 seconds remaining', () => {
    const gate = createRestBeepGate();
    assert.equal(shouldPlayRestBeep(3, { ...base, gate }), true);
    assert.equal(shouldPlayRestBeep(2, { ...base, gate }), true);
    assert.equal(shouldPlayRestBeep(1, { ...base, gate }), true);
  });

  it('does not trigger outside the final 3 seconds', () => {
    const gate = createRestBeepGate();
    for (const remaining of [90, 10, 5, 4, 0, -1]) {
      assert.equal(shouldPlayRestBeep(remaining, { ...base, gate }), false, `remaining=${remaining}`);
    }
  });

  it('is silent when the preference is off', () => {
    const gate = createRestBeepGate();
    for (const remaining of [3, 2, 1]) {
      assert.equal(shouldPlayRestBeep(remaining, { enabled: false, hidden: false, gate }), false);
    }
  });

  it('is silent when the tab is hidden or the timer is paused', () => {
    const gate = createRestBeepGate();
    assert.equal(shouldPlayRestBeep(3, { enabled: true, hidden: true, gate }), false);
    assert.equal(shouldPlayRestBeep(3, { ...base, paused: true, gate }), false);
  });

  it('never repeats a beep for the same second across rerenders', () => {
    const gate = createRestBeepGate();
    assert.equal(shouldPlayRestBeep(3, { ...base, gate }), true);
    assert.equal(shouldPlayRestBeep(3, { ...base, gate }), false);
    assert.equal(shouldPlayRestBeep(3, { ...base, gate }), false);
    assert.equal(shouldPlayRestBeep(2, { ...base, gate }), true);
    assert.equal(shouldPlayRestBeep(2, { ...base, gate }), false);
  });

  it('beeps again if the countdown re-enters the final window (+15 s)', () => {
    const gate = createRestBeepGate();
    assert.equal(shouldPlayRestBeep(3, { ...base, gate }), true);
    // User adds 15 s at 2 s remaining → counts down through 3 again.
    assert.equal(shouldPlayRestBeep(17, { ...base, gate }), false);
    assert.equal(shouldPlayRestBeep(3, { ...base, gate }), true);
  });

  it('ignores fractional values defensively', () => {
    const gate = createRestBeepGate();
    assert.equal(shouldPlayRestBeep(2.5, { ...base, gate }), false);
  });

  it('does not mark the gate when suppressed (hidden), so unhiding still beeps', () => {
    const gate = createRestBeepGate();
    assert.equal(shouldPlayRestBeep(3, { enabled: true, hidden: true, gate }), false);
    assert.equal(shouldPlayRestBeep(3, { ...base, gate }), true);
  });
});
