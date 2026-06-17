import { CalendarDays, Clock3, Flame, Share2 } from 'lucide-react';
import type { Program } from '../types';
import { getPersistedProgramId } from '../lib/format';

export function ProgramCard({
  program,
  busy,
  onActivate,
  onShare,
}: {
  program: Program;
  busy: boolean;
  onActivate: (program: Program) => void;
  onShare: (program: Program) => void;
}) {
  const persisted = Boolean(getPersistedProgramId(program));
  return (
    <article className="program-card">
      <div className="program-card__top">
        <span className={`chip chip--${program.difficulty.toLowerCase()}`}>{program.difficulty}</span>
        {program.isActive ? <span className="chip chip--active">Active</span> : null}
      </div>
      <h3>{program.name}</h3>
      <p>{program.description}</p>
      <div className="program-card__stats">
        <span><Clock3 size={15} /> {program.duration} min</span>
        <span><CalendarDays size={15} /> {program.daysPerWeek}×/wk</span>
        <span><Flame size={15} /> {program.totalCalories} cal</span>
      </div>
      {program.tags.length ? (
        <div className="tag-row">
          {program.tags.slice(0, 4).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      ) : null}
      <div className="program-card__actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => onActivate(program)}
          disabled={busy || program.isActive || !persisted}
        >
          {program.isActive ? 'Active' : 'Activate'}
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => onShare(program)}
          disabled={busy || !persisted}
          aria-label="Share program"
        >
          <Share2 size={17} />
        </button>
      </div>
    </article>
  );
}
