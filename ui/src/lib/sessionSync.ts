import { sessionsApi } from '../api';
import { runCompletion, type SessionApi } from './sessionEngine';
import { browserSessionStore, readActiveSession } from './sessionStore';

const OBJECT_ID = /^[a-f\d]{24}$/i;

/** Wrap the HTTP API in the shape the pure engine expects. */
export function createSessionApi(token: string | null): SessionApi {
  return {
    start: async (programId) => {
      if (!token) throw new Error('not-authenticated');
      const { session } = await sessionsApi.start(token, programId);
      return { sessionId: session._id };
    },
    complete: async (sessionId, payload) => {
      if (!token) throw new Error('not-authenticated');
      await sessionsApi.complete(token, sessionId, payload);
    },
  };
}

/**
 * If a finished-but-unsaved session is sitting in storage, try to push it to the
 * backend. Safe to call on app load and whenever the network comes back.
 */
export async function syncActiveSession(token: string | null): Promise<'saved' | 'failed' | 'noop'> {
  const session = readActiveSession();
  if (!session?.completion) return 'noop';

  const result = await runCompletion({
    state: session,
    completion: session.completion,
    backendProgramId: OBJECT_ID.test(session.programId) ? session.programId : null,
    api: createSessionApi(token),
    store: browserSessionStore,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
  });
  return result.status;
}
