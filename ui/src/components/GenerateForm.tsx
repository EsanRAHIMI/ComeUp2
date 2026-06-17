import { Loader2, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../hooks/useApp';
import type { FitnessLevel, Goal } from '../types';

const GOALS: Goal[] = ['General Fitness', 'Strength', 'Muscle Gain', 'Weight Loss'];
const LEVELS: FitnessLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const EQUIPMENT = ['bodyweight', 'dumbbells', 'barbell', 'machine', 'kettlebell', 'bands'];
const FOCUS = ['full body', 'legs', 'chest', 'back', 'shoulders', 'arms', 'core', 'cardio'];

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function GenerateForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, generateProgram, busy } = useApp();
  const [goal, setGoal] = useState<Goal>(user?.goal ?? 'General Fitness');
  const [level, setLevel] = useState<FitnessLevel>(user?.fitnessLevel ?? 'Beginner');
  const [duration, setDuration] = useState(40);
  const [daysPerWeek, setDaysPerWeek] = useState(user?.workoutDaysPerWeek ?? 3);
  const [equipment, setEquipment] = useState<string[]>(['bodyweight', 'dumbbells']);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);

  if (!open) return null;

  async function submit() {
    const program = await generateProgram({ goal, fitnessLevel: level, duration, daysPerWeek, equipment, focusAreas });
    if (program) onClose();
  }

  return (
    <div className="modal-overlay" role="dialog" aria-label="Generate workout">
      <div className="modal-card">
        <div className="modal-card__head">
          <h2>Generate a workout</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Goal</span>
            <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
              {GOALS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Level</span>
            <select value={level} onChange={(e) => setLevel(e.target.value as FitnessLevel)}>
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Duration (min)</span>
            <input type="number" min={15} max={120} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Days / week</span>
            <input type="number" min={1} max={7} value={daysPerWeek} onChange={(e) => setDaysPerWeek(Number(e.target.value))} />
          </label>
        </div>

        <div className="field">
          <span>Equipment</span>
          <div className="chip-toggle">
            {EQUIPMENT.map((item) => (
              <button
                key={item}
                type="button"
                className={`chip-toggle__item ${equipment.includes(item) ? 'is-on' : ''}`}
                onClick={() => setEquipment((list) => toggle(list, item))}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Focus areas <small className="field__hint">(optional)</small></span>
          <div className="chip-toggle">
            {FOCUS.map((item) => (
              <button
                key={item}
                type="button"
                className={`chip-toggle__item ${focusAreas.includes(item) ? 'is-on' : ''}`}
                onClick={() => setFocusAreas((list) => toggle(list, item))}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => void submit()} disabled={busy}>
          {busy ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
          Generate program
        </button>
      </div>
    </div>
  );
}
