import type { GptDraftProgram } from '../types';

export function DraftPreview({ draft }: { draft: GptDraftProgram }) {
  return (
    <div className="gpt-draft">
      <div className="gpt-draft__head">
        <strong>{draft.name}</strong>
        <span>{draft.daysPerWeek} days/wk · {draft.sessionDuration} min · {draft.difficulty}</span>
      </div>
      {draft.description ? <p className="gpt-draft__desc">{draft.description}</p> : null}
      {draft.days.map((day) => (
        <div key={day.day} className="gpt-draft__day">
          <p className="eyebrow">Day {day.day} · {day.title}</p>
          <ul>
            {day.exercises.map((ex, i) => (
              <li key={`${ex.name}-${i}`}>
                <span>{ex.name}</span>
                <small>{ex.sets} × {ex.repRange || ex.reps} · {ex.restTime}s · {ex.muscleGroups.slice(0, 2).join(', ')}</small>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
