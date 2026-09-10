import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { User } from '../models/User.js';
import {
  AppleIapError,
  appleIapCredentialsConfigured,
  appleIapDevGrantEnabled,
  verifyApplePurchase,
} from '../services/appleIap.js';
import { publicUser } from '../utils/publicUser.js';
import { userIsPremium } from '../utils/premium.js';
import { parseBody } from '../utils/schemas.js';

const verifyBodySchema = z
  .object({
    signedTransactionInfo: z.string().min(1).optional(),
    transactionId: z.string().min(1).optional(),
    productId: z.string().min(1).optional(),
    /** Dev-only flag — ignored unless APPLE_IAP_DEV_GRANT is enabled in development. */
    devGrant: z.boolean().optional(),
  })
  .refine(
    (body) => Boolean(body.signedTransactionInfo || body.transactionId || (body.devGrant && body.productId)),
    { message: 'signedTransactionInfo or transactionId is required' },
  );

async function applyEntitlement(userId: string, verified: Awaited<ReturnType<typeof verifyApplePurchase>>) {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      subscriptionStatus: verified.status === 'expired' ? 'expired' : verified.status,
      subscriptionProductId: verified.productId,
      subscriptionExpiresAt: verified.expiresAt,
      subscriptionOriginalTransactionId: verified.originalTransactionId,
    },
    { new: true },
  );
  if (!user) throw new AppleIapError('User not found', 404, 'USER_NOT_FOUND');
  return user;
}

function entitlementPayload(user: any) {
  return {
    isPremium: userIsPremium(user),
    status: (user.subscriptionStatus as string | undefined) ?? 'none',
    productId: user.subscriptionProductId ?? undefined,
    expiresAt: user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).toISOString() : null,
    originalTransactionId: user.subscriptionOriginalTransactionId ?? undefined,
    user: publicUser(user),
  };
}

async function verifyHandler(request: FastifyRequest, reply: FastifyReply) {
  const body = parseBody(verifyBodySchema, request.body);

  try {
    const verified = await verifyApplePurchase(body);
    const user = await applyEntitlement(request.user.sub, verified);
    return {
      ok: true,
      verified: {
        productId: verified.productId,
        transactionId: verified.transactionId,
        originalTransactionId: verified.originalTransactionId,
        expiresAt: verified.expiresAt.toISOString(),
        status: verified.status,
        environment: verified.environment,
      },
      ...entitlementPayload(user),
    };
  } catch (error) {
    if (error instanceof AppleIapError) {
      return reply.code(error.status).send({ message: error.message, code: error.code });
    }
    throw error;
  }
}

export const billingRoutes: FastifyPluginAsync = async (app) => {
  app.get('/billing/status', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = await User.findById(request.user.sub);
    if (!user) return reply.code(404).send({ message: 'User not found' });
    return {
      ...entitlementPayload(user),
      configured: appleIapCredentialsConfigured() || appleIapDevGrantEnabled(),
      /** App Store Server Notifications V2 — deferred. */
      notificationsWebhook: 'TODO',
    };
  });

  app.get('/subscriptions/status', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = await User.findById(request.user.sub);
    if (!user) return reply.code(404).send({ message: 'User not found' });
    return entitlementPayload(user);
  });

  app.post('/billing/apple/verify', { preHandler: [app.authenticate] }, verifyHandler);
  app.post('/billing/apple/restore', { preHandler: [app.authenticate] }, verifyHandler);
  app.post('/subscriptions/apple/verify', { preHandler: [app.authenticate] }, verifyHandler);
  app.post('/subscriptions/apple/restore', { preHandler: [app.authenticate] }, verifyHandler);

  // Stub for App Store Server Notifications V2 — implement later.
  app.post('/billing/apple/notifications', async (request, reply) => {
    request.log.info(
      { bodyKeys: Object.keys((request.body as object) ?? {}) },
      'Apple ASN V2 stub (not processed)',
    );
    return reply.code(202).send({
      ok: true,
      message: 'Server Notifications V2 webhook stub — not yet processed',
      code: 'NOTIFICATIONS_TODO',
    });
  });
};
