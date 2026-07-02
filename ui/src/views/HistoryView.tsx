import {
  ArrowRight,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Loader2,
  Timer,
  Utensils,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { reportsApi, sessionsApi } from '../api';
import { EmptyState } from '../components/EmptyState';
import { useApp } from '../hooks/useApp';
import { useRouter } from '../hooks/useRouter';
import { addMonths, buildMonthGrid, currentMonthKey, monthLabel, todayDayKey } from '../lib/calendar';
import { formatDuration, formatSessionDate } from '../lib/format';
import type { CalendarDayData, CalendarReport, CalendarWorkoutStatus, WorkoutSession } from '../types';

const WEEKDAY_HEAD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const STATUS_LABEL: Record<CalendarWorkoutStatus, string> = {
  completed: 'Completed',
  pending: 'Pending',
  missed: 'Missed',
  shifted: 'Shifted',
  upcoming: 'Scheduled',
};

/** Primary dot for a day: trained beats schedule status. */
function dayDotStatus(data: CalendarDayData | undefined): CalendarWorkoutStatus | null {
  if (!data) return null;
  if ((data.sessions ?? 0) > 0) return 'completed';
  return data.workout?.status ?? null;
}

export function HistoryView() {
  const { token, notify } = useApp();
  const { navigate } = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[] | null>(null);
  const [month, setMonth] = useState(() => currentMonthKey());
  const [calendar, setCalendar] = useState<CalendarReport | null>(null);
  const [calLoading, setCalLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  const todayKey = calendar?.todayKey ?? todayDayKey();

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

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setCalLoading(true);
    reportsApi
      .calendar(token, month)
      .then((res) => {
        if (cancelled) return;
        setCalendar(res);
        setCalLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCalendar(null);
        setCalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, month]);

  const weeks = useMemo(() => buildMonthGrid(month), [month]);
  const days = calendar?.days ?? {};
  const monthHasData = Object.keys(days).length > 0;
  const selectedData: CalendarDayData | undefined = selected ? days[selected] : undefined;

  const completed = (sessions ?? []).filter((s) => s.status === 'completed');
  const totalSets = completed.reduce((sum, s) => sum + s.exercises.reduce((n, e) => n + e.sets.length, 0), 0);
  const totalMinutes = Math.round(completed.reduce((sum, s) => sum + s.totalDuration, 0) / 60);

  function changeMonth(delta: number) {
    setMonth((m) => addMonths(m, delta));
    setSelected(null);
  }

  return (
    <div className="view-stack">
      <section className="card cal">
        <div className="cal__head">
          <button type="button" className="icon-btn" onClick={() => changeMonth(-1)} aria-label="Previous month">
            <ChevronLeft size={18} />
          </button>
          <h3>{monthLabel(month)}</h3>
          <button type="button" className="icon-btn" onClick={() => changeMonth(1)} aria-label="Next month">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="cal__weekdays" aria-hidden>
          {WEEKDAY_HEAD.map((d, i) => (
            <span key={`${d}-${i}`}>{d}</span>
          ))}
        </div>

        {calLoading ? (
          <div className="loading-row cal__loading">
            <Loader2 className="spin" size={18} />
            <span>Loading month…</span>
          </div>
        ) : (
          <div className="cal__grid" role="grid" aria-label={monthLabel(month)}>
            {weeks.flat().map((cell, i) => {
              if (!cell) return <span key={`empty-${i}`} className="cal__cell cal__cell--empty" />;
              const data = days[cell.dayKey];
              const dot = dayDotStatus(data);
              const isToday = cell.dayKey === todayKey;
              const isSelected = cell.dayKey === selected;
              return (
                <button
                  key={cell.dayKey}
                  type="button"
                  role="gridcell"
                  className={`cal__cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelected((s) => (s === cell.dayKey ? null : cell.dayKey))}
                  aria-label={cell.dayKey}
                >
                  <span className="cal__num">{cell.dayOfMonth}</span>
                  <span className="cal__dots">
                    {dot ? <i className={`cal__dot cal__dot--${dot}`} /> : null}
                    {data?.nutrition ? <i className="cal__dot cal__dot--food" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="cal__legend" aria-hidden>
          <span><i className="cal__dot cal__dot--completed" /> Done</span>
          <span><i className="cal__dot cal__dot--pending" /> Pending</span>
          <span><i className="cal__dot cal__dot--shifted" /> Shifted</span>
          <span><i className="cal__dot cal__dot--missed" /> Missed</span>
          <span><i className="cal__dot cal__dot--upcoming" /> Planned</span>
          <span><i className="cal__dot cal__dot--food" /> Food</span>
        </div>

        {!calLoading && !monthHasData ? (
          <p className="cal__empty">No activity in {monthLabel(month)} yet.</p>
        ) : null}
      </section>

      {selected ? (
        <section className="card cal-detail">
          <p className="eyebrow">{selected === todayKey ? 'Today' : selected}</p>
          {selectedData ? (
            <>
              {selectedData.workout ? (
                <div className="cal-detail__row">
                  <span className={`chip cal-chip--${selectedData.workout.status}`}>
                    {STATUS_LABEL[selectedData.workout.status]}
                  </span>
                  <strong>{selectedData.workout.title}</strong>
                </div>
              ) : (selectedData.sessions ?? 0) > 0 ? (
                <div className="cal-detail__row">
                  <span className="chip cal-chip--completed">Trained</span>
                  <strong>Unscheduled workout</strong>
                </div>
              ) : null}

              {selectedData.stats ? (
                <div className="cal-detail__stats">
                  <span><Dumbbell size={14} /> {selectedData.stats.sets} sets</span>
                  <span><Timer size={14} /> {selectedData.stats.minutes} min</span>
                  <span><Flame size={14} /> {selectedData.stats.calories} cal</span>
                </div>
              ) : null}

              {selectedData.nutrition ? (
                <div className="cal-detail__row cal-detail__row--muted">
                  <Utensils size={14} />
                  <span>
                    {selectedData.nutrition.loggedSlots}/{selectedData.nutrition.slotCount} meals logged
                  </span>
                </div>
              ) : null}

              {selectedData.workout?.status === 'pending' || selectedData.workout?.status === 'shifted' ? (
                <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('workout')}>
                  Go to workout <ArrowRight size={16} />
                </button>
              ) : selectedData.workout?.status === 'upcoming' ? (
                <button type="button" className="btn btn--ghost btn--block" onClick={() => navigate('programs')}>
                  View program <ArrowRight size={16} />
                </button>
              ) : selectedData.nutrition ? (
                <button type="button" className="btn btn--ghost btn--block" onClick={() => navigate('nutrition')}>
                  Open Food <ArrowRight size={16} />
                </button>
              ) : null}
            </>
          ) : (
            <p className="cal__empty">
              {selected > todayKey ? 'Nothing planned for this day yet.' : 'A rest day — no activity recorded.'}
            </p>
          )}
        </section>
      ) : null}

      {sessions === null ? (
        <div className="loading-row">
          <Loader2 className="spin" size={22} />
          <span>Loading your sessions…</span>
        </div>
      ) : completed.length === 0 ? (
        <EmptyState
          title="No sessions yet"
          description="Finish a workout and it will show up here with duration, sets, and calories."
        />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
