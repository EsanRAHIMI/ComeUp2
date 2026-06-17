import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sessionsApi } from '../api';
import { getPersistedProgramId } from '../lib/format';
import { STORAGE_KEYS, readJSON, remove, writeJSON } from '../lib/storage';
import type { Exercise, Program, SessionExercise } from '../types';

type CompletedSet = {
  exerciseId?: string;
  exerciseName: string;
  setNumber: number;
  reps: number;
  restTime: number;
  completedAt: string;
};

type PersistedSession = {
  sessionId: string | null;
  programId: string;
  startedAt: number;
  currentIndex: number;
  completedSets: Record<string, CompletedSet>;
};

export type SessionSummary = {
  durationSeconds: number;
  completedSets: number;
  totalSets: number;
  caloriesBurned: number;
};

function setKey(exerciseIndex: number, setNumber: number) {
  return `${exerciseIndex}:${setNumber}`;
}

function programKey(program: Program | null) {
  return program ? getPersistedProgramId(program) ?? program._id ?? program.name : 'none';
}

type Params = {
  program: Program | null;
  exercises: Exercise[];
  token: string | null;
  notify: (message: string, tone?: 'info' | 'success' | 'error') => void;
};

export function useWorkoutSession({ program, exercises, token, notify }: Params) {
  const pKey = programKey(program);

  // Restore an in-progress session for this program after a refresh / re-entry.
  // Lazy initializers run once on mount; the parent keys this hook's component
  // by program id, so switching programs remounts and re-restores cleanly.
  const [state, setState] = useState<PersistedSession | null>(() => {
    const saved = readJSON<PersistedSession>(STORAGE_KEYS.session);
    return saved && saved.programId === pKey ? saved : null;
  });
  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = readJSON<PersistedSession>(STORAGE_KEYS.session);
    return saved && saved.programId === pKey
      ? Math.min(saved.currentIndex, Math.max(0, exercises.length - 1))
      : 0;
  });
  const [now, setNow] = useState(() => Date.now());

  // Persist on every change so a refresh never loses progress.
  useEffect(() => {
    if (state) writeJSON(STORAGE_KEYS.session, { ...state, currentIndex });
  }, [state, currentIndex]);

  // Tick the elapsed clock once per second while a session is active.
  useEffect(() => {
    if (!state) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [state]);

  const active = state !== null;
  const totalSets = useMemo(() => exercises.reduce((sum, ex) => sum + ex.sets, 0), [exercises]);
  const completedCount = state ? Object.keys(state.completedSets).length : 0;
  const progress = totalSets ? Math.round((completedCount / totalSets) * 100) : 0;
  const elapsedSeconds = state ? Math.floor((now - state.startedAt) / 1000) : 0;

  const startingRef = useRef(false);

  const start = useCallback(async () => {
    if (active || startingRef.current) return;
    startingRef.current = true;
    const base: PersistedSession = {
      sessionId: null,
      programId: pKey,
      startedAt: Date.now(),
      currentIndex: 0,
      completedSets: {},
    };
    setCurrentIndex(0);
    setState(base);
    setNow(Date.now());

    const backendId = program ? getPersistedProgramId(program) : null;
    if (token && backendId) {
      try {
        const { session } = await sessionsApi.start(token, backendId);
        setState((current) => (current ? { ...current, sessionId: session._id } : current));
      } catch {
        notify('Offline mode — progress is saved on this device', 'info');
      }
    }
    startingRef.current = false;
  }, [active, pKey, program, token, notify]);

  const isSetDone = useCallback(
    (exerciseIndex: number, setNumber: number) =>
      Boolean(state?.completedSets[setKey(exerciseIndex, setNumber)]),
    [state],
  );

  const toggleSet = useCallback(
    (exerciseIndex: number, exercise: Exercise, setNumber: number) => {
      setState((current) => {
        if (!current) return current;
        const key = setKey(exerciseIndex, setNumber);
        const completedSets = { ...current.completedSets };
        if (completedSets[key]) {
          delete completedSets[key];
        } else {
          completedSets[key] = {
            exerciseId: exercise._id,
            exerciseName: exercise.name,
            setNumber,
            reps: exercise.reps,
            restTime: exercise.restTime,
            completedAt: new Date().toISOString(),
          };
        }
        return { ...current, completedSets };
      });
    },
    [],
  );

  const goTo = useCallback(
    (index: number) => setCurrentIndex(Math.min(Math.max(index, 0), Math.max(0, exercises.length - 1))),
    [exercises.length],
  );

  const buildPayload = useCallback(
    (sets: Record<string, CompletedSet>): SessionExercise[] => {
      const byExercise = new Map<string, SessionExercise>();
      for (const record of Object.values(sets)) {
        const id = record.exerciseId ?? record.exerciseName;
        if (!byExercise.has(id)) {
          byExercise.set(id, { exerciseId: id, exerciseName: record.exerciseName, sets: [] });
        }
        byExercise.get(id)!.sets.push({
          setNumber: record.setNumber,
          repsCompleted: record.reps,
          restTime: record.restTime,
          completedAt: record.completedAt,
        });
      }
      return [...byExercise.values()];
    },
    [],
  );

  const reset = useCallback(() => {
    setState(null);
    setCurrentIndex(0);
    remove(STORAGE_KEYS.session);
  }, []);

  const complete = useCallback(async (): Promise<SessionSummary | null> => {
    if (!state) return null;
    const durationSeconds = Math.floor((Date.now() - state.startedAt) / 1000);
    const done = Object.keys(state.completedSets).length;
    const caloriesBurned = totalSets
      ? Math.round((program?.totalCalories ?? 0) * (done / totalSets))
      : program?.totalCalories ?? 0;
    const summary: SessionSummary = { durationSeconds, completedSets: done, totalSets, caloriesBurned };

    if (token && state.sessionId) {
      try {
        await sessionsApi.complete(token, state.sessionId, {
          exercises: buildPayload(state.completedSets),
          totalDuration: durationSeconds,
          caloriesBurned,
          averageFormScore: 0,
          endTime: new Date().toISOString(),
        });
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Could not save session', 'error');
      }
    }
    reset();
    return summary;
  }, [state, totalSets, program, token, buildPayload, reset, notify]);

  return {
    active,
    currentIndex,
    setCurrentIndex: goTo,
    totalSets,
    completedCount,
    progress,
    elapsedSeconds,
    start,
    toggleSet,
    isSetDone,
    complete,
    reset,
  };
}
