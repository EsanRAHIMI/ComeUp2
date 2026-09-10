/** Premium entitlement helpers for ComeUp IAP. */
export type SubscriptionStatus = 'none' | 'active' | 'expired' | 'grace' | 'revoked';

export type PremiumUserLike = {
  subscriptionStatus?: SubscriptionStatus | null;
  subscriptionExpiresAt?: Date | string | null;
  subscriptionProductId?: string | null;
  subscriptionOriginalTransactionId?: string | null;
};

/** True when status is active/grace and expiresAt is still in the future. */
export function userIsPremium(user: PremiumUserLike | null | undefined, now = new Date()): boolean {
  if (!user) return false;
  const status = user.subscriptionStatus ?? 'none';
  if (status !== 'active' && status !== 'grace') return false;
  if (!user.subscriptionExpiresAt) return false;
  const expires = user.subscriptionExpiresAt instanceof Date
    ? user.subscriptionExpiresAt
    : new Date(user.subscriptionExpiresAt);
  if (Number.isNaN(expires.getTime())) return false;
  return expires.getTime() > now.getTime();
}

export const PREMIUM_PRODUCT_IDS = [
  'comeup_premium_monthly',
  'comeup_premium_yearly',
] as const;

export type PremiumProductId = (typeof PREMIUM_PRODUCT_IDS)[number];

export function isPremiumProductId(value: string): value is PremiumProductId {
  return (PREMIUM_PRODUCT_IDS as readonly string[]).includes(value);
}

export const FREE_WEEKLY_GPT_LIMIT = 5;

/** Pure quota selector — keep free of env imports for easy unit tests. */
export function selectWeeklyGptLimit(
  isPremium: boolean,
  premiumLimit: number,
  freeLimit: number = FREE_WEEKLY_GPT_LIMIT,
): number {
  return isPremium ? premiumLimit : freeLimit;
}
