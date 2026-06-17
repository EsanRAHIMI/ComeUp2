import { useState } from 'react';
import type { Exercise } from '../types';
import { fallbackExerciseImage } from '../lib/exerciseImages';

/** Image with lazy loading and an instant local gradient fallback on error. */
export function ExerciseImage({
  exercise,
  src,
  className,
}: {
  exercise: Exercise;
  src: string;
  className?: string;
}) {
  const fallback = fallbackExerciseImage(exercise);
  // Track only the src that failed; the displayed src is derived (no effect).
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const current = src && src !== failedSrc ? src : fallback;

  return (
    <img
      className={className}
      src={current}
      alt={exercise.name}
      loading="lazy"
      decoding="async"
      onError={() => src && setFailedSrc(src)}
    />
  );
}
