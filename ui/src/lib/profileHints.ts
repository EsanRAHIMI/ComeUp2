import type { User } from '../types';

export type ProfileHint = { id: string; label: string };

const DEFAULT_LABELS: Record<string, string> = {
  weight: 'current weight',
  height: 'height',
  age: 'age',
  preferredDays: 'preferred training days',
};

export function missingProfileHints(
  user: User | null,
  labels: Record<string, string> = DEFAULT_LABELS,
): ProfileHint[] {
  const checks: Array<{ id: string; label: string; missing: (u: User) => boolean }> = [
    { id: 'weight', label: labels.weight ?? DEFAULT_LABELS.weight, missing: (u) => !u.weight },
    { id: 'height', label: labels.height ?? DEFAULT_LABELS.height, missing: (u) => !u.height },
    { id: 'age', label: labels.age ?? DEFAULT_LABELS.age, missing: (u) => !u.age },
    {
      id: 'preferredDays',
      label: labels.preferredDays ?? DEFAULT_LABELS.preferredDays,
      missing: (u) => !u.preferredDays?.length,
    },
  ];
  if (!user) return [];
  return checks.filter((c) => c.missing(user)).map(({ id, label }) => ({ id, label }));
}

export function profilePromptText(
  hints: ProfileHint[],
  format: (list: string) => string = (list) => `Add ${list} for sharper recommendations.`,
  join: (items: string[]) => string = (items) => {
    if (items.length <= 1) return items[0] ?? '';
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
  },
): string | null {
  if (!hints.length) return null;
  const labels = hints.slice(0, 3).map((h) => h.label);
  return format(join(labels));
}
