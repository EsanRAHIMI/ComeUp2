import { GptUsage } from '../models/GptUsage.js';

export const WEEKLY_GPT_LIMIT = 5;

export type QuotaStatus = {
  limit: number;
  used: number;
  remaining: number;
  weekStartDate: string;
};

/** Monday 00:00 UTC of the week containing `date` (ISO week start). */
export function startOfWeek(date = new Date()): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = d.getUTCDay(); // 0 = Sunday
  const shiftToMonday = (weekday === 0 ? -6 : 1) - weekday;
  d.setUTCDate(d.getUTCDate() + shiftToMonday);
  return d;
}

function toStatus(weekStart: Date, used: number): QuotaStatus {
  return {
    limit: WEEKLY_GPT_LIMIT,
    used,
    remaining: Math.max(0, WEEKLY_GPT_LIMIT - used),
    weekStartDate: weekStart.toISOString(),
  };
}

export async function getQuota(userId: string): Promise<QuotaStatus> {
  const weekStart = startOfWeek();
  const usage = await GptUsage.findOne({ userId });
  const used = usage && usage.weekStartDate.getTime() === weekStart.getTime() ? usage.messageCount : 0;
  return toStatus(weekStart, used);
}

/**
 * Atomically consume one weekly GPT message for the user.
 * Resets the counter when a new ISO week has started. Returns ok:false when the
 * weekly limit is already reached.
 */
export async function consumeQuota(userId: string): Promise<{ ok: boolean; quota: QuotaStatus }> {
  const weekStart = startOfWeek();

  let usage = await GptUsage.findOne({ userId });
  if (!usage) {
    usage = await GptUsage.create({ userId, weekStartDate: weekStart, messageCount: 0 });
  }
  if (usage.weekStartDate.getTime() !== weekStart.getTime()) {
    usage.weekStartDate = weekStart;
    usage.messageCount = 0;
  }

  if (usage.messageCount >= WEEKLY_GPT_LIMIT) {
    return { ok: false, quota: toStatus(weekStart, usage.messageCount) };
  }

  usage.messageCount += 1;
  await usage.save();
  return { ok: true, quota: toStatus(weekStart, usage.messageCount) };
}
