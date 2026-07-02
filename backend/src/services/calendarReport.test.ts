import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCalendarMonth, isMonthKey } from './calendarReport.js';

const JULY = '2026-07';
const entry = (dayKey: string, title = 'Push Day') => ({ dayKey, title });
const session = (dayKey: string, sets = 12, durationSec = 3600, calories = 300) => ({
  dayKey,
  sets,
  durationSec,
  calories,
});

describe('isMonthKey', () => {
  it('accepts YYYY-MM and rejects everything else', () => {
    assert.equal(isMonthKey('2026-07'), true);
    assert.equal(isMonthKey('2026-7'), false);
    assert.equal(isMonthKey('2026-07-01'), false);
  });
});

describe('buildCalendarMonth — statuses', () => {
  it('marks a completed day with sessions and stats', () => {
    const result = buildCalendarMonth({
      month: JULY,
      todayKey: '2026-07-10',
      behavior: 'skip',
      entries: [entry('2026-07-01')],
      completed: [session('2026-07-01')],
    });
    const d = result.days['2026-07-01'];
    assert.equal(d.workout?.status, 'completed');
    assert.equal(d.sessions, 1);
    assert.deepEqual(d.stats, { sets: 12, minutes: 60, calories: 300 });
  });

  it('marks a pending today and upcoming future days (never missed in the future)', () => {
    const result = buildCalendarMonth({
      month: JULY,
      todayKey: '2026-07-10',
      behavior: 'skip',
      entries: [entry('2026-07-10'), entry('2026-07-20')],
      completed: [],
    });
    assert.equal(result.days['2026-07-10'].workout?.status, 'pending');
    assert.equal(result.days['2026-07-20'].workout?.status, 'upcoming');
  });

  it('marks unmatched past days as missed under skip behavior', () => {
    const result = buildCalendarMonth({
      month: JULY,
      todayKey: '2026-07-10',
      behavior: 'skip',
      entries: [entry('2026-07-02'), entry('2026-07-06')],
      completed: [session('2026-07-06')],
    });
    assert.equal(result.days['2026-07-02'].workout?.status, 'missed');
    assert.equal(result.days['2026-07-06'].workout?.status, 'completed');
  });

  it('marks pending + shifted (not missed) under shift behavior', () => {
    const result = buildCalendarMonth({
      month: JULY,
      todayKey: '2026-07-10',
      behavior: 'shift',
      entries: [entry('2026-07-02'), entry('2026-07-06'), entry('2026-07-08')],
      completed: [session('2026-07-03')], // consumed entry 0
    });
    assert.equal(result.days['2026-07-02'].workout?.status, 'completed');
    assert.equal(result.days['2026-07-06'].workout?.status, 'pending');
    assert.equal(result.days['2026-07-08'].workout?.status, 'shifted');
    // Actual training day still shows the session.
    assert.equal(result.days['2026-07-03'].sessions, 1);
    assert.equal(result.days['2026-07-03'].workout, undefined);
  });

  it('omits rest days entirely', () => {
    const result = buildCalendarMonth({
      month: JULY,
      todayKey: '2026-07-10',
      behavior: 'shift',
      entries: [entry('2026-07-01')],
      completed: [session('2026-07-01')],
    });
    assert.equal(result.days['2026-07-15'], undefined);
    assert.equal(Object.keys(result.days).length, 1);
  });

  it('handles no active program (no entries)', () => {
    const result = buildCalendarMonth({
      month: JULY,
      todayKey: '2026-07-10',
      behavior: 'shift',
      entries: [],
      completed: [session('2026-07-04')],
    });
    assert.equal(result.days['2026-07-04'].sessions, 1);
    assert.equal(result.days['2026-07-04'].workout, undefined);
  });
});

describe('buildCalendarMonth — month boundaries', () => {
  it('filters schedule and sessions to the requested month only', () => {
    const result = buildCalendarMonth({
      month: JULY,
      todayKey: '2026-07-10',
      behavior: 'skip',
      entries: [entry('2026-06-30'), entry('2026-07-01'), entry('2026-08-01')],
      completed: [session('2026-06-30'), session('2026-07-01')],
    });
    assert.equal(result.days['2026-06-30'], undefined);
    assert.equal(result.days['2026-08-01'], undefined);
    assert.equal(result.days['2026-07-01'].workout?.status, 'completed');
  });

  it('keeps shift consumption correct across month boundaries', () => {
    // Two entries in June already consumed; July entry 0 is next.
    const result = buildCalendarMonth({
      month: JULY,
      todayKey: '2026-07-10',
      behavior: 'shift',
      entries: [entry('2026-06-27'), entry('2026-06-29'), entry('2026-07-04')],
      completed: [session('2026-06-27'), session('2026-06-29')],
    });
    assert.equal(result.days['2026-07-04'].workout?.status, 'pending');
  });

  it('aggregates multiple sessions on the same day', () => {
    const result = buildCalendarMonth({
      month: JULY,
      todayKey: '2026-07-10',
      behavior: 'skip',
      entries: [],
      completed: [session('2026-07-05', 10, 1800, 150), session('2026-07-05', 8, 1200, 100)],
    });
    assert.equal(result.days['2026-07-05'].sessions, 2);
    assert.deepEqual(result.days['2026-07-05'].stats, { sets: 18, minutes: 50, calories: 250 });
  });
});

describe('buildCalendarMonth — nutrition markers', () => {
  it('adds nutrition markers, clamped to the slot count', () => {
    const result = buildCalendarMonth({
      month: JULY,
      todayKey: '2026-07-10',
      behavior: 'shift',
      entries: [],
      completed: [],
      nutritionByDay: { '2026-07-03': 4, '2026-07-04': 9, '2026-08-01': 2 },
      nutritionSlotCount: 6,
    });
    assert.deepEqual(result.days['2026-07-03'].nutrition, { loggedSlots: 4, slotCount: 6 });
    assert.deepEqual(result.days['2026-07-04'].nutrition, { loggedSlots: 6, slotCount: 6 });
    assert.equal(result.days['2026-08-01'], undefined);
  });

  it('works with nutrition data missing entirely (query failed / no logs)', () => {
    const result = buildCalendarMonth({
      month: JULY,
      todayKey: '2026-07-10',
      behavior: 'shift',
      entries: [entry('2026-07-01')],
      completed: [session('2026-07-01')],
    });
    assert.equal(result.days['2026-07-01'].nutrition, undefined);
    assert.equal(result.days['2026-07-01'].workout?.status, 'completed');
  });

  it('ignores zero-slot days and zero slotCount', () => {
    const result = buildCalendarMonth({
      month: JULY,
      todayKey: '2026-07-10',
      behavior: 'shift',
      entries: [],
      completed: [],
      nutritionByDay: { '2026-07-03': 0 },
      nutritionSlotCount: 0,
    });
    assert.deepEqual(result.days, {});
  });
});
