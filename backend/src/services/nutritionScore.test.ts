import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { scoreDay, summarizeRange, type ScoreTargetInput } from './nutritionScore.js';

const slot = (mealSlot: string, label: string, min = 30, max = 45) => ({
  mealSlot,
  label,
  proteinGRange: { min, max },
});

const target = (goal: string, extra?: Partial<ScoreTargetInput>): ScoreTargetInput => ({
  goal,
  mealSlots: [slot('breakfast', 'Breakfast'), slot('lunch', 'Lunch'), slot('dinner', 'Dinner')],
  waterTargetMl: 2000,
  supplementPlan: [],
  ...extra,
});

const allDone = [
  { mealSlot: 'breakfast', status: 'done' as const },
  { mealSlot: 'lunch', status: 'done' as const },
  { mealSlot: 'dinner', status: 'done' as const },
];

describe('scoreDay — basics', () => {
  it('scores a perfect confirmation-only day high with medium confidence', () => {
    const r = scoreDay({
      date: '2026-07-02',
      target: target('General Fitness'),
      mealLogs: allDone,
      habit: { waterMl: 2000 },
    });
    assert.ok(r.score! >= 95, String(r.score));
    assert.equal(r.confidence, 'medium'); // confirmations only — honest cap
    assert.ok(r.positiveLabels.includes('All logged meals on plan'));
    assert.equal(r.nextAction, 'Day complete — nice work');
  });

  it('returns null score with no data at all', () => {
    const r = scoreDay({ date: '2026-07-02', target: target('General Fitness'), mealLogs: [], habit: null });
    assert.equal(r.score, null);
    assert.equal(r.explanation, 'No nutrition logged yet today.');
    assert.match(r.nextAction, /Breakfast/i);
  });

  it('unlogged slots are excluded from the average (mid-day is fair)', () => {
    const r = scoreDay({
      date: '2026-07-02',
      target: target('General Fitness'),
      mealLogs: [{ mealSlot: 'breakfast', status: 'done' }],
      habit: { waterMl: 1000 },
    });
    assert.ok(r.score! >= 80, String(r.score));
    assert.equal(r.confidence, 'low'); // 1/3 coverage
    assert.equal(r.nextAction, 'Log lunch');
  });
});

describe('scoreDay — goal-aware statuses', () => {
  const heavierLunch = [
    { mealSlot: 'breakfast', status: 'done' as const },
    { mealSlot: 'lunch', status: 'heavier' as const },
    { mealSlot: 'dinner', status: 'done' as const },
  ];

  it('heavier hurts fat loss more than muscle gain', () => {
    const wl = scoreDay({ date: 'd', target: target('Weight Loss'), mealLogs: heavierLunch, habit: { waterMl: 2000 } });
    const mg = scoreDay({ date: 'd', target: target('Muscle Gain'), mealLogs: heavierLunch, habit: { waterMl: 2000 } });
    assert.ok(wl.score! < mg.score!, `${wl.score} vs ${mg.score}`);
    assert.ok(wl.negativeLabels.some((l) => l.includes('heavier')));
    assert.match(wl.explanation, /heavier/);
  });

  it('skipped and lighter hurt muscle gain more than fat loss', () => {
    const logs = [
      { mealSlot: 'breakfast', status: 'skipped' as const },
      { mealSlot: 'lunch', status: 'lighter' as const },
      { mealSlot: 'dinner', status: 'done' as const },
    ];
    const mg = scoreDay({ date: 'd', target: target('Muscle Gain'), mealLogs: logs, habit: { waterMl: 2000 } });
    const wl = scoreDay({ date: 'd', target: target('Weight Loss'), mealLogs: logs, habit: { waterMl: 2000 } });
    assert.ok(mg.score! < wl.score!, `${mg.score} vs ${wl.score}`);
  });

  it('off-plan is the worst single status for fat loss', () => {
    const off = scoreDay({
      date: 'd',
      target: target('Weight Loss'),
      mealLogs: [{ mealSlot: 'lunch', status: 'off_plan' }],
      habit: null,
    });
    const heavy = scoreDay({
      date: 'd',
      target: target('Weight Loss'),
      mealLogs: [{ mealSlot: 'lunch', status: 'heavier' }],
      habit: null,
    });
    assert.ok(off.score! < heavy.score!);
    assert.ok(off.negativeLabels.some((l) => l.includes('off-plan')));
  });

  it('water matters more for fat loss', () => {
    const noWater = { mealLogs: allDone, habit: { waterMl: 0 } };
    const wl = scoreDay({ date: 'd', target: target('Weight Loss'), ...noWater });
    const gf = scoreDay({ date: 'd', target: target('General Fitness'), ...noWater });
    assert.ok(wl.score! < gf.score!);
  });
});

describe('scoreDay — detailed macros', () => {
  it('protein in range lifts a lighter meal to full points (fat loss)', () => {
    const detailed = scoreDay({
      date: 'd',
      target: target('Weight Loss'),
      mealLogs: [{ mealSlot: 'lunch', status: 'lighter', proteinG: 38 }],
      habit: { waterMl: 2000 },
    });
    const plain = scoreDay({
      date: 'd',
      target: target('Weight Loss'),
      mealLogs: [{ mealSlot: 'lunch', status: 'lighter' }],
      habit: { waterMl: 2000 },
    });
    assert.ok(detailed.score! > plain.score!);
  });

  it('very low protein drags a done meal down and is labeled', () => {
    const r = scoreDay({
      date: 'd',
      target: target('Muscle Gain'),
      mealLogs: [
        { mealSlot: 'breakfast', status: 'done', proteinG: 8 },
        { mealSlot: 'lunch', status: 'done', proteinG: 40 },
        { mealSlot: 'dinner', status: 'done', proteinG: 40 },
      ],
      habit: { waterMl: 2000 },
    });
    const full = scoreDay({
      date: 'd',
      target: target('Muscle Gain'),
      mealLogs: allDone.map((l) => ({ ...l, proteinG: 40 })),
      habit: { waterMl: 2000 },
    });
    assert.ok(r.score! < full.score!);
    assert.ok(r.negativeLabels.some((l) => l.toLowerCase().includes('low protein')));
  });

  it('detailed logging on most meals yields high confidence', () => {
    const r = scoreDay({
      date: 'd',
      target: target('Weight Loss'),
      mealLogs: allDone.map((l) => ({ ...l, proteinG: 38 })),
      habit: { waterMl: 2000 },
    });
    assert.equal(r.confidence, 'high');
    assert.ok(r.positiveLabels.some((l) => l.includes('Detailed logging')));
  });
});

describe('scoreDay — supplements and water status', () => {
  it('counts supplements from the plan only, case-insensitively', () => {
    const r = scoreDay({
      date: 'd',
      target: target('General Fitness', { supplementPlan: [{ name: 'Creatine' }, { name: 'Whey' }] }),
      mealLogs: allDone,
      habit: { waterMl: 2000, supplementsTaken: ['creatine', 'vitamin x'] },
    });
    assert.deepEqual(r.supplementStatus, { taken: 1, planned: 2 });
    assert.equal(r.nextAction, 'Check off your supplements');
  });

  it('reports water status precisely', () => {
    const r = scoreDay({
      date: 'd',
      target: target('General Fitness'),
      mealLogs: allDone,
      habit: { waterMl: 1500 },
    });
    assert.deepEqual(r.waterStatus, { ml: 1500, targetMl: 2000, pct: 75 });
    assert.equal(r.nextAction, 'Drink 500 ml more water');
  });
});

describe('summarizeRange', () => {
  it('averages only days with data and finds best/worst', () => {
    const mk = (date: string, score: number | null) =>
      ({ ...scoreDay({ date, target: target('General Fitness'), mealLogs: [], habit: null }), score }) as ReturnType<typeof scoreDay>;
    const summary = summarizeRange([mk('2026-07-01', 80), mk('2026-07-02', null), mk('2026-07-03', 60)]);
    assert.equal(summary.averageScore, 70);
    assert.equal(summary.daysWithData, 2);
    assert.equal(summary.totalDays, 3);
    assert.deepEqual(summary.bestDay, { date: '2026-07-01', score: 80 });
    assert.deepEqual(summary.worstDay, { date: '2026-07-03', score: 60 });
  });

  it('handles an all-empty range', () => {
    const summary = summarizeRange([]);
    assert.equal(summary.averageScore, null);
    assert.equal(summary.daysWithData, 0);
  });
});
