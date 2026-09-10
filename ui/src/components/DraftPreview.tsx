import { levelLabel } from '../i18n';
import { useT } from '../i18n/LocaleProvider';
import type { GptDraftProgram } from '../types';

export function DraftPreview({ draft }: { draft: GptDraftProgram }) {
  const fa = useT();
  return (
    <div className="gpt-draft">
      <div className="gpt-draft__head">
        <strong>{draft.name}</strong>
        <span>{fa.draft.meta(draft.daysPerWeek, draft.sessionDuration, levelLabel(draft.difficulty))}</span>
      </div>
      {draft.description ? <p className="gpt-draft__desc">{draft.description}</p> : null}
      {draft.days.map((day) => (
        <div key={day.day} className="gpt-draft__day">
          <p className="eyebrow">{fa.draft.dayNTitle(day.day, day.title)}</p>
          <ul>
            {day.exercises.map((ex, i) => (
              <li key={`${ex.name}-${i}`}>
                <span>{ex.name}</span>
                <small>{ex.sets} × {ex.repRange || ex.reps} · {ex.restTime}ث · {ex.muscleGroups.slice(0, 2).join(', ')}</small>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
