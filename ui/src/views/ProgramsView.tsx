import { ChevronDown, Copy, Pencil, Search, Share2, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { GenerateForm } from '../components/GenerateForm';
import { GptBuilder } from '../components/GptBuilder';
import { ProgramCreateHub, type ProgramCreatePanel } from '../components/ProgramCreateHub';
import { ProgramDays } from '../components/ProgramDays';
import { ProgramEditor } from '../components/ProgramEditor';
import { useApp } from '../hooks/useApp';
import { useRouter } from '../hooks/useRouter';
import { getPersistedProgramId } from '../lib/format';
import type { Program } from '../types';

function ProgramCardActions({
  program,
  persisted,
  busy,
  onActivate,
  onEdit,
  onDuplicate,
  onShare,
  onDelete,
}: {
  program: Program;
  persisted: boolean;
  busy: boolean;
  onActivate: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="manage-card__actions" role="toolbar" aria-label="Program actions">
      <button
        type="button"
        className={`manage-card__action manage-card__action--primary ${program.isActive ? 'manage-card__action--is-active' : ''}`}
        title={program.isActive ? 'Active program' : 'Activate program'}
        onClick={(e) => {
          e.stopPropagation();
          onActivate();
        }}
        disabled={busy || program.isActive || !persisted}
      >
        {program.isActive ? 'Active' : 'Activate'}
      </button>
      <button
        type="button"
        className="manage-card__action"
        title="Edit program"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        disabled={busy || !persisted}
      >
        <Pencil size={15} />
      </button>
      <button
        type="button"
        className="manage-card__action"
        title="Duplicate program"
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
        disabled={busy || !persisted}
      >
        <Copy size={15} />
      </button>
      <button
        type="button"
        className="manage-card__action"
        title="Share program"
        onClick={(e) => {
          e.stopPropagation();
          onShare();
        }}
        disabled={busy || !persisted}
      >
        <Share2 size={15} />
      </button>
      <button
        type="button"
        className="manage-card__action manage-card__action--danger"
        title="Delete program"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        disabled={busy || !persisted}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

export function ProgramsView() {
  const { programs, busy, activateProgram, shareProgram, duplicateProgram, deleteProgram } = useApp();
  const { programsAction, clearProgramsAction } = useRouter();
  const shareInputRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState('');
  const [genOpen, setGenOpen] = useState(false);
  const [gptOpen, setGptOpen] = useState(false);
  const [createPanel, setCreatePanel] = useState<ProgramCreatePanel>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<Program | null>(null);

  useEffect(() => {
    if (!programsAction) return;
    if (programsAction === 'gpt') setGptOpen(true);
    if (programsAction === 'quick') setGenOpen(true);
    if (programsAction === 'import') setCreatePanel('share');
    if (programsAction === 'coach') setCreatePanel('coach');
    clearProgramsAction();
  }, [programsAction, clearProgramsAction]);

  function confirmDelete(program: Program) {
    if (program.isActive) {
      if (!window.confirm(`"${program.name}" is your ACTIVE program. Are you sure you want to delete it?`)) return;
      if (!window.confirm('This cannot be undone. Delete the active program?')) return;
    } else if (!window.confirm(`Delete "${program.name}"? This cannot be undone.`)) {
      return;
    }
    deleteProgram(program);
  }

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return programs;
    return programs.filter((p) => [p.name, p.description, p.difficulty, ...p.tags].join(' ').toLowerCase().includes(q));
  }, [programs, term]);

  const sortedPrograms = useMemo(
    () => [...filtered].sort((a, b) => Number(b.isActive) - Number(a.isActive)),
    [filtered],
  );

  return (
    <div className="view-stack">
      <ProgramCreateHub
        onAiCoach={() => setGptOpen(true)}
        onQuickGenerate={() => setGenOpen(true)}
        panel={createPanel}
        onPanelChange={setCreatePanel}
        shareInputRef={shareInputRef}
      />

      <div className="toolbar">
        <label className="search-box">
          <Search size={18} />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search your programs" />
        </label>
      </div>

      {filtered.length ? (
        <div className="program-list">
          <p className="eyebrow program-list__label">Your programs</p>
          {sortedPrograms.map((program) => {
            const id = program._id ?? program.id ?? program.name;
            const persisted = Boolean(getPersistedProgramId(program));
            const isOpen = expanded === id;
            return (
              <article
                className={`card manage-card ${program.isActive ? 'manage-card--active' : ''} ${isOpen ? 'is-open' : ''}`}
                key={id}
              >
                <div className="manage-card__header">
                  <button type="button" className="manage-card__head-main" onClick={() => setExpanded(isOpen ? null : id)}>
                    <div className="manage-card__title">
                      <h3>{program.name}</h3>
                    </div>
                    <small>{program.daysPerWeek}×/wk · {program.duration} min · {program.exercises.length} exercises</small>
                  </button>
                  <ProgramCardActions
                    program={program}
                    persisted={persisted}
                    busy={busy}
                    onActivate={() => activateProgram(program)}
                    onEdit={() => setEditing(program)}
                    onDuplicate={() => duplicateProgram(program)}
                    onShare={() => shareProgram(program)}
                    onDelete={() => confirmDelete(program)}
                  />
                  <button
                    type="button"
                    className="manage-card__chevron"
                    onClick={() => setExpanded(isOpen ? null : id)}
                    aria-label={isOpen ? 'Collapse program' : 'Expand program'}
                  >
                    <ChevronDown size={18} className={isOpen ? 'rot-180' : ''} />
                  </button>
                </div>

                {isOpen ? (
                  <>
                    {program.shareCode ? (
                      <small className="manage-card__code">Share code: <strong>{program.shareCode}</strong></small>
                    ) : null}
                    <ProgramDays program={program} />
                  </>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={term ? 'No matches' : 'No saved programs yet'}
          description={
            term
              ? 'Try a different search.'
              : 'Use AI Coach or Quick generate above — both share 5 AI generations per week.'
          }
          actionLabel={term ? undefined : 'Start with AI Coach'}
          onAction={term ? undefined : () => setGptOpen(true)}
        />
      )}

      <GenerateForm open={genOpen} onClose={() => setGenOpen(false)} />
      <GptBuilder open={gptOpen} onClose={() => setGptOpen(false)} />
      {editing ? <ProgramEditor program={editing} open onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
