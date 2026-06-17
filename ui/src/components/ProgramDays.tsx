import type { Exercise, Program } from '../types';

type DayGroup = { day: number; title: string; exercises: Exercise[] };

/** Group a program's exercises by training day (from week-1 schedule), with a flat fallback. */
export function groupByDay(program: Program): DayGroup[] {
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
  return [{ day: 1, title: 'All exercises', exercises: program.exercises }];
}

export function ProgramDays({ program }: { program: Program }) {
  const days = groupByDay(program);
  return (
    <div className="program-days">
      {days.map((day) => (
        <div key={day.day} className="program-days__day">
          <p className="eyebrow">Day {day.day} · {day.title}</p>
          <div className="exercise-list">
            {day.exercises.map((ex, i) => (
              <div className="exercise-row" key={`${ex.name}-${i}`}>
                <span className="exercise-row__num">{i + 1}</span>
                <div className="exercise-row__body">
                  <strong>{ex.name}</strong>
                  <small>
                    {ex.sets} × {ex.repRange || ex.reps} {ex.trackingType === 'time' ? 'sec' : 'reps'} · {ex.restTime}s rest
                  </small>
                </div>
                <em>{ex.muscleGroups.slice(0, 2).join(', ')}</em>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
