// Zero-dependency tests — run with: npm test
// (node --experimental-strip-types --test). No transpiler or test framework needed.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  backendProgramId,
  buildCompletion,
  createSession,
  isSetDone,
  programKey,
  restoreSession,
  runCompletion,
  toggleSet,
  type PersistedSession,
  type SessionApi,
  type SessionStore,
} from './sessionEngine.ts';
import type { Exercise } from '../types.ts';

const HEX_ID = '0123456789abcdef01234567';

function makeExercise(over: Partial<Exercise> = {}): Exercise {
  return {
    _id: 'abcabcabcabcabcabcabcabc',
    name: 'Back Squat',
    sets: 3,
    reps: 10,
    restTime: 60,
    instructions: 'Brace and sit between the hips.',
    muscleGroups: ['legs'],
    ...over,
  };
}

function makeStore() {
  const state = { value: null as PersistedSession | null, clears: 0, writes: 0 };
  const store: SessionStore = {
    write: (s) => {
      state.value = s;
      state.writes += 1;
    },
    clear: () => {
      state.value = null;
      state.clears += 1;
    },
  };
  return { store, state };
}

// --- start session ---
test('createSession starts empty and unsynced', () => {
  const s = createSession('p1', 1000);
  assert.equal(s.programId, 'p1');
  assert.equal(s.sessionId, null);
  assert.equal(s.startedAt, 1000);
  assert.deepEqual(s.completedSets, {});
});

test('programKey / backendProgramId distinguish saved vs unsaved programs', () => {
  assert.equal(programKey({ _id: HEX_ID, name: 'P' }), HEX_ID);
  assert.equal(programKey({ _id: undefined, name: 'Demo' }), 'Demo');
  assert.equal(backendProgramId({ _id: HEX_ID }), HEX_ID);
  assert.equal(backendProgramId({ _id: 'demo-strength' }), null);
});

// --- toggle set ---
test('toggleSet marks then clears a set', () => {
  let s = createSession('p1', 0);
  const ex = makeExercise();
  s = toggleSet(s, 0, ex, 1, '2020-01-01T00:00:00.000Z');
  assert.equal(isSetDone(s, 0, 1), true);
  assert.equal(Object.keys(s.completedSets).length, 1);
  s = toggleSet(s, 0, ex, 1);
  assert.equal(isSetDone(s, 0, 1), false);
});

// --- refresh restore ---
test('restoreSession restores matching program and clamps the index', () => {
  const stored: PersistedSession = {
    sessionId: null,
    programId: 'p1',
    startedAt: 5,
    currentIndex: 9,
    completedSets: {},
  };
  const restored = restoreSession(stored, 'p1', 3);
  assert.ok(restored);
  assert.equal(restored?.currentIndex, 2); // clamped to exerciseCount - 1
  assert.equal(restoreSession(stored, 'different', 3), null);
  assert.equal(restoreSession(null, 'p1', 3), null);
});

// --- complete success ---
test('complete success clears the local session', async () => {
  const { store, state } = makeStore();
  const session = { ...createSession(HEX_ID, 0), sessionId: 'sess-1' };
  let completed = false;
  const api: SessionApi = {
    start: async () => {
      throw new Error('should not be called');
    },
    complete: async () => {
      completed = true;
    },
  };
  const { payload } = buildCompletion(session, { totalSets: 3, totalCalories: 300, nowMs: 60_000 });
  const res = await runCompletion({
    state: session,
    completion: payload,
    backendProgramId: HEX_ID,
    api,
    store,
    online: true,
  });
  assert.equal(res.status, 'saved');
  assert.equal(res.state, null);
  assert.equal(completed, true);
  assert.equal(state.value, null);
  assert.equal(state.clears, 1);
});

// --- complete API failure must NOT clear local session ---
test('complete API failure keeps the local session for retry', async () => {
  const { store, state } = makeStore();
  const session = { ...createSession('p1', 0), sessionId: 'sess-1' };
  const api: SessionApi = {
    start: async () => ({ sessionId: 'x' }),
    complete: async () => {
      throw new Error('network down');
    },
  };
  const { payload } = buildCompletion(session, { totalSets: 1, totalCalories: 100, nowMs: 1000 });
  const res = await runCompletion({
    state: session,
    completion: payload,
    backendProgramId: 'p1',
    api,
    store,
    online: true,
  });
  assert.equal(res.status, 'failed');
  assert.ok(res.state, 'failed result keeps the session');
  assert.equal(state.clears, 0, 'storage was never cleared');
  assert.ok(state.value, 'session still in storage');
  assert.equal(state.value?.awaitingSave, true);
  assert.ok(state.value?.completion, 'completion payload preserved');
});

// --- offline session completion ---
test('offline completion is preserved, then syncs when back online', async () => {
  const { store, state } = makeStore();
  const offline = createSession(HEX_ID, 0); // sessionId === null (started offline)
  let startCalls = 0;
  let completeCalls = 0;
  const api: SessionApi = {
    start: async () => {
      startCalls += 1;
      return { sessionId: 'created-1' };
    },
    complete: async () => {
      completeCalls += 1;
    },
  };
  const { payload } = buildCompletion(offline, { totalSets: 2, totalCalories: 200, nowMs: 5000 });

  // While offline: cannot reach the server, but the workout is preserved.
  const offlineRes = await runCompletion({
    state: offline,
    completion: payload,
    backendProgramId: HEX_ID,
    api,
    store,
    online: false,
  });
  assert.equal(offlineRes.status, 'failed');
  assert.equal(startCalls, 0);
  assert.equal(completeCalls, 0);
  assert.equal(state.clears, 0);
  assert.ok(state.value?.completion);

  // Back online: a backend session is created, then completed.
  const onlineRes = await runCompletion({
    state: state.value!,
    completion: state.value!.completion!,
    backendProgramId: HEX_ID,
    api,
    store,
    online: true,
  });
  assert.equal(onlineRes.status, 'saved');
  assert.equal(startCalls, 1, 'backend session created at completion time');
  assert.equal(completeCalls, 1);
  assert.equal(state.value, null);
});

// --- backend payload compatibility ---
test('completion payload matches the backend schema', () => {
  let s = createSession('p1', 0);
  const ex = makeExercise({ _id: 'abcabcabcabcabcabcabcabc' });
  s = toggleSet(s, 0, ex, 1, '2020-01-01T00:00:00.000Z');
  s = toggleSet(s, 0, ex, 2, '2020-01-01T00:00:30.000Z');
  const { payload } = buildCompletion(s, { totalSets: 3, totalCalories: 300, nowMs: 90_000 });

  assert.equal(Number.isInteger(payload.totalDuration), true);
  assert.equal(Number.isInteger(payload.caloriesBurned), true);
  assert.equal(payload.totalDuration, 90);
  assert.equal(payload.caloriesBurned, 200); // 2/3 of 300 sets completed
  assert.equal(payload.averageFormScore, 0);
  assert.match(payload.endTime, /Z$/); // ISO 8601 with Z — accepted by Zod .datetime()
  assert.equal(payload.exercises.length, 1);

  const exPayload = payload.exercises[0];
  assert.equal(typeof exPayload.exerciseId, 'string'); // required String in mongoose schema
  assert.equal(exPayload.exerciseName, 'Back Squat');
  assert.equal(exPayload.sets.length, 2);
  assert.equal(exPayload.sets[0].setNumber, 1); // required Number
  assert.equal(exPayload.sets[0].repsCompleted, 10);
  assert.equal(exPayload.sets[1].setNumber, 2);
});
