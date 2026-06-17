import {
  ArrowRight,
  Bot,
  CalendarDays,
  Clock3,
  Dumbbell,
  Flame,
  PlayCircle,
  RotateCcw,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { reportsApi } from '../api';
import { DailyMedals } from '../components/DailyMedals';
import { GptBuilder } from '../components/GptBuilder';
import { useActiveSession } from '../hooks/useActiveSession';
import { useApp } from '../hooks/useApp';
import { useRouter } from '../hooks/useRouter';
import { formatCountdown, formatCountdownLong, formatSessionDate, isSameLocalDay } from '../lib/format';
import { programKey } from '../lib/sessionEngine';
import type { DailyReport, ReportOverview, WeeklyReport } from '../types';

export function DashboardView() {
  const { activeProgram, token } = useApp();
  const { navigate } = useRouter();
  const { isRunning, isUnsaved, session } = useActiveSession();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [overview, setOverview] = useState<ReportOverview | null>(null);
  const [daily, setDaily] = useState<DailyReport | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);

  const refreshReports = useCallback(() => {
    if (!token) return;
    reportsApi.weekly(token).then(setWeekly).catch(() => undefined);
    reportsApi.overview(token).then(setOverview).catch(() => undefined);
    reportsApi.daily(token).then(setDaily).catch(() => undefined);
  }, [token]);

  useEffect(() => {
    refreshReports();
  }, [refreshReports]);

  useEffect(() => {
    const tick = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(tick);
  }, []);

  const focusSession = daily?.focusSession;
  const estimatedMinutes = daily?.estimatedMinutes ?? activeProgram?.duration ?? 0;
  const exerciseCount = daily?.exerciseCount ?? activeProgram?.exercises.length ?? 0;

  const secondsUntil = (() => {
    if (daily?.completedToday) return null;
    if (daily?.secondsUntilWorkout != null) return daily.secondsUntilWorkout;
    if (!focusSession) return null;
    const diff = Math.round((new Date(focusSession.startsAt).getTime() - nowMs) / 1000);
    return diff > 0 ? diff : 0;
  })();

  const canResumeToday = Boolean(
    activeProgram &&
      session &&
      (isRunning || isUnsaved) &&
      session.programId === programKey(activeProgram) &&
      isSameLocalDay(new Date(session.startedAt), new Date()),
  );

  return (
    <div className="view-stack">
      <section className="week-stats">
        <div className="week-stats__head">
          <p className="eyebrow">This week</p>
          {weekly && weekly.adherencePct !== null ? (
            <span className="week-stats__badge">{weekly.adherencePct}% plan</span>
          ) : null}
        </div>
        <div className="week-stats__mosaic">
          <article className="week-stat">
            <TrendingUp size={15} aria-hidden />
            <strong>{weekly?.completedSessions ?? 0}</strong>
            <span>Sessions</span>
          </article>
          <article className="week-stat">
            <Timer size={15} aria-hidden />
            <strong>{weekly?.totalMinutes ?? 0}</strong>
            <span>Minutes</span>
          </article>
          <article className="week-stat">
            <Flame size={15} aria-hidden />
            <strong>{weekly?.totalCalories ?? 0}</strong>
            <span>Calories</span>
          </article>
          <article className="week-stat week-stat--accent">
            <CalendarDays size={15} aria-hidden />
            <strong>{overview?.streakDays ?? daily?.streakDays ?? 0}</strong>
            <span>Streak</span>
          </article>
        </div>
        {weekly && weekly.adherencePct !== null ? (
          <div className="week-stats__progress" role="progressbar" aria-valuenow={weekly.adherencePct} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ width: `${weekly.adherencePct}%` }} />
          </div>
        ) : null}
      </section>

      {activeProgram && daily?.medals?.length ? (
        <DailyMedals medals={daily.medals} completedToday={daily.completedToday} />
      ) : null}

      {activeProgram ? (
        <section className="home-today">
          <p className="eyebrow">
            {daily?.completedToday ? 'Today’s win' : focusSession?.isToday === false ? 'Next workout' : 'Today’s workout'}
          </p>
          <h2>{focusSession?.title ?? activeProgram.name}</h2>

          {!daily?.completedToday && !canResumeToday && secondsUntil != null ? (
            <div className="home-countdown">
              <Clock3 size={18} />
              <div>
                <strong>{secondsUntil > 0 ? formatCountdown(secondsUntil) : 'Ready now'}</strong>
                <small>
                  {secondsUntil > 0 ? `${formatCountdownLong(secondsUntil)} until training` : 'Your scheduled session is here'}
                  {focusSession ? ` · ${formatSessionDate(focusSession.startsAt)}` : ''}
                </small>
              </div>
            </div>
          ) : canResumeToday ? (
            <div className="home-countdown home-countdown--resume">
              <RotateCcw size={18} />
              <div>
                <strong>Workout in progress</strong>
                <small>Pick up where you left off today</small>
              </div>
            </div>
          ) : daily?.completedToday && daily.todayStats ? (
            <div className="home-countdown home-countdown--done">
              <Target size={18} />
              <div>
                <strong>Session complete</strong>
                <small>
                  {daily.todayStats.minutes} min · {daily.todayStats.sets} sets · {daily.todayStats.calories} cal burned
                </small>
              </div>
            </div>
          ) : null}

          <div className="home-today__meta">
            <span><Dumbbell size={15} /> {activeProgram.name}</span>
            <span><Timer size={15} /> ~{estimatedMinutes} min est.</span>
            <span><PlayCircle size={15} /> {exerciseCount} exercises</span>
          </div>
          {canResumeToday ? (
            <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => navigate('workout')}>
              <RotateCcw size={20} /> Resume workout
            </button>
          ) : !daily?.completedToday ? (
            <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => navigate('workout')}>
              <PlayCircle size={20} /> {secondsUntil === 0 ? 'Start now' : 'Start workout'}
            </button>
          ) : (
            <button type="button" className="btn btn--ghost btn--block" onClick={() => navigate('history')}>
              View today in history <ArrowRight size={16} />
            </button>
          )}
        </section>
      ) : (
        <section className="home-today">
          <p className="eyebrow">Get started</p>
          <h2>No active program yet</h2>
          <p>Create a personalized program with AI Coach, or import your coach plan.</p>
          <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => setBuilderOpen(true)}>
            <Bot size={20} /> Create my program
          </button>
        </section>
      )}

      {activeProgram ? (
        <section className="card home-program">
          <div className="home-program__head">
            <div>
              <p className="eyebrow">Active program</p>
              <h3>{activeProgram.name}</h3>
            </div>
            <span className={`chip chip--${activeProgram.difficulty.toLowerCase()}`}>{activeProgram.difficulty}</span>
          </div>
          <div className="home-program__facts">
            <div><Target size={15} /><span>Goal</span><strong>{activeProgram.longTermGoal || activeProgram.tags[1] || activeProgram.difficulty}</strong></div>
            <div><CalendarDays size={15} /><span>Days/wk</span><strong>{activeProgram.daysPerWeek}</strong></div>
            <div><Timer size={15} /><span>Session</span><strong>{activeProgram.duration} min</strong></div>
          </div>
          <button type="button" className="btn btn--ghost btn--block" onClick={() => navigate('programs')}>
            View full program <ArrowRight size={16} />
          </button>
        </section>
      ) : null}

      <GptBuilder open={builderOpen} onClose={() => setBuilderOpen(false)} />
    </div>
  );
}
