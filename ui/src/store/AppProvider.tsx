import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { authApi, mediaApi, programsApi, ApiError } from '../api';
import { exerciseKey } from '../lib/exerciseImages';
import { getPersistedProgramId } from '../lib/format';
import { STORAGE_KEYS, readJSON, remove, writeJSON } from '../lib/storage';
import type { AuthMode, Exercise, Program, User } from '../types';

export type ToastTone = 'info' | 'success' | 'error';
export type Toast = { id: number; message: string; tone: ToastTone };

export type AppContextValue = {
  ready: boolean;
  token: string | null;
  user: User | null;
  programs: Program[];
  activeProgram: Program | null;
  exerciseMedia: Record<string, string>;
  busy: boolean;
  toast: Toast | null;
  notify: (message: string, tone?: ToastTone) => void;
  authenticate: (mode: AuthMode, formData: FormData) => Promise<void>;
  logout: () => void;
  refreshPrograms: () => Promise<void>;
  generateProgram: () => Promise<Program | null>;
  importCoachPlan: (input: {
    text: string;
    startDate: string;
    workoutTime: string;
    weeks: number;
    sessionDuration: number;
  }) => Promise<Program | null>;
  activateProgram: (program: Program) => Promise<void>;
  shareProgram: (program: Program) => Promise<void>;
  saveExerciseImage: (exercise: Exercise, imageUrl: string) => Promise<void>;
};

export const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.token));
  const [user, setUser] = useState<User | null>(() => readJSON<User>(STORAGE_KEYS.user));
  const [programs, setPrograms] = useState<Program[]>([]);
  const [exerciseMedia, setExerciseMedia] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(!localStorage.getItem(STORAGE_KEYS.token));
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const notify = useCallback((message: string, tone: ToastTone = 'info') => {
    setToast({ id: Date.now(), message, tone });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), tone === 'error' ? 5000 : 3000);
  }, []);

  const clearSession = useCallback(() => {
    remove(STORAGE_KEYS.token);
    remove(STORAGE_KEYS.user);
    setToken(null);
    setUser(null);
    setPrograms([]);
    setExerciseMedia({});
  }, []);

  const loadAccountData = useCallback(async (authToken: string) => {
    const [programResult, mediaResult] = await Promise.all([
      programsApi.list(authToken),
      mediaApi.list(authToken).catch(() => ({ media: [] })),
    ]);
    setPrograms(programResult.programs);
    setExerciseMedia(Object.fromEntries(mediaResult.media.map((item) => [item.exerciseKey, item.imageUrl])));
  }, []);

  // On boot: validate the saved token against /auth/me and hydrate data.
  useEffect(() => {
    const savedToken = localStorage.getItem(STORAGE_KEYS.token);
    if (!savedToken) return;

    let cancelled = false;
    (async () => {
      try {
        const { user: freshUser } = await authApi.me(savedToken);
        if (cancelled) return;
        setUser(freshUser);
        writeJSON(STORAGE_KEYS.user, freshUser);
        await loadAccountData(savedToken);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          clearSession();
          notify('Session expired. Please sign in again.', 'error');
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadAccountData, clearSession, notify]);

  const authenticate = useCallback(
    async (mode: AuthMode, formData: FormData) => {
      setBusy(true);
      try {
        const result =
          mode === 'login'
            ? await authApi.login({
                email: String(formData.get('email')),
                password: String(formData.get('password')),
              })
            : await authApi.register({
                name: String(formData.get('name')),
                email: String(formData.get('email')),
                password: String(formData.get('password')),
                goal: formData.get('goal') as User['goal'],
                fitnessLevel: formData.get('fitnessLevel') as User['fitnessLevel'],
              });

        writeJSON(STORAGE_KEYS.user, result.user);
        localStorage.setItem(STORAGE_KEYS.token, result.token);
        setToken(result.token);
        setUser(result.user);
        await loadAccountData(result.token);
        notify(`Welcome${result.user.name ? `, ${result.user.name.split(' ')[0]}` : ''}!`, 'success');
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Authentication failed', 'error');
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [loadAccountData, notify],
  );

  const logout = useCallback(() => {
    clearSession();
    notify('Signed out.', 'info');
  }, [clearSession, notify]);

  const refreshPrograms = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    try {
      const result = await programsApi.list(token);
      setPrograms(result.programs);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not sync programs', 'error');
    } finally {
      setBusy(false);
    }
  }, [token, notify]);

  const generateProgram = useCallback(async () => {
    if (!token || !user) {
      notify('Sign in to generate AI workouts', 'error');
      return null;
    }
    setBusy(true);
    notify('Generating AI workout…', 'info');
    try {
      const { program } = await programsApi.generate(token, {
        goal: user.goal,
        fitnessLevel: user.fitnessLevel,
        duration: 40,
        equipment: ['bodyweight', 'dumbbells'],
        focusAreas: ['legs', 'core', 'chest'],
      });
      const saved = await programsApi.create(token, {
        name: program.name,
        description: program.description || 'Generated by ComeUp AI and tuned to your profile.',
        difficulty: program.difficulty,
        duration: program.duration,
        daysPerWeek: program.daysPerWeek || user.workoutDaysPerWeek,
        exercises: program.exercises,
        tags: program.tags?.length ? program.tags : ['ai', user.goal.toLowerCase()],
        totalCalories: program.totalCalories,
      });
      setPrograms((current) => [saved.program, ...current]);
      notify('AI program created', 'success');
      return saved.program;
    } catch (error) {
      notify(error instanceof Error ? error.message : 'AI generation failed', 'error');
      return null;
    } finally {
      setBusy(false);
    }
  }, [token, user, notify]);

  const importCoachPlan = useCallback<AppContextValue['importCoachPlan']>(
    async (input) => {
      if (!token) {
        notify('Sign in to import a coach plan', 'error');
        return null;
      }
      setBusy(true);
      notify('Building your plan…', 'info');
      try {
        const { program } = await programsApi.importCoachPlan(token, input);
        setPrograms((current) => [program, ...current]);
        notify('Coach plan scheduled', 'success');
        return program;
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Could not import coach plan', 'error');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [token, notify],
  );

  const activateProgram = useCallback(
    async (program: Program) => {
      const id = getPersistedProgramId(program);
      if (!token || !id) {
        notify('Save the program before activating it', 'error');
        return;
      }
      setBusy(true);
      try {
        const { program: updated } = await programsApi.activate(token, id);
        setPrograms((current) => current.map((item) => ({ ...item, isActive: item._id === updated._id })));
        notify('Program activated', 'success');
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Activation failed', 'error');
      } finally {
        setBusy(false);
      }
    },
    [token, notify],
  );

  const shareProgram = useCallback(
    async (program: Program) => {
      const id = getPersistedProgramId(program);
      if (!token || !id) {
        notify('Save the program before sharing it', 'error');
        return;
      }
      setBusy(true);
      try {
        const result = await programsApi.share(token, id);
        setPrograms((current) =>
          current.map((item) =>
            item._id === program._id ? { ...result.program, shareCode: result.shareCode } : item,
          ),
        );
        notify(`Share code: ${result.shareCode}`, 'success');
        await navigator.clipboard?.writeText(result.shareCode).catch(() => undefined);
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Sharing failed', 'error');
      } finally {
        setBusy(false);
      }
    },
    [token, notify],
  );

  const saveExerciseImage = useCallback(
    async (exercise: Exercise, imageUrl: string) => {
      if (!token) return;
      try {
        const { media } = await mediaApi.upsert(token, exercise.name, imageUrl);
        setExerciseMedia((current) => ({ ...current, [media.exerciseKey]: media.imageUrl }));
        notify('Exercise image saved', 'success');
      } catch (error) {
        // optimistic local fallback
        setExerciseMedia((current) => ({ ...current, [exerciseKey(exercise.name)]: imageUrl }));
        notify(error instanceof Error ? error.message : 'Saved locally only', 'error');
      }
    },
    [token, notify],
  );

  const activeProgram = useMemo(
    () => programs.find((program) => program.isActive) ?? programs[0] ?? null,
    [programs],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      token,
      user,
      programs,
      activeProgram,
      exerciseMedia,
      busy,
      toast,
      notify,
      authenticate,
      logout,
      refreshPrograms,
      generateProgram,
      importCoachPlan,
      activateProgram,
      shareProgram,
      saveExerciseImage,
    }),
    [
      ready,
      token,
      user,
      programs,
      activeProgram,
      exerciseMedia,
      busy,
      toast,
      notify,
      authenticate,
      logout,
      refreshPrograms,
      generateProgram,
      importCoachPlan,
      activateProgram,
      shareProgram,
      saveExerciseImage,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
