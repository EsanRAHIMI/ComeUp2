import { useMemo, useSyncExternalStore } from 'react';
import { clearActiveSession, getRawActiveSession, subscribeActiveSession } from '../lib/sessionStore';
import type { PersistedSession } from '../lib/sessionEngine';

/** Read-only view of the persisted active session, kept in sync across the app. */
export function useActiveSession() {
  const raw = useSyncExternalStore(subscribeActiveSession, getRawActiveSession, getRawActiveSession);
  const session = useMemo<PersistedSession | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PersistedSession;
    } catch {
      return null;
    }
  }, [raw]);

  return {
    session,
    isRunning: session !== null && !session.completion,
    isUnsaved: Boolean(session?.completion),
    discard: clearActiveSession,
  };
}
