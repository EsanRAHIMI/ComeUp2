// Pure, framework-free workout-session logic.
// Only `import type` is used here so the module runs under Node's
// --experimental-strip-types for tests (no transpiler / dependencies needed).
import type { Exercise, Program, SessionExercise } from '../types';

export type CompletedSet = {
  exerciseId?: string;
  exerciseName: string;
  setNumber: number;
  reps: number;
  restTime: number;
  completedAt: string;
};

/** Payload sent to PATCH /sessions/:id/complete — shape mirrors the backend Zod schema. */
export type CompletionPayload = {
  exercises: SessionExercise[];
  totalDuration: number;
  caloriesBurned: number;
  averageFormScore: number;
  endTime: string;
};

export type PersistedSession = {
  sessionId: string | null;
  programId: string;
  startedAt: number;
  currentIndex: number;
  completedSets: Record<string, CompletedSet>;
  /** Set once the user finishes; presence means the workout is done but not yet saved. */
  completion?: CompletionPayload;
  awaitingSave?: boolean;
};

export type SessionSummary = {
  durationSeconds: number;
  completedSets: number;
  totalSets: number;
  caloriesBurned: number;
};

const OBJECT_ID = /^[a-f\d]{24}$/i;

export function setKey(exerciseIndex: number, setNumber: number) {
  return `${exerciseIndex}:${setNumber}`;
}

/** The Mongo ObjectId of a saved program, or null for demo/unsaved programs. */
export function backendProgramId(program: Pick<Program, '_id'> | null): string | null {
  return program && typeof program._id === 'string' && OBJECT_ID.test(program._id) ? program._id : null;
}

/** Stable per-program key used to scope a persisted session. */
export function programKey(program: Pick<Program, '_id' | 'name'> | null): string {
  if (!program) return 'none';
  return backendProgramId(program) ?? program._id ?? program.name;
}

export function createSession(pKey: string, startedAt = Date.now()): PersistedSession {
  return { sessionId: null, programId: pKey, startedAt, currentIndex: 0, completedSets: {} };
}

/** Restore a stored session only if it belongs to the given program. */
export function restoreSession(raw: unknown, pKey: string, exerciseCount: number): PersistedSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as PersistedSession;
  if (s.programId !== pKey || typeof s.startedAt !== 'number') return null;
  const currentIndex = Math.min(Math.max(0, s.currentIndex ?? 0), Math.max(0, exerciseCount - 1));
  return { ...s, currentIndex, completedSets: s.completedSets ?? {} };
}

export function isSetDone(state: PersistedSession | null, exIndex: number, setNumber: number): boolean {
  return Boolean(state?.completedSets[setKey(exIndex, setNumber)]);
}

/** First exercise that still has an incomplete set; used to highlight the live working set. */
export function findProgressExerciseIndex(
  exercises: Pick<Exercise, 'sets'>[],
  isDone: (exIndex: number, setNumber: number) => boolean,
): number {
  for (let i = 0; i < exercises.length; i++) {
    for (let n = 1; n <= exercises[i].sets; n++) {
      if (!isDone(i, n)) return i;
    }
  }
  return Math.max(0, exercises.length - 1);
}

export function toggleSet(
  state: PersistedSession,
  exIndex: number,
  exercise: Exercise,
  setNumber: number,
  at: string = new Date().toISOString(),
): PersistedSession {
  const key = setKey(exIndex, setNumber);
  const completedSets = { ...state.completedSets };
  if (completedSets[key]) {
    delete completedSets[key];
  } else {
    completedSets[key] = {
      exerciseId: exercise._id,
      exerciseName: exercise.name,
      setNumber,
      reps: exercise.reps,
      restTime: exercise.restTime,
      completedAt: at,
    };
  }
  return { ...state, completedSets };
}

export function countCompleted(state: PersistedSession | null): number {
  return state ? Object.keys(state.completedSets).length : 0;
}

/** Group completed sets into the per-exercise array the backend expects. */
export function buildExercisesPayload(completedSets: Record<string, CompletedSet>): SessionExercise[] {
  const byExercise = new Map<string, SessionExercise>();
  for (const record of Object.values(completedSets)) {
    const id = record.exerciseId ?? record.exerciseName;
    let entry = byExercise.get(id);
    if (!entry) {
      entry = { exerciseId: id, exerciseName: record.exerciseName, sets: [] };
      byExercise.set(id, entry);
    }
    entry.sets.push({
      setNumber: record.setNumber,
      repsCompleted: record.reps,
      restTime: record.restTime,
      completedAt: record.completedAt,
    });
  }
  return [...byExercise.values()];
}

export function buildCompletion(
  state: PersistedSession,
  opts: { totalSets: number; totalCalories: number; nowMs?: number },
): { payload: CompletionPayload; summary: SessionSummary } {
  const now = opts.nowMs ?? Date.now();
  const durationSeconds = Math.max(0, Math.floor((now - state.startedAt) / 1000));
  const completed = countCompleted(state);
  const caloriesBurned = opts.totalSets
    ? Math.round(opts.totalCalories * (completed / opts.totalSets))
    : Math.round(opts.totalCalories);

  const payload: CompletionPayload = {
    exercises: buildExercisesPayload(state.completedSets),
    // Backend requires integers (z.number().int()).
    totalDuration: Math.max(0, Math.round(durationSeconds)),
    caloriesBurned: Math.max(0, Math.round(caloriesBurned)),
    averageFormScore: 0,
    endTime: new Date(now).toISOString(),
  };
  const summary: SessionSummary = {
    durationSeconds,
    completedSets: completed,
    totalSets: opts.totalSets,
    caloriesBurned: payload.caloriesBurned,
  };
  return { payload, summary };
}

export function summaryFromCompletion(state: PersistedSession, completion: CompletionPayload, totalSets: number): SessionSummary {
  return {
    durationSeconds: completion.totalDuration,
    completedSets: countCompleted(state),
    totalSets,
    caloriesBurned: completion.caloriesBurned,
  };
}

// --- Completion IO (dependency-injected so it is testable without a network) ---

export type SessionApi = {
  start: (programId: string) => Promise<{ sessionId: string }>;
  complete: (sessionId: string, payload: CompletionPayload) => Promise<void>;
};

export type SessionStore = {
  write: (state: PersistedSession) => void;
  clear: () => void;
};

export type CompleteResult = { status: 'saved' | 'failed'; state: PersistedSession | null };

/**
 * Finish a workout and persist it to the backend.
 * Guarantees: the local session is NEVER cleared unless the save succeeds.
 * If the session has no backend id (started offline), one is created here first.
 */
export async function runCompletion(args: {
  state: PersistedSession;
  completion: CompletionPayload;
  backendProgramId: string | null;
  api: SessionApi;
  store: SessionStore;
  online: boolean;
}): Promise<CompleteResult> {
  const { completion, api, store, online } = args;

  // Persist the finished workout up front so a crash/refresh can't lose it.
  let latest: PersistedSession = { ...args.state, completion, awaitingSave: true };
  store.write(latest);

  try {
    if (!online) throw new Error('offline');

    let sessionId = latest.sessionId;
    if (!sessionId) {
      if (!args.backendProgramId) throw new Error('no-backend-program');
      const started = await api.start(args.backendProgramId);
      sessionId = started.sessionId;
      latest = { ...latest, sessionId };
      store.write(latest);
    }

    await api.complete(sessionId, completion);
    store.clear();
    return { status: 'saved', state: null };
  } catch {
    // Keep it locally (already written) for retry / later sync.
    return { status: 'failed', state: latest };
  }
}
