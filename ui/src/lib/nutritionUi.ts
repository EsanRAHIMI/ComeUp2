// Pure display helpers for the Phase 6 nutrition system.
// No DOM, no network — unit-testable with the repo's Node test runner.
import type { GramRange, MealLogStatus, TargetMealSlot } from '../types';

export type ScoreTone = 'good' | 'ok' | 'low' | 'none';

export function scoreTone(score: number | null | undefined): ScoreTone {
  if (score == null) return 'none';
  if (score >= 80) return 'good';
  if (score >= 60) return 'ok';
  return 'low';
}

export function scoreLabel(score: number | null | undefined): string {
  switch (scoreTone(score)) {
    case 'good':
      return 'روی برنامه';
    case 'ok':
      return 'نزدیک به هدف';
    case 'low':
      return 'امروز خارج از برنامه';
    default:
      return 'هنوز داده‌ای نیست';
  }
}

export const MEAL_STATUS_META: Record<MealLogStatus, { label: string; tone: 'good' | 'warn' | 'bad' | 'muted' }> = {
  done: { label: 'انجام شد', tone: 'good' },
  heavier: { label: 'سنگین‌تر', tone: 'warn' },
  lighter: { label: 'سبک‌تر', tone: 'warn' },
  off_plan: { label: 'خارج از برنامه', tone: 'bad' },
  skipped: { label: 'رد شده', tone: 'muted' },
};

export function waterPct(ml: number, targetMl: number): number {
  if (targetMl <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((ml / targetMl) * 100)));
}

export function gramRangeText(range: GramRange): string {
  if (range.min === range.max) return `${range.min} g`;
  return `${range.min}–${range.max} g`;
}

/** One-line macro summary for a slot, e.g. "P 30–45 · C 55–80 · F 10–15 g". */
export function slotMacroSummary(slot: Pick<TargetMealSlot, 'proteinGRange' | 'carbsGRange' | 'fatGRange'>): string {
  const part = (r: GramRange) => (r.min === r.max ? `${r.min}` : `${r.min}–${r.max}`);
  return `P ${part(slot.proteinGRange)} · C ${part(slot.carbsGRange)} · F ${part(slot.fatGRange)} g`;
}

/** First slot without a log — what the user should eat/log next. */
export function nextUnloggedSlot<T extends { mealSlot: string }>(
  slots: T[],
  loggedSlotIds: string[],
): T | null {
  return slots.find((s) => !loggedSlotIds.includes(s.mealSlot)) ?? null;
}

export function confidenceLabel(confidence: 'low' | 'medium' | 'high'): string {
  switch (confidence) {
    case 'high':
      return 'اطمینان بالا';
    case 'medium':
      return 'اطمینان متوسط';
    default:
      return 'تخمین تقریبی';
  }
}
