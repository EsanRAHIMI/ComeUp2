import { getT } from '../i18n';
import { useT } from '../i18n/LocaleProvider';
import type { Exercise, Program } from '../types';
import { ExerciseListRow } from './ExerciseListRow';

type DayGroup = { day: number; title: string; exercises: Exercise[] };

/** Group a program's exercises by training day (from week-1 schedule), with a flat fallback. */
export function groupByDay(program: Program): DayGroup[] {
  const fa = getT();
  const week1 = (program.schedule ?? []).filter((s) => s.week === 1);
  if (week1.length) {
    return week1.map((day) => ({
      day: day.day,
      title: day.title,
      exercises: day.exerciseNames
        .map((name) => program.exercises.find((ex) => ex.name.toLowerCase() === name.toLowerCase()))
        .filter((ex): ex is Exercise => Boolean(ex)),
    }));
  }
  return [{ day: 1, title: fa.programDetail.allExercises, exercises: program.exercises }];
}

export function ProgramDays({ program }: { program: Program }) {
  const fa = useT();
  const days = groupByDay(program);
  return (
    <div className="program-days">
      {days.map((day) => (
        <div key={day.day} className="program-days__day">
          <p className="eyebrow">{fa.programDetail.dayNTitle(day.day, day.title)}</p>
          <div className="exercise-list">
            {day.exercises.map((ex, i) => (
              <ExerciseListRow key={`${ex.name}-${i}`} exercise={ex} index={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
