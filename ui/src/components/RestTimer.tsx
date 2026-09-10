import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Pause, Play, Plus, SkipForward } from 'lucide-react';
import { formatClock } from '../lib/format';
import { createRestBeepGate, playRestBeep, shouldPlayRestBeep } from '../lib/restSound';
import { useT } from '../i18n/LocaleProvider';

/**
 * Prominent rest countdown for the workout runner.
 * The parent gives this a unique `key` per set, so each rest is a fresh mount
 * — no reset effect needed.
 */
export function RestTimer({
  seconds,
  onDone,
  compact = false,
  soundEnabled = false,
}: {
  seconds: number;
  onDone?: () => void;
  compact?: boolean;
  /** Three soft beeps at 3/2/1 s remaining (preferences.restCountdownSound). */
  soundEnabled?: boolean;
}) {
  const fa = useT();
  const baseTotal = Math.max(seconds, 1);
  const [remaining, setRemaining] = useState(seconds);
  const [total, setTotal] = useState(baseTotal);
  const [paused, setPaused] = useState(false);
  const firedRef = useRef(false);
  const beepGateRef = useRef(createRestBeepGate());

  useEffect(() => {
    if (paused || remaining <= 0) return;
    const id = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [paused, remaining]);

  useEffect(() => {
    if (remaining === 0 && !firedRef.current) {
      firedRef.current = true;
      navigator.vibrate?.([120, 60, 120]);
      onDone?.();
    }
  }, [remaining, onDone]);

  // Soft countdown beeps at 3/2/1 s. The gate dedupes rerenders; audio calls
  // never throw, so the timer is unaffected if sound is blocked.
  useEffect(() => {
    const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    if (shouldPlayRestBeep(remaining, { enabled: soundEnabled, hidden, paused, gate: beepGateRef.current })) {
      playRestBeep();
    }
  }, [remaining, paused, soundEnabled]);

  const pct = Math.max(0, Math.min(100, Math.round(((total - remaining) / total) * 100)));
  const done = remaining <= 0;

  return (
    <div className={`rest-timer ${compact ? 'rest-timer--compact' : ''} ${done ? 'rest-timer--done' : ''}`}>
      <div className="rest-timer__ring" style={{ '--pct': `${pct}%` } as CSSProperties}>
        <div className="rest-timer__inner">
          <strong>{formatClock(remaining)}</strong>
          <span>{done ? fa.workout.restReady : fa.workout.restLabel}</span>
        </div>
      </div>
      <div className="rest-timer__controls">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            setRemaining((v) => {
              const next = v + 15;
              setTotal((t) => Math.max(t, next));
              return next;
            });
          }}
          aria-label={fa.workout.add15s}
        >
          <Plus size={16} /> 15s
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setPaused((p) => !p)}
          disabled={done}
          aria-label={paused ? fa.workout.resumeRest : fa.workout.pauseRest}
        >
          {paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setRemaining(0)} aria-label={fa.workout.skipRest}>
          <SkipForward size={16} /> {fa.workout.skip}
        </button>
      </div>
    </div>
  );
}
