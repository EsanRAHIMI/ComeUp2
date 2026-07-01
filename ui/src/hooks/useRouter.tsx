import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ViewKey } from '../types';

const VIEWS: ViewKey[] = ['dashboard', 'programs', 'workout', 'history', 'nutrition', 'profile', 'admin'];

export type ProgramsAction = 'gpt' | 'quick' | 'import' | 'coach';

type NavigateOptions = {
  programsAction?: ProgramsAction;
};

function viewFromPath(pathname: string): ViewKey {
  const segment = pathname.replace(/^\/+/, '').split('/')[0] as ViewKey;
  return VIEWS.includes(segment) ? segment : 'dashboard';
}

type RouterValue = {
  view: ViewKey;
  programsAction: ProgramsAction | null;
  navigate: (view: ViewKey, options?: NavigateOptions) => void;
  clearProgramsAction: () => void;
};

const RouterContext = createContext<RouterValue | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<ViewKey>(() => viewFromPath(window.location.pathname));
  const [programsAction, setProgramsAction] = useState<ProgramsAction | null>(null);

  useEffect(() => {
    const onPop = () => setView(viewFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((next: ViewKey, options?: NavigateOptions) => {
    const target = `/${next}`;
    if (window.location.pathname !== target) {
      window.history.pushState({}, '', target);
    }
    setView(next);
    if (options?.programsAction) setProgramsAction(options.programsAction);
    window.scrollTo({ top: 0 });
  }, []);

  const clearProgramsAction = useCallback(() => setProgramsAction(null), []);

  const value = useMemo(
    () => ({ view, programsAction, navigate, clearProgramsAction }),
    [view, programsAction, navigate, clearProgramsAction],
  );
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
