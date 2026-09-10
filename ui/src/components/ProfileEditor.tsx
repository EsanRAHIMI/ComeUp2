import { Loader2, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { goalLabel, levelLabel } from '../i18n';
import { useT } from '../i18n/LocaleProvider';
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
const MUSCLE_FOCUS = ['chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'core', 'full body'];


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
  const fa = useT();
  const WEEKDAYS = [...fa.weekdaysShort];
  const GENDER_LABELS = fa.genders as Record<Gender, string>;
  const NUTRITION_PREFS: Array<{ id: NutritionPreference; label: string }> = (
    ['no_preference', 'high_protein', 'low_carb', 'vegetarian', 'vegan', 'keto'] as NutritionPreference[]
  ).map((id) => ({ id, label: fa.nutritionPrefs[id] }));
  const WALKING_METRICS: Array<{ id: WalkingTargetMetric; label: string }> = (
    ['steps', 'minutes', 'distanceKm'] as WalkingTargetMetric[]
  ).map((id) => ({ id, label: fa.walkingMetrics[id] }));
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
    <div className="modal-overlay" role="dialog" aria-label={fa.profileEdit.aria}>
      <div className="modal-card">
        <div className="modal-card__head">
          <h2>{fa.profileEdit.title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={fa.close}><X size={18} /></button>
        </div>

        <p className="eyebrow modal-section-title">{fa.profileEdit.basics}</p>

        <label className="field"><span>{fa.profileEdit.name}</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>

        <div className="field-row">
          <label className="field"><span>{fa.profileEdit.gender}</span>
            <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
              {GENDERS.map((g) => <option key={g} value={g}>{GENDER_LABELS[g]}</option>)}
            </select>
          </label>
          <label className="field"><span>{fa.profileEdit.age}</span><input type="number" min={12} max={100} value={age} onChange={(e) => setAge(e.target.value)} /></label>
        </div>

        <div className="field-row">
          <label className="field"><span>{fa.profileEdit.heightCm}</span><input type="number" min={80} max={260} value={height} onChange={(e) => setHeight(e.target.value)} /></label>
          <label className="field"><span>{fa.profileEdit.weightKg}</span><input type="number" min={25} max={350} value={weight} onChange={(e) => setWeight(e.target.value)} /></label>
        </div>

        <p className="eyebrow modal-section-title">{fa.profileEdit.goalSection}</p>

        <div className="field-row">
          <label className="field"><span>{fa.profileEdit.goal}</span>
            <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>{GOALS.map((g) => <option key={g} value={g}>{goalLabel(g)}</option>)}</select>
          </label>
          <label className="field"><span>{fa.profileEdit.level}</span>
            <select value={level} onChange={(e) => setLevel(e.target.value as FitnessLevel)}>{LEVELS.map((l) => <option key={l} value={l}>{levelLabel(l)}</option>)}</select>
          </label>
        </div>

        <div className="field-row">
          <label className="field"><span>{fa.profileEdit.targetWeightKg}</span><input type="number" min={25} max={350} value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} placeholder={fa.optional} /></label>
          <label className="field"><span>{fa.profileEdit.goalDeadline}</span><input type="date" value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} /></label>
        </div>

        <div className="field">
          <span>{fa.profileEdit.muscleFocusOptional} <small className="field__hint">({fa.optional})</small></span>
          <div className="chip-toggle">
            {MUSCLE_FOCUS.map((item) => (
              <button key={item} type="button" className={`chip-toggle__item ${muscleFocus.includes(item) ? 'is-on' : ''}`} onClick={() => setMuscleFocus((l) => toggle(l, item))}>{item}</button>
            ))}
          </div>
        </div>

        <p className="eyebrow modal-section-title">{fa.profileEdit.training}</p>

        <div className="field-row">
          <label className="field"><span>{fa.profileEdit.daysPerWeek}</span><input type="number" min={1} max={7} value={daysPerWeek} onChange={(e) => setDaysPerWeek(Number(e.target.value))} /></label>
          <label className="field"><span>{fa.profileEdit.sessionMin}</span><input type="number" min={20} max={180} step={5} value={sessionDuration} onChange={(e) => setSessionDuration(Number(e.target.value))} /></label>
        </div>

        <div className="field">
          <span>{fa.profileEdit.availableEquipment}</span>
          <div className="chip-toggle">
            {EQUIPMENT.map((item) => (
              <button key={item} type="button" className={`chip-toggle__item ${equipment.includes(item) ? 'is-on' : ''}`} onClick={() => setEquipment((l) => toggle(l, item))}>{item}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>{fa.profileEdit.preferredTrainingDays}</span>
          <div className="chip-toggle">
            {WEEKDAYS.map((label, idx) => (
              <button key={label} type="button" className={`chip-toggle__item ${preferredDays.includes(idx) ? 'is-on' : ''}`} onClick={() => setPreferredDays((l) => toggle(l, idx))}>{label}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>{fa.profileEdit.ifIMiss}</span>
          <div className="chip-toggle">
            <button
              type="button"
              className={`chip-toggle__item ${missedBehavior === 'shift' ? 'is-on' : ''}`}
              onClick={() => setMissedBehavior('shift')}
            >
              {fa.profileEdit.shiftForward}
            </button>
            <button
              type="button"
              className={`chip-toggle__item ${missedBehavior === 'skip' ? 'is-on' : ''}`}
              onClick={() => setMissedBehavior('skip')}
            >
              {fa.profileEdit.skipToNext}
            </button>
          </div>
          <small className="field__hint">
            {missedBehavior === 'shift'
              ? fa.profileEditExtra.missedShiftHint
              : fa.profileEditExtra.missedSkipHint}
          </small>
        </div>

        <p className="eyebrow modal-section-title">{fa.profileEdit.health}</p>

        <label className="field">
          <span>{fa.profileEdit.injuriesCsv} <small className="field__hint">{fa.profileEdit.injuriesHint}</small></span>
          <input value={injuries} onChange={(e) => setInjuries(e.target.value)} placeholder={fa.profileEdit.injuriesPh} />
        </label>

        <label className="field">
          <span>{fa.profileEdit.limitationsCsv} <small className="field__hint">{fa.profileEdit.injuriesHint}</small></span>
          <input value={limitations} onChange={(e) => setLimitations(e.target.value)} placeholder={fa.profileEdit.limitationsPh} />
        </label>

        <p className="eyebrow modal-section-title">{fa.profileEdit.nutritionSection}</p>

        <div className="field-row">
          <label className="field"><span>{fa.profileEdit.preference}</span>
            <select value={nutritionPref} onChange={(e) => setNutritionPref(e.target.value as NutritionPreference)}>
              {NUTRITION_PREFS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <label className="field"><span>{fa.profileEdit.waterTargetMl}</span><input type="number" min={250} max={10000} step={250} value={waterTargetMl} onChange={(e) => setWaterTargetMl(e.target.value)} placeholder="مثلاً ۲۵۰۰" /></label>
        </div>

        <label className="field">
          <span>{fa.profileEdit.supplementsCsv} <small className="field__hint">{fa.profileEdit.supplementsHint}</small></span>
          <input value={supplements} onChange={(e) => setSupplements(e.target.value)} placeholder={fa.profileEdit.supplementsPh} />
        </label>

        <p className="eyebrow modal-section-title">{fa.profileEdit.walkingSection}</p>

        <div className="field-row">
          <label className="field"><span>{fa.profileEdit.dailyTarget}</span>
            <select value={walkingMetric} onChange={(e) => setWalkingMetric(e.target.value as WalkingTargetMetric)}>
              {WALKING_METRICS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          <label className="field"><span>{fa.profileEdit.amount}</span><input type="number" min={1} value={walkingValue} onChange={(e) => setWalkingValue(e.target.value)} placeholder={fa.optional} /></label>
        </div>

        <p className="eyebrow modal-section-title">{fa.profileEdit.restTimerSection}</p>

        <div className="field profile-rest-settings">
          <div className="settings-row settings-row--inset">
            <div>
              <strong>{fa.profileEditExtra.autoRest}</strong>
              <small>{fa.profileEditExtra.autoRestHint}</small>
            </div>
            <button
              type="button"
              className={`switch ${autoRestTimer ? 'is-on' : ''}`}
              onClick={() => setAutoRestTimer((v) => !v)}
              role="switch"
              aria-checked={autoRestTimer}
              aria-label={fa.profileEditExtra.autoRestAria}
            >
              <span />
            </button>
          </div>
          <div className="settings-row settings-row--inset">
            <div>
              <strong>{fa.profileEditExtra.countdownSound}</strong>
              <small>{fa.profileEditExtra.countdownSoundHint}</small>
            </div>
            <button
              type="button"
              className={`switch ${restCountdownSound ? 'is-on' : ''}`}
              onClick={() => setRestCountdownSound((v) => !v)}
              role="switch"
              aria-checked={restCountdownSound}
              aria-label={fa.profileEditExtra.countdownSound}
            >
              <span />
            </button>
          </div>
          <label className="field">
            <span>{fa.profileEdit.defaultRestSec}</span>
            <input
              type="number"
              min={0}
              max={900}
              step={5}
              value={defaultRestSeconds}
              disabled={!autoRestTimer}
              onChange={(e) => setDefaultRestSeconds(Number(e.target.value))}
            />
            <small className="field__hint">{fa.profileEditExtra.defaultRestHint}</small>
          </label>
        </div>

        <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => void save()} disabled={busy || name.trim().length < 2}>
          {busy ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
          {fa.profileEdit.saveProfile}
        </button>
      </div>
    </div>
  );
}
