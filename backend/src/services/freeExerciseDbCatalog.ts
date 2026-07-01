import {
  buildSearchVariants,
  normalizeExerciseName,
  scoreExerciseNameMatch,
} from './exerciseNameMatch.js';

const DATASET_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMAGE_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

type CatalogExercise = {
  name: string;
  images?: string[];
};

export type CatalogMediaMatch = {
  name: string;
  url: string;
  previewUrl: string;
  score: number;
};

let cachedExercises: CatalogExercise[] | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function loadCatalog(): Promise<CatalogExercise[]> {
  if (cachedExercises && Date.now() - cacheLoadedAt < CACHE_TTL_MS) return cachedExercises;

  const res = await fetch(DATASET_URL, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error('Could not load exercise catalog');

  cachedExercises = (await res.json()) as CatalogExercise[];
  cacheLoadedAt = Date.now();
  return cachedExercises;
}

export async function searchFreeExerciseDb(exerciseName: string): Promise<CatalogMediaMatch[]> {
  const catalog = await loadCatalog();
  const variants = buildSearchVariants(exerciseName);
  const matches = new Map<string, CatalogMediaMatch>();

  for (const row of catalog) {
    const imagePath = row.images?.[0];
    if (!imagePath) continue;

    let bestScore = 0;
    for (const variant of variants) {
      bestScore = Math.max(bestScore, scoreExerciseNameMatch(row.name, variant));
    }
    if (bestScore < 55) continue;

    const url = `${IMAGE_BASE}${imagePath}`;
    const existing = matches.get(url);
    const candidate = { name: row.name, url, previewUrl: url, score: bestScore };
    if (!existing || candidate.score > existing.score) matches.set(url, candidate);
  }

  return [...matches.values()].sort((a, b) => b.score - a.score).slice(0, 15);
}

export { normalizeExerciseName as normalizeName };
