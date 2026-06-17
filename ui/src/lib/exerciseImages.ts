import type { Exercise } from '../types';

export function exerciseKey(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Lightweight inline SVG placeholders keyed by muscle group. These render
// instantly (no network), so the workout runner never blocks on slow gym data.
const palette: Record<string, [string, string, string]> = {
  chest: ['#f97316', '#ea580c', 'CHEST'],
  legs: ['#0ea5e9', '#0284c7', 'LEGS'],
  back: ['#8b5cf6', '#7c3aed', 'BACK'],
  shoulders: ['#14b8a6', '#0d9488', 'SHOULDERS'],
  arms: ['#ec4899', '#db2777', 'ARMS'],
  cardio: ['#ef4444', '#dc2626', 'CARDIO'],
  core: ['#eab308', '#ca8a04', 'CORE'],
  default: ['#475569', '#334155', 'TRAIN'],
};

function placeholderFor(key: keyof typeof palette) {
  const [from, to, label] = palette[key] ?? palette.default;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient></defs>
    <rect width="800" height="520" fill="url(#g)"/>
    <text x="50%" y="52%" fill="rgba(255,255,255,0.92)" font-family="Inter,system-ui,sans-serif"
      font-size="64" font-weight="800" text-anchor="middle" letter-spacing="4">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function muscleKey(exercise: Exercise): keyof typeof palette {
  const text = `${exercise.name} ${exercise.muscleGroups.join(' ')}`.toLowerCase();
  if (/chest|press|fly|سینه/.test(text)) return 'chest';
  if (/leg|quad|squat|lunge|calf|ران|پا|ساق|glute|hamstring/.test(text)) return 'legs';
  if (/back|row|pulldown|lat|لت|زیربغل/.test(text)) return 'back';
  if (/shoulder|delt|سرشانه/.test(text)) return 'shoulders';
  if (/curl|biceps|triceps|بازو/.test(text)) return 'arms';
  if (/cardio|treadmill|run|walk|climb/.test(text)) return 'cardio';
  if (/plank|core|abs|شکم/.test(text)) return 'core';
  return 'default';
}

/** Local gradient fallback used as placeholder and on image-load error. */
export function fallbackExerciseImage(exercise: Exercise) {
  return placeholderFor(muscleKey(exercise));
}

/** Resolve the best image: user-saved media → exercise thumbnail → local placeholder. */
export function resolveExerciseImage(exercise: Exercise, media: Record<string, string>) {
  return media[exerciseKey(exercise.name)] || exercise.thumbnailUrl || fallbackExerciseImage(exercise);
}
