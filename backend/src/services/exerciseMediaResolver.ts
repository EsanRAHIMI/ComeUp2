import { CommunityExerciseMedia } from '../models/CommunityExerciseMedia.js';
import { ExerciseMedia } from '../models/ExerciseMedia.js';
import { exerciseKey } from '../utils/exerciseKey.js';

export type ResolvedExerciseMedia = {
  exerciseKey: string;
  exerciseName: string;
  imageUrl: string;
  source: 'personal' | 'community';
};

let communityBootstrapped = false;

/** Seed community images from existing per-user uploads (one-time, lazy). */
async function bootstrapCommunityFromLegacy() {
  if (communityBootstrapped) return;
  communityBootstrapped = true;

  const existing = await CommunityExerciseMedia.estimatedDocumentCount();
  if (existing > 0) return;

  const grouped = await ExerciseMedia.aggregate<{
    _id: string;
    exerciseName: string;
    imageUrl: string;
    ownerId: unknown;
  }>([
    { $sort: { updatedAt: -1 } },
    {
      $group: {
        _id: '$exerciseKey',
        exerciseName: { $first: '$exerciseName' },
        imageUrl: { $first: '$imageUrl' },
        ownerId: { $first: '$ownerId' },
      },
    },
  ]);

  if (!grouped.length) return;

  await CommunityExerciseMedia.insertMany(
    grouped.map((row) => ({
      exerciseKey: row._id,
      exerciseName: row.exerciseName,
      imageUrl: row.imageUrl,
      contributedBy: row.ownerId,
    })),
    { ordered: false },
  ).catch(() => undefined);
}

export async function getResolvedExerciseMedia(ownerId: string): Promise<ResolvedExerciseMedia[]> {
  await bootstrapCommunityFromLegacy();

  const [personal, community] = await Promise.all([
    ExerciseMedia.find({ ownerId, isOverride: true }),
    CommunityExerciseMedia.find({}).sort({ exerciseName: 1 }),
  ]);

  const personalByKey = new Map(personal.map((item) => [item.exerciseKey, item]));
  const resolved = new Map<string, ResolvedExerciseMedia>();

  for (const item of community) {
    const override = personalByKey.get(item.exerciseKey);
    if (override) {
      resolved.set(item.exerciseKey, {
        exerciseKey: item.exerciseKey,
        exerciseName: override.exerciseName,
        imageUrl: override.imageUrl,
        source: 'personal',
      });
    } else {
      resolved.set(item.exerciseKey, {
        exerciseKey: item.exerciseKey,
        exerciseName: item.exerciseName,
        imageUrl: item.imageUrl,
        source: 'community',
      });
    }
  }

  for (const item of personal) {
    if (!resolved.has(item.exerciseKey)) {
      resolved.set(item.exerciseKey, {
        exerciseKey: item.exerciseKey,
        exerciseName: item.exerciseName,
        imageUrl: item.imageUrl,
        source: 'personal',
      });
    }
  }

  return [...resolved.values()].sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
}

export async function upsertExerciseImage(
  ownerId: string,
  exerciseName: string,
  imageUrl: string,
): Promise<ResolvedExerciseMedia> {
  await bootstrapCommunityFromLegacy();

  const key = exerciseKey(exerciseName);
  const community = await CommunityExerciseMedia.findOne({ exerciseKey: key });
  const personal = await ExerciseMedia.findOne({ ownerId, exerciseKey: key, isOverride: true });

  if (!community) {
    await CommunityExerciseMedia.create({
      exerciseKey: key,
      exerciseName,
      imageUrl,
      contributedBy: ownerId,
    });
    if (personal) await personal.deleteOne();
    return { exerciseKey: key, exerciseName, imageUrl, source: 'community' };
  }

  if (personal) {
    personal.exerciseName = exerciseName;
    personal.imageUrl = imageUrl;
    await personal.save();
    return { exerciseKey: key, exerciseName, imageUrl, source: 'personal' };
  }

  if (imageUrl === community.imageUrl) {
    return {
      exerciseKey: key,
      exerciseName: community.exerciseName,
      imageUrl: community.imageUrl,
      source: 'community',
    };
  }

  const saved = await ExerciseMedia.findOneAndUpdate(
    { ownerId, exerciseKey: key },
    {
      ownerId,
      exerciseKey: key,
      exerciseName,
      imageUrl,
      isOverride: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return {
    exerciseKey: key,
    exerciseName: saved.exerciseName,
    imageUrl: saved.imageUrl,
    source: 'personal',
  };
}
