import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ViewKey } from '../types';

const VIEWS: ViewKey[] = ['dashboard', 'programs', 'workout', 'history', 'profile'];

function viewFromPath(pathname: string): ViewKey {
  const segment = pathname.replace(/^\/+/, '').split('/')[0] as ViewKey;
  return VIEWS.includes(segment) ? segment : 'dashboard';
}

type RouterValue = {
  view: ViewKey;
  navigate: (view: ViewKey) => void;
};

const RouterContext = createContext<RouterValue | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewKey>(() => viewFromPath(window.location.pathname));

  useEffect(() => {
    const onPop = () => setView(viewFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((next: ViewKey) => {
    const target = `/${next}`;
    if (window.location.pathname !== target) {
      window.history.pushState({}, '', target);
    }
    setView(next);
    window.scrollTo({ top: 0 });
  }, []);

  const value = useMemo(() => ({ view, navigate }), [view, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
