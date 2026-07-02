import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { isS3Configured, s3DeleteObject, s3GetObject, s3PutObject } from './s3Client.js';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function usesS3ForNutrition() {
  return isS3Configured();
}

function allowsEphemeralLocalStorage() {
  return env.NODE_ENV === 'development' && env.NUTRITION_LOCAL_STORAGE;
}

function localNutritionRoot() {
  return path.join(os.tmpdir(), 'comeup-nutrition-uploads');
}

function resolveNutritionPath(storageKey: string) {
  if (!storageKey || storageKey.includes('..') || path.isAbsolute(storageKey)) {
    throw new Error('Invalid storage key');
  }
  const root = localNutritionRoot();
  const absolutePath = path.resolve(root, storageKey);
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new Error('Invalid storage key');
  }
  return absolutePath;
}

function nutritionStorageError() {
  return new Error(
    'Nutrition files must be stored in S3. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET. For offline local dev only, set NUTRITION_LOCAL_STORAGE=true (files go to OS temp, not the project or host data dir).',
  );
}

/** Ensure storage is ready — S3 required everywhere except optional ephemeral dev fallback. */
export async function ensureNutritionStorageReady() {
  if (isS3Configured()) return;

  if (env.NODE_ENV === 'production' || !allowsEphemeralLocalStorage()) {
    throw nutritionStorageError();
  }

  const root = localNutritionRoot();
  await fs.mkdir(path.join(root, 'photos'), { recursive: true });
  await fs.mkdir(path.join(root, 'generated'), { recursive: true });
}

export function isAllowedNutritionMime(mimeType: string) {
  return ALLOWED_MIME.has(mimeType);
}

async function saveNutritionFile(input: {
  storageKey: string;
  buffer: Buffer;
  contentType: string;
}) {
  if (isS3Configured()) {
    await s3PutObject({
      storageKey: input.storageKey,
      body: input.buffer,
      contentType: input.contentType,
    });
    return input.storageKey;
  }

  await ensureNutritionStorageReady();
  const absolutePath = resolveNutritionPath(input.storageKey);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, input.buffer);
  return input.storageKey;
}

export async function saveNutritionPhoto(input: {
  userId: string;
  date: string;
  mealSlot: string;
  buffer: Buffer;
  mimeType: string;
}) {
  const ext = mimeToExt(input.mimeType);
  const storageKey = `photos/${input.userId}/${input.date}_${input.mealSlot}_${randomUUID()}.${ext}`;
  await saveNutritionFile({ storageKey, buffer: input.buffer, contentType: input.mimeType });
  return storageKey;
}

export async function saveGeneratedPlate(input: {
  userId: string;
  date: string;
  mealSlot: string;
  buffer: Buffer;
}) {
  const storageKey = `generated/${input.userId}/${input.date}_${input.mealSlot}_${randomUUID()}.png`;
  await saveNutritionFile({ storageKey, buffer: input.buffer, contentType: 'image/png' });
  return storageKey;
}

export async function readNutritionFile(storageKey: string) {
  if (isS3Configured()) {
    return s3GetObject(storageKey);
  }
  if (!allowsEphemeralLocalStorage()) {
    throw nutritionStorageError();
  }
  const absolutePath = resolveNutritionPath(storageKey);
  return fs.readFile(absolutePath);
}

export async function deleteNutritionFile(storageKey: string) {
  if (isS3Configured()) {
    await s3DeleteObject(storageKey);
    return;
  }
  if (!allowsEphemeralLocalStorage()) {
    throw nutritionStorageError();
  }
  const absolutePath = resolveNutritionPath(storageKey);
  await fs.unlink(absolutePath);
}

function mimeToExt(mimeType: string) {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'bin';
  }
}

export function guessMimeFromStorageKey(storageKey: string) {
  const ext = path.extname(storageKey).slice(1).toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}
