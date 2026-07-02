import { Loader2, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../hooks/useApp';
import type {
  FitnessLevel,
  Gender,
  Goal,
  MissedWorkoutBehavior,
  NutritionPreference,
  User,
  WalkingTargetMetric,
} from '../types';

const GOALS: Goal[] = ['General Fitness', 'Strength', 'Muscle Gain', 'Weight Loss'];
const LEVELS: FitnessLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const GENDERS: Gender[] = ['male', 'female', 'other', 'undisclosed'];
const EQUIPMENT = ['bodyweight', 'dumbbells', 'barbell', 'machine', 'kettlebell', 'bands', 'cables', 'bench'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MUSCLE_FOCUS = ['chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'core', 'full body'];

const NUTRITION_PREFS: Array<{ id: NutritionPreference; label: string }> = [
  { id: 'no_preference', label: 'No preference' },
  { id: 'high_protein', label: 'High protein' },
  { id: 'low_carb', label: 'Low carb' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'keto', label: 'Keto' },
];

const WALKING_METRICS: Array<{ id: WalkingTargetMetric; label: string }> = [
  { id: 'steps', label: 'Steps / day' },
  { id: 'minutes', label: 'Minutes / day' },
  { id: 'distanceKm', label: 'Distance (km) / day' },
];

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function numberOrUndefined(value: string) {
  const n = Number(value);
  return value.trim() === '' || Number.isNaN(n) ? undefined : n;
}

/** Value to send for an optional clearable field: number, null (clear), or omit. */
function clearable<T>(next: T | undefined, previouslySet: boolean): T | null | undefined {
  if (next !== undefined) return next;
  return previouslySet ? null : undefined;
}

function csvList(value: string) {
  return value.split(',').map((s) => s.trim()).filter(Boolean);
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
  // Phase 3 fields — every one optional and skippable.
  const [targetWeight, setTargetWeight] = useState(user?.targetWeight?.toString() ?? '');
  const [goalDeadline, setGoalDeadline] = useState(user?.goalDeadline ?? '');
  const [muscleFocus, setMuscleFocus] = useState<string[]>(user?.muscleFocus ?? []);
  const [limitations, setLimitations] = useState((user?.physicalLimitations ?? []).join(', '));
  const [nutritionPref, setNutritionPref] = useState<NutritionPreference>(
    user?.nutritionPreference ?? 'no_preference',
  );
  const [supplements, setSupplements] = useState((user?.supplements ?? []).join(', '));
  const [waterTargetMl, setWaterTargetMl] = useState(user?.waterTargetMl?.toString() ?? '');
  const [walkingMetric, setWalkingMetric] = useState<WalkingTargetMetric>(
    user?.walkingTarget?.metric ?? 'steps',
  );
  const [walkingValue, setWalkingValue] = useState(user?.walkingTarget?.value?.toString() ?? '');
  const [missedBehavior, setMissedBehavior] = useState<MissedWorkoutBehavior>(
    user?.missedWorkoutBehavior ?? 'shift',
  );
  const [restCountdownSound, setRestCountdownSound] = useState(
    user?.preferences?.restCountdownSound !== false,
  );

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
    setTargetWeight(user.targetWeight?.toString() ?? '');
    setGoalDeadline(user.goalDeadline ?? '');
    setMuscleFocus(user.muscleFocus ?? []);
    setLimitations((user.physicalLimitations ?? []).join(', '));
    setNutritionPref(user.nutritionPreference ?? 'no_preference');
    setSupplements((user.supplements ?? []).join(', '));
    setWaterTargetMl(user.waterTargetMl?.toString() ?? '');
    setWalkingMetric(user.walkingTarget?.metric ?? 'steps');
    setWalkingValue(user.walkingTarget?.value?.toString() ?? '');
    setMissedBehavior(user.missedWorkoutBehavior ?? 'shift');
    setRestCountdownSound(user.preferences?.restCountdownSound !== false);
  }, [open, user]);

  if (!open) return null;

  async function save() {
    const walkingValueNum = numberOrUndefined(walkingValue);
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
      injuries: csvList(injuries),
      targetWeight: clearable(numberOrUndefined(targetWeight), user?.targetWeight != null),
      goalDeadline: clearable(goalDeadline || undefined, Boolean(user?.goalDeadline)),
      muscleFocus,
      physicalLimitations: csvList(limitations),
      nutritionPreference: nutritionPref,
      supplements: csvList(supplements),
      waterTargetMl: clearable(numberOrUndefined(waterTargetMl), user?.waterTargetMl != null),
      walkingTarget: clearable(
        walkingValueNum !== undefined ? { metric: walkingMetric, value: walkingValueNum } : undefined,
        Boolean(user?.walkingTarget),
      ),
      missedWorkoutBehavior: missedBehavior,
      preferences: {
        autoRestTimer,
        defaultRestSeconds,
        restCountdownSound,
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

        <p className="eyebrow modal-section-title">Basics</p>

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

        <p className="eyebrow modal-section-title">Goal</p>

        <div className="field-row">
          <label className="field"><span>Goal</span>
            <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>{GOALS.map((g) => <option key={g}>{g}</option>)}</select>
          </label>
          <label className="field"><span>Level</span>
            <select value={level} onChange={(e) => setLevel(e.target.value as FitnessLevel)}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
          </label>
        </div>

        <div className="field-row">
          <label className="field"><span>Target weight (kg)</span><input type="number" min={25} max={350} value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} placeholder="optional" /></label>
          <label className="field"><span>Goal deadline</span><input type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} /></label>
        </div>

        <div className="field">
          <span>Muscle focus <small className="field__hint">(optional)</small></span>
          <div className="chip-toggle">
            {MUSCLE_FOCUS.map((item) => (
              <button key={item} type="button" className={`chip-toggle__item ${muscleFocus.includes(item) ? 'is-on' : ''}`} onClick={() => setMuscleFocus((l) => toggle(l, item))}>{item}</button>
            ))}
          </div>
        </div>

        <p className="eyebrow modal-section-title">Training</p>

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

        <div className="field">
          <span>If I miss a workout</span>
          <div className="chip-toggle">
            <button
              type="button"
              className={`chip-toggle__item ${missedBehavior === 'shift' ? 'is-on' : ''}`}
              onClick={() => setMissedBehavior('shift')}
            >
              Shift it forward
            </button>
            <button
              type="button"
              className={`chip-toggle__item ${missedBehavior === 'skip' ? 'is-on' : ''}`}
              onClick={() => setMissedBehavior('skip')}
            >
              Skip to next day
            </button>
          </div>
          <small className="field__hint">
            {missedBehavior === 'shift'
              ? 'Missed workouts stay pending — your program continues in order.'
              : 'Missed workouts are skipped — you follow the calendar dates.'}
          </small>
        </div>

        <p className="eyebrow modal-section-title">Health</p>

        <label className="field">
          <span>Injuries <small className="field__hint">(comma separated)</small></span>
          <input value={injuries} onChange={(e) => setInjuries(e.target.value)} placeholder="e.g. knee pain, lower back" />
        </label>

        <label className="field">
          <span>Physical limitations <small className="field__hint">(comma separated)</small></span>
          <input value={limitations} onChange={(e) => setLimitations(e.target.value)} placeholder="e.g. can't jump, limited shoulder mobility" />
        </label>

        <p className="eyebrow modal-section-title">Nutrition</p>

        <div className="field-row">
          <label className="field"><span>Preference</span>
            <select value={nutritionPref} onChange={(e) => setNutritionPref(e.target.value as NutritionPreference)}>
              {NUTRITION_PREFS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <label className="field"><span>Water target (ml)</span><input type="number" min={250} max={10000} step={250} value={waterTargetMl} onChange={(e) => setWaterTargetMl(e.target.value)} placeholder="e.g. 2500" /></label>
        </div>

        <label className="field">
          <span>Supplements <small className="field__hint">(comma separated, optional)</small></span>
          <input value={supplements} onChange={(e) => setSupplements(e.target.value)} placeholder="e.g. creatine, whey, vitamin D" />
        </label>

        <p className="eyebrow modal-section-title">Walking</p>

        <div className="field-row">
          <label className="field"><span>Daily target</span>
            <select value={walkingMetric} onChange={(e) => setWalkingMetric(e.target.value as WalkingTargetMetric)}>
              {WALKING_METRICS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          <label className="field"><span>Amount</span><input type="number" min={1} value={walkingValue} onChange={(e) => setWalkingValue(e.target.value)} placeholder="optional" /></label>
        </div>

        <p className="eyebrow modal-section-title">Rest timer</p>

        <div className="field profile-rest-settings">
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
          <div className="settings-row settings-row--inset">
            <div>
              <strong>Countdown sound</strong>
              <small>Three soft beeps in the last 3 seconds of rest</small>
            </div>
            <button
              type="button"
              className={`switch ${restCountdownSound ? 'is-on' : ''}`}
              onClick={() => setRestCountdownSound((v) => !v)}
              role="switch"
              aria-checked={restCountdownSound}
              aria-label="Rest countdown sound"
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
