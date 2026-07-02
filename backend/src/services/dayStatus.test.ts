import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeDayStatuses, dayKeyFrom } from './dayStatus.js';

const DAYS = ['2026-07-01', '2026-07-03', '2026-07-05', '2026-07-07'];

describe('dayKeyFrom', () => {
  it('applies a Tehran offset (UTC+3:30 → getTimezoneOffset -210)', () => {
    // 2026-07-01 22:00 UTC is already 2026-07-02 in Tehran.
    const d = new Date('2026-07-01T22:00:00Z');
    assert.equal(dayKeyFrom(d, -210), '2026-07-02');
  });

  it('falls back to server-local parts without an offset', () => {
    const d = new Date(2026, 6, 1, 12, 0, 0);
    assert.equal(dayKeyFrom(d), '2026-07-01');
  });
});

describe('computeDayStatuses — shift behavior', () => {
  it('keeps a missed workout pending and shifts the rest forward', () => {
    // Missed 07-01 and 07-03; today is 07-04.
    const r = computeDayStatuses({
      entryDayKeys: DAYS,
      completedDayKeys: [],
      todayKey: '2026-07-04',
      behavior: 'shift',
    });
    assert.deepEqual(r.entryStatuses, ['pending', 'shifted', 'upcoming', 'upcoming']);
    assert.equal(r.nextIndex, 0);
    assert.equal(r.todayStatus, 'shifted');
  });

  it('consumes entries in order regardless of the day trained', () => {
    // One workout done (on an unscheduled day) — entry 0 is consumed.
    const r = computeDayStatuses({
      entryDayKeys: DAYS,
      completedDayKeys: ['2026-07-02'],
      todayKey: '2026-07-03',
      behavior: 'shift',
    });
    assert.deepEqual(r.entryStatuses, ['completed', 'pending', 'upcoming', 'upcoming']);
    assert.equal(r.nextIndex, 1);
    assert.equal(r.todayStatus, 'pending');
  });

  it('reports completed today and rest when everything is done', () => {
    const done = computeDayStatuses({
      entryDayKeys: DAYS,
      completedDayKeys: DAYS,
      todayKey: '2026-07-07',
      behavior: 'shift',
    });
    assert.equal(done.nextIndex, null);
    assert.equal(done.todayStatus, 'completed');
    assert.deepEqual(done.entryStatuses, ['completed', 'completed', 'completed', 'completed']);
  });

  it('is a rest day when the next entry is in the future', () => {
    const r = computeDayStatuses({
      entryDayKeys: DAYS,
      completedDayKeys: ['2026-07-01'],
      todayKey: '2026-07-02',
      behavior: 'shift',
    });
    assert.equal(r.todayStatus, 'rest');
    assert.equal(r.nextIndex, 1);
  });
});

describe('computeDayStatuses — skip behavior', () => {
  it('marks unmatched past entries as missed and moves on', () => {
    const r = computeDayStatuses({
      entryDayKeys: DAYS,
      completedDayKeys: ['2026-07-03'],
      todayKey: '2026-07-05',
      behavior: 'skip',
    });
    assert.deepEqual(r.entryStatuses, ['missed', 'completed', 'pending', 'upcoming']);
    assert.equal(r.nextIndex, 2);
    assert.equal(r.todayStatus, 'pending');
  });

  it('does not resurface missed workouts on rest days', () => {
    const r = computeDayStatuses({
      entryDayKeys: DAYS,
      completedDayKeys: [],
      todayKey: '2026-07-04',
      behavior: 'skip',
    });
    assert.deepEqual(r.entryStatuses, ['missed', 'missed', 'upcoming', 'upcoming']);
    assert.equal(r.nextIndex, 2);
    assert.equal(r.todayStatus, 'rest');
  });

  it('consumes one session per entry on the same day', () => {
    const twoSameDay = computeDayStatuses({
      entryDayKeys: ['2026-07-01', '2026-07-01'],
      completedDayKeys: ['2026-07-01'],
      todayKey: '2026-07-02',
      behavior: 'skip',
    });
    assert.deepEqual(twoSameDay.entryStatuses, ['completed', 'missed']);
  });
});

describe('computeDayStatuses — edge cases', () => {
  it('handles an empty schedule', () => {
    const r = computeDayStatuses({
      entryDayKeys: [],
      completedDayKeys: [],
      todayKey: '2026-07-04',
      behavior: 'shift',
    });
    assert.equal(r.nextIndex, null);
    assert.equal(r.todayStatus, 'none');
  });
});
