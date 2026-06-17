import { Check, CheckCircle2, ChevronLeft, ChevronRight, Flame, ImagePlus, PlayCircle, Timer, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
// nowMs uses a lazy useState initializer (allowed) rather than Date.now() in render.
import { EmptyState } from '../components/EmptyState';
import { ExerciseImage } from '../components/ExerciseImage';
import { RestTimer } from '../components/RestTimer';
import { useApp } from '../hooks/useApp';
import { useRouter } from '../hooks/useRouter';
import { useWorkoutSession, type SessionSummary } from '../hooks/useWorkoutSession';
import { resolveExerciseImage } from '../lib/exerciseImages';
import { formatClock, formatDuration, nextScheduledSession } from '../lib/format';
import type { Exercise, Program, ScheduleEntry } from '../types';

export function WorkoutView() {
  const { activeProgram, generateProgram } = useApp();
  const [nowMs] = useState(() => Date.now());

  const scheduledSession = useMemo(
    () => nextScheduledSession(activeProgram, nowMs),
    [activeProgram, nowMs],
  );

  const exercises = useMemo(() => {
    if (!activeProgram) return [];
    const names = scheduledSession?.exerciseNames.map((n) => n.toLowerCase()) ?? [];
    const filtered = names.length
      ? activeProgram.exercises.filter((ex) => names.includes(ex.name.toLowerCase()))
      : activeProgram.exercises;
    return filtered.length ? filtered : activeProgram.exercises;
  }, [activeProgram, scheduledSession]);

  if (!activeProgram) {
    return (
      <div className="view-stack">
        <EmptyState
          title="No workout loaded"
          description="Generate and activate a program, then come back to start a session."
          actionLabel="Generate program"
          onAction={() => void generateProgram()}
        />
      </div>
    );
  }

  return (
    <SessionRunner
      key={activeProgram._id ?? activeProgram.name}
      program={activeProgram}
      exercises={exercises}
      scheduledSession={scheduledSession}
    />
  );
}

function SessionRunner({
  program,
  exercises,
  scheduledSession,
}: {
  program: Program;
  exercises: Exercise[];
  scheduledSession: ScheduleEntry | null;
}) {
  const { exerciseMedia, token, notify, saveExerciseImage } = useApp();
  const { navigate } = useRouter();
  const session = useWorkoutSession({ program, exercises, token, notify });

  const [rest, setRest] = useState<{ id: number; seconds: number } | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [editingImage, setEditingImage] = useState(false);
  const [imageDraft, setImageDraft] = useState('');
  const restSeq = useRef(0);

  const current = exercises[session.currentIndex] ?? exercises[0];
  const currentImage = resolveExerciseImage(current, exerciseMedia);
  const isTimed = current.trackingType === 'time';
  const setNumbers = Array.from({ length: current.sets }, (_, i) => i + 1);
  const currentDone = setNumbers.filter((n) => session.isSetDone(session.currentIndex, n)).length;

  function toggleSet(setNumber: number) {
    const wasDone = session.isSetDone(session.currentIndex, setNumber);
    session.toggleSet(session.currentIndex, current, setNumber);
    if (!wasDone) {
      navigator.vibrate?.(35);
      if (current.restTime > 0) {
        restSeq.current += 1;
        setRest({ id: restSeq.current, seconds: current.restTime });
      }
    }
  }

  async function finish() {
    const result = await session.complete();
    setRest(null);
    if (result) setSummary(result);
  }

  function move(delta: number) {
    session.setCurrentIndex(session.currentIndex + delta);
    setRest(null);
    setEditingImage(false);
  }

  // ---- Idle: pre-workout overview ----
  if (!session.active) {
    return (
      <div className="view-stack">
        <section className="card runner-intro">
          <p className="eyebrow">Ready to train</p>
          <h2>{scheduledSession?.title ?? program.name}</h2>
          <div className="runner-intro__stats">
            <span><Timer size={16} /> {program.duration} min</span>
            <span><PlayCircle size={16} /> {exercises.length} exercises</span>
            <span><Flame size={16} /> {program.totalCalories} cal</span>
          </div>
          <ol className="runner-intro__list">
            {exercises.map((ex, i) => (
              <li key={`${ex.name}-${i}`}>
                <strong>{ex.name}</strong>
                <small>{ex.sets} × {ex.repRange || ex.reps} {ex.trackingType === 'time' ? 'sec' : 'reps'}</small>
              </li>
            ))}
          </ol>
          <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => void session.start()}>
            <PlayCircle size={20} />
            Start workout
          </button>
        </section>

        {summary ? (
          <SummaryCard summary={summary} onClose={() => setSummary(null)} onHistory={() => navigate('history')} />
        ) : null}
      </div>
    );
  }

  // ---- Active: full-screen runner ----
  return (
    <div className="runner">
      <div className="runner__bar">
        <div className="runner__progress" style={{ width: `${session.progress}%` }} />
      </div>
      <div className="runner__top">
        <span><Timer size={15} /> {formatClock(session.elapsedSeconds)}</span>
        <span>{session.completedCount}/{session.totalSets} sets</span>
        <span>{session.progress}%</span>
      </div>

      <div className="runner__media">
        <ExerciseImage exercise={current} src={currentImage} className="runner__img" />
        <button
          type="button"
          className="runner__img-edit"
          onClick={() => {
            setImageDraft(currentImage);
            setEditingImage((v) => !v);
          }}
          aria-label="Replace image"
        >
          <ImagePlus size={16} />
        </button>
        <div className="runner__media-meta">
          <span>Exercise {session.currentIndex + 1} / {exercises.length}</span>
          <h2>{current.name}</h2>
          <small>{current.muscleGroups.slice(0, 3).join(' · ')}</small>
        </div>
      </div>

      {editingImage ? (
        <div className="image-editor">
          <input value={imageDraft} onChange={(e) => setImageDraft(e.target.value)} placeholder="Paste image URL" />
          <button
            type="button"
            className="btn btn--primary"
            disabled={!/^https?:\/\/.+/i.test(imageDraft)}
            onClick={async () => {
              await saveExerciseImage(current, imageDraft);
              setEditingImage(false);
            }}
          >
            Save
          </button>
        </div>
      ) : null}

      {current.instructions ? <p className="runner__cue">{current.instructions}</p> : null}

      <div className="set-grid">
        {setNumbers.map((n) => {
          const done = session.isSetDone(session.currentIndex, n);
          return (
            <button key={n} type="button" className={`set-tile ${done ? 'is-done' : ''}`} onClick={() => toggleSet(n)}>
              <span className="set-tile__icon">{done ? <Check size={20} /> : n}</span>
              <strong>Set {n}</strong>
              <small>{current.repRange || current.reps} {isTimed ? 'sec' : 'reps'}</small>
            </button>
          );
        })}
      </div>

      {rest ? <RestTimer key={rest.id} seconds={rest.seconds} onDone={() => setRest(null)} /> : null}

      <div className="runner__nav">
        <button type="button" className="btn btn--ghost" onClick={() => move(-1)} disabled={session.currentIndex === 0}>
          <ChevronLeft size={20} />
          Prev
        </button>
        <span className="runner__nav-count">{currentDone}/{current.sets} done</span>
        {session.currentIndex < exercises.length - 1 ? (
          <button type="button" className="btn btn--primary" onClick={() => move(1)}>
            Next
            <ChevronRight size={20} />
          </button>
        ) : (
          <button type="button" className="btn btn--success" onClick={() => void finish()}>
            <CheckCircle2 size={20} />
            Finish
          </button>
        )}
      </div>

      <button type="button" className="btn btn--text runner__finish-early" onClick={() => void finish()}>
        Finish &amp; save now
      </button>

      {summary ? (
        <SummaryCard summary={summary} onClose={() => setSummary(null)} onHistory={() => navigate('history')} />
      ) : null}
    </div>
  );
}

function SummaryCard({
  summary,
  onClose,
  onHistory,
}: {
  summary: SessionSummary;
  onClose: () => void;
  onHistory: () => void;
}) {
  return (
    <div className="summary-overlay" role="dialog" aria-label="Workout complete">
      <div className="summary-card">
        <button type="button" className="icon-btn summary-card__close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <span className="summary-card__badge"><CheckCircle2 size={30} /></span>
        <h2>Workout complete</h2>
        <div className="summary-card__stats">
          <div><strong>{formatDuration(summary.durationSeconds)}</strong><span>Duration</span></div>
          <div><strong>{summary.completedSets}/{summary.totalSets}</strong><span>Sets</span></div>
          <div><strong>{summary.caloriesBurned}</strong><span>Calories</span></div>
        </div>
        <div className="summary-card__actions">
          <button type="button" className="btn btn--ghost btn--block" onClick={onHistory}>View history</button>
          <button type="button" className="btn btn--primary btn--block" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
