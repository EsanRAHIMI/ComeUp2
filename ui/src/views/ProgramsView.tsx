import {
  Bot,
  ChevronDown,
  Copy,
  Download,
  Pencil,
  Search,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ApiError, programsApi } from '../api';
import { CoachPlanImporter } from '../components/CoachPlanImporter';
import { EmptyState } from '../components/EmptyState';
import { GenerateForm } from '../components/GenerateForm';
import { GptBuilder } from '../components/GptBuilder';
import { ProgramDays } from '../components/ProgramDays';
import { ProgramEditor } from '../components/ProgramEditor';
import { useApp } from '../hooks/useApp';
import { getPersistedProgramId } from '../lib/format';
import type { Program } from '../types';

export function ProgramsView() {
  const { programs, busy, activateProgram, shareProgram, duplicateProgram, deleteProgram } = useApp();
  const [term, setTerm] = useState('');
  const [genOpen, setGenOpen] = useState(false);
  const [gptOpen, setGptOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<Program | null>(null);

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

  return (
    <div className="view-stack">
      <div className="toolbar">
        <label className="search-box">
          <Search size={18} />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search programs" />
        </label>
      </div>

      <div className="program-actions-row">
        <button type="button" className="btn btn--primary" onClick={() => setGptOpen(true)}>
          <Bot size={17} /> GPT program
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setGenOpen(true)}>
          <Sparkles size={17} /> Quick generate
        </button>
      </div>

      <ShareCodeImport />
      <CoachPlanImporter />

      {filtered.length ? (
        <div className="program-list">
          {filtered.map((program) => {
            const id = program._id ?? program.id ?? program.name;
            const persisted = Boolean(getPersistedProgramId(program));
            const isOpen = expanded === id;
            return (
              <article className="card manage-card" key={id}>
                <button type="button" className="manage-card__head" onClick={() => setExpanded(isOpen ? null : id)}>
                  <div>
                    <div className="manage-card__title">
                      <h3>{program.name}</h3>
                      {program.isActive ? <span className="chip chip--active">Active</span> : null}
                    </div>
                    <small>{program.daysPerWeek}×/wk · {program.duration} min · {program.exercises.length} exercises</small>
                  </div>
                  <ChevronDown size={20} className={isOpen ? 'rot-180' : ''} />
                </button>

                {isOpen ? (
                  <>
                    <ProgramDays program={program} />
                    <div className="manage-card__actions">
                      <button type="button" className="btn btn--primary" onClick={() => activateProgram(program)} disabled={busy || program.isActive || !persisted}>
                        {program.isActive ? 'Active' : 'Activate'}
                      </button>
                      <button type="button" className="btn btn--ghost" onClick={() => setEditing(program)} disabled={busy || !persisted}>
                        <Pencil size={16} /> Edit
                      </button>
                      <button type="button" className="btn btn--ghost" onClick={() => duplicateProgram(program)} disabled={busy || !persisted}>
                        <Copy size={16} /> Duplicate
                      </button>
                      <button type="button" className="btn btn--ghost" onClick={() => shareProgram(program)} disabled={busy || !persisted}>
                        <Share2 size={16} /> Share
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost manage-card__delete"
                        onClick={() => confirmDelete(program)}
                        disabled={busy || !persisted}
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                    {program.shareCode ? <small className="manage-card__code">Share code: <strong>{program.shareCode}</strong></small> : null}
                  </>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={term ? 'No matches' : 'No programs yet'}
          description={term ? 'Try a different search.' : 'Use Quick generate or GPT program builder — both use your profile and share 5 AI generations per week.'}
          actionLabel={term ? undefined : 'Create with GPT'}
          onAction={term ? undefined : () => setGptOpen(true)}
        />
      )}

      <GenerateForm open={genOpen} onClose={() => setGenOpen(false)} />
      <GptBuilder open={gptOpen} onClose={() => setGptOpen(false)} />
      {editing ? <ProgramEditor program={editing} open onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

function ShareCodeImport() {
  const { token, notify, refreshPrograms } = useApp();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!token || !code.trim()) return;
    setBusy(true);
    try {
      await programsApi.importByCode(token, code.trim().toUpperCase());
      await refreshPrograms();
      notify('Program imported', 'success');
      setCode('');
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'Invalid share code', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="share-import">
      <Download size={18} />
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter a share code" />
      <button type="button" className="btn btn--ghost" onClick={() => void submit()} disabled={busy || code.trim().length < 3}>
        Import
      </button>
    </div>
  );
}
