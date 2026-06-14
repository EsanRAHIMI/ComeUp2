import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  AI_SERVICE_URL: z.string().url().default('http://localhost:4100'),
  AI_SERVICE_TOKEN: z.string().min(16),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Backend environment validation failed. Fix these Dokploy variables:');
  for (const issue of parsedEnv.error.issues) {
    console.error(`- ${issue.path.join('.') || 'ENV'}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsedEnv.data;

export const corsOrigins =
  env.CORS_ORIGIN === '*'
    ? true
    : env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
