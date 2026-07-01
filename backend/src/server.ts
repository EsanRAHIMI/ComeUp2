import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { buildApp } from './app.js';
import { ensureDefaultNutritionTemplate } from './services/nutritionPlanService.js';
import { ensureNutritionUploadDirs } from './services/nutritionStorage.js';

const app = await buildApp();

try {
  await connectDatabase();
  await ensureNutritionUploadDirs();
  await ensureDefaultNutritionTemplate();
  await app.listen({ port: env.PORT, host: env.BIND_HOST });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

async function shutdown(signal: string) {
  app.log.info({ signal }, 'Shutting down');
  await app.close();
  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
