import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Pause, Play, Plus, SkipForward } from 'lucide-react';
import { formatClock } from '../lib/format';

/**
 * Prominent rest countdown for the workout runner.
 * The parent gives this a unique `key` per set, so each rest is a fresh mount
 * — no reset effect needed.
 */
export function RestTimer({
  seconds,
  onDone,
  compact = false,
}: {
  seconds: number;
  onDone?: () => void;
  compact?: boolean;
}) {
  const baseTotal = Math.max(seconds, 1);
  const [remaining, setRemaining] = useState(seconds);
  const [total, setTotal] = useState(baseTotal);
  const [paused, setPaused] = useState(false);
  const firedRef = useRef(false);

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

  const pct = Math.max(0, Math.min(100, Math.round(((total - remaining) / total) * 100)));
  const done = remaining <= 0;

  return (
    <div className={`rest-timer ${compact ? 'rest-timer--compact' : ''} ${done ? 'rest-timer--done' : ''}`}>
      <div className="rest-timer__ring" style={{ '--pct': `${pct}%` } as CSSProperties}>
        <div className="rest-timer__inner">
          <strong>{formatClock(remaining)}</strong>
          <span>{done ? 'Ready' : 'Rest'}</span>
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
          aria-label="Add 15 seconds"
        >
          <Plus size={16} /> 15s
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => setPaused((p) => !p)}
          disabled={done}
          aria-label={paused ? 'Resume rest' : 'Pause rest'}
        >
          {paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setRemaining(0)} aria-label="Skip rest">
          <SkipForward size={16} /> Skip
        </button>
      </div>
    </div>
  );
}
