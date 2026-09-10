import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  ImagePlus,
  Loader2,
  PlayCircle,
  RotateCcw,
  Timer,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { ExerciseImage } from '../components/ExerciseImage';
import { ExerciseListRow } from '../components/ExerciseListRow';
import { NoProgramGuide } from '../components/NoProgramGuide';
import { RestTimer } from '../components/RestTimer';
import { useApp } from '../hooks/useApp';
import { useRouter } from '../hooks/useRouter';
import { useWorkoutSession, type SessionSummary } from '../hooks/useWorkoutSession';
import { resolveExerciseImage } from '../lib/exerciseImages';
import { formatClock, formatDuration, nextScheduledSession, resolveRestSeconds } from '../lib/format';
import { unlockRestAudio } from '../lib/restSound';
import { findProgressExerciseIndex } from '../lib/sessionEngine';
import type { Exercise, Program, ScheduleEntry } from '../types';
import { fa } from '../i18n/fa';

type Overlay = { summary: SessionSummary; status: 'saved' | 'failed' };

export function WorkoutView() {
  const { activeProgram } = useApp();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const tick = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(tick);
  }, []);

  const scheduledSession = nextScheduledSession(activeProgram, nowMs);

  const exercises = activeProgram
    ? (() => {
        const names = scheduledSession?.exerciseNames.map((n) => n.toLowerCase()) ?? [];
        const filtered = names.length
          ? activeProgram.exercises.filter((ex) => names.includes(ex.name.toLowerCase()))
          : activeProgram.exercises;
        return filtered.length ? filtered : activeProgram.exercises;
      })()
    : [];

  if (!activeProgram) {
    return (
      <>
        <NoProgramGuide open />
        <div className="view-stack view-stack--dimmed" aria-hidden="true">
          <EmptyState
            title="No workout loaded"
            description="Activate a program to start training."
          />
        </div>
      </>
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
  const { exerciseMedia, token, notify, saveExerciseImage, user } = useApp();
  const { navigate } = useRouter();
  const session = useWorkoutSession({ program, exercises, token, notify });

  const [rest, setRest] = useState<{ id: number; seconds: number } | null>(null);
  const [overlay, setOverlay] = useState<Overlay | null>(() =>
    session.isUnsaved && session.pendingSummary ? { summary: session.pendingSummary, status: 'failed' } : null,
  );
  const [editingImage, setEditingImage] = useState(false);
  const [imageDraft, setImageDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [successBurst, setSuccessBurst] = useState(false);

  const current = exercises[session.currentIndex] ?? exercises[0];
  const currentImage = resolveExerciseImage(current, exerciseMedia);
  const isTimed = current.trackingType === 'time';
  const setNumbers = Array.from({ length: current.sets }, (_, i) => i + 1);
  const currentDone = setNumbers.filter((n) => session.isSetDone(session.currentIndex, n)).length;
  const activeSetNumber = setNumbers.find((n) => !session.isSetDone(session.currentIndex, n)) ?? null;
  const progressExerciseIndex = findProgressExerciseIndex(exercises, session.isSetDone);
  const isReviewingExercise = session.currentIndex !== progressExerciseIndex;

  const autoRestTimer = user?.preferences?.autoRestTimer !== false;
  const defaultRestSeconds = user?.preferences?.defaultRestSeconds ?? 60;
  const restSoundEnabled = user?.preferences?.restCountdownSound !== false;

  function toggleSet(setNumber: number) {
    if (successBurst) return;
    // User gesture: create/resume the shared AudioContext so the upcoming
    // rest countdown is allowed to beep (no-op if sound is off or blocked).
    if (restSoundEnabled) unlockRestAudio();
    const wasDone = session.isSetDone(session.currentIndex, setNumber);
    session.toggleSet(session.currentIndex, current, setNumber);
    if (!wasDone) {
      navigator.vibrate?.(35);
      const completedAfterToggle = currentDone + 1;
      const isLastSet = completedAfterToggle >= current.sets;
      const hasNextExercise = session.currentIndex < exercises.length - 1;
      const seconds = resolveRestSeconds(current, defaultRestSeconds, autoRestTimer);
      if (isLastSet && hasNextExercise) {
        if (seconds > 0) setRest((r) => ({ id: (r?.id ?? 0) + 1, seconds }));
        setSuccessBurst(true);
        navigator.vibrate?.([40, 50, 100, 40, 140]);
        window.setTimeout(() => {
          setSuccessBurst(false);
          move(1, { keepRest: true });
        }, 4000);
        return;
      }
      if (seconds > 0) setRest((r) => ({ id: (r?.id ?? 0) + 1, seconds }));
    }
  }

  function move(delta: number, opts?: { keepRest?: boolean }) {
    session.setCurrentIndex(session.currentIndex + delta);
    if (!opts?.keepRest) setRest(null);
    setEditingImage(false);
  }

  async function finish() {
    setSaving(true);
    const result = await session.complete();
    setSaving(false);
    setRest(null);
    if (result) setOverlay(result);
  }

  async function retry() {
    setSaving(true);
    const result = await session.retrySave();
    setSaving(false);
    if (result) setOverlay(result);
  }

  function discard() {
    session.discard();
    setOverlay(null);
  }

  const summaryCard = overlay ? (
    <SummaryCard
      summary={overlay.summary}
      status={overlay.status}
      saving={saving}
      onClose={() => {
        setOverlay(null);
        navigate('dashboard');
      }}
      onHistory={() => navigate('history')}
      onRetry={() => void retry()}
      onDiscard={discard}
    />
  ) : null;

  // ---- Running: full-screen runner ----
  if (session.isRunning) {
    return (
      <div className="runner runner--live">
        <div className="runner__body">
        <div className="runner__bar">
          <div className="runner__progress" style={{ width: `${session.progress}%` }} />
        </div>
        <div className="runner__top">
          <span><Timer size={14} /> {formatClock(session.elapsedSeconds)}</span>
          <span>{session.currentIndex + 1}/{exercises.length}</span>
          <span>{session.completedCount}/{session.totalSets}</span>
        </div>

        <div className={`runner__hero ${successBurst ? 'is-celebrating' : ''}`}>
          <ExerciseImage exercise={current} src={currentImage} className="runner__img" />
          <button
            type="button"
            className="runner__img-edit"
            onClick={() => {
              setImageDraft(currentImage);
              setEditingImage((v) => !v);
            }}
            aria-label="Replace image"
            disabled={successBurst}
          >
            <ImagePlus size={15} />
          </button>
          {successBurst ? (
            <div className="runner__success-popup" role="status" aria-live="polite">
              <div className="runner__success-popup__glow" aria-hidden />
              <div className="runner__success-popup__ring runner__success-popup__ring--1" aria-hidden />
              <div className="runner__success-popup__ring runner__success-popup__ring--2" aria-hidden />
              <div className="runner__success-popup__card">
                <span className="runner__success-popup__icon">
                  <CheckCircle2 size={52} strokeWidth={2.2} />
                </span>
                <strong>{fa.workout.setComplete}</strong>
                <span>{fa.workout.crushedIt}</span>
              </div>
            </div>
          ) : null}
          <div className="runner__hero-meta">
            <h2>{current.name}</h2>
            <p>
              {current.repRange || current.reps} {isTimed ? 'sec' : 'reps'}
              {' · '}
              {current.sets} sets
              {current.muscleGroups[0] ? ` · ${current.muscleGroups.slice(0, 2).join(', ')}` : ''}
            </p>
          </div>
        </div>

        {editingImage ? (
          <div className="image-editor image-editor--compact">
            <input value={imageDraft} onChange={(e) => setImageDraft(e.target.value)} placeholder={fa.workout.imageUrl} />
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={!/^https?:\/\/.+/i.test(imageDraft)}
              onClick={async () => {
                await saveExerciseImage(current, imageDraft);
                setEditingImage(false);
              }}
            >
              {fa.save}
            </button>
          </div>
        ) : null}

        <div className="runner__controls">
          <div className="runner__sets-panel">
            <div className="runner__sets-head">
              <span>{isReviewingExercise ? 'Review logged sets' : 'Mark each set complete'}</span>
              <strong>
                {currentDone}/{current.sets} ثبت‌شده · {current.repRange || current.reps} {isTimed ? 'ثانیه' : 'تکرار'}
              </strong>
            </div>
            <div className="set-row" role="group" aria-label="Sets">
              {setNumbers.map((n) => {
                const done = session.isSetDone(session.currentIndex, n);
                const isActive = !done && n === activeSetNumber && !isReviewingExercise;
                const isPending = !done && !isActive;
                const repLabel = `${current.repRange || current.reps}${isTimed ? 's' : ''}`;
                return (
                  <button
                    key={n}
                    type="button"
                    className={`set-chip ${done ? 'is-done' : ''} ${isActive ? 'is-active' : ''} ${isPending ? 'is-pending' : ''}`}
                    onClick={() => toggleSet(n)}
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={`Set ${n}, ${repLabel}${isActive ? ', current set' : ''}${done ? ', completed' : ''}${isPending ? ', not logged' : ''}`}
                  >
                    <span className="set-chip__num">{done ? <Check size={22} strokeWidth={2.5} /> : n}</span>
                    <small className="set-chip__reps">{repLabel}</small>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        </div>

        <div className="runner__dock">
          <div className="runner__rest-slot" aria-hidden={!rest}>
            {rest ? (
              <div className="runner__rest-strip">
                <RestTimer key={rest.id} seconds={rest.seconds} compact soundEnabled={restSoundEnabled} onDone={() => setRest(null)} />
              </div>
            ) : null}
          </div>

        <footer className="runner__footer">
          <div className="runner__nav-bar">
            <button type="button" className="runner__nav-btn" onClick={() => move(-1)} disabled={session.currentIndex === 0}>
              <ChevronLeft size={20} />
              <span>{fa.workout.prev}</span>
            </button>
            <div className="runner__nav-center">
              <strong>{currentDone}/{current.sets}</strong>
              <span>{fa.workout.setsDone}</span>
            </div>
            {session.currentIndex < exercises.length - 1 ? (
              <button type="button" className="runner__nav-btn runner__nav-btn--primary" onClick={() => move(1)}>
                <span>{fa.workout.next}</span>
                <ChevronRight size={20} />
              </button>
            ) : (
              <button type="button" className="runner__nav-btn runner__nav-btn--success" onClick={() => void finish()} disabled={saving}>
                {saving ? <Loader2 className="spin" size={20} /> : <CheckCircle2 size={20} />}
                <span>{fa.workout.finish}</span>
              </button>
            )}
          </div>
          <button type="button" className="runner__finish-early" onClick={() => void finish()} disabled={saving}>
            {fa.workout.finishEarly}
          </button>
        </footer>
        </div>

        {summaryCard}
      </div>
    );
  }

  // ---- Unsaved: finished but not yet persisted ----
  if (session.isUnsaved) {
    return (
      <div className="view-stack">
        <section className="card runner-intro">
          <span className="empty-state__icon"><AlertTriangle size={22} /></span>
          <h2>{fa.workout.savedOnDevice}</h2>
          <p>{fa.workout.notSynced}</p>
        </section>
        {summaryCard}
      </div>
    );
  }

  // ---- Idle: pre-workout overview ----
  return (
    <div className="view-stack">
      <section className="card runner-intro">
        <p className="eyebrow">{fa.workout.readyToTrain}</p>
        <h2>{scheduledSession?.title ?? program.name}</h2>
        <div className="runner-intro__stats">
          <span><Timer size={16} /> {program.duration} min</span>
          <span><PlayCircle size={16} /> {exercises.length} exercises</span>
          <span><Flame size={16} /> {program.totalCalories} cal</span>
        </div>
        <div className="exercise-list runner-intro__list">
          {exercises.map((ex, i) => (
            <ExerciseListRow key={`${ex.name}-${i}`} exercise={ex} index={i} showMuscleGroups={false} />
          ))}
        </div>
        <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => void session.start()}>
          <PlayCircle size={20} />
          {fa.workout.startWorkout}
        </button>
      </section>
      {summaryCard}
    </div>
  );
}

function SummaryCard({
  summary,
  status,
  saving,
  onClose,
  onHistory,
  onRetry,
  onDiscard,
}: {
  summary: SessionSummary;
  status: 'saved' | 'failed';
  saving: boolean;
  onClose: () => void;
  onHistory: () => void;
  onRetry: () => void;
  onDiscard: () => void;
}) {
  const failed = status === 'failed';
  return (
    <div className="summary-overlay" role="dialog" aria-label="Workout complete">
      <div className="summary-card">
        {failed ? null : (
          <button type="button" className="icon-btn summary-card__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        )}
        <span className={`summary-card__badge ${failed ? 'summary-card__badge--warn' : ''}`}>
          {failed ? <AlertTriangle size={30} /> : <CheckCircle2 size={30} />}
        </span>
        <h2>{failed ? 'Couldn’t save' : 'Workout complete'}</h2>
        {failed ? <p>{fa.workout.safeOnDevice}</p> : null}
        <div className="summary-card__stats">
          <div><strong>{formatDuration(summary.durationSeconds)}</strong><span>{fa.workout.duration}</span></div>
          <div><strong>{summary.completedSets}/{summary.totalSets}</strong><span>{fa.workout.sets}</span></div>
          <div><strong>{summary.caloriesBurned}</strong><span>{fa.workout.calories}</span></div>
        </div>
        {failed ? (
          <div className="summary-card__actions">
            <button type="button" className="btn btn--ghost btn--block" onClick={onDiscard}>{fa.workout.discard}</button>
            <button type="button" className="btn btn--primary btn--block" onClick={onRetry} disabled={saving}>
              {saving ? <Loader2 className="spin" size={18} /> : <RotateCcw size={18} />}
              ذخیره دوباره
            </button>
          </div>
        ) : (
          <div className="summary-card__actions">
            <button type="button" className="btn btn--ghost btn--block" onClick={onHistory}>{fa.workout.viewHistory}</button>
            <button type="button" className="btn btn--primary btn--block" onClick={onClose}>{fa.workout.done}</button>
          </div>
        )}
      </div>
    </div>
  );
}
