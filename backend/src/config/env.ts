import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  BIND_HOST: z.string().default('0.0.0.0'),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  AI_SERVICE_URL: z.string().url().default('http://localhost:4100'),
  AI_SERVICE_TOKEN: z.string().min(16),
  /** Comma-separated admin emails (case-insensitive). */
  ADMIN_EMAILS: z.string().default(''),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  /** Root folder for all ComeUp/Gym files inside AWS_S3_BUCKET (e.g. gym/nutrition/photos/...). */
  AWS_S3_PREFIX: z.string().default('gym'),
  /** Dev-only: ephemeral files in OS temp — never use on deploy/production. */
  NUTRITION_LOCAL_STORAGE: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_PUBLIC_BASE_URL: z.string().url().optional(),
  /** Apple IAP / App Store Server API */
  APPLE_BUNDLE_ID: z.string().default('com.najahai.comeup'),
  APPLE_IAP_ENVIRONMENT: z.enum(['Sandbox', 'Production']).default('Sandbox'),
  APPLE_IAP_ISSUER_ID: z.string().optional(),
  APPLE_IAP_KEY_ID: z.string().optional(),
  /** PEM contents or absolute path to .p8 — never commit real keys. */
  APPLE_IAP_PRIVATE_KEY: z.string().optional(),
  PREMIUM_GPT_WEEKLY_LIMIT: z.coerce.number().int().positive().default(50),
  /**
   * Dev-only grant path. NEVER set in production.
   * When NODE_ENV=development and this is '1', verify accepts DEV.* signedTransactionInfo
   * or { productId, devGrant: true }.
   */
  APPLE_IAP_DEV_GRANT: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1'),
}).superRefine((data, ctx) => {
  const s3Ready = Boolean(
    data.AWS_ACCESS_KEY_ID?.trim() &&
      data.AWS_SECRET_ACCESS_KEY?.trim() &&
      data.AWS_REGION?.trim() &&
      data.AWS_S3_BUCKET?.trim(),
  );

  if (data.NODE_ENV === 'production' && !s3Ready) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Production requires AWS S3 for nutrition uploads',
      path: ['AWS_S3_BUCKET'],
    });
  }

  if (data.NUTRITION_LOCAL_STORAGE && data.NODE_ENV !== 'development') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'NUTRITION_LOCAL_STORAGE is allowed only in development',
      path: ['NUTRITION_LOCAL_STORAGE'],
    });
  }

  if (data.APPLE_IAP_DEV_GRANT && data.NODE_ENV === 'production') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'APPLE_IAP_DEV_GRANT must never be enabled in production',
      path: ['APPLE_IAP_DEV_GRANT'],
    });
  }
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Backend environment validation failed. Fix these Dokploy variables:');
  for (const issue of parsedEnv.error.issues) {
    console.error(`- ${issue.path.join('.') || 'ENV'}: ${issue.message}`);
  }
  process.exit(1);
}

const adminEmails = parsedEnv.data.ADMIN_EMAILS.split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const env = { ...parsedEnv.data, ADMIN_EMAILS: adminEmails };

export const corsOrigins =
  env.CORS_ORIGIN === '*'
    ? true
    : env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
