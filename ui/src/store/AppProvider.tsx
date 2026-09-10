import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { authApi, mediaApi, profileApi, programsApi, ApiError } from '../api';
import { exerciseKey } from '../lib/exerciseImages';
import { getPersistedProgramId } from '../lib/format';
import { syncActiveSession } from '../lib/sessionSync';
import { fa } from '../i18n/fa';
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
  importCoachPlan: (input: {
    text: string;
    startDate: string;
    workoutTime: string;
    weeks: number;
    sessionDuration: number;
  }) => Promise<Program | null>;
  activateProgram: (program: Program) => Promise<void>;
  shareProgram: (program: Program) => Promise<void>;
  duplicateProgram: (program: Program) => Promise<void>;
  deleteProgram: (program: Program) => Promise<void>;
  updateProgram: (id: string, patch: Partial<Program>) => Promise<boolean>;
  updateProfile: (patch: Partial<User>) => Promise<boolean>;
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
          notify(fa.toast.sessionExpired, 'error');
        } else {
          notify(
            error instanceof Error ? error.message : fa.toast.couldNotLoadAccount,
            'error',
          );
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadAccountData, clearSession, notify]);

  // Flush any finished-but-unsaved workout to the backend on load and whenever
  // the network comes back.
  useEffect(() => {
    if (!token) return;
    void syncActiveSession(token);
    const onOnline = () => void syncActiveSession(token);
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [token]);

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
        notify(fa.toast.welcome(result.user.name ? result.user.name.split(' ')[0] : undefined), 'success');
      } catch (error) {
        notify(error instanceof Error ? error.message : fa.toast.authFailed, 'error');
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [loadAccountData, notify],
  );

  const logout = useCallback(() => {
    clearSession();
    notify(fa.toast.signedOut, 'info');
  }, [clearSession, notify]);

  const refreshPrograms = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    try {
      const result = await programsApi.list(token);
      setPrograms(result.programs);
    } catch (error) {
      notify(error instanceof Error ? error.message : fa.toast.couldNotSyncPrograms, 'error');
    } finally {
      setBusy(false);
    }
  }, [token, notify]);

  const importCoachPlan = useCallback<AppContextValue['importCoachPlan']>(
    async (input) => {
      if (!token) {
        notify(fa.toast.signInToImport, 'error');
        return null;
      }
      setBusy(true);
      notify(fa.toast.buildingPlan, 'info');
      try {
        const { program } = await programsApi.importCoachPlan(token, input);
        setPrograms((current) => [program, ...current]);
        notify(fa.toast.coachPlanScheduled, 'success');
        return program;
      } catch (error) {
        notify(error instanceof Error ? error.message : fa.toast.couldNotImportCoach, 'error');
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
        notify(fa.toast.saveBeforeActivate, 'error');
        return;
      }
      setBusy(true);
      try {
        const { program: updated } = await programsApi.activate(token, id);
        setPrograms((current) => current.map((item) => ({ ...item, isActive: item._id === updated._id })));
        notify(fa.toast.programActivated, 'success');
      } catch (error) {
        notify(error instanceof Error ? error.message : fa.toast.activationFailed, 'error');
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
        notify(fa.toast.saveBeforeShare, 'error');
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
        notify(fa.toast.shareCode(result.shareCode), 'success');
        await navigator.clipboard?.writeText(result.shareCode).catch(() => undefined);
      } catch (error) {
        notify(error instanceof Error ? error.message : fa.toast.sharingFailed, 'error');
      } finally {
        setBusy(false);
      }
    },
    [token, notify],
  );

  const duplicateProgram = useCallback(
    async (program: Program) => {
      const id = getPersistedProgramId(program);
      if (!token || !id) return;
      setBusy(true);
      try {
        const { program: copy } = await programsApi.duplicate(token, id);
        setPrograms((current) => [copy, ...current]);
        notify(fa.toast.programDuplicated, 'success');
      } catch (error) {
        notify(error instanceof Error ? error.message : fa.toast.couldNotDuplicate, 'error');
      } finally {
        setBusy(false);
      }
    },
    [token, notify],
  );

  const deleteProgram = useCallback(
    async (program: Program) => {
      const id = getPersistedProgramId(program);
      if (!token || !id) return;
      setBusy(true);
      try {
        await programsApi.remove(token, id);
        setPrograms((current) => current.filter((p) => p._id !== program._id));
        notify(fa.toast.programDeleted, 'info');
      } catch (error) {
        notify(error instanceof Error ? error.message : fa.toast.couldNotDelete, 'error');
      } finally {
        setBusy(false);
      }
    },
    [token, notify],
  );

  const updateProgram = useCallback(
    async (id: string, patch: Partial<Program>) => {
      if (!token) return false;
      setBusy(true);
      try {
        const { program } = await programsApi.update(token, id, patch);
        setPrograms((current) => current.map((p) => (p._id === program._id ? program : p)));
        notify(fa.toast.programUpdated, 'success');
        return true;
      } catch (error) {
        notify(error instanceof Error ? error.message : fa.toast.couldNotSaveChanges, 'error');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [token, notify],
  );

  const updateProfile = useCallback(
    async (patch: Partial<User>) => {
      if (!token) return false;
      setBusy(true);
      try {
        const { user: updated } = await profileApi.update(token, patch);
        setUser(updated);
        writeJSON(STORAGE_KEYS.user, updated);
        notify(fa.toast.profileSaved, 'success');
        return true;
      } catch (error) {
        notify(error instanceof Error ? error.message : fa.toast.couldNotSaveProfile, 'error');
        return false;
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
        notify(
          media.source === 'personal' ? fa.toast.personalImageSaved : fa.toast.imageSharedAll,
          'success',
        );
      } catch (error) {
        // optimistic local fallback
        setExerciseMedia((current) => ({ ...current, [exerciseKey(exercise.name)]: imageUrl }));
        notify(error instanceof Error ? error.message : fa.toast.savedLocallyOnly, 'error');
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
      importCoachPlan,
      activateProgram,
      shareProgram,
      duplicateProgram,
      deleteProgram,
      updateProgram,
      updateProfile,
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
      importCoachPlan,
      activateProgram,
      shareProgram,
      duplicateProgram,
      deleteProgram,
      updateProgram,
      updateProfile,
      saveExerciseImage,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
