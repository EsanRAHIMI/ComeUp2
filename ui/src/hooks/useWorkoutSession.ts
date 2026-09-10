import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sessionsApi } from '../api';
import {
  backendProgramId,
  buildCompletion,
  countCompleted,
  createSession,
  isSetDone as engineIsSetDone,
  programKey,
  restoreSession,
  runCompletion,
  summaryFromCompletion,
  toggleSet as engineToggleSet,
  type PersistedSession,
  type SessionSummary,
} from '../lib/sessionEngine';
import { browserSessionStore, readActiveSession, writeActiveSession } from '../lib/sessionStore';
import { createSessionApi } from '../lib/sessionSync';
import type { Exercise, Program } from '../types';
import { fa } from '../i18n/fa';

export type { SessionSummary } from '../lib/sessionEngine';
export type CompleteOutcome = { summary: SessionSummary; status: 'saved' | 'failed' };

type Params = {
  program: Program | null;
  exercises: Exercise[];
  token: string | null;
  notify: (message: string, tone?: 'info' | 'success' | 'error') => void;
};

export function useWorkoutSession({ program, exercises, token, notify }: Params) {
  const pKey = programKey(program);

  // Lazy init restores any in-progress session for this program. The parent keys
  // this hook's component by program id, so switching programs remounts cleanly.
  const [state, setState] = useState<PersistedSession | null>(() =>
    restoreSession(readActiveSession(), pKey, exercises.length),
  );
  const [now, setNow] = useState(() => Date.now());
  const startingRef = useRef(false);

  // Persist on every change so a refresh never loses progress.
  useEffect(() => {
    if (state) writeActiveSession(state);
  }, [state]);

  // Tick the elapsed clock while running.
  useEffect(() => {
    if (!state || state.completion) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [state]);

  const currentIndex = state?.currentIndex ?? 0;
  const totalSets = useMemo(() => exercises.reduce((sum, ex) => sum + ex.sets, 0), [exercises]);
  const completedCount = countCompleted(state);
  const progress = totalSets ? Math.round((completedCount / totalSets) * 100) : 0;
  const elapsedSeconds = state ? Math.floor((now - state.startedAt) / 1000) : 0;

  const isRunning = state !== null && !state.completion;
  const isUnsaved = Boolean(state?.completion);
  const pendingSummary = useMemo(
    () => (state?.completion ? summaryFromCompletion(state, state.completion, totalSets) : null),
    [state, totalSets],
  );

  const start = useCallback(async () => {
    if (state || startingRef.current) return;
    startingRef.current = true;
    const created = createSession(pKey);
    setState(created);
    setNow(Date.now());

    const bId = backendProgramId(program);
    if (token && bId && navigator.onLine) {
      try {
        const { session } = await sessionsApi.start(token, bId);
        setState((s) => (s ? { ...s, sessionId: session._id } : s));
      } catch {
        notify(fa.toast.offlineProgress, 'info');
      }
    }
    startingRef.current = false;
  }, [state, pKey, program, token, notify]);

  const toggleSet = useCallback((exIndex: number, exercise: Exercise, setNumber: number) => {
    setState((s) => (s ? engineToggleSet(s, exIndex, exercise, setNumber) : s));
  }, []);

  const isSetDone = useCallback(
    (exIndex: number, setNumber: number) => engineIsSetDone(state, exIndex, setNumber),
    [state],
  );

  const setCurrentIndex = useCallback(
    (index: number) =>
      setState((s) =>
        s ? { ...s, currentIndex: Math.min(Math.max(index, 0), Math.max(0, exercises.length - 1)) } : s,
      ),
    [exercises.length],
  );

  const save = useCallback(async (): Promise<CompleteOutcome | null> => {
    const snapshot = state;
    if (!snapshot) return null;

    const { payload, summary } = snapshot.completion
      ? { payload: snapshot.completion, summary: summaryFromCompletion(snapshot, snapshot.completion, totalSets) }
      : buildCompletion(snapshot, { totalSets, totalCalories: program?.totalCalories ?? 0 });

    const result = await runCompletion({
      state: snapshot,
      completion: payload,
      backendProgramId: backendProgramId(program),
      api: createSessionApi(token),
      store: browserSessionStore,
      online: navigator.onLine,
    });

    setState(result.state);
    if (result.status === 'failed') {
      notify(fa.toast.couldNotSaveWorkout, 'error');
    }
    return { summary, status: result.status };
  }, [state, totalSets, program, token, notify]);

  const discard = useCallback(() => {
    setState(null);
    browserSessionStore.clear();
  }, []);

  return {
    state,
    active: state !== null,
    isRunning,
    isUnsaved,
    pendingSummary,
    currentIndex,
    setCurrentIndex,
    totalSets,
    completedCount,
    progress,
    elapsedSeconds,
    start,
    toggleSet,
    isSetDone,
    complete: save,
    retrySave: save,
    discard,
  };
}
