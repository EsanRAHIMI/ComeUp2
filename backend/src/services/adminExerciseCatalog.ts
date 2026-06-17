import { CommunityExerciseMedia } from '../models/CommunityExerciseMedia.js';
import { ExerciseMedia } from '../models/ExerciseMedia.js';
import { Program } from '../models/Program.js';
import { classifyExercise } from './exerciseDictionary.js';
import { exerciseKey } from '../utils/exerciseKey.js';

export type CatalogExercise = {
  exerciseKey: string;
  exerciseName: string;
  muscleGroups: string[];
  primaryGroup: string;
  programCount: number;
  hasImage: boolean;
  imageUrl?: string;
  mediaId?: string;
  needsReview: boolean;
};

export type AdminExerciseMediaPayload = {
  stats: {
    totalExercises: number;
    withImage: number;
    withoutImage: number;
    communityMedia: number;
    personalOverrides: number;
  };
  groups: string[];
  withImage: CatalogExercise[];
  withoutImage: CatalogExercise[];
  byGroup: Record<string, { withImage: CatalogExercise[]; withoutImage: CatalogExercise[] }>;
  community: Array<{
    id: string;
    exerciseKey: string;
    exerciseName: string;
    imageUrl: string;
    contributedBy?: unknown;
    updatedAt?: Date;
  }>;
  personal: Array<{
    id: string;
    exerciseKey: string;
    exerciseName: string;
    imageUrl: string;
    owner?: unknown;
    updatedAt?: Date;
  }>;
};

const GROUP_ORDER = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'glutes',
  'hamstrings',
  'legs',
  'calves',
  'core',
  'cardio',
  'full body',
];

function groupSortKey(group: string) {
  const idx = GROUP_ORDER.indexOf(group);
  return idx === -1 ? GROUP_ORDER.length : idx;
}

function primaryGroup(groups: string[]) {
  const sorted = [...groups].sort((a, b) => groupSortKey(a) - groupSortKey(b));
  return sorted[0] ?? 'full body';
}

export async function buildAdminExerciseCatalog(): Promise<AdminExerciseMediaPayload> {
  const [programs, community, personal] = await Promise.all([
    Program.find({}, { exercises: 1 }),
    CommunityExerciseMedia.find({}).sort({ exerciseName: 1 }).populate('contributedBy', 'name email'),
    ExerciseMedia.find({ isOverride: true }).sort({ exerciseName: 1 }).populate('ownerId', 'name email'),
  ]);

  const catalog = new Map<string, CatalogExercise>();

  for (const program of programs) {
    for (const exercise of program.exercises ?? []) {
      const name = String(exercise.name ?? '').trim();
      if (!name) continue;
      const key = exerciseKey(name);
      const classification = classifyExercise(name);
      const existing = catalog.get(key);
      if (existing) {
        existing.programCount += 1;
        if (name.length > existing.exerciseName.length) existing.exerciseName = name;
      } else {
        catalog.set(key, {
          exerciseKey: key,
          exerciseName: name,
          muscleGroups: classification.groups,
          primaryGroup: primaryGroup(classification.groups),
          programCount: 1,
          hasImage: false,
          needsReview: classification.needsReview,
        });
      }
    }
  }

  for (const item of community) {
    const key = item.exerciseKey;
    const existing = catalog.get(key);
    const classification = classifyExercise(item.exerciseName);
    if (existing) {
      existing.hasImage = true;
      existing.imageUrl = item.imageUrl;
      existing.mediaId = item._id.toString();
      existing.exerciseName = item.exerciseName;
    } else {
      catalog.set(key, {
        exerciseKey: key,
        exerciseName: item.exerciseName,
        muscleGroups: classification.groups,
        primaryGroup: primaryGroup(classification.groups),
        programCount: 0,
        hasImage: true,
        imageUrl: item.imageUrl,
        mediaId: item._id.toString(),
        needsReview: classification.needsReview,
      });
    }
  }

  const all = [...catalog.values()].sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
  const withImage = all.filter((item) => item.hasImage);
  const withoutImage = all.filter((item) => !item.hasImage);

  const groupSet = new Set<string>();
  for (const item of all) groupSet.add(item.primaryGroup);

  const byGroup: AdminExerciseMediaPayload['byGroup'] = {};
  for (const group of [...groupSet].sort((a, b) => groupSortKey(a) - groupSortKey(b))) {
    byGroup[group] = {
      withImage: withImage.filter((item) => item.primaryGroup === group),
      withoutImage: withoutImage.filter((item) => item.primaryGroup === group),
    };
  }

  return {
    stats: {
      totalExercises: all.length,
      withImage: withImage.length,
      withoutImage: withoutImage.length,
      communityMedia: community.length,
      personalOverrides: personal.length,
    },
    groups: [...groupSet].sort((a, b) => groupSortKey(a) - groupSortKey(b)),
    withImage,
    withoutImage,
    byGroup,
    community: community.map((item) => ({
      id: item._id.toString(),
      exerciseKey: item.exerciseKey,
      exerciseName: item.exerciseName,
      imageUrl: item.imageUrl,
      contributedBy: item.contributedBy,
      updatedAt: item.updatedAt,
    })),
    personal: personal.map((item) => ({
      id: item._id.toString(),
      exerciseKey: item.exerciseKey,
      exerciseName: item.exerciseName,
      imageUrl: item.imageUrl,
      owner: item.ownerId,
      updatedAt: item.updatedAt,
    })),
  };
}
