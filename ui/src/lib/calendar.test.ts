import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addMonths, buildMonthGrid, currentMonthKey, monthLabel, todayDayKey } from './calendar.ts';

describe('addMonths', () => {
  it('crosses year boundaries in both directions', () => {
    assert.equal(addMonths('2026-01', -1), '2025-12');
    assert.equal(addMonths('2026-12', 1), '2027-01');
    assert.equal(addMonths('2026-07', 0), '2026-07');
    assert.equal(addMonths('2026-07', -19), '2024-12');
  });
});

describe('monthLabel', () => {
  it('formats a human label', () => {
    assert.equal(monthLabel('2026-07'), 'July 2026');
    assert.equal(monthLabel('2025-01'), 'January 2025');
  });
});

describe('buildMonthGrid', () => {
  it('produces full 7-cell weeks covering exactly the month', () => {
    const weeks = buildMonthGrid('2026-07'); // July 2026 starts Wednesday
    assert.ok(weeks.every((w) => w.length === 7));
    const cells = weeks.flat().filter((c) => c !== null);
    assert.equal(cells.length, 31);
    assert.equal(cells[0]!.dayKey, '2026-07-01');
    assert.equal(cells[30]!.dayKey, '2026-07-31');
  });

  it('places the first day on the correct weekday (Sunday start)', () => {
    // 2026-07-01 is a Wednesday → index 3 in a Sunday-start week.
    const weeks = buildMonthGrid('2026-07', 0);
    assert.equal(weeks[0][2], null);
    assert.equal(weeks[0][3]?.dayKey, '2026-07-01');
  });

  it('handles February and months starting on the week start', () => {
    const feb = buildMonthGrid('2026-02'); // 2026-02-01 is a Sunday
    assert.equal(feb[0][0]?.dayKey, '2026-02-01');
    assert.equal(feb.flat().filter(Boolean).length, 28);

    const leap = buildMonthGrid('2028-02');
    assert.equal(leap.flat().filter(Boolean).length, 29);
  });

  it('pads day keys to two digits (no off-by-format bugs)', () => {
    const weeks = buildMonthGrid('2026-07');
    const first = weeks.flat().find((c) => c !== null)!;
    assert.match(first.dayKey, /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('todayDayKey / currentMonthKey', () => {
  it('formats from a provided date deterministically', () => {
    const d = new Date(2026, 0, 5, 23, 59, 59); // local Jan 5
    assert.equal(todayDayKey(d), '2026-01-05');
    assert.equal(currentMonthKey(d), '2026-01');
  });
});
