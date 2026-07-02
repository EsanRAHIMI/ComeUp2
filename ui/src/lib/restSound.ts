// Soft rest-countdown beeps (three short tones at 3/2/1 s remaining).
//
// Design constraints:
// - WebAudio only, no libraries, no audio files.
// - A single shared AudioContext, created/resumed only from a user gesture
//   (unlockRestAudio). Browsers block audio started outside gestures.
// - Every audio call fails silently — sound must never break the timer.
// - The pure gating logic (shouldPlayRestBeep) is separated from the DOM so
//   it can be unit-tested with the repo's Node test runner.

export type RestBeepGate = {
  /** Last `remaining` value that produced a beep — prevents rerender repeats. */
  lastBeeped: number | null;
};

export function createRestBeepGate(): RestBeepGate {
  return { lastBeeped: null };
}

/**
 * Decide whether a beep should play for this tick, and record it in the gate.
 * Pure with respect to the environment: callers pass `enabled` (the
 * preferences.restCountdownSound value) and `hidden` (document hidden state).
 */
export function shouldPlayRestBeep(
  remaining: number,
  opts: { enabled: boolean; hidden: boolean; paused?: boolean; gate: RestBeepGate },
): boolean {
  // Leaving the final window (e.g. user taps +15 s) re-arms the gate so a
  // fresh 3-2-1 countdown beeps again.
  if (Number.isFinite(remaining) && remaining > 3) opts.gate.lastBeeped = null;
  if (!opts.enabled || opts.hidden || opts.paused) return false;
  if (!Number.isInteger(remaining) || remaining < 1 || remaining > 3) return false;
  if (opts.gate.lastBeeped === remaining) return false;
  opts.gate.lastBeeped = remaining;
  return true;
}

// --- WebAudio (browser only; every entry point is wrapped in try/catch) ---

type AudioContextCtor = typeof AudioContext;

let sharedCtx: AudioContext | null = null;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ??
    null
  );
}

/**
 * Create/resume the shared AudioContext. Must be called from a user gesture
 * (e.g. tapping a set). Safe to call repeatedly — it never creates a second
 * context and never throws.
 */
export function unlockRestAudio(): void {
  try {
    const Ctor = audioContextCtor();
    if (!Ctor) return;
    if (!sharedCtx) sharedCtx = new Ctor();
    if (sharedCtx.state === 'suspended') {
      void sharedCtx.resume().catch(() => undefined);
    }
  } catch {
    /* audio unavailable — stay silent */
  }
}

/** Play one soft, short beep (~120 ms sine at 880 Hz, low gain). Never throws. */
export function playRestBeep(): void {
  try {
    if (!sharedCtx || sharedCtx.state !== 'running') return;
    const ctx = sharedCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.value = 880;
    // Gentle attack + exponential decay — soft "tick", not an alarm.
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);
    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        /* already disconnected */
      }
    };
  } catch {
    /* audio blocked or unavailable — stay silent */
  }
}
