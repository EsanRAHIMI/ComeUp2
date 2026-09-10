import { useEffect, useMemo, useState } from 'react';
import { type UiCopy } from '../i18n';
import { useT } from '../i18n/LocaleProvider';

export type AiGenerationStage = {
  id: string;
  label: string;
  message: string;
};

function stagesFrom(copy: UiCopy): AiGenerationStage[] {
  return copy.aiGen.stages.map((s) => ({ ...s }));
}

const STAGE_MS = 3800;

export function useAiGenerationStages(active: boolean) {
  const fa = useT();
  const stages = useMemo(() => stagesFrom(fa), [fa]);
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
      setStageIndex(Math.min(stages.length - 1, Math.floor((Date.now() - started) / STAGE_MS)));
    }, 250);

    return () => window.clearInterval(tick);
  }, [active, stages.length]);

  const progress = active
    ? Math.min(92, 8 + stageIndex * 14 + Math.min(12, elapsedSec))
    : 100;

  return {
    stage: stages[stageIndex],
    stages,
    stageIndex,
    totalStages: stages.length,
    elapsedSec,
    progress,
  };
}
