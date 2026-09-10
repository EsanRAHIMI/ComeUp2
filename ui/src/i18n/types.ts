/** Supported UI locales. */
export type Locale = 'en' | 'fa' | 'ar';

export const LOCALES: Locale[] = ['en', 'fa', 'ar'];

export const LOCALE_STORAGE_KEY = 'comeup.locale';

export const DEFAULT_LOCALE: Locale = 'en';

/** BCP-47 tags for Intl date/number formatting. */
export function localeToBcp47(locale: Locale): string {
  switch (locale) {
    case 'fa':
      return 'fa-IR';
    case 'ar':
      return 'ar';
    default:
      return 'en-US';
  }
}

export function isRtl(locale: Locale): boolean {
  return locale === 'fa' || locale === 'ar';
}

export function localeDirection(locale: Locale): 'rtl' | 'ltr' {
  return isRtl(locale) ? 'rtl' : 'ltr';
}

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'fa' || value === 'ar';
}
