import { CalendarClock, Dumbbell, Flame, Loader2, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { sessionsApi } from '../api';
import { EmptyState } from '../components/EmptyState';
import { useApp } from '../hooks/useApp';
import { formatDuration, formatSessionDate } from '../lib/format';
import type { WorkoutSession } from '../types';

export function HistoryView() {
  const { token, notify } = useApp();
  const [sessions, setSessions] = useState<WorkoutSession[] | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    sessionsApi
      .list(token)
      .then((res) => !cancelled && setSessions(res.sessions))
      .catch((err) => {
        if (cancelled) return;
        setSessions([]);
        notify(err instanceof Error ? err.message : 'Could not load history', 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [token, notify]);

  if (sessions === null) {
    return (
      <div className="view-stack">
        <div className="loading-row">
          <Loader2 className="spin" size={22} />
          <span>Loading your sessions…</span>
        </div>
      </div>
    );
  }

  const completed = sessions.filter((s) => s.status === 'completed');

  if (!completed.length) {
    return (
      <div className="view-stack">
        <EmptyState
          title="No sessions yet"
          description="Finish a workout and it will show up here with duration, sets, and calories."
        />
      </div>
    );
  }

  const totalSets = completed.reduce((sum, s) => sum + s.exercises.reduce((n, e) => n + e.sets.length, 0), 0);
  const totalMinutes = Math.round(completed.reduce((sum, s) => sum + s.totalDuration, 0) / 60);

  return (
    <div className="view-stack">
      <section className="history-summary">
        <div><strong>{completed.length}</strong><span>Workouts</span></div>
        <div><strong>{totalSets}</strong><span>Sets</span></div>
        <div><strong>{totalMinutes}</strong><span>Minutes</span></div>
      </section>

      <div className="history-list">
        {completed.map((s) => {
          const sets = s.exercises.reduce((n, e) => n + e.sets.length, 0);
          return (
            <article className="history-row" key={s._id}>
              <span className="history-row__icon"><CalendarClock size={18} /></span>
              <div className="history-row__body">
                <strong>{formatSessionDate(s.startTime)}</strong>
                <small>{s.exercises.length} exercises</small>
              </div>
              <div className="history-row__stats">
                <span><Timer size={14} /> {formatDuration(s.totalDuration)}</span>
                <span><Dumbbell size={14} /> {sets} sets</span>
                <span><Flame size={14} /> {s.caloriesBurned}</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
