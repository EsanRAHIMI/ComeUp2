import { Plus, RefreshCcw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { ProgramCard } from '../components/ProgramCard';
import { useApp } from '../hooks/useApp';

export function ProgramsView() {
  const { programs, busy, refreshPrograms, generateProgram, activateProgram, shareProgram } = useApp();
  const [term, setTerm] = useState('');

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return programs;
    return programs.filter((p) =>
      [p.name, p.description, p.difficulty, ...p.tags].join(' ').toLowerCase().includes(q),
    );
  }, [programs, term]);

  return (
    <div className="view-stack">
      <div className="toolbar">
        <label className="search-box">
          <Search size={18} />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search programs" />
        </label>
        <button type="button" className="icon-btn" onClick={() => void refreshPrograms()} disabled={busy} aria-label="Sync">
          <RefreshCcw size={17} />
        </button>
        <button type="button" className="btn btn--primary" onClick={() => void generateProgram()} disabled={busy}>
          <Plus size={17} />
          AI
        </button>
      </div>

      {filtered.length ? (
        <div className="program-grid">
          {filtered.map((program) => (
            <ProgramCard
              key={program._id ?? program.id ?? program.name}
              program={program}
              busy={busy}
              onActivate={activateProgram}
              onShare={shareProgram}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={term ? 'No matches' : 'No programs saved'}
          description={
            term
              ? 'Try a different search term.'
              : 'Generate a program to save it, activate it, and create share codes.'
          }
          actionLabel={term ? undefined : 'Generate AI program'}
          onAction={term ? undefined : () => void generateProgram()}
        />
      )}
    </div>
  );
}
