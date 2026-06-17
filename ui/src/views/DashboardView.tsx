import {
  ArrowRight,
  Bot,
  CalendarDays,
  Dumbbell,
  Flame,
  PlayCircle,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { chatApi, reportsApi } from '../api';
import { GptBuilder } from '../components/GptBuilder';
import { useApp } from '../hooks/useApp';
import { useRouter } from '../hooks/useRouter';
import { formatSessionDate, nextScheduledSession } from '../lib/format';
import type { GptQuota, ReportOverview, ScheduleEntry, WeeklyReport } from '../types';

function isSameDay(a: Date, b: Date) {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

export function DashboardView() {
  const { activeProgram, token } = useApp();
  const { navigate } = useRouter();
  const [nowMs] = useState(() => Date.now());
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [overview, setOverview] = useState<ReportOverview | null>(null);
  const [quota, setQuota] = useState<GptQuota | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    reportsApi.weekly(token).then((r) => !cancelled && setWeekly(r)).catch(() => undefined);
    reportsApi.overview(token).then((r) => !cancelled && setOverview(r)).catch(() => undefined);
    chatApi.quota(token).then((r) => !cancelled && setQuota(r.quota)).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [token]);

  const schedule = activeProgram?.schedule ?? [];
  const todaySession =
    schedule.find((s) => isSameDay(new Date(s.startsAt), new Date(nowMs))) ??
    nextScheduledSession(activeProgram, nowMs);
  const upcoming: ScheduleEntry[] = schedule
    .filter((s) => new Date(s.startsAt).getTime() >= nowMs)
    .slice(0, 3);

  const sessionExerciseCount = (() => {
    if (!activeProgram) return 0;
    if (!todaySession?.exerciseNames.length) return activeProgram.exercises.length;
    const names = todaySession.exerciseNames.map((n) => n.toLowerCase());
    const matched = activeProgram.exercises.filter((ex) => names.includes(ex.name.toLowerCase())).length;
    return matched || activeProgram.exercises.length;
  })();

  return (
    <div className="view-stack">
      {/* B. Today's workout */}
      {activeProgram ? (
        <section className="home-today">
          <p className="eyebrow">Today’s workout</p>
          <h2>{todaySession?.title ?? activeProgram.name}</h2>
          <div className="home-today__meta">
            <span><Dumbbell size={15} /> {activeProgram.name}</span>
            <span><Timer size={15} /> {todaySession?.duration ?? activeProgram.duration} min</span>
            <span><PlayCircle size={15} /> {sessionExerciseCount} exercises</span>
          </div>
          {todaySession ? <small className="home-today__when">{formatSessionDate(todaySession.startsAt)}</small> : null}
          <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => navigate('workout')}>
            <PlayCircle size={20} /> Start workout
          </button>
        </section>
      ) : (
        <section className="home-today">
          <p className="eyebrow">Get started</p>
          <h2>No active program yet</h2>
          <p>Create a personalized program with GPT, or import your coach plan.</p>
          <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => setBuilderOpen(true)}>
            <Bot size={20} /> Create my program
          </button>
        </section>
      )}

      {/* C. Weekly progress */}
      <section>
        <p className="eyebrow section-label">This week</p>
        <div className="stat-grid">
          <article className="stat"><TrendingUp size={16} /><strong>{weekly?.completedSessions ?? 0}</strong><span>Sessions</span></article>
          <article className="stat"><Timer size={16} /><strong>{weekly?.totalMinutes ?? 0}</strong><span>Minutes</span></article>
          <article className="stat"><Flame size={16} /><strong>{weekly?.totalCalories ?? 0}</strong><span>Calories</span></article>
          <article className="stat"><CalendarDays size={16} /><strong>{overview?.streakDays ?? 0}</strong><span>Day streak</span></article>
        </div>
        {weekly && weekly.adherencePct !== null ? (
          <div className="adherence">
            <div className="adherence__bar"><i style={{ width: `${weekly.adherencePct}%` }} /></div>
            <small>{weekly.adherencePct}% of this week’s planned sessions done</small>
          </div>
        ) : null}
      </section>

      {/* D. Active program summary */}
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

      {/* E. Next sessions */}
      {upcoming.length ? (
        <section>
          <p className="eyebrow section-label">Next sessions</p>
          <div className="next-list">
            {upcoming.map((s) => (
              <div key={`${s.week}-${s.day}-${s.startsAt}`} className="next-row">
                <span className="next-row__tag">W{s.week} D{s.day}</span>
                <div className="next-row__body">
                  <strong>{s.title}</strong>
                  <small>{formatSessionDate(s.startsAt)}</small>
                </div>
                <em>{s.duration} min</em>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* F. GPT program builder */}
      <section className="card gpt-cta">
        <div className="gpt-cta__icon"><Bot size={22} /></div>
        <div className="gpt-cta__text">
          <strong>Create or improve my program with GPT</strong>
          <small>{quota ? `${quota.remaining} of ${quota.limit} GPT corrections left this week` : 'Personalized to your profile'}</small>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setBuilderOpen(true)}>Open</button>
      </section>

      <GptBuilder open={builderOpen} onClose={() => setBuilderOpen(false)} />
    </div>
  );
}
