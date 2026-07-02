// Pure helper: which important profile fields are missing for better
// recommendations. Never blocks the user — Home only shows a gentle prompt.
import type { User } from '../types';

export type ProfileHint = { id: string; label: string };

const HINTS: Array<{ id: string; label: string; missing: (u: User) => boolean }> = [
  { id: 'weight', label: 'current weight', missing: (u) => !u.weight },
  { id: 'height', label: 'height', missing: (u) => !u.height },
  { id: 'age', label: 'age', missing: (u) => !u.age },
  {
    id: 'preferredDays',
    label: 'preferred training days',
    missing: (u) => !u.preferredDays || u.preferredDays.length === 0,
  },
];

export function missingProfileHints(user: User | null | undefined): ProfileHint[] {
  if (!user) return [];
  return HINTS.filter((h) => h.missing(user)).map(({ id, label }) => ({ id, label }));
}

/** Human sentence for the Home prompt, e.g. "Add your current weight and height". */
export function profilePromptText(hints: ProfileHint[]): string | null {
  if (!hints.length) return null;
  const labels = hints.slice(0, 3).map((h) => h.label);
  const list =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
  return `Add your ${list} to get sharper recommendations.`;
}
