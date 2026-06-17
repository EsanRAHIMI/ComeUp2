import { STORAGE_KEYS, readJSON, remove, writeJSON } from './storage';
import type { PersistedSession, SessionStore } from './sessionEngine';

const EVENT = 'comeup:session-changed';

export function readActiveSession(): PersistedSession | null {
  return readJSON<PersistedSession>(STORAGE_KEYS.session);
}

/** Stable string snapshot for useSyncExternalStore (avoids new-object churn). */
export function getRawActiveSession(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.session);
  } catch {
    return null;
  }
}

export function writeActiveSession(state: PersistedSession) {
  writeJSON(STORAGE_KEYS.session, state);
  dispatchEvent(new Event(EVENT));
}

export function clearActiveSession() {
  remove(STORAGE_KEYS.session);
  dispatchEvent(new Event(EVENT));
}

/** Adapter passed to the pure engine's runCompletion. */
export const browserSessionStore: SessionStore = {
  write: writeActiveSession,
  clear: clearActiveSession,
};

/** Subscribe to active-session changes (same tab via custom event, other tabs via storage). */
export function subscribeActiveSession(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEYS.session || event.key === null) callback();
  };
  window.addEventListener(EVENT, callback);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener('storage', onStorage);
  };
}
