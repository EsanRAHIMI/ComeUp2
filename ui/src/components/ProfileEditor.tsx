import { Loader2, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../hooks/useApp';
import type { FitnessLevel, Gender, Goal, User } from '../types';

const GOALS: Goal[] = ['General Fitness', 'Strength', 'Muscle Gain', 'Weight Loss'];
const LEVELS: FitnessLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const GENDERS: Gender[] = ['male', 'female', 'other', 'undisclosed'];
const EQUIPMENT = ['bodyweight', 'dumbbells', 'barbell', 'machine', 'kettlebell', 'bands', 'cables', 'bench'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function numberOrUndefined(value: string) {
  const n = Number(value);
  return value.trim() === '' || Number.isNaN(n) ? undefined : n;
}

export function ProfileEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, updateProfile, busy } = useApp();
  const [name, setName] = useState(user?.name ?? '');
  const [gender, setGender] = useState<Gender>(user?.gender ?? 'undisclosed');
  const [age, setAge] = useState(user?.age?.toString() ?? '');
  const [height, setHeight] = useState(user?.height?.toString() ?? '');
  const [weight, setWeight] = useState(user?.weight?.toString() ?? '');
  const [goal, setGoal] = useState<Goal>(user?.goal ?? 'General Fitness');
  const [level, setLevel] = useState<FitnessLevel>(user?.fitnessLevel ?? 'Beginner');
  const [daysPerWeek, setDaysPerWeek] = useState(user?.workoutDaysPerWeek ?? 3);
  const [sessionDuration, setSessionDuration] = useState(user?.sessionDuration ?? 60);
  const [equipment, setEquipment] = useState<string[]>(user?.availableEquipment ?? []);
  const [preferredDays, setPreferredDays] = useState<number[]>(user?.preferredDays ?? []);
  const [injuries, setInjuries] = useState((user?.injuries ?? []).join(', '));
  const [autoRestTimer, setAutoRestTimer] = useState(user?.preferences?.autoRestTimer !== false);
  const [defaultRestSeconds, setDefaultRestSeconds] = useState(user?.preferences?.defaultRestSeconds ?? 60);

  useEffect(() => {
    if (!open || !user) return;
    setName(user.name);
    setGender(user.gender ?? 'undisclosed');
    setAge(user.age?.toString() ?? '');
    setHeight(user.height?.toString() ?? '');
    setWeight(user.weight?.toString() ?? '');
    setGoal(user.goal);
    setLevel(user.fitnessLevel);
    setDaysPerWeek(user.workoutDaysPerWeek);
    setSessionDuration(user.sessionDuration ?? 60);
    setEquipment(user.availableEquipment ?? []);
    setPreferredDays(user.preferredDays ?? []);
    setInjuries((user.injuries ?? []).join(', '));
    setAutoRestTimer(user.preferences?.autoRestTimer !== false);
    setDefaultRestSeconds(user.preferences?.defaultRestSeconds ?? 60);
  }, [open, user]);

  if (!open) return null;

  async function save() {
    const patch: Partial<User> = {
      name: name.trim(),
      gender,
      age: numberOrUndefined(age),
      height: numberOrUndefined(height),
      weight: numberOrUndefined(weight),
      goal,
      fitnessLevel: level,
      workoutDaysPerWeek: daysPerWeek,
      sessionDuration,
      availableEquipment: equipment,
      preferredDays,
      injuries: injuries.split(',').map((s) => s.trim()).filter(Boolean),
      preferences: {
        autoRestTimer,
        defaultRestSeconds,
      },
    };
    const ok = await updateProfile(patch);
    if (ok) onClose();
  }

  return (
    <div className="modal-overlay" role="dialog" aria-label="Edit profile">
      <div className="modal-card">
        <div className="modal-card__head">
          <h2>Edit profile</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <label className="field"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>

        <div className="field-row">
          <label className="field"><span>Gender</span>
            <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label className="field"><span>Age</span><input type="number" min={12} max={100} value={age} onChange={(e) => setAge(e.target.value)} /></label>
        </div>

        <div className="field-row">
          <label className="field"><span>Height (cm)</span><input type="number" min={80} max={260} value={height} onChange={(e) => setHeight(e.target.value)} /></label>
          <label className="field"><span>Weight (kg)</span><input type="number" min={25} max={350} value={weight} onChange={(e) => setWeight(e.target.value)} /></label>
        </div>

        <div className="field-row">
          <label className="field"><span>Goal</span>
            <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>{GOALS.map((g) => <option key={g}>{g}</option>)}</select>
          </label>
          <label className="field"><span>Level</span>
            <select value={level} onChange={(e) => setLevel(e.target.value as FitnessLevel)}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
          </label>
        </div>

        <div className="field-row">
          <label className="field"><span>Days / week</span><input type="number" min={1} max={7} value={daysPerWeek} onChange={(e) => setDaysPerWeek(Number(e.target.value))} /></label>
          <label className="field"><span>Session (min)</span><input type="number" min={20} max={180} step={5} value={sessionDuration} onChange={(e) => setSessionDuration(Number(e.target.value))} /></label>
        </div>

        <div className="field">
          <span>Available equipment</span>
          <div className="chip-toggle">
            {EQUIPMENT.map((item) => (
              <button key={item} type="button" className={`chip-toggle__item ${equipment.includes(item) ? 'is-on' : ''}`} onClick={() => setEquipment((l) => toggle(l, item))}>{item}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Preferred training days</span>
          <div className="chip-toggle">
            {WEEKDAYS.map((label, idx) => (
              <button key={label} type="button" className={`chip-toggle__item ${preferredDays.includes(idx) ? 'is-on' : ''}`} onClick={() => setPreferredDays((l) => toggle(l, idx))}>{label}</button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>Injuries / limitations <small className="field__hint">(comma separated)</small></span>
          <input value={injuries} onChange={(e) => setInjuries(e.target.value)} placeholder="e.g. knee pain, lower back" />
        </label>

        <div className="field profile-rest-settings">
          <span>Rest timer defaults</span>
          <div className="settings-row settings-row--inset">
            <div>
              <strong>Auto rest between sets</strong>
              <small>Count down after each completed set</small>
            </div>
            <button
              type="button"
              className={`switch ${autoRestTimer ? 'is-on' : ''}`}
              onClick={() => setAutoRestTimer((v) => !v)}
              role="switch"
              aria-checked={autoRestTimer}
              aria-label="Auto rest timer"
            >
              <span />
            </button>
          </div>
          <label className="field">
            <span>Default rest (seconds)</span>
            <input
              type="number"
              min={0}
              max={900}
              step={5}
              value={defaultRestSeconds}
              disabled={!autoRestTimer}
              onChange={(e) => setDefaultRestSeconds(Number(e.target.value))}
            />
            <small className="field__hint">Used when an exercise has no custom rest time</small>
          </label>
        </div>

        <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => void save()} disabled={busy || name.trim().length < 2}>
          {busy ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
          Save profile
        </button>
      </div>
    </div>
  );
}
