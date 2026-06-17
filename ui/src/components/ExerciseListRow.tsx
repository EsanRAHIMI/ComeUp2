import { useApp } from '../hooks/useApp';
import { resolveExerciseImage } from '../lib/exerciseImages';
import type { Exercise } from '../types';
import { ExerciseImage } from './ExerciseImage';

type Props = {
  exercise: Exercise;
  index: number;
  showMuscleGroups?: boolean;
};

export function ExerciseListRow({ exercise, index, showMuscleGroups = true }: Props) {
  const { exerciseMedia } = useApp();
  const imageSrc = resolveExerciseImage(exercise, exerciseMedia);

  return (
    <div className="exercise-row">
      <span className="exercise-row__num">{index + 1}</span>
      <div className="exercise-row__body">
        <strong>{exercise.name}</strong>
        <small>
          {exercise.sets} × {exercise.repRange || exercise.reps}{' '}
          {exercise.trackingType === 'time' ? 'sec' : 'reps'}
          {exercise.restTime ? ` · ${exercise.restTime}s rest` : ''}
        </small>
      </div>
      {showMuscleGroups ? <em>{exercise.muscleGroups.slice(0, 2).join(', ')}</em> : null}
      <ExerciseImage
        exercise={exercise}
        src={imageSrc}
        className="exercise-row__thumb"
      />
    </div>
  );
}
