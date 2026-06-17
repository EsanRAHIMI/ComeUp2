import { useEffect, useState } from 'react';

export type AiGenerationStage = {
  id: string;
  label: string;
  message: string;
};

export const AI_GENERATION_STAGES: AiGenerationStage[] = [
  {
    id: 'profile',
    label: 'Profile',
    message: 'Reading your profile — goals, fitness level, and how often you train…',
  },
  {
    id: 'constraints',
    label: 'Constraints',
    message: 'Checking your equipment, injuries, and preferred training days…',
  },
  {
    id: 'structure',
    label: 'Structure',
    message: 'Designing your weekly split and session structure…',
  },
  {
    id: 'exercises',
    label: 'Exercises',
    message: 'Selecting exercises, sets, reps, and rest periods for each day…',
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    message: 'Adding nutrition guidance and coaching cues…',
  },
  {
    id: 'finalize',
    label: 'Finalize',
    message: 'Almost there — finalizing your personalized program…',
  },
];

const STAGE_MS = 3800;

export function useAiGenerationStages(active: boolean) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsedSec(0);
      setStageIndex(0);
      return;
    }

    const started = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      setElapsedSec(elapsed);
      setStageIndex(Math.min(AI_GENERATION_STAGES.length - 1, Math.floor((Date.now() - started) / STAGE_MS)));
    }, 250);

    return () => window.clearInterval(tick);
  }, [active]);

  const progress = active
    ? Math.min(92, 8 + stageIndex * 14 + Math.min(12, elapsedSec))
    : 100;

  return {
    stage: AI_GENERATION_STAGES[stageIndex],
    stageIndex,
    totalStages: AI_GENERATION_STAGES.length,
    elapsedSec,
    progress,
  };
}
