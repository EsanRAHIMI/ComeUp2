import { useEffect, useState } from 'react';
import { fa } from '../i18n/fa';

export type AiGenerationStage = {
  id: string;
  label: string;
  message: string;
};

export const AI_GENERATION_STAGES: AiGenerationStage[] = fa.aiGen.stages.map((s) => ({ ...s }));

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
