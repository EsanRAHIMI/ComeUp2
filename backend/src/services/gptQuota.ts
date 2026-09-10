import { env } from '../config/env.js';
import { GptUsage } from '../models/GptUsage.js';
import { User } from '../models/User.js';
import { FREE_WEEKLY_GPT_LIMIT, selectWeeklyGptLimit, userIsPremium } from '../utils/premium.js';

/** @deprecated Prefer FREE_WEEKLY_GPT_LIMIT / weeklyLimitForUser */
export const WEEKLY_GPT_LIMIT = FREE_WEEKLY_GPT_LIMIT;

export type QuotaStatus = {
  limit: number;
  used: number;
  remaining: number;
  weekStartDate: string;
  isPremium: boolean;
};

/** Monday 00:00 UTC of the week containing `date` (ISO week start). */
export function startOfWeek(date = new Date()): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = d.getUTCDay(); // 0 = Sunday
  const shiftToMonday = (weekday === 0 ? -6 : 1) - weekday;
  d.setUTCDate(d.getUTCDate() + shiftToMonday);
  return d;
}

export { FREE_WEEKLY_GPT_LIMIT, selectWeeklyGptLimit } from '../utils/premium.js';

export function weeklyLimitForPremium(isPremium: boolean): number {
  return selectWeeklyGptLimit(isPremium, env.PREMIUM_GPT_WEEKLY_LIMIT, FREE_WEEKLY_GPT_LIMIT);
}

export async function resolveIsPremium(userId: string): Promise<boolean> {
  const user = await User.findById(userId).select(
    'subscriptionStatus subscriptionExpiresAt subscriptionProductId',
  );
  return userIsPremium(user);
}

function toStatus(weekStart: Date, used: number, isPremium: boolean): QuotaStatus {
  const limit = weeklyLimitForPremium(isPremium);
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    weekStartDate: weekStart.toISOString(),
    isPremium,
  };
}

export async function getQuota(userId: string): Promise<QuotaStatus> {
  const weekStart = startOfWeek();
  const isPremium = await resolveIsPremium(userId);
  const usage = await GptUsage.findOne({ userId });
  const used = usage && usage.weekStartDate.getTime() === weekStart.getTime() ? usage.messageCount : 0;
  return toStatus(weekStart, used, isPremium);
}

/**
 * Atomically consume one weekly GPT message for the user.
 * Resets the counter when a new ISO week has started. Returns ok:false when the
 * weekly limit is already reached.
 */
export async function consumeQuota(userId: string): Promise<{ ok: boolean; quota: QuotaStatus }> {
  const weekStart = startOfWeek();
  const isPremium = await resolveIsPremium(userId);
  const limit = weeklyLimitForPremium(isPremium);

  let usage = await GptUsage.findOne({ userId });
  if (!usage) {
    usage = await GptUsage.create({ userId, weekStartDate: weekStart, messageCount: 0 });
  }
  if (usage.weekStartDate.getTime() !== weekStart.getTime()) {
    usage.weekStartDate = weekStart;
    usage.messageCount = 0;
  }

  if (usage.messageCount >= limit) {
    return { ok: false, quota: toStatus(weekStart, usage.messageCount, isPremium) };
  }

  usage.messageCount += 1;
  await usage.save();
  return { ok: true, quota: toStatus(weekStart, usage.messageCount, isPremium) };
}
