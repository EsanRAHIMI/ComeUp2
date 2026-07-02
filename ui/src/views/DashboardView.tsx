import {
  ArrowRight,
  Bot,
  CalendarDays,
  Clock3,
  Dumbbell,
  Flame,
  Moon,
  PlayCircle,
  RotateCcw,
  Target,
  Timer,
  TrendingUp,
  UserRound,
  Utensils,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { reportsApi } from '../api';
import { DailyMedals } from '../components/DailyMedals';
import { GptBuilder } from '../components/GptBuilder';
import { useActiveSession } from '../hooks/useActiveSession';
import { useApp } from '../hooks/useApp';
import { useRouter } from '../hooks/useRouter';
import { formatCountdown, formatCountdownLong, formatSessionDate, isSameLocalDay } from '../lib/format';
import { missingProfileHints, profilePromptText } from '../lib/profileHints';
import { programKey } from '../lib/sessionEngine';
import { readJSON, STORAGE_KEYS, writeJSON } from '../lib/storage';
import type { DailyReport, ReportOverview, WeeklyReport } from '../types';

export function DashboardView() {
  const { activeProgram, token, user } = useApp();
  const { navigate } = useRouter();
  const { isRunning, isUnsaved, session } = useActiveSession();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [overview, setOverview] = useState<ReportOverview | null>(null);
  const [daily, setDaily] = useState<DailyReport | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(
    () => readJSON<boolean>(STORAGE_KEYS.profilePromptDismissed) === true,
  );

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
  const nextWorkout = daily?.nextWorkout;
  const todayStatus = daily?.todayStatus;
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

  const isRestDay = todayStatus === 'rest' && !canResumeToday && !daily?.completedToday;
  const isShifted = todayStatus === 'shifted';

  const hints = missingProfileHints(user);
  const promptText = profilePromptText(hints);
  const showProfilePrompt = Boolean(promptText) && !promptDismissed;

  const nutrition = daily?.nutrition;
  const loggedCount = nutrition?.loggedSlotIds.length ?? 0;

  const dismissPrompt = () => {
    setPromptDismissed(true);
    writeJSON(STORAGE_KEYS.profilePromptDismissed, true);
  };

  const todayEyebrow = daily?.completedToday
    ? 'Today’s win'
    : isRestDay
      ? 'Rest day'
      : isShifted
        ? 'Shifted workout'
        : focusSession?.isToday === false
          ? 'Next workout'
          : 'Today’s workout';

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

      {showProfilePrompt ? (
        <section className="card profile-prompt" aria-label="Complete your profile">
          <span className="profile-prompt__icon"><UserRound size={18} /></span>
          <div className="profile-prompt__text">
            <strong>Sharper plan, better estimates</strong>
            <small>{promptText}</small>
          </div>
          <div className="profile-prompt__actions">
            <button type="button" className="btn btn--primary" onClick={() => navigate('profile')}>
              Update
            </button>
            <button type="button" className="profile-prompt__close" onClick={dismissPrompt} aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        </section>
      ) : null}

      {activeProgram && daily?.medals?.length ? (
        <DailyMedals medals={daily.medals} completedToday={daily.completedToday} />
      ) : null}

      {activeProgram ? (
        <section className="home-today">
          <p className="eyebrow">{todayEyebrow}</p>
          <h2>{focusSession?.title ?? nextWorkout?.title ?? activeProgram.name}</h2>

          {isShifted && !canResumeToday && !daily?.completedToday ? (
            <div className="home-countdown home-countdown--shifted">
              <RotateCcw size={18} />
              <div>
                <strong>Carried over</strong>
                <small>This workout shifted forward — ready whenever you are</small>
              </div>
            </div>
          ) : isRestDay ? (
            <div className="home-countdown home-countdown--rest">
              <Moon size={18} />
              <div>
                <strong>Recovery counts too</strong>
                <small>
                  {nextWorkout
                    ? `Next: ${nextWorkout.title} · ${formatSessionDate(nextWorkout.startsAt)}`
                    : 'No workout scheduled today'}
                </small>
              </div>
            </div>
          ) : !daily?.completedToday && !canResumeToday && secondsUntil != null ? (
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
          ) : daily?.completedToday ? (
            <button type="button" className="btn btn--ghost btn--block" onClick={() => navigate('history')}>
              View today in history <ArrowRight size={16} />
            </button>
          ) : isRestDay ? (
            <button type="button" className="btn btn--ghost btn--block" onClick={() => navigate('programs')}>
              View program <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => navigate('workout')}>
              <PlayCircle size={20} /> {isShifted ? 'Start shifted workout' : secondsUntil === 0 ? 'Start now' : 'Start workout'}
            </button>
          )}
        </section>
      ) : (
        <section className="home-today">
          <p className="eyebrow">Get started</p>
          <h2>No active program yet</h2>
          <p>
            Build one with the AI Coach chat, quick-generate from your profile, or import a plan
            from your coach with a share code.
          </p>
          <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => setBuilderOpen(true)}>
            <Bot size={20} /> Create my program
          </button>
          <button type="button" className="btn btn--ghost btn--block" onClick={() => navigate('programs')}>
            See all ways to add a program <ArrowRight size={16} />
          </button>
        </section>
      )}

      <section className="card home-nutrition">
        <div className="home-nutrition__head">
          <div>
            <p className="eyebrow">Nutrition</p>
            <h3>
              {nutrition
                ? nutrition.nextSlot
                  ? nutrition.nextSlot.title
                  : 'All meals logged'
                : 'Your meal plan'}
            </h3>
          </div>
          <span className="card__head-icon" aria-hidden><Utensils size={20} /></span>
        </div>
        {nutrition ? (
          <div className="home-nutrition__meta">
            {nutrition.nextSlot?.time ? <span><Clock3 size={14} /> {nutrition.nextSlot.time}</span> : null}
            <span>
              <Target size={14} /> {loggedCount}/{nutrition.slotCount} meals logged today
            </span>
          </div>
        ) : (
          <p className="home-nutrition__empty">Open Food to see today’s plan and log your meals.</p>
        )}
        <button type="button" className="btn btn--ghost btn--block" onClick={() => navigate('nutrition')}>
          {nutrition?.nextSlot ? 'Log this meal' : 'Open Food'} <ArrowRight size={16} />
        </button>
      </section>

      {user ? (
        <section className="card home-goal">
          <div className="home-goal__head">
            <div>
              <p className="eyebrow">Goal</p>
              <h3>{user.goal}</h3>
            </div>
            <span className="card__head-icon" aria-hidden><Target size={20} /></span>
          </div>
          <div className="home-goal__facts">
            <div>
              <span>Plan adherence</span>
              <strong>{weekly?.adherencePct != null ? `${weekly.adherencePct}%` : '—'}</strong>
            </div>
            <div>
              <span>Streak</span>
              <strong>{overview?.streakDays ?? daily?.streakDays ?? 0} days</strong>
            </div>
            <div>
              <span>This week</span>
              <strong>
                {weekly?.completedSessions ?? 0}/{weekly?.scheduledThisWeek || '—'}
              </strong>
            </div>
          </div>
          <p className="home-goal__note">
            Timeline estimates unlock as you log workouts and weigh-ins.
          </p>
        </section>
      ) : null}

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
