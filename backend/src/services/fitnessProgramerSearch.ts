import {
  buildSearchVariants,
  classifyExerciseNameMatch,
  normalizeExerciseName,
  scoreExerciseNameMatch,
  singularizeToken,
  type ExerciseMatchTier,
} from './exerciseNameMatch.js';

const BASE_URL = 'https://fitnessprogramer.com';
const EXERCISE_PATH = '/exercise';

const EQUIPMENT_PREFIXES = ['dumbbell', 'barbell', 'cable', 'machine', 'smith', 'seated', 'standing'];
const DEFAULT_EQUIPMENT_TRY = ['dumbbell', 'cable', 'barbell', 'machine'];

/** Known slug overrides when the plain exercise name is ambiguous on FitnessProgramer. */
const SLUG_ALIASES: Record<string, string[]> = {
  'lateral raises': ['dumbbell-lateral-raise'],
  'lateral raise': ['dumbbell-lateral-raise'],
  'front raises': ['dumbbell-front-raise', 'barbell-front-raise'],
  'front raise': ['dumbbell-front-raise', 'barbell-front-raise'],
  'rear delt fly': ['dumbbell-rear-delt-fly', 'cable-rear-delt-fly'],
  'rear delt flies': ['dumbbell-rear-delt-fly', 'cable-rear-delt-fly'],
  'face pull': ['cable-face-pull'],
  'face pulls': ['cable-face-pull'],
  'lat pulldown': ['lat-pulldown', 'cable-lat-pulldown'],
  'lat pulldowns': ['lat-pulldown', 'cable-lat-pulldown'],
  'tricep dips': ['triceps-dips', 'triceps-dips-on-floor', 'bench-dips'],
  'tricep dip': ['triceps-dips', 'triceps-dips-on-floor', 'bench-dips'],
  'triceps dips': ['triceps-dips', 'triceps-dips-on-floor', 'bench-dips'],
  'triceps dip': ['triceps-dips', 'triceps-dips-on-floor', 'bench-dips'],
};

export type FitnessProgramerMatch = {
  url: string;
  previewUrl: string;
  title: string;
  pageUrl: string;
  score: number;
  matchTier: ExerciseMatchTier;
};

type FitnessProgramerPage = {
  url: string;
  previewUrl: string;
  title: string;
  pageUrl: string;
  slugTitle: string;
};

function slugify(name: string) {
  return normalizeExerciseName(name).replace(/\s+/g, '-');
}

function hasEquipmentPrefix(name: string) {
  const normalized = normalizeExerciseName(name);
  return EQUIPMENT_PREFIXES.some(
    (prefix) => normalized.startsWith(`${prefix} `) || normalized.includes(` ${prefix} `),
  );
}

function buildExerciseSlugPhases(exerciseName: string) {
  const fullSlugs: string[] = [];
  const partialSlugs: string[] = [];
  const seen = new Set<string>();

  const add = (slug: string, phase: 'full' | 'partial') => {
    if (!slug || slug.length <= 2 || slug === 'ups' || seen.has(slug)) return;
    seen.add(slug);
    (phase === 'full' ? fullSlugs : partialSlugs).push(slug);
  };

  const normalized = normalizeExerciseName(exerciseName);

  for (const alias of SLUG_ALIASES[normalized] ?? []) add(alias, 'full');

  for (const variant of buildSearchVariants(exerciseName)) {
    if (!variant) continue;
    add(slugify(variant), 'full');
    add(variant.replace(/\s+/g, ''), 'full');
  }

  const hyphenated = exerciseName
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9-\s]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  if (hyphenated) add(hyphenated, 'full');

  const hyphenParts = hyphenated.split('-').filter(Boolean);
  if (hyphenParts.length) {
    const singularParts = hyphenParts.map((part) => (part.length > 2 ? singularizeToken(part) : part));
    add(singularParts.join('-'), 'full');
  }

  if (!hasEquipmentPrefix(exerciseName)) {
    for (const variant of buildSearchVariants(exerciseName)) {
      if (!variant) continue;
      const base = slugify(variant);
      for (const prefix of DEFAULT_EQUIPMENT_TRY) {
        add(`${prefix}-${base}`, 'partial');
      }
      if (hyphenParts.length) {
        const singularParts = hyphenParts.map((part) => (part.length > 2 ? singularizeToken(part) : part));
        for (const prefix of DEFAULT_EQUIPMENT_TRY) {
          add(`${prefix}-${singularParts.join('-')}`, 'partial');
        }
      }
    }
  }

  const tokens = normalized.split(' ').filter(Boolean);
  if (tokens.length >= 2) {
    add(slugify(tokens.slice(0, 2).join(' ')), 'partial');
  }
  if (tokens.length >= 1 && tokens[0].length > 3) {
    add(slugify(tokens[0]), 'partial');
  }

  return { fullSlugs, partialSlugs };
}

function extractMetaContent(html: string, property: string) {
  const patterns = [
    new RegExp(`property="${property}"\\s+content="([^"]+)"`, 'i'),
    new RegExp(`content="([^"]+)"\\s+property="${property}"`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function pageTitleFromHtml(html: string, fallback: string) {
  const ogTitle = extractMetaContent(html, 'og:title');
  if (!ogTitle) return fallback;
  return ogTitle.replace(/\s*\|.*$/, '').trim() || fallback;
}

async function fetchExerciseBySlug(slug: string): Promise<FitnessProgramerPage | null> {
  const pageUrl = `${BASE_URL}${EXERCISE_PATH}/${slug}/`;
  const res = await fetch(pageUrl, {
    signal: AbortSignal.timeout(12_000),
    redirect: 'follow',
    headers: { 'user-agent': 'ComeUp/1.0 (exercise media lookup)' },
  });
  if (!res.ok) return null;

  const finalUrl = res.url;
  if (!finalUrl.includes(`${EXERCISE_PATH}/`)) return null;

  const html = await res.text();
  const imageUrl = extractMetaContent(html, 'og:image:secure_url') ?? extractMetaContent(html, 'og:image');
  if (!imageUrl) return null;

  const slugFromUrl =
    finalUrl.split(`${EXERCISE_PATH}/`)[1]?.replace(/\/.*$/, '').replace(/-/g, ' ') ?? slug.replace(/-/g, ' ');
  const title = pageTitleFromHtml(html, slugFromUrl);

  if (/online workout planner/i.test(title) || /online-workout-planner/i.test(imageUrl)) {
    return null;
  }
  return {
    url: imageUrl,
    previewUrl: imageUrl,
    title,
    pageUrl: finalUrl,
    slugTitle: slugFromUrl,
  };
}

function toCandidate(page: FitnessProgramerPage, exerciseName: string): FitnessProgramerMatch | null {
  const matchTier = classifyExerciseNameMatch(page.slugTitle, exerciseName);
  if (matchTier === 'none') return null;

  const matchScore = scoreExerciseNameMatch(page.slugTitle, exerciseName);
  return {
    url: page.url,
    previewUrl: page.previewUrl,
    title: page.slugTitle || page.title,
    pageUrl: page.pageUrl,
    score: matchScore,
    matchTier,
  };
}

async function probeSlugs(
  slugs: string[],
  exerciseName: string,
  requiredTier: ExerciseMatchTier,
): Promise<FitnessProgramerMatch[]> {
  const found = new Map<string, FitnessProgramerMatch>();

  for (const slug of slugs) {
    const page = await fetchExerciseBySlug(slug);
    if (!page) continue;

    const candidate = toCandidate(page, exerciseName);
    if (!candidate) continue;
    if (requiredTier === 'full' && candidate.matchTier !== 'full') continue;

    const existing = found.get(candidate.url);
    if (!existing || candidate.score > existing.score) found.set(candidate.url, candidate);

    if (requiredTier === 'full' && candidate.matchTier === 'full' && candidate.score >= 150) {
      break;
    }
  }

  return [...found.values()].sort((a, b) => {
    if (a.matchTier !== b.matchTier) return a.matchTier === 'full' ? -1 : 1;
    return b.score - a.score;
  });
}

/**
 * Stage 1: accept a full-name FitnessProgramer match when available.
 * Stage 2: fall back to partial matches (first one or two query words).
 */
export async function searchFitnessProgramer(exerciseName: string): Promise<FitnessProgramerMatch[]> {
  const { fullSlugs, partialSlugs } = buildExerciseSlugPhases(exerciseName);

  const fullMatches = await probeSlugs(fullSlugs, exerciseName, 'full');
  if (fullMatches.length) return fullMatches.slice(0, 8);

  const partialMatches = await probeSlugs(partialSlugs, exerciseName, 'partial');
  return partialMatches.slice(0, 8);
}
