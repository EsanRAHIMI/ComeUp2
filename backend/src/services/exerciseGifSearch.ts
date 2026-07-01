import { searchFitnessProgramer } from './fitnessProgramerSearch.js';
import { searchFreeExerciseDb } from './freeExerciseDbCatalog.js';
import {
  buildSearchVariants,
  isValidWorkoutXKey,
  normalizeExerciseName,
  scoreExerciseNameMatch,
} from './exerciseNameMatch.js';
import { filterReachableCandidates } from './mediaUrlValidator.js';

export type GifCandidate = {
  url: string;
  previewUrl: string;
  title: string;
  source: 'fitnessprogramer' | 'free-exercise-db' | 'workoutx' | 'wikimedia' | 'tenor' | 'giphy';
  score: number;
  professional: boolean;
};

export type MediaSearchResult = {
  candidates: GifCandidate[];
  hints: string[];
};

const WORKOUTX_BASE = 'https://api.workoutxapp.com/v1/exercises';
const MIN_AUTO_GIF_SCORE = 80;

const MEME_BLOCKLIST =
  /\b(meme|funny|fail|reaction|lol|lmao|wtf|cat|kitten|dog|puppy|baby|crying|laugh|drunk|party|dance|celebrat|tiktok|prank|joke|comedy|anime|cartoon|disney|marvel|batman|spongebob|minion|emoji|heart eyes|thumbs up)\b/i;

const FITNESS_SIGNAL =
  /\b(exercise|workout|gym|fitness|training|muscle|lift|lifting|squat|press|curl|pulldown|row|deadlift|lunge|plank|cardio|form|technique|demonstration|barbell|dumbbell|kettlebell|bodyweight|stretch|yoga|pilates|crossfit|calisthenics)\b/i;

function buildWikimediaQueries(exerciseName: string) {
  const normalized = normalizeExerciseName(exerciseName);
  const tokens = normalized.split(' ').filter(Boolean);
  const queries = new Set<string>();
  if (normalized) {
    queries.add(`${normalized} exercise form`);
    queries.add(`${normalized} fitness demonstration`);
    queries.add(`${normalized} workout technique`);
  }
  if (tokens.length >= 2) queries.add(`${tokens.slice(0, 4).join(' ')} exercise`);
  return [...queries];
}

function scoreTitleMatch(title: string, exerciseName: string) {
  return Math.round(scoreExerciseNameMatch(title, exerciseName) * 0.6);
}

function passesMemeFilter(title: string, exerciseName: string) {
  if (MEME_BLOCKLIST.test(title)) return false;
  const titleScore = scoreTitleMatch(title, exerciseName);
  if (titleScore >= 70) return true;
  return FITNESS_SIGNAL.test(title) && titleScore >= 35;
}

function dedupeAndRank(items: GifCandidate[], exerciseName: string) {
  const seen = new Set<string>();
  return items
    .filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      if (!item.professional && !passesMemeFilter(item.title, exerciseName)) return false;
      return true;
    })
    .map((item) => ({
      ...item,
      score: item.score + scoreTitleMatch(item.title, exerciseName),
    }))
    .sort((a, b) => {
      if (a.professional !== b.professional) return a.professional ? -1 : 1;
      return b.score - a.score;
    });
}

type WorkoutXRow = {
  id: string;
  name: string;
  gifUrl?: string;
};

async function searchWorkoutX(exerciseName: string, apiKey: string): Promise<GifCandidate[]> {
  if (!isValidWorkoutXKey(apiKey)) return [];

  const found = new Map<string, GifCandidate>();
  for (const variant of buildSearchVariants(exerciseName)) {
    const url = `${WORKOUTX_BASE}/name/${encodeURIComponent(variant)}?limit=20`;
    const res = await fetch(url, {
      headers: { 'X-WorkoutX-Key': apiKey },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) continue;

    const payload = (await res.json()) as WorkoutXRow[] | { data?: WorkoutXRow[] };
    const rows = Array.isArray(payload) ? payload : (payload.data ?? []);

    for (const row of rows) {
      if (!row.gifUrl) continue;
      const matchScore = scoreExerciseNameMatch(row.name, exerciseName);
      if (matchScore < 55) continue;
      const candidate: GifCandidate = {
        url: row.gifUrl,
        previewUrl: row.gifUrl,
        title: row.name,
        source: 'workoutx',
        score: 180 + matchScore,
        professional: true,
      };
      const existing = found.get(row.gifUrl);
      if (!existing || candidate.score > existing.score) found.set(row.gifUrl, candidate);
    }
  }

  return [...found.values()].sort((a, b) => b.score - a.score);
}

async function searchTenor(query: string, apiKey: string): Promise<GifCandidate[]> {
  const url = new URL('https://tenor.googleapis.com/v2/search');
  url.searchParams.set('q', query);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('limit', '8');
  url.searchParams.set('media_filter', 'gif');
  url.searchParams.set('contentfilter', 'high');

  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    results?: Array<{
      title?: string;
      media_formats?: {
        gif?: { url?: string };
        mediumgif?: { url?: string };
        tinygif?: { url?: string };
      };
    }>;
  };

  return (data.results ?? [])
    .map((item): GifCandidate | null => {
      const gif = item.media_formats?.gif?.url ?? item.media_formats?.mediumgif?.url;
      const preview = item.media_formats?.tinygif?.url ?? gif;
      if (!gif) return null;
      return {
        url: gif,
        previewUrl: preview ?? gif,
        title: item.title ?? query,
        source: 'tenor',
        score: 20,
        professional: false,
      };
    })
    .filter((item): item is GifCandidate => item !== null);
}

async function searchGiphy(query: string, apiKey: string): Promise<GifCandidate[]> {
  const url = new URL('https://api.giphy.com/v1/gifs/search');
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '8');
  url.searchParams.set('rating', 'g');

  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    data?: Array<{
      title?: string;
      images?: {
        original?: { url?: string };
        fixed_height?: { url?: string };
        preview_gif?: { url?: string };
      };
    }>;
  };

  return (data.data ?? [])
    .map((item): GifCandidate | null => {
      const gif = item.images?.fixed_height?.url ?? item.images?.original?.url;
      const preview = item.images?.preview_gif?.url ?? gif;
      if (!gif) return null;
      return {
        url: gif,
        previewUrl: preview ?? gif,
        title: item.title ?? query,
        source: 'giphy',
        score: 15,
        professional: false,
      };
    })
    .filter((item): item is GifCandidate => item !== null);
}

async function searchWikimedia(query: string): Promise<GifCandidate[]> {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('generator', 'search');
  url.searchParams.set('gsrsearch', query);
  url.searchParams.set('gsrnamespace', '6');
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url|mime');
  url.searchParams.set('iiurlwidth', '320');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          title?: string;
          imageinfo?: Array<{ url?: string; thumburl?: string; mime?: string }>;
        }
      >;
    };
  };

  const pages = Object.values(data.query?.pages ?? {});
  return pages
    .map((page): GifCandidate | null => {
      const info = page.imageinfo?.[0];
      if (!info?.url) return null;
      const isGif = info.mime === 'image/gif' || info.url.toLowerCase().endsWith('.gif');
      if (!isGif) return null;
      return {
        url: info.url,
        previewUrl: info.thumburl ?? info.url,
        title: (page.title ?? query).replace(/^File:/i, ''),
        source: 'wikimedia',
        score: 60,
        professional: true,
      };
    })
    .filter((item): item is GifCandidate => item !== null);
}

async function searchWikimediaForExercise(exerciseName: string): Promise<GifCandidate[]> {
  for (const query of buildWikimediaQueries(exerciseName)) {
    const found = await searchWikimedia(query);
    if (found.length) return found;
  }
  return [];
}

function memeSourcesEnabled() {
  return process.env.GIF_SEARCH_ENABLE_MEME_SOURCES === 'true';
}

function memeSearchQuery(exerciseName: string) {
  return `${normalizeExerciseName(exerciseName)} gym exercise form technique`;
}

function collectWorkoutXHints(hints: string[]) {
  const workoutxKey = process.env.WORKOUTX_API_KEY?.trim();
  if (workoutxKey && !isValidWorkoutXKey(workoutxKey)) {
    hints.push(
      'WORKOUTX_API_KEY is set but invalid — it must start with wx_. Copy the Exercise API key from workoutxapp.com (not a hash or other token).',
    );
  }
}

async function collectCandidates(exerciseName: string): Promise<GifCandidate[]> {
  const name = exerciseName.trim();
  if (!name) return [];

  const collected: GifCandidate[] = [];

  try {
    const fitnessProgramerMatches = await searchFitnessProgramer(name);
    collected.push(
      ...fitnessProgramerMatches.map((match) => ({
        url: match.url,
        previewUrl: match.previewUrl,
        title: match.title,
        source: 'fitnessprogramer' as const,
        score: (match.matchTier === 'full' ? 260 : 220) + match.score,
        professional: true,
      })),
    );
  } catch {
    /* optional provider */
  }

  if (!collected.some((item) => item.source === 'fitnessprogramer')) {
    try {
      const catalogMatches = await searchFreeExerciseDb(name);
      collected.push(
        ...catalogMatches.map((match) => ({
          url: match.url,
          previewUrl: match.previewUrl,
          title: match.name,
          source: 'free-exercise-db' as const,
          score: 140 + match.score,
          professional: true,
        })),
      );
    } catch {
      /* optional provider */
    }
  }

  const workoutxKey = process.env.WORKOUTX_API_KEY?.trim();
  if (workoutxKey && isValidWorkoutXKey(workoutxKey)) {
    try {
      collected.push(...(await searchWorkoutX(name, workoutxKey)));
    } catch {
      /* optional provider */
    }
  }

  if (!collected.some((item) => item.score >= 170)) {
    try {
      collected.push(...(await searchWikimediaForExercise(name)));
    } catch {
      /* optional provider */
    }
  }

  if (memeSourcesEnabled()) {
    const query = memeSearchQuery(name);
    const tenorKey = process.env.TENOR_API_KEY?.trim();
    const giphyKey = process.env.GIPHY_API_KEY?.trim();

    if (tenorKey) {
      try {
        collected.push(...(await searchTenor(query, tenorKey)));
      } catch {
        /* optional provider */
      }
    }

    if (giphyKey) {
      try {
        collected.push(...(await searchGiphy(query, giphyKey)));
      } catch {
        /* optional provider */
      }
    }
  }

  return collected;
}

/** Search verified exercise media; only returns URLs that actually load. */
export async function searchExerciseMedia(exerciseName: string): Promise<MediaSearchResult> {
  const hints: string[] = [];
  collectWorkoutXHints(hints);

  const ranked = dedupeAndRank(await collectCandidates(exerciseName), exerciseName.trim());
  const candidates = await filterReachableCandidates(ranked, 12);

  if (!candidates.length && ranked.length > 0) {
    hints.push('Matches were found but media URLs could not be verified. Try again or paste a URL manually.');
  } else if (!candidates.length) {
    hints.push(
      'No catalog match for this exercise name. Try singular form (e.g. "Dumbbell Row" not "Dumbbell Rows") or paste a URL.',
    );
  }

  return { candidates, hints };
}

export async function searchExerciseGifs(exerciseName: string): Promise<GifCandidate[]> {
  return (await searchExerciseMedia(exerciseName)).candidates;
}

export function pickBestGif(candidates: GifCandidate[]): GifCandidate | null {
  const best = candidates[0];
  if (!best) return null;
  if (best.score < MIN_AUTO_GIF_SCORE) return null;
  return best;
}

export function minAutoGifScore() {
  return MIN_AUTO_GIF_SCORE;
}
