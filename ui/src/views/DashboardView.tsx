import {
  ArrowRight,
  Bot,
  CalendarDays,
  Clock3,
  Droplets,
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
import { fa, goalLabel } from '../i18n/fa';
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
    ? fa.dashboard.todayWin
    : isRestDay
      ? fa.dashboard.restDay
      : isShifted
        ? fa.dashboard.shiftedWorkout
        : focusSession?.isToday === false
          ? fa.dashboard.nextWorkout
          : fa.dashboard.todaysWorkout;

  return (
    <div className="view-stack">
      <section className="week-stats">
        <div className="week-stats__head">
          <p className="eyebrow">This week</p>
          {weekly && weekly.adherencePct !== null ? (
            <span className="week-stats__badge">{weekly.adherencePct}٪ برنامه</span>
          ) : null}
        </div>
        <div className="week-stats__mosaic">
          <article className="week-stat">
            <TrendingUp size={15} aria-hidden />
            <strong>{weekly?.completedSessions ?? 0}</strong>
            <span>{fa.dashboard.sessions}</span>
          </article>
          <article className="week-stat">
            <Timer size={15} aria-hidden />
            <strong>{weekly?.totalMinutes ?? 0}</strong>
            <span>{fa.dashboard.minutes}</span>
          </article>
          <article className="week-stat">
            <Flame size={15} aria-hidden />
            <strong>{weekly?.totalCalories ?? 0}</strong>
            <span>{fa.dashboard.calories}</span>
          </article>
          <article className="week-stat week-stat--accent">
            <CalendarDays size={15} aria-hidden />
            <strong>{overview?.streakDays ?? daily?.streakDays ?? 0}</strong>
            <span>{fa.dashboard.streak}</span>
          </article>
        </div>
        {weekly && weekly.adherencePct !== null ? (
          <div className="week-stats__progress" role="progressbar" aria-valuenow={weekly.adherencePct} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ width: `${weekly.adherencePct}%` }} />
          </div>
        ) : null}
      </section>

      {showProfilePrompt ? (
        <section className="card profile-prompt" aria-label={fa.dashboard.completeProfile}>
          <span className="profile-prompt__icon"><UserRound size={18} /></span>
          <div className="profile-prompt__text">
            <strong>{fa.dashboard.sharperPlan}</strong>
            <small>{promptText}</small>
          </div>
          <div className="profile-prompt__actions">
            <button type="button" className="btn btn--primary" onClick={() => navigate('profile')}>
              Update
            </button>
            <button type="button" className="profile-prompt__close" onClick={dismissPrompt} aria-label={fa.dashboard.dismiss}>
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
                <strong>{fa.dashboard.carriedOver}</strong>
                <small>{fa.dashboard.carriedOverHint}</small>
              </div>
            </div>
          ) : isRestDay ? (
            <div className="home-countdown home-countdown--rest">
              <Moon size={18} />
              <div>
                <strong>{fa.dashboard.recoveryCounts}</strong>
                <small>
                  {nextWorkout
                    ? `${fa.dashboard.nextPrefix} ${nextWorkout.title} · ${formatSessionDate(nextWorkout.startsAt)}`
                    : fa.dashboard.noWorkoutToday}
                </small>
              </div>
            </div>
          ) : !daily?.completedToday && !canResumeToday && secondsUntil != null ? (
            <div className="home-countdown">
              <Clock3 size={18} />
              <div>
                <strong>{secondsUntil > 0 ? formatCountdown(secondsUntil) : fa.dashboard.readyNow}</strong>
                <small>
                  {secondsUntil > 0 ? `${formatCountdownLong(secondsUntil)} ${fa.dashboard.untilTraining}` : fa.dashboard.scheduledHere}
                  {focusSession ? ` · ${formatSessionDate(focusSession.startsAt)}` : ''}
                </small>
              </div>
            </div>
          ) : canResumeToday ? (
            <div className="home-countdown home-countdown--resume">
              <RotateCcw size={18} />
              <div>
                <strong>{fa.dashboard.workoutInProgress}</strong>
                <small>{fa.dashboard.pickUpWhere}</small>
              </div>
            </div>
          ) : daily?.completedToday && daily.todayStats ? (
            <div className="home-countdown home-countdown--done">
              <Target size={18} />
              <div>
                <strong>{fa.dashboard.sessionComplete}</strong>
                <small>
                  {fa.dashboard.minSetsCal(daily.todayStats.minutes, daily.todayStats.sets, daily.todayStats.calories)}
                </small>
              </div>
            </div>
          ) : null}

          <div className="home-today__meta">
            <span><Dumbbell size={15} /> {activeProgram.name}</span>
            <span><Timer size={15} /> {fa.dashboard.estMin(estimatedMinutes)}</span>
            <span><PlayCircle size={15} /> {fa.dashboard.exercisesCount(exerciseCount)}</span>
          </div>
          {canResumeToday ? (
            <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => navigate('workout')}>
              <RotateCcw size={20} /> {fa.dashboard.resumeWorkout}
            </button>
          ) : daily?.completedToday ? (
            <button type="button" className="btn btn--ghost btn--block" onClick={() => navigate('history')}>
              {fa.dashboard.viewTodayHistory} <ArrowRight size={16} />
            </button>
          ) : isRestDay ? (
            <button type="button" className="btn btn--ghost btn--block" onClick={() => navigate('programs')}>
              {fa.dashboard.viewProgram} <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => navigate('workout')}>
              <PlayCircle size={20} /> {isShifted ? fa.dashboard.startShifted : secondsUntil === 0 ? fa.dashboard.startNow : fa.dashboard.startWorkout}
            </button>
          )}
        </section>
      ) : (
        <section className="home-today">
          <p className="eyebrow">{fa.dashboard.getStarted}</p>
          <h2>{fa.dashboard.noActiveProgram}</h2>
          <p>
            {fa.dashboard.noActiveProgramBody}
          </p>
          <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => setBuilderOpen(true)}>
            <Bot size={20} /> {fa.dashboard.createMyProgram}
          </button>
          <button type="button" className="btn btn--ghost btn--block" onClick={() => navigate('programs')}>
            {fa.dashboard.seeAllWays} <ArrowRight size={16} />
          </button>
        </section>
      )}

      <section className="card home-nutrition">
        <div className="home-nutrition__head">
          <div>
            <p className="eyebrow">{fa.dashboard.nutrition}</p>
            <h3>
              {nutrition
                ? nutrition.nextSlot
                  ? nutrition.nextSlot.title
                  : 'All meals logged'
                : fa.dashboard.yourMealPlan}
            </h3>
          </div>
          {nutrition?.score != null ? (
            <span className={`home-nutrition__score home-nutrition__score--${nutrition.score >= 80 ? 'good' : nutrition.score >= 60 ? 'ok' : 'low'}`}>
              {nutrition.score}
            </span>
          ) : (
            <span className="card__head-icon" aria-hidden><Utensils size={20} /></span>
          )}
        </div>
        {nutrition ? (
          <>
            <div className="home-nutrition__meta">
              {nutrition.nextSlot?.time ? <span><Clock3 size={14} /> {nutrition.nextSlot.time}</span> : null}
              <span>
                <Target size={14} /> {fa.dashboard.mealsLoggedToday(loggedCount, nutrition.slotCount)}
              </span>
              {nutrition.water ? (
                <span>
                  <Droplets size={14} /> {nutrition.water.ml}/{nutrition.water.targetMl} ml
                </span>
              ) : null}
            </div>
            {nutrition.water ? (
              <div className="nut-water-bar" role="progressbar" aria-valuenow={nutrition.water.pct} aria-valuemin={0} aria-valuemax={100}>
                <i style={{ width: `${nutrition.water.pct}%` }} />
              </div>
            ) : null}
          </>
        ) : (
          <p className="home-nutrition__empty">{fa.dashboard.openFoodEmpty}</p>
        )}
        <button type="button" className="btn btn--ghost btn--block" onClick={() => navigate('nutrition')}>
          {nutrition?.nextSlot ? fa.dashboard.logThisMeal : fa.dashboard.openFood} <ArrowRight size={16} />
        </button>
      </section>

      {user ? (
        <section className="card home-goal">
          <div className="home-goal__head">
            <div>
              <p className="eyebrow">{fa.dashboard.goal}</p>
              <h3>{goalLabel(user.goal)}</h3>
            </div>
            <span className="card__head-icon" aria-hidden><Target size={20} /></span>
          </div>
          <div className="home-goal__facts">
            <div>
              <span>{fa.dashboard.planAdherence}</span>
              <strong>{weekly?.adherencePct != null ? `${weekly.adherencePct}%` : '—'}</strong>
            </div>
            <div>
              <span>{fa.dashboard.streak}</span>
              <strong>{overview?.streakDays ?? daily?.streakDays ?? 0} روز</strong>
            </div>
            <div>
              <span>{fa.dashboard.thisWeekLabel}</span>
              <strong>
                {weekly?.completedSessions ?? 0}/{weekly?.scheduledThisWeek || '—'}
              </strong>
            </div>
          </div>
          <p className="home-goal__note">
            {fa.dashboard.timelineNote}
          </p>
        </section>
      ) : null}

      {activeProgram ? (
        <section className="card home-program">
          <div className="home-program__head">
            <div>
              <p className="eyebrow">{fa.dashboard.activeProgram}</p>
              <h3>{activeProgram.name}</h3>
            </div>
            <span className={`chip chip--${activeProgram.difficulty.toLowerCase()}`}>{activeProgram.difficulty}</span>
          </div>
          <div className="home-program__facts">
            <div><Target size={15} /><span>{fa.dashboard.goal}</span><strong>{activeProgram.longTermGoal || activeProgram.tags[1] || activeProgram.difficulty}</strong></div>
            <div><CalendarDays size={15} /><span>{fa.dashboard.daysPerWeek}</span><strong>{activeProgram.daysPerWeek}</strong></div>
            <div><Timer size={15} /><span>{fa.dashboard.session}</span><strong>{activeProgram.duration} دقیقه</strong></div>
          </div>
          <button type="button" className="btn btn--ghost btn--block" onClick={() => navigate('programs')}>
            {fa.dashboard.viewFullProgram} <ArrowRight size={16} />
          </button>
        </section>
      ) : null}

      <GptBuilder open={builderOpen} onClose={() => setBuilderOpen(false)} />
    </div>
  );
}
