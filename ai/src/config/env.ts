import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4100),
  HOST: z.string().default('0.0.0.0'),
  AI_SERVICE_TOKEN: z.string().min(16),
});

export const env = envSchema.parse(process.env);
