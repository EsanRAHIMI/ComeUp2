export function normalizeExerciseName(name: string) {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PLURAL_OVERRIDES: Record<string, string> = {
  raises: 'raise',
  presses: 'press',
  lunges: 'lunge',
  flies: 'fly',
  curls: 'curl',
  rows: 'row',
  squats: 'squat',
  dips: 'dip',
  pulls: 'pull',
  pushes: 'push',
};

/** Singular/plural muscle names — FitnessProgramer slugs use "triceps", not "tricep". */
const MUSCLE_SYNONYMS: Record<string, string[]> = {
  tricep: ['triceps'],
  triceps: ['tricep'],
  bicep: ['biceps'],
  biceps: ['bicep'],
  quad: ['quads', 'quadriceps'],
  quads: ['quad', 'quadriceps'],
  quadriceps: ['quad', 'quads'],
  hamstring: ['hamstrings'],
  hamstrings: ['hamstring'],
  glute: ['glutes'],
  glutes: ['glute'],
  ab: ['abs'],
  abs: ['ab'],
};

const UNREQUESTED_MODIFIERS =
  /\b(lying|one arm|incline|decline|reverse|handstand|kneeling|prone|elevated|close grip|wide grip|single arm|two arm)\b/i;

export function singularizeToken(token: string) {
  if (PLURAL_OVERRIDES[token]) return PLURAL_OVERRIDES[token];
  if (token.endsWith('ies') && token.length > 4) return token.slice(0, -3) + 'y';
  if (token.endsWith('ches') || token.endsWith('shes') || token.endsWith('xes') || token.endsWith('zes')) {
    return token.slice(0, -2);
  }
  if (token.endsWith('es') && token.length > 3) return token.slice(0, -2);
  if (token.endsWith('s') && token.length > 2) return token.slice(0, -1);
  return token;
}

export function nameTokens(name: string) {
  return normalizeExerciseName(name)
    .split(' ')
    .filter((token) => token.length > 2);
}

export type ExerciseMatchTier = 'full' | 'partial' | 'none';

export function leadingWordsMatch(catalogName: string, exerciseName: string, wordCount: 1 | 2) {
  const hay = normalizeExerciseName(catalogName);
  const hayCompact = hay.replace(/\s+/g, '');
  const leading = nameTokens(exerciseName)
    .map(singularizeToken)
    .slice(0, wordCount);
  if (!leading.length) return false;
  return leading.every(
    (token) => hay.includes(token) || hayCompact.includes(token.replace(/\s+/g, '')),
  );
}

/** Classify how closely a catalog/slug title matches the requested exercise name. */
export function classifyExerciseNameMatch(catalogName: string, exerciseName: string): ExerciseMatchTier {
  const score = scoreExerciseNameMatch(catalogName, exerciseName);
  const hay = normalizeExerciseName(catalogName);
  const needle = normalizeExerciseName(exerciseName);
  const queryTokens = nameTokens(exerciseName).map(singularizeToken);

  if (!needle) return 'none';
  if (hay === needle || score >= 150) return 'full';

  if (
    queryTokens.length > 0 &&
    queryTokens.every((token) => hay.includes(token) || hay.replace(/\s+/g, '').includes(token)) &&
    score >= 85
  ) {
    return 'full';
  }

  if (leadingWordsMatch(catalogName, exerciseName, 2)) return 'partial';
  if (leadingWordsMatch(catalogName, exerciseName, 1)) return 'partial';
  if (score >= 55) return 'partial';

  return 'none';
}

export function buildSearchVariants(exerciseName: string) {
  const normalized = normalizeExerciseName(exerciseName);
  const singular = normalized
    .split(' ')
    .map((token) => (token.length > 2 ? singularizeToken(token) : token))
    .join(' ')
    .trim();

  const variants = new Set<string>();
  if (normalized) variants.add(normalized);
  if (singular && singular !== normalized) variants.add(singular);
  if (nameTokens(exerciseName)[0]) variants.add(nameTokens(exerciseName).slice(0, 3).join(' '));

  for (const phrase of [...variants]) {
    for (const expanded of expandMuscleSynonyms(phrase)) {
      variants.add(expanded);
      const expandedSingular = expanded
        .split(' ')
        .map((token) => (token.length > 2 ? singularizeToken(token) : token))
        .join(' ')
        .trim();
      if (expandedSingular) variants.add(expandedSingular);
    }
  }

  // Compact form: "push ups" -> "pushups"
  const compact = normalized.replace(/\s+/g, '');
  if (compact.length > 3) variants.add(compact);

  return [...variants];
}

function expandMuscleSynonyms(phrase: string) {
  const tokens = phrase.split(' ').filter(Boolean);
  const results = new Set<string>();

  for (let i = 0; i < tokens.length; i++) {
    const alts = MUSCLE_SYNONYMS[tokens[i]!];
    if (!alts?.length) continue;
    for (const alt of alts) {
      const next = [...tokens];
      next[i] = alt;
      results.add(next.join(' '));
    }
  }

  return [...results];
}

export function scoreExerciseNameMatch(catalogName: string, exerciseName: string) {
  const hay = normalizeExerciseName(catalogName);
  const needle = normalizeExerciseName(exerciseName);
  const hayCompact = hay.replace(/\s+/g, '');
  const needleCompact = needle.replace(/\s+/g, '');
  if (!needle) return 0;
  if (hay === needle || hayCompact === needleCompact) return 200;
  if (hay.includes(needle) || needle.includes(hay)) return 150;
  if (hayCompact.includes(needleCompact) || needleCompact.includes(hayCompact)) return 140;

  const queryTokens = nameTokens(exerciseName).map(singularizeToken);
  if (!queryTokens.length) return 0;

  const hits = queryTokens.filter((token) => {
    return hay.includes(token) || hayCompact.includes(token.replace(/\s+/g, ''));
  }).length;

  let score = Math.round((hits / queryTokens.length) * 100);

  // Penalize extra exercise-name tokens (e.g. Handstand Push-Ups for query Push-ups).
  const catalogTokens = nameTokens(catalogName).map(singularizeToken);
  const extras = catalogTokens.filter((token) => {
    if (token.length < 4) return false;
    return !queryTokens.some(
      (queryToken) => token === queryToken || token.includes(queryToken) || queryToken.includes(token),
    );
  });
  score -= extras.length * 35;

  if (UNREQUESTED_MODIFIERS.test(hay) && !UNREQUESTED_MODIFIERS.test(needle)) {
    score -= 45;
  }

  return Math.max(0, score);
}

export function isValidWorkoutXKey(key: string) {
  return key.startsWith('wx_') && key.length > 12;
}
