// Pure helper: which important profile fields are missing for better
// recommendations. Never blocks the user — Home only shows a gentle prompt.
import type { User } from '../types';

export type ProfileHint = { id: string; label: string };

const HINTS: Array<{ id: string; label: string; missing: (u: User) => boolean }> = [
  { id: 'weight', label: 'وزن فعلی', missing: (u) => !u.weight },
  { id: 'height', label: 'قد', missing: (u) => !u.height },
  { id: 'age', label: 'سن', missing: (u) => !u.age },
  {
    id: 'preferredDays',
    label: 'روزهای ترجیحی تمرین',
    missing: (u) => !u.preferredDays || u.preferredDays.length === 0,
  },
];

export function missingProfileHints(user: User | null | undefined): ProfileHint[] {
  if (!user) return [];
  return HINTS.filter((h) => h.missing(user)).map(({ id, label }) => ({ id, label }));
}

function joinFaList(items: string[]) {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} و ${items[1]}`;
  return `${items.slice(0, -1).join('، ')} و ${items[items.length - 1]}`;
}

/** Human sentence for the Home prompt. */
export function profilePromptText(hints: ProfileHint[]): string | null {
  if (!hints.length) return null;
  const labels = hints.slice(0, 3).map((h) => h.label);
  return `برای پیشنهادهای دقیق‌تر، ${joinFaList(labels)} را اضافه کن.`;
}
