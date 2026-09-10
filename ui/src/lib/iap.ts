/**
 * ComeUp Premium — StoreKit wrapper via @capgo/native-purchases.
 * Native iOS only; web returns friendly no-op results (no external checkout).
 */
import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';

export const PREMIUM_PRODUCT_IDS = [
  'comeup_premium_monthly',
  'comeup_premium_yearly',
] as const;

export type PremiumProductId = (typeof PREMIUM_PRODUCT_IDS)[number];

export type IapProduct = {
  id: PremiumProductId;
  title: string;
  description: string;
  priceString: string;
  price: number;
};

export type IapPurchaseResult = {
  productId: string;
  transactionId: string;
  /** StoreKit 2 JWS — preferred for backend verify. */
  signedTransactionInfo?: string;
  /** Legacy receipt (fallback). */
  receipt?: string;
  expirationDate?: string;
};

export function isNativeIapPlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

export async function getProducts(): Promise<IapProduct[]> {
  if (!isNativeIapPlatform()) return [];
  const { products } = await NativePurchases.getProducts({
    productIdentifiers: [...PREMIUM_PRODUCT_IDS],
    productType: PURCHASE_TYPE.SUBS,
  });
  return products
    .filter((p) => (PREMIUM_PRODUCT_IDS as readonly string[]).includes(p.identifier))
    .map((p) => ({
      id: p.identifier as PremiumProductId,
      title: p.title,
      description: p.description,
      priceString: p.priceString,
      price: p.price,
    }));
}

export async function purchase(productId: PremiumProductId): Promise<IapPurchaseResult> {
  if (!isNativeIapPlatform()) {
    throw new Error('Purchases are only available in the iOS app');
  }
  const tx = await NativePurchases.purchaseProduct({
    productIdentifier: productId,
    productType: PURCHASE_TYPE.SUBS,
  });
  return {
    productId: tx.productIdentifier,
    transactionId: tx.transactionId,
    signedTransactionInfo: tx.jwsRepresentation,
    receipt: tx.receipt,
    expirationDate: tx.expirationDate,
  };
}

/**
 * Restore previous subscriptions and return the best active premium transaction
 * (if any) for backend verification.
 */
export async function restore(): Promise<IapPurchaseResult | null> {
  if (!isNativeIapPlatform()) {
    throw new Error('Restore is only available in the iOS app');
  }
  await NativePurchases.restorePurchases();
  const { purchases } = await NativePurchases.getPurchases({
    productType: PURCHASE_TYPE.SUBS,
    onlyCurrentEntitlements: true,
  });
  const premium = purchases.filter((p) =>
    (PREMIUM_PRODUCT_IDS as readonly string[]).includes(p.productIdentifier),
  );
  if (!premium.length) return null;
  // Prefer active / latest expiry
  premium.sort((a, b) => {
    const ae = a.expirationDate ? Date.parse(a.expirationDate) : 0;
    const be = b.expirationDate ? Date.parse(b.expirationDate) : 0;
    return be - ae;
  });
  const tx = premium[0]!;
  return {
    productId: tx.productIdentifier,
    transactionId: tx.transactionId,
    signedTransactionInfo: tx.jwsRepresentation,
    receipt: tx.receipt,
    expirationDate: tx.expirationDate,
  };
}

export async function manageSubscriptions(): Promise<void> {
  if (!isNativeIapPlatform()) return;
  await NativePurchases.manageSubscriptions();
}
