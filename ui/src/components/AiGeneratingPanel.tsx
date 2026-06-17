import { Bot, Dumbbell, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AI_GENERATION_STAGES, useAiGenerationStages } from '../hooks/useAiGenerationStages';

export type AiProfileContext = {
  name?: string;
  goal?: string;
  fitnessLevel?: string;
  workoutDaysPerWeek?: number;
  sessionDuration?: number;
  equipment?: string[];
  injuries?: string[];
};

type Props = {
  active: boolean;
  profile?: AiProfileContext | null;
  compact?: boolean;
};

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

export function AiGeneratingPanel({ active, profile, compact = false }: Props) {
  const { stage, stageIndex, totalStages, elapsedSec, progress } = useAiGenerationStages(active);
  const [messageVisible, setMessageVisible] = useState(true);

  useEffect(() => {
    if (!active) return;
    setMessageVisible(false);
    const t = window.setTimeout(() => setMessageVisible(true), 120);
    return () => window.clearTimeout(t);
  }, [stage.id, active]);

  if (!active) return null;

  const chips = [
    profile?.goal,
    profile?.fitnessLevel,
    profile?.workoutDaysPerWeek ? `${profile.workoutDaysPerWeek} days/wk` : null,
    profile?.sessionDuration ? `${profile.sessionDuration} min` : null,
    ...(profile?.equipment?.slice(0, 3) ?? []),
    profile?.injuries?.length ? `${profile.injuries.length} injury note(s)` : null,
  ].filter(Boolean) as string[];

  return (
    <div className={`ai-gen ${compact ? 'ai-gen--compact' : ''}`} role="status" aria-live="polite" aria-busy="true">
      <div className="ai-gen__hero">
        <div className="ai-gen__orb" aria-hidden="true">
          <span className="ai-gen__ring" />
          <span className="ai-gen__ring ai-gen__ring--delay" />
          <span className="ai-gen__avatar">
            <Bot size={compact ? 22 : 28} />
          </span>
        </div>
        <div className="ai-gen__hero-text">
          <p className="ai-gen__eyebrow">
            <Sparkles size={14} /> AI coach is working
          </p>
          <strong>Building your personalized program</strong>
          <small>Usually takes 15–45 seconds · {formatElapsed(elapsedSec)}</small>
        </div>
      </div>

      <div className="ai-gen__progress" aria-hidden="true">
        <div className="ai-gen__progress-track">
          <div className="ai-gen__progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <span>{progress}%</span>
      </div>

      <ol className="ai-gen__steps">
        {AI_GENERATION_STAGES.map((item, index) => {
          const state = index < stageIndex ? 'done' : index === stageIndex ? 'active' : 'pending';
          return (
            <li key={item.id} className={`ai-gen__step ai-gen__step--${state}`}>
              <span className="ai-gen__step-dot" />
              <span className="ai-gen__step-label">{item.label}</span>
            </li>
          );
        })}
      </ol>

      <div className={`ai-gen__message ${messageVisible ? 'is-visible' : ''}`}>
        <Dumbbell size={16} aria-hidden="true" />
        <p>{stage.message}</p>
        <span className="ai-gen__typing" aria-hidden="true">
          <span /><span /><span />
        </span>
      </div>

      {chips.length ? (
        <div className="ai-gen__chips">
          {chips.map((chip) => (
            <span key={chip} className="ai-gen__chip">{chip}</span>
          ))}
        </div>
      ) : null}

      <p className="ai-gen__hint">
        Step {stageIndex + 1} of {totalStages} — your program is being generated live; please keep this open.
      </p>
    </div>
  );
}
