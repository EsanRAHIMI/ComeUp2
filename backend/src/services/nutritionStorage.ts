import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function nutritionUploadRoot() {
  return env.NUTRITION_UPLOAD_DIR;
}

export async function ensureNutritionUploadDirs() {
  const root = nutritionUploadRoot();
  await fs.mkdir(path.join(root, 'photos'), { recursive: true });
  await fs.mkdir(path.join(root, 'generated'), { recursive: true });
}

export function isAllowedNutritionMime(mimeType: string) {
  return ALLOWED_MIME.has(mimeType);
}

export async function saveNutritionPhoto(input: {
  userId: string;
  date: string;
  mealSlot: string;
  buffer: Buffer;
  mimeType: string;
}) {
  await ensureNutritionUploadDirs();
  const ext = mimeToExt(input.mimeType);
  const storageKey = `photos/${input.userId}/${input.date}_${input.mealSlot}_${randomUUID()}.${ext}`;
  const absolutePath = path.join(nutritionUploadRoot(), storageKey);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, input.buffer);
  return storageKey;
}

export async function readNutritionFile(storageKey: string) {
  const absolutePath = path.join(nutritionUploadRoot(), storageKey);
  return fs.readFile(absolutePath);
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
