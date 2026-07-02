import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

let client: S3Client | null = null;

function normalizeSegment(segment: string) {
  return segment.replace(/^\/+|\/+$/g, '');
}

export function isS3Configured() {
  return Boolean(
    env.AWS_ACCESS_KEY_ID?.trim() &&
      env.AWS_SECRET_ACCESS_KEY?.trim() &&
      env.AWS_REGION?.trim() &&
      env.AWS_S3_BUCKET?.trim(),
  );
}

function s3() {
  if (!isS3Configured()) {
    throw new Error('S3 is not configured');
  }
  if (!client) {
    client = new S3Client({
      region: env.AWS_REGION!,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

/** Full S3 object key: {AWS_S3_PREFIX}/{module}/{storageKey} → e.g. gym/nutrition/photos/... */
export function s3ObjectKey(module: string, storageKey: string) {
  const parts = [env.AWS_S3_PREFIX, module, storageKey]
    .map(normalizeSegment)
    .filter(Boolean);
  return parts.join('/');
}

export function nutritionS3Key(storageKey: string) {
  return s3ObjectKey('nutrition', storageKey);
}

export async function s3PutObject(input: {
  storageKey: string;
  body: Buffer;
  contentType: string;
  module?: string;
}) {
  const module = input.module ?? 'nutrition';
  await s3().send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET!,
      Key: s3ObjectKey(module, input.storageKey),
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: 'private, max-age=31536000',
    }),
  );
}

export async function s3GetObject(storageKey: string, module = 'nutrition') {
  const response = await s3().send(
    new GetObjectCommand({
      Bucket: env.AWS_S3_BUCKET!,
      Key: s3ObjectKey(module, storageKey),
    }),
  );
  if (!response.Body) throw new Error('S3 object body is empty');
  return Buffer.from(await response.Body.transformToByteArray());
}

export async function s3DeleteObject(storageKey: string, module = 'nutrition') {
  await s3().send(
    new DeleteObjectCommand({
      Bucket: env.AWS_S3_BUCKET!,
      Key: s3ObjectKey(module, storageKey),
    }),
  );
}
