/** React locale context / hooks. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyDocumentLocale,
  dictFor,
  getLocale,
  setLocaleGlobal,
  subscribeLocale,
  type Locale,
  type UiCopy,
  isLocale,
  localeDirection,
  localeToBcp47,
} from './index';

type LocaleContextValue = {
  locale: Locale;
  t: UiCopy;
  setLocale: (next: Locale) => void;
  dir: 'rtl' | 'ltr';
  bcp47: string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale,
  onLocaleChange,
}: {
  children: ReactNode;
  initialLocale?: Locale | null;
  onLocaleChange?: (locale: Locale) => void;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (initialLocale && isLocale(initialLocale)) return initialLocale;
    return getLocale();
  });

  useEffect(() => subscribeLocale(() => setLocaleState(getLocale())), []);

  useEffect(() => {
    if (!initialLocale || !isLocale(initialLocale)) return;
    if (initialLocale === getLocale()) return;
    const stored = (() => {
      try {
        return localStorage.getItem('comeup.locale');
      } catch {
        return null;
      }
    })();
    if (stored && isLocale(stored)) return;
    setLocaleGlobal(initialLocale);
  }, [initialLocale]);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleGlobal(next);
      setLocaleState(next);
      onLocaleChange?.(next);
    },
    [onLocaleChange],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      t: dictFor(locale),
      setLocale,
      dir: localeDirection(locale),
      bcp47: localeToBcp47(locale),
    }),
    [locale, setLocale],
  );

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    const locale = getLocale();
    return {
      locale,
      t: dictFor(locale),
      setLocale: setLocaleGlobal,
      dir: localeDirection(locale),
      bcp47: localeToBcp47(locale),
    };
  }
  return ctx;
}

export function useT(): UiCopy {
  return useLocale().t;
}
