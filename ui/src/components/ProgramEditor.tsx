import { Loader2, Save, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { useT } from '../i18n/LocaleProvider';
import { getPersistedProgramId } from '../lib/format';
import type { Exercise, Program, ScheduleEntry } from '../types';

type DraftExercise = {
  originalName: string;
  name: string;
  sets: number;
  reps: number;
  repRange: string;
  restTime: number;
  instructions: string;
  muscleGroups: string;
  trackingType: Exercise['trackingType'];
};

export function ProgramEditor({ program, open, onClose }: { program: Program; open: boolean; onClose: () => void }) {
  const fa = useT();
  const { updateProgram, busy } = useApp();
  const [name, setName] = useState(program.name);

  const initialDayTitles = useMemo(() => {
    const map: Record<number, string> = {};
    for (const s of program.schedule ?? []) if (!(s.day in map)) map[s.day] = s.title;
    return map;
  }, [program.schedule]);
  const [dayTitles, setDayTitles] = useState<Record<number, string>>(initialDayTitles);

  const [exercises, setExercises] = useState<DraftExercise[]>(() =>
    program.exercises.map((ex) => ({
      originalName: ex.name,
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      repRange: ex.repRange ?? '',
      restTime: ex.restTime,
      instructions: ex.instructions ?? '',
      muscleGroups: ex.muscleGroups.join(', '),
      trackingType: ex.trackingType ?? 'reps',
    })),
  );

  if (!open) return null;

  function patchExercise(index: number, patch: Partial<DraftExercise>) {
    setExercises((list) => list.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)));
  }

  async function save() {
    const id = getPersistedProgramId(program);
    if (!id) {
      onClose();
      return;
    }

    const renameMap = new Map<string, string>();
    const nextExercises: Exercise[] = exercises.map((ex, i) => {
      if (ex.originalName && ex.originalName !== ex.name) {
        renameMap.set(ex.originalName.toLowerCase(), ex.name);
      }
      const source = program.exercises[i];
      return {
        ...source,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        repRange: ex.repRange,
        restTime: ex.restTime,
        instructions: ex.instructions,
        muscleGroups: ex.muscleGroups.split(',').map((s) => s.trim()).filter(Boolean),
      };
    });

    // Update schedule: refresh day titles and remap any renamed exercises.
    const nextSchedule: ScheduleEntry[] | undefined = program.schedule?.map((s) => ({
      ...s,
      title: dayTitles[s.day] ?? s.title,
      exerciseNames: s.exerciseNames.map((n) => renameMap.get(n.toLowerCase()) ?? n),
    }));

    const ok = await updateProgram(id, {
      name: name.trim(),
      exercises: nextExercises,
      ...(nextSchedule ? { schedule: nextSchedule } : {}),
    });
    if (ok) onClose();
  }

  const days = Object.keys(dayTitles)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="modal-overlay" role="dialog" aria-label={fa.editor.aria}>
      <div className="modal-card">
        <div className="modal-card__head">
          <h2>{fa.editor.title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={fa.close}><X size={18} /></button>
        </div>

        <label className="field"><span>{fa.editor.programName}</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>

        {days.length ? (
          <div className="field">
            <span>{fa.editor.dayTitles}</span>
            <div className="editor-days">
              {days.map((day) => (
                <label key={day} className="editor-day">
                  <em>{fa.editor.dayN(day)}</em>
                  <input value={dayTitles[day]} onChange={(e) => setDayTitles((m) => ({ ...m, [day]: e.target.value }))} />
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <div className="field"><span>{fa.editor.exercises}</span></div>
        <div className="editor-exercises">
          {exercises.map((ex, i) => (
            <div key={i} className="editor-exercise">
              <input className="editor-exercise__name" value={ex.name} onChange={(e) => patchExercise(i, { name: e.target.value })} placeholder={fa.editor.exerciseName} />
              <div className="editor-exercise__grid">
                <label><em>{fa.editor.sets}</em><input type="number" min={1} max={20} value={ex.sets} onChange={(e) => patchExercise(i, { sets: Number(e.target.value) })} /></label>
                <label><em>{fa.editor.reps}</em><input type="number" min={1} max={300} value={ex.reps} onChange={(e) => patchExercise(i, { reps: Number(e.target.value) })} /></label>
                <label><em>{fa.editor.range}</em><input value={ex.repRange} onChange={(e) => patchExercise(i, { repRange: e.target.value })} placeholder="8-12" /></label>
                <label><em>{fa.editor.restS}</em><input type="number" min={0} max={900} value={ex.restTime} onChange={(e) => patchExercise(i, { restTime: Number(e.target.value) })} /></label>
              </div>
              <input value={ex.muscleGroups} onChange={(e) => patchExercise(i, { muscleGroups: e.target.value })} placeholder={fa.editor.muscleGroupsPh} />
              <textarea rows={2} value={ex.instructions} onChange={(e) => patchExercise(i, { instructions: e.target.value })} placeholder={fa.editor.instructionsPh} />
            </div>
          ))}
        </div>

        <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => void save()} disabled={busy || name.trim().length < 1}>
          {busy ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
          {fa.editor.saveChanges}
        </button>
      </div>
    </div>
  );
}
