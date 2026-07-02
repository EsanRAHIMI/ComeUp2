// Deterministic, goal-aware nutrition adherence scoring.
//
// Pure module: accepted target + the day's logs in → 0–100 score out, with
// honest confidence, human-readable labels, and a next action. Never invents
// calories the user didn't log; confirmation-only days score with low/medium
// confidence instead of fake precision.

import type { GramRange, TargetGoal } from './nutritionTargetEngine.js';

export type MealStatus = 'done' | 'heavier' | 'lighter' | 'off_plan' | 'skipped';

export type ScoreTargetSlot = {
  mealSlot: string;
  label: string;
  proteinGRange: GramRange;
};

export type ScoreTargetInput = {
  goal: TargetGoal | string;
  mealSlots: ScoreTargetSlot[];
  waterTargetMl: number;
  supplementPlan: Array<{ name: string }>;
};

export type ScoreMealLogInput = {
  mealSlot: string;
  status: MealStatus;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
};

export type ScoreHabitInput = {
  waterMl?: number;
  supplementsTaken?: string[];
} | null;

export type MealBreakdownEntry = {
  mealSlot: string;
  label: string;
  status: MealStatus | 'unlogged';
  points: number | null; // 0..1, null when unlogged
  detailed: boolean;
};

export type DayScore = {
  date: string;
  score: number | null; // null = nothing logged yet
  confidence: 'low' | 'medium' | 'high';
  mealBreakdown: MealBreakdownEntry[];
  waterStatus: { ml: number; targetMl: number; pct: number };
  supplementStatus: { taken: number; planned: number };
  positiveLabels: string[];
  negativeLabels: string[];
  nextAction: string;
  explanation: string;
};

function normalizeGoal(goal: string): TargetGoal {
  const known: TargetGoal[] = ['Weight Loss', 'Muscle Gain', 'General Fitness', 'Strength'];
  return known.includes(goal as TargetGoal) ? (goal as TargetGoal) : 'General Fitness';
}

/** Base points (0..1) per confirmation status, by goal. */
const STATUS_POINTS: Record<TargetGoal, Record<MealStatus, number>> = {
  'Weight Loss': { done: 1, lighter: 0.85, heavier: 0.55, off_plan: 0.35, skipped: 0.55 },
  'Muscle Gain': { done: 1, lighter: 0.6, heavier: 0.9, off_plan: 0.5, skipped: 0.3 },
  Strength: { done: 1, lighter: 0.7, heavier: 0.85, off_plan: 0.5, skipped: 0.4 },
  'General Fitness': { done: 1, lighter: 0.8, heavier: 0.75, off_plan: 0.5, skipped: 0.5 },
};

const STATUS_NEGATIVE_LABEL: Record<MealStatus, string | null> = {
  done: null,
  heavier: 'marked heavier than planned',
  lighter: 'marked lighter than planned',
  off_plan: 'off-plan',
  skipped: 'skipped',
};

/**
 * Detailed-macro adjustment for one meal: protein inside the target range
 * lifts the meal to full points; well under range pulls it down (harder for
 * fat loss and muscle gain, where protein is the anchor).
 */
function proteinAdjust(base: number, proteinG: number, range: GramRange, goal: TargetGoal): number {
  if (range.min <= 0) return base;
  if (proteinG >= range.min) return Math.max(base, proteinG <= range.max * 1.3 ? 1 : 0.85);
  const ratio = proteinG / range.min;
  const floor = goal === 'General Fitness' ? 0.5 : 0.35;
  return Math.max(floor * base, base * Math.max(ratio, 0.4));
}

export function scoreDay(args: {
  date: string;
  target: ScoreTargetInput;
  mealLogs: ScoreMealLogInput[];
  habit: ScoreHabitInput;
}): DayScore {
  const goal = normalizeGoal(args.target.goal);
  const logBySlot = new Map(args.mealLogs.map((l) => [l.mealSlot, l]));

  let detailedCount = 0;
  const mealBreakdown: MealBreakdownEntry[] = args.target.mealSlots.map((slot) => {
    const log = logBySlot.get(slot.mealSlot);
    if (!log) {
      return { mealSlot: slot.mealSlot, label: slot.label, status: 'unlogged', points: null, detailed: false };
    }
    const detailed = log.proteinG != null;
    if (detailed) detailedCount += 1;
    let points = STATUS_POINTS[goal][log.status];
    if (log.status !== 'skipped' && log.proteinG != null) {
      points = proteinAdjust(points, log.proteinG, slot.proteinGRange, goal);
    }
    return {
      mealSlot: slot.mealSlot,
      label: slot.label,
      status: log.status,
      points: Math.max(0, Math.min(1, points)),
      detailed,
    };
  });

  const logged = mealBreakdown.filter((m) => m.points !== null);
  const slotCount = args.target.mealSlots.length || 1;

  const waterTarget = Math.max(1, args.target.waterTargetMl);
  const waterMl = Math.max(0, args.habit?.waterMl ?? 0);
  const waterPct = Math.min(100, Math.round((waterMl / waterTarget) * 100));

  const planned = args.target.supplementPlan.length;
  const takenSet = new Set((args.habit?.supplementsTaken ?? []).map((s) => s.trim().toLowerCase()));
  const taken = args.target.supplementPlan.filter((s) => takenSet.has(s.name.trim().toLowerCase())).length;

  const anyData = logged.length > 0 || waterMl > 0 || taken > 0;
  if (!anyData) {
    return {
      date: args.date,
      score: null,
      confidence: 'low',
      mealBreakdown,
      waterStatus: { ml: waterMl, targetMl: waterTarget, pct: waterPct },
      supplementStatus: { taken, planned },
      positiveLabels: [],
      negativeLabels: [],
      nextAction: `Log your first meal (${args.target.mealSlots[0]?.label ?? 'breakfast'})`,
      explanation: 'No nutrition logged yet today.',
    };
  }

  // --- Weighted components ---
  const waterWeight = goal === 'Weight Loss' ? 0.2 : 0.15;
  const suppWeight = planned > 0 ? 0.05 : 0;
  const mealWeight = 1 - waterWeight - suppWeight;

  const mealAvg = logged.length
    ? logged.reduce((s, m) => s + (m.points ?? 0), 0) / logged.length
    : 0.5; // habits-only day: neutral meal component
  const waterComponent = Math.min(1, waterMl / waterTarget);
  const suppComponent = planned > 0 ? taken / planned : 0;

  const score = Math.round(
    100 * (mealAvg * mealWeight + waterComponent * waterWeight + suppComponent * suppWeight),
  );

  // --- Confidence: coverage + detail, never inflated ---
  const coverage = logged.length / slotCount;
  const confidence: DayScore['confidence'] =
    detailedCount >= Math.min(3, slotCount) && coverage >= 0.6
      ? 'high'
      : coverage >= 0.5
        ? 'medium'
        : 'low';

  // --- Labels ---
  const positiveLabels: string[] = [];
  const negativeLabels: string[] = [];
  const onPlan = logged.filter((m) => m.status === 'done');
  if (onPlan.length === logged.length && logged.length >= 3) positiveLabels.push('All logged meals on plan');
  else if (onPlan.length >= 2) positiveLabels.push(`${onPlan.length} meals on plan`);
  if (waterPct >= 100) positiveLabels.push('Water target met');
  else if (waterPct >= 70) positiveLabels.push('Good water intake');
  if (planned > 0 && taken === planned) positiveLabels.push('Supplements complete');
  if (detailedCount > 0) positiveLabels.push('Detailed logging — more accurate score');

  for (const m of mealBreakdown) {
    if (m.points === null) continue;
    const neg = STATUS_NEGATIVE_LABEL[m.status as MealStatus];
    if (neg) negativeLabels.push(`${m.label} ${neg}`);
  }
  if (waterMl > 0 && waterPct < 50) negativeLabels.push('Water intake well below target');
  if (goal !== 'General Fitness') {
    const lowProtein = mealBreakdown.filter((m) => m.detailed && (m.points ?? 1) < 0.7);
    if (lowProtein.length > 0) negativeLabels.push(`Low protein at ${lowProtein.map((m) => m.label.toLowerCase()).join(', ')}`);
  }

  // --- Next action ---
  const firstUnlogged = mealBreakdown.find((m) => m.points === null);
  const nextAction =
    firstUnlogged != null
      ? `Log ${firstUnlogged.label.toLowerCase()}`
      : waterPct < 100
        ? `Drink ${waterTarget - waterMl} ml more water`
        : planned > taken
          ? 'Check off your supplements'
          : 'Day complete — nice work';

  // --- Explanation (goal-aware, honest) ---
  const parts: string[] = [];
  if (mealAvg >= 0.85 && logged.length >= 2) parts.push('Good consistency today.');
  else if (mealAvg < 0.6 && logged.length >= 1) {
    parts.push(goal === 'Muscle Gain' ? 'Missed fuel is slowing muscle gain today.' : 'Today drifted from the plan.');
  }
  const worst = [...logged].sort((a, b) => (a.points ?? 1) - (b.points ?? 1))[0];
  if (worst && (worst.points ?? 1) < 0.7) {
    const neg = STATUS_NEGATIVE_LABEL[worst.status as MealStatus];
    if (neg) parts.push(`${worst.label} was ${neg}, which lowered your ${goal.toLowerCase()} score.`);
  }
  if (waterPct < 70) parts.push('Completing your water target will lift the score.');
  if (confidence === 'low') parts.push('Score is approximate — log more meals for a better estimate.');
  if (parts.length === 0) parts.push('On track — keep logging as you go.');

  return {
    date: args.date,
    score: Math.max(0, Math.min(100, score)),
    confidence,
    mealBreakdown,
    waterStatus: { ml: waterMl, targetMl: waterTarget, pct: waterPct },
    supplementStatus: { taken, planned },
    positiveLabels,
    negativeLabels,
    nextAction,
    explanation: parts.join(' '),
  };
}

export type RangeScoreSummary = {
  averageScore: number | null;
  daysWithData: number;
  totalDays: number;
  bestDay: { date: string; score: number } | null;
  worstDay: { date: string; score: number } | null;
};

export function summarizeRange(days: DayScore[]): RangeScoreSummary {
  const withData = days.filter((d): d is DayScore & { score: number } => d.score !== null);
  if (withData.length === 0) {
    return { averageScore: null, daysWithData: 0, totalDays: days.length, bestDay: null, worstDay: null };
  }
  const sorted = [...withData].sort((a, b) => a.score - b.score);
  return {
    averageScore: Math.round(withData.reduce((s, d) => s + d.score, 0) / withData.length),
    daysWithData: withData.length,
    totalDays: days.length,
    bestDay: { date: sorted[sorted.length - 1].date, score: sorted[sorted.length - 1].score },
    worstDay: { date: sorted[0].date, score: sorted[0].score },
  };
}
