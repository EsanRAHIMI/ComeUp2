import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4100),
  HOST: z.string().default('0.0.0.0'),
  BIND_HOST: z.string().default('0.0.0.0'),
  AI_SERVICE_TOKEN: z.string().min(16),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('AI service environment validation failed. Fix these Dokploy variables:');
  for (const issue of parsedEnv.error.issues) {
    console.error(`- ${issue.path.join('.') || 'ENV'}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsedEnv.data;
