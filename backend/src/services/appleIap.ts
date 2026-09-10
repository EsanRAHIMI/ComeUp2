/**
 * Apple StoreKit 2 / App Store Server API verification for ComeUp Premium.
 *
 * Strategies (in order):
 * 1. Dev grant (NODE_ENV=development + APPLE_IAP_DEV_GRANT=1 only)
 * 2. App Store Server API getTransactionInfo when API credentials are present
 * 3. Local JWS verification of signedTransactionInfo via `jose` + x5c chain
 *
 * Production without credentials: callers should return 503.
 */
import { createPrivateKey, X509Certificate, createPublicKey } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as jose from 'jose';
import { env } from '../config/env.js';
import { isPremiumProductId, type PremiumProductId, type SubscriptionStatus } from '../utils/premium.js';

export type VerifiedAppleTransaction = {
  productId: PremiumProductId;
  transactionId: string;
  originalTransactionId: string;
  expiresAt: Date;
  status: SubscriptionStatus;
  environment: 'Sandbox' | 'Production';
  bundleId: string;
  raw?: Record<string, unknown>;
};

export class AppleIapError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = 'APPLE_IAP_ERROR') {
    super(message);
    this.name = 'AppleIapError';
    this.status = status;
    this.code = code;
  }
}

const MONTHLY_MS = 31 * 24 * 60 * 60 * 1000;
const YEARLY_MS = 366 * 24 * 60 * 60 * 1000;

export function appleIapCredentialsConfigured(): boolean {
  return Boolean(
    env.APPLE_IAP_ISSUER_ID?.trim() &&
      env.APPLE_IAP_KEY_ID?.trim() &&
      env.APPLE_IAP_PRIVATE_KEY?.trim(),
  );
}

export function appleIapDevGrantEnabled(): boolean {
  return env.NODE_ENV === 'development' && Boolean(env.APPLE_IAP_DEV_GRANT);
}

function loadPrivateKeyPem(): string {
  const raw = env.APPLE_IAP_PRIVATE_KEY?.trim() ?? '';
  if (!raw) throw new AppleIapError('APPLE_IAP_PRIVATE_KEY missing', 503, 'APPLE_IAP_NOT_CONFIGURED');
  if (raw.includes('BEGIN PRIVATE KEY') || raw.includes('BEGIN EC PRIVATE KEY')) {
    return raw.replace(/\\n/g, '\n');
  }
  // Treat as filesystem path
  try {
    return readFileSync(raw, 'utf8');
  } catch {
    throw new AppleIapError('Could not read APPLE_IAP_PRIVATE_KEY path', 503, 'APPLE_IAP_NOT_CONFIGURED');
  }
}

async function createAppStoreApiToken(): Promise<string> {
  const pem = loadPrivateKeyPem();
  const key = createPrivateKey(pem);
  const now = Math.floor(Date.now() / 1000);
  return new jose.SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: env.APPLE_IAP_KEY_ID!, typ: 'JWT' })
    .setIssuer(env.APPLE_IAP_ISSUER_ID!)
    .setIssuedAt(now)
    .setExpirationTime(now + 20 * 60)
    .setAudience('appstoreconnect-v1')
    .sign(key);
}

function apiBase(): string {
  return env.APPLE_IAP_ENVIRONMENT === 'Production'
    ? 'https://api.storekit.itunes.apple.com'
    : 'https://api.storekit-sandbox.itunes.apple.com';
}

function mapSubscriptionStatus(payload: Record<string, unknown>): SubscriptionStatus {
  const expiresDate = Number(payload.expiresDate ?? 0);
  const revocationDate = payload.revocationDate ? Number(payload.revocationDate) : 0;
  if (revocationDate > 0) return 'revoked';
  if (expiresDate && expiresDate > Date.now()) return 'active';
  if (expiresDate && expiresDate <= Date.now()) return 'expired';
  return 'active';
}

function normalizeTransactionPayload(payload: Record<string, unknown>): VerifiedAppleTransaction {
  const productId = String(payload.productId ?? '');
  if (!isPremiumProductId(productId)) {
    throw new AppleIapError(`Unsupported productId: ${productId}`, 400, 'INVALID_PRODUCT');
  }
  const bundleId = String(payload.bundleId ?? '');
  if (bundleId && bundleId !== env.APPLE_BUNDLE_ID) {
    throw new AppleIapError('bundleId mismatch', 400, 'BUNDLE_MISMATCH');
  }
  const transactionId = String(payload.transactionId ?? '');
  const originalTransactionId = String(payload.originalTransactionId ?? transactionId);
  if (!transactionId) {
    throw new AppleIapError('Missing transactionId', 400, 'INVALID_TRANSACTION');
  }
  const expiresMs = Number(payload.expiresDate ?? 0);
  const expiresAt = expiresMs > 0
    ? new Date(expiresMs)
    : new Date(Date.now() + (productId.endsWith('yearly') ? YEARLY_MS : MONTHLY_MS));

  const environmentRaw = String(payload.environment ?? env.APPLE_IAP_ENVIRONMENT);
  const environment: 'Sandbox' | 'Production' =
    environmentRaw.toLowerCase() === 'production' ? 'Production' : 'Sandbox';

  return {
    productId,
    transactionId,
    originalTransactionId,
    expiresAt,
    status: mapSubscriptionStatus({ ...payload, expiresDate: expiresAt.getTime() }),
    environment,
    bundleId: bundleId || env.APPLE_BUNDLE_ID,
    raw: payload,
  };
}

async function fetchTransactionViaServerApi(transactionId: string): Promise<VerifiedAppleTransaction> {
  const token = await createAppStoreApiToken();
  const url = `${apiBase()}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new AppleIapError(
      `App Store Server API error (${res.status}): ${body.slice(0, 200)}`,
      res.status === 404 ? 404 : 502,
      'APPLE_API_ERROR',
    );
  }
  const data = (await res.json()) as { signedTransactionInfo?: string };
  if (!data.signedTransactionInfo) {
    throw new AppleIapError('App Store Server API returned no signedTransactionInfo', 502, 'APPLE_API_ERROR');
  }
  return verifySignedTransactionJws(data.signedTransactionInfo, { skipApiFallback: true });
}

/**
 * Verify StoreKit 2 JWS using the embedded x5c certificate chain.
 * Validates leaf signature; checks intermediate/root presence when available.
 */
export async function verifySignedTransactionJws(
  signedTransactionInfo: string,
  opts?: { skipApiFallback?: boolean },
): Promise<VerifiedAppleTransaction> {
  const parts = signedTransactionInfo.split('.');
  if (parts.length !== 3) {
    throw new AppleIapError('signedTransactionInfo is not a JWS', 400, 'INVALID_JWS');
  }

  let header: jose.ProtectedHeaderParameters;
  try {
    header = jose.decodeProtectedHeader(signedTransactionInfo);
  } catch {
    throw new AppleIapError('Could not decode JWS header', 400, 'INVALID_JWS');
  }

  const x5c = header.x5c;
  if (!Array.isArray(x5c) || x5c.length === 0) {
    // No certs in header — fall back to Server API if configured
    if (!opts?.skipApiFallback && appleIapCredentialsConfigured()) {
      const unverified = jose.decodeJwt(signedTransactionInfo) as Record<string, unknown>;
      const txId = String(unverified.transactionId ?? '');
      if (!txId) throw new AppleIapError('JWS missing transactionId and x5c', 400, 'INVALID_JWS');
      return fetchTransactionViaServerApi(txId);
    }
    throw new AppleIapError('JWS missing x5c certificates', 400, 'INVALID_JWS');
  }

  try {
    const leafPem = `-----BEGIN CERTIFICATE-----\n${x5c[0]}\n-----END CERTIFICATE-----`;
    const leaf = new X509Certificate(leafPem);
    const key = createPublicKey(leaf.publicKey);

    // Best-effort chain check: each cert signed by the next
    for (let i = 0; i < x5c.length - 1; i += 1) {
      const cert = new X509Certificate(`-----BEGIN CERTIFICATE-----\n${x5c[i]}\n-----END CERTIFICATE-----`);
      const issuer = new X509Certificate(`-----BEGIN CERTIFICATE-----\n${x5c[i + 1]}\n-----END CERTIFICATE-----`);
      if (!cert.verify(issuer.publicKey)) {
        throw new AppleIapError('Apple certificate chain verification failed', 400, 'INVALID_JWS');
      }
    }

    const { payload } = await jose.jwtVerify(signedTransactionInfo, key, {
      algorithms: ['ES256'],
    });
    return normalizeTransactionPayload(payload as Record<string, unknown>);
  } catch (error) {
    if (error instanceof AppleIapError) throw error;
    throw new AppleIapError(
      error instanceof Error ? error.message : 'JWS verification failed',
      400,
      'INVALID_JWS',
    );
  }
}

function defaultExpiryForProduct(productId: PremiumProductId): Date {
  return new Date(Date.now() + (productId.endsWith('yearly') ? YEARLY_MS : MONTHLY_MS));
}

/** Development-only entitlement grant — never available in production. */
export function tryDevGrant(input: {
  signedTransactionInfo?: string;
  productId?: string;
  transactionId?: string;
  devGrant?: boolean;
}): VerifiedAppleTransaction | null {
  if (!appleIapDevGrantEnabled()) return null;

  const signed = input.signedTransactionInfo?.trim() ?? '';
  if (signed.startsWith('DEV.')) {
    // DEV.<productId>[.<days>]
    const parts = signed.split('.');
    const productId = parts[1] ?? 'comeup_premium_monthly';
    if (!isPremiumProductId(productId)) {
      throw new AppleIapError(`Dev grant unsupported productId: ${productId}`, 400, 'INVALID_PRODUCT');
    }
    const days = Number(parts[2] ?? 31);
    const expiresAt = new Date(Date.now() + (Number.isFinite(days) ? days : 31) * 86_400_000);
    return {
      productId,
      transactionId: `dev_${Date.now()}`,
      originalTransactionId: `dev_orig_${input.transactionId ?? Date.now()}`,
      expiresAt,
      status: 'active',
      environment: 'Sandbox',
      bundleId: env.APPLE_BUNDLE_ID,
    };
  }

  if (input.devGrant === true && input.productId && isPremiumProductId(input.productId)) {
    return {
      productId: input.productId,
      transactionId: input.transactionId ?? `dev_${Date.now()}`,
      originalTransactionId: input.transactionId ?? `dev_orig_${Date.now()}`,
      expiresAt: defaultExpiryForProduct(input.productId),
      status: 'active',
      environment: 'Sandbox',
      bundleId: env.APPLE_BUNDLE_ID,
    };
  }

  return null;
}

export type VerifyAppleInput = {
  signedTransactionInfo?: string;
  transactionId?: string;
  productId?: string;
  devGrant?: boolean;
};

/**
 * Verify a purchase/restore payload and return a normalized entitlement snapshot.
 */
export async function verifyApplePurchase(input: VerifyAppleInput): Promise<VerifiedAppleTransaction> {
  const dev = tryDevGrant(input);
  if (dev) return dev;

  const signed = input.signedTransactionInfo?.trim();
  if (signed) {
    return verifySignedTransactionJws(signed);
  }

  if (input.transactionId?.trim()) {
    if (!appleIapCredentialsConfigured()) {
      throw new AppleIapError(
        'Apple IAP API credentials are not configured. Set APPLE_IAP_ISSUER_ID, APPLE_IAP_KEY_ID, APPLE_IAP_PRIVATE_KEY.',
        503,
        'APPLE_IAP_NOT_CONFIGURED',
      );
    }
    const verified = await fetchTransactionViaServerApi(input.transactionId.trim());
    if (input.productId && verified.productId !== input.productId) {
      throw new AppleIapError('productId does not match transaction', 400, 'PRODUCT_MISMATCH');
    }
    return verified;
  }

  if (!appleIapCredentialsConfigured() && env.NODE_ENV === 'production') {
    throw new AppleIapError(
      'Apple IAP is not configured on this server',
      503,
      'APPLE_IAP_NOT_CONFIGURED',
    );
  }

  throw new AppleIapError(
    'Provide signedTransactionInfo (StoreKit 2 JWS) or transactionId',
    400,
    'MISSING_TRANSACTION',
  );
}
