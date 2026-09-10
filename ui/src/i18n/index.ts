/** Multi-locale UI framework for ComeUp (non-React core). */
import { ar } from './ar';
import { en, type UiCopy } from './en';
import { fa } from './fa';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  isLocale,
  isRtl,
  localeDirection,
  localeToBcp47,
  type Locale,
} from './types';

export type { Locale, UiCopy };
export {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  LOCALES,
  isLocale,
  isRtl,
  localeDirection,
  localeToBcp47,
} from './types';

const DICTS: Record<Locale, UiCopy> = { en, fa: fa as unknown as UiCopy, ar };

/** Module-level locale for non-React callers (toasts, format helpers). */
let currentLocale: Locale = readStoredLocale();

const listeners = new Set<() => void>();

function readStoredLocale(): Locale {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_LOCALE;
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function getT(): UiCopy {
  return DICTS[currentLocale];
}

export function applyDocumentLocale(locale: Locale) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.lang = locale;
  root.dir = localeDirection(locale);
}

/** Call ASAP on boot (before first paint) to avoid EN/FA/AR flash. */
export function bootLocaleFromStorage() {
  const locale = readStoredLocale();
  currentLocale = locale;
  applyDocumentLocale(locale);
  return locale;
}

function persistLocale(locale: Locale) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

export function setLocaleGlobal(locale: Locale) {
  if (locale === currentLocale) {
    applyDocumentLocale(locale);
    return;
  }
  currentLocale = locale;
  persistLocale(locale);
  applyDocumentLocale(locale);
  listeners.forEach((l) => l());
}

export function subscribeLocale(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function dictFor(locale: Locale): UiCopy {
  return DICTS[locale];
}

/** Nested key lookup: t(locale, 'nav.home') — string leaves only. */
export function t(locale: Locale, key: string): string {
  const parts = key.split('.');
  let cur: unknown = DICTS[locale];
  for (const part of parts) {
    if (cur && typeof cur === 'object' && part in (cur as object)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof cur === 'string' ? cur : key;
}

export function goalLabel(goal: string, copy: UiCopy = getT()) {
  return copy.goals[goal] ?? goal;
}

export function levelLabel(level: string, copy: UiCopy = getT()) {
  return copy.levels[level] ?? level;
}

export function equipmentLabel(item: string, copy: UiCopy = getT()) {
  return copy.equipment[item] ?? item;
}

export function focusLabel(item: string, copy: UiCopy = getT()) {
  return copy.focusAreas[item] ?? item;
}

export function genderLabel(gender: string, copy: UiCopy = getT()) {
  return copy.genders[gender] ?? gender;
}

export function nutritionPrefLabel(id: string, copy: UiCopy = getT()) {
  return copy.nutritionPrefs[id] ?? id;
}

export function joinList(items: string[], copy: UiCopy = getT()) {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} ${copy.listAnd} ${items[1]}`;
  return `${items.slice(0, -1).join(copy.listSep)} ${copy.listAnd} ${items[items.length - 1]}`;
}

/** @deprecated Use joinList */
export const joinFaList = joinList;
