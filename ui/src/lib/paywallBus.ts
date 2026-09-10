/** Tiny event bus so GPT / plate screens can open the shared paywall. */
type Listener = (reason?: string) => void;

const listeners = new Set<Listener>();

export function openPaywall(reason?: string) {
  listeners.forEach((l) => l(reason));
}

export function subscribePaywall(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
