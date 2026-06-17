import { Activity, ArrowRight, Clock3, Dumbbell, Flame, Gauge, PlayCircle, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CoachPlanImporter } from '../components/CoachPlanImporter';
import { EmptyState } from '../components/EmptyState';
import { ProgramDetail } from '../components/ProgramDetail';
import { useApp } from '../hooks/useApp';
import { useRouter } from '../hooks/useRouter';
import { formatSessionDate, nextScheduledSession } from '../lib/format';

function Metric({ icon: Icon, label, value }: { icon: typeof Dumbbell; label: string; value: number }) {
  return (
    <article className="metric">
      <Icon size={18} />
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

export function DashboardView() {
  const { user, programs, activeProgram, generateProgram } = useApp();
  const { navigate } = useRouter();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const metrics = useMemo(() => {
    const totalExercises = programs.reduce((sum, p) => sum + p.exercises.length, 0);
    const weeklyMinutes = programs.reduce((sum, p) => sum + p.duration * p.daysPerWeek, 0);
    const weeklyCalories = programs.reduce((sum, p) => sum + p.totalCalories * p.daysPerWeek, 0);
    return { totalPrograms: programs.length, totalExercises, weeklyMinutes, weeklyCalories };
  }, [programs]);

  const nextSession = nextScheduledSession(activeProgram, nowMs);
  const firstName = user?.name?.split(' ')[0] ?? 'athlete';

  return (
    <div className="view-stack">
      <section className="hero">
        <p className="eyebrow">Today</p>
        <h2>
          Let’s train, {firstName}.
        </h2>
        <p className="hero__lede">
          {activeProgram
            ? `${activeProgram.name} is active — ${activeProgram.exercises.length} exercises, ${activeProgram.duration} min.`
            : 'Generate your first program to start tracking real sessions.'}
        </p>

        {nextSession ? (
          <div className="hero__next">
            <Gauge size={18} />
            <div>
              <span>Next session</span>
              <strong>{nextSession.title}</strong>
              <small>{formatSessionDate(nextSession.startsAt)}</small>
            </div>
          </div>
        ) : null}

        <div className="hero__actions">
          <button type="button" className="btn btn--primary btn--lg" onClick={() => navigate('workout')}>
            <PlayCircle size={18} />
            Start workout
          </button>
          <button type="button" className="btn btn--ghost btn--lg" onClick={() => navigate('programs')}>
            Programs
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <section className="metric-grid">
        <Metric icon={Dumbbell} label="Programs" value={metrics.totalPrograms} />
        <Metric icon={Activity} label="Exercises" value={metrics.totalExercises} />
        <Metric icon={Clock3} label="Weekly min" value={metrics.weeklyMinutes} />
        <Metric icon={Flame} label="Weekly cal" value={metrics.weeklyCalories} />
      </section>

      <CoachPlanImporter />

      {activeProgram ? (
        <ProgramDetail program={activeProgram} nowMs={nowMs} />
      ) : (
        <EmptyState
          title="No active program yet"
          description="Create an AI program and it appears here with its exercises and weekly load."
          actionLabel="Generate program"
          onAction={() => void generateProgram()}
        />
      )}

      <button type="button" className="btn btn--ghost btn--block" onClick={() => void generateProgram()}>
        <Sparkles size={18} />
        Generate a new AI program
      </button>
    </div>
  );
}
