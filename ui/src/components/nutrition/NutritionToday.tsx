import {
  Check,
  ChevronDown,
  ChevronUp,
  Droplets,
  Loader2,
  Minus,
  Pencil,
  Pill,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { nutritionApi } from '../../api';
import { useApp } from '../../hooks/useApp';
import { useRouter } from '../../hooks/useRouter';
import { dateInputValue } from '../../lib/format';
import {
  confidenceLabel,
  MEAL_STATUS_META,
  nextUnloggedSlot,
  scoreLabel,
  scoreTone,
  slotMacroSummary,
  waterPct,
} from '../../lib/nutritionUi';
import { missingProfileHints } from '../../lib/profileHints';
import type {
  HabitEntry,
  MealLogEntry,
  MealLogStatus,
  NutritionDayScore,
  NutritionTargetInfo,
} from '../../types';

const QUICK_STATUSES: MealLogStatus[] = ['done', 'heavier', 'lighter', 'off_plan', 'skipped'];

type DetailDraft = { proteinG: string; carbsG: string; fatG: string; grams: string; note: string };

const emptyDraft: DetailDraft = { proteinG: '', carbsG: '', fatG: '', grams: '', note: '' };

function numOrUndefined(value: string) {
  const n = Number(value);
  return value.trim() === '' || Number.isNaN(n) ? undefined : n;
}

export function NutritionToday() {
  const { token, user, notify } = useApp();
  const { navigate } = useRouter();
  const today = dateInputValue();

  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<NutritionTargetInfo | null>(null);
  const [logs, setLogs] = useState<MealLogEntry[]>([]);
  const [habit, setHabit] = useState<HabitEntry | null>(null);
  const [score, setScore] = useState<NutritionDayScore | null>(null);
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [busyTarget, setBusyTarget] = useState(false);
  const [detailSlot, setDetailSlot] = useState<string | null>(null);
  const [draft, setDraft] = useState<DetailDraft>(emptyDraft);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetDraft, setTargetDraft] = useState({ protein: '', carbs: '', fat: '', water: '' });
  const [waterBusy, setWaterBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [targetRes, logsRes, habitRes] = await Promise.all([
        nutritionApi.target(token),
        nutritionApi.mealLogs(token, today),
        nutritionApi.habits(token, today),
      ]);
      setTarget(targetRes.target);
      setLogs(logsRes.logs);
      setHabit(habitRes.habit);
      if (targetRes.target?.status === 'accepted') {
        const scoreRes = await nutritionApi.score(token, today, today);
        setScore(scoreRes.days[0] ?? null);
      } else {
        setScore(null);
      }
    } catch {
      /* individual cards degrade below */
    } finally {
      setLoading(false);
    }
  }, [token, today]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="loading-row">
        <Loader2 className="spin" size={20} />
        <span>Loading today…</span>
      </div>
    );
  }

  const accepted = target?.status === 'accepted';
  const logBySlot = new Map(logs.map((l) => [l.mealSlot, l]));
  const nextSlot = target ? nextUnloggedSlot(target.mealSlots, logs.map((l) => l.mealSlot)) : null;
  const waterTarget = target?.waterTargetMl ?? user?.waterTargetMl ?? 2000;
  const waterMl = habit?.waterMl ?? 0;
  const wPct = waterPct(waterMl, waterTarget);
  const hints = missingProfileHints(user);

  async function generateTarget() {
    if (!token) return;
    setBusyTarget(true);
    try {
      const res = await nutritionApi.generateTarget(token);
      setTarget(res.target);
      notify('Nutrition target created — review and accept it', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not create target', 'error');
    } finally {
      setBusyTarget(false);
    }
  }

  async function acceptTarget() {
    if (!token) return;
    setBusyTarget(true);
    try {
      const res = await nutritionApi.acceptTarget(token);
      setTarget(res.target);
      notify('Target accepted — daily scoring is now on', 'success');
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not accept target', 'error');
    } finally {
      setBusyTarget(false);
    }
  }

  async function saveTargetEdit() {
    if (!token || !target) return;
    setBusyTarget(true);
    try {
      const res = await nutritionApi.patchTarget(token, {
        dailyProteinG: numOrUndefined(targetDraft.protein) ?? target.dailyProteinG,
        dailyCarbsG: numOrUndefined(targetDraft.carbs) ?? target.dailyCarbsG,
        dailyFatG: numOrUndefined(targetDraft.fat) ?? target.dailyFatG,
        waterTargetMl: numOrUndefined(targetDraft.water) ?? target.waterTargetMl,
      });
      setTarget(res.target);
      setEditingTarget(false);
      notify('Target updated', 'success');
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update target', 'error');
    } finally {
      setBusyTarget(false);
    }
  }

  async function logMeal(mealSlot: string, status: MealLogStatus, detail?: DetailDraft) {
    if (!token) return;
    setBusySlot(mealSlot);
    try {
      await nutritionApi.upsertMealLog(token, {
        date: today,
        mealSlot,
        status,
        proteinG: detail ? numOrUndefined(detail.proteinG) : undefined,
        carbsG: detail ? numOrUndefined(detail.carbsG) : undefined,
        fatG: detail ? numOrUndefined(detail.fatG) : undefined,
        grams: detail ? numOrUndefined(detail.grams) : undefined,
        note: detail?.note || undefined,
      });
      setDetailSlot(null);
      setDraft(emptyDraft);
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not log meal', 'error');
    } finally {
      setBusySlot(null);
    }
  }

  async function addWater(amount: number) {
    if (!token) return;
    setWaterBusy(true);
    try {
      const res = await nutritionApi.putHabits(token, {
        date: today,
        waterMl: Math.max(0, waterMl + amount),
      });
      setHabit(res.habit);
      if (accepted) {
        const scoreRes = await nutritionApi.score(token, today, today);
        setScore(scoreRes.days[0] ?? null);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update water', 'error');
    } finally {
      setWaterBusy(false);
    }
  }

  async function toggleSupplement(name: string) {
    if (!token) return;
    const taken = habit?.supplementsTaken ?? [];
    const next = taken.includes(name) ? taken.filter((s) => s !== name) : [...taken, name];
    try {
      const res = await nutritionApi.putHabits(token, { date: today, supplementsTaken: next });
      setHabit(res.habit);
      if (accepted) {
        const scoreRes = await nutritionApi.score(token, today, today);
        setScore(scoreRes.days[0] ?? null);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update supplements', 'error');
    }
  }

  return (
    <div className="nut-today">
      {/* ---------- Daily summary ---------- */}
      <section className="card nut-summary">
        <div className="nut-summary__score">
          <div className={`nut-score-ring nut-score-ring--${scoreTone(score?.score)}`}>
            <strong>{score?.score ?? '—'}</strong>
            <span>score</span>
          </div>
          <div className="nut-summary__text">
            <h3>{scoreLabel(score?.score)}</h3>
            <small>
              {accepted
                ? score
                  ? `${confidenceLabel(score.confidence)} · ${score.nextAction}`
                  : 'Log your first meal to start scoring'
                : 'Accept a nutrition target to unlock daily scoring'}
            </small>
          </div>
        </div>
        <div className="nut-summary__row">
          <span className="nut-summary__item">
            <Droplets size={14} /> {waterMl}/{waterTarget} ml
          </span>
          {nextSlot ? (
            <span className="nut-summary__item">
              <Target size={14} /> Next: {nextSlot.label}
            </span>
          ) : target ? (
            <span className="nut-summary__item nut-summary__item--good">
              <Check size={14} /> All meals logged
            </span>
          ) : null}
        </div>
        <div className="nut-water-bar" role="progressbar" aria-valuenow={wPct} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${wPct}%` }} />
        </div>
      </section>

      {/* ---------- Target card ---------- */}
      {!target ? (
        <section className="card nut-target nut-target--empty">
          <span className="card__head-icon" aria-hidden><Sparkles size={20} /></span>
          <h3>Create your nutrition target</h3>
          <p>
            ComeUp builds a practical daily eating structure from your goal, weight, training
            schedule, and preferences — protein, carbs, fat, and water, split across your meals.
          </p>
          <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => void generateTarget()} disabled={busyTarget}>
            {busyTarget ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />} Create nutrition target
          </button>
          {hints.length > 0 ? (
            <button type="button" className="btn btn--ghost btn--block" onClick={() => navigate('profile')}>
              Add {hints.map((h) => h.label).slice(0, 2).join(' and ')} first for accuracy
            </button>
          ) : null}
        </section>
      ) : (
        <section className="card nut-target">
          <div className="nut-target__head">
            <div>
              <p className="eyebrow">Daily target · {target.goalSnapshot.goal}</p>
              <h3>
                {target.status === 'accepted' ? 'Your nutrition target' : 'Proposed target'}
                <span className={`chip nut-conf nut-conf--${target.confidence}`}>{confidenceLabel(target.confidence)}</span>
              </h3>
            </div>
          </div>

          <div className="nut-target__macros">
            <div><span>Protein</span><strong>{target.dailyProteinG} g</strong></div>
            <div><span>Carbs</span><strong>{target.dailyCarbsG} g</strong></div>
            <div><span>Fat</span><strong>{target.dailyFatG} g</strong></div>
            <div><span>Water</span><strong>{target.waterTargetMl} ml</strong></div>
            {target.dailyCaloriesEstimate ? (
              <div><span>~Calories</span><strong>{target.dailyCaloriesEstimate}</strong></div>
            ) : null}
          </div>

          {editingTarget ? (
            <div className="nut-target__edit">
              <div className="field-row">
                <label className="field"><span>Protein (g)</span>
                  <input type="number" min={0} max={500} placeholder={String(target.dailyProteinG)} value={targetDraft.protein} onChange={(e) => setTargetDraft((d) => ({ ...d, protein: e.target.value }))} />
                </label>
                <label className="field"><span>Carbs (g)</span>
                  <input type="number" min={0} max={1000} placeholder={String(target.dailyCarbsG)} value={targetDraft.carbs} onChange={(e) => setTargetDraft((d) => ({ ...d, carbs: e.target.value }))} />
                </label>
              </div>
              <div className="field-row">
                <label className="field"><span>Fat (g)</span>
                  <input type="number" min={0} max={400} placeholder={String(target.dailyFatG)} value={targetDraft.fat} onChange={(e) => setTargetDraft((d) => ({ ...d, fat: e.target.value }))} />
                </label>
                <label className="field"><span>Water (ml)</span>
                  <input type="number" min={250} max={10000} step={250} placeholder={String(target.waterTargetMl)} value={targetDraft.water} onChange={(e) => setTargetDraft((d) => ({ ...d, water: e.target.value }))} />
                </label>
              </div>
              <div className="nut-target__actions">
                <button type="button" className="btn btn--primary" onClick={() => void saveTargetEdit()} disabled={busyTarget}>
                  {busyTarget ? <Loader2 className="spin" size={16} /> : <Check size={16} />} Save
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setEditingTarget(false)}>
                  <X size={16} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="nut-target__actions">
              {target.status === 'proposed' ? (
                <button type="button" className="btn btn--primary" onClick={() => void acceptTarget()} disabled={busyTarget}>
                  {busyTarget ? <Loader2 className="spin" size={16} /> : <Check size={16} />} Accept
                </button>
              ) : null}
              <button type="button" className="btn btn--ghost" onClick={() => { setTargetDraft({ protein: '', carbs: '', fat: '', water: '' }); setEditingTarget(true); }}>
                <Pencil size={16} /> Edit
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => void generateTarget()} disabled={busyTarget}>
                <RefreshCw size={16} /> Regenerate
              </button>
            </div>
          )}

          {target.missingInputs.length > 0 ? (
            <button type="button" className="nut-target__hint" onClick={() => navigate('profile')}>
              Add {target.missingInputs.join(', ')} in Profile to improve accuracy →
            </button>
          ) : null}
        </section>
      )}

      {/* ---------- Today's meals ---------- */}
      {target ? (
        <section className="card nut-meals">
          <p className="eyebrow">Today’s meals</p>
          {!accepted ? <p className="nut-meals__hint">Accept your target to activate scoring — logging works right away.</p> : null}
          <ul className="nut-meals__list">
            {target.mealSlots.map((slot) => {
              const log = logBySlot.get(slot.mealSlot);
              const isBusy = busySlot === slot.mealSlot;
              const isDetail = detailSlot === slot.mealSlot;
              return (
                <li key={slot.mealSlot} className={`nut-meal ${log ? `nut-meal--${MEAL_STATUS_META[log.status].tone}` : ''}`}>
                  <div className="nut-meal__head">
                    <div className="nut-meal__title">
                      <strong>{slot.label}</strong>
                      <small>{slotMacroSummary(slot)}{slot.guidanceNote ? ` · ${slot.guidanceNote}` : ''}</small>
                    </div>
                    {log ? (
                      <span className={`chip nut-status nut-status--${MEAL_STATUS_META[log.status].tone}`}>
                        {MEAL_STATUS_META[log.status].label}
                      </span>
                    ) : null}
                  </div>

                  <div className="nut-meal__actions">
                    {QUICK_STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={`nut-quick ${log?.status === status ? 'is-on' : ''}`}
                        disabled={isBusy}
                        onClick={() => void logMeal(slot.mealSlot, status)}
                      >
                        {status === 'done' ? <Check size={14} /> : status === 'heavier' ? <TrendingUp size={14} /> : status === 'lighter' ? <TrendingDown size={14} /> : status === 'off_plan' ? <X size={14} /> : <Minus size={14} />}
                        {MEAL_STATUS_META[status].label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="nut-quick nut-quick--detail"
                      onClick={() => {
                        if (isDetail) { setDetailSlot(null); return; }
                        setDetailSlot(slot.mealSlot);
                        setDraft({
                          proteinG: log?.proteinG?.toString() ?? '',
                          carbsG: log?.carbsG?.toString() ?? '',
                          fatG: log?.fatG?.toString() ?? '',
                          grams: log?.grams?.toString() ?? '',
                          note: log?.note ?? '',
                        });
                      }}
                      aria-expanded={isDetail}
                    >
                      {isDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Details
                    </button>
                  </div>

                  {isDetail ? (
                    <div className="nut-meal__detail">
                      <div className="field-row">
                        <label className="field"><span>Protein (g)</span><input type="number" min={0} max={500} value={draft.proteinG} onChange={(e) => setDraft((d) => ({ ...d, proteinG: e.target.value }))} /></label>
                        <label className="field"><span>Carbs (g)</span><input type="number" min={0} max={1000} value={draft.carbsG} onChange={(e) => setDraft((d) => ({ ...d, carbsG: e.target.value }))} /></label>
                      </div>
                      <div className="field-row">
                        <label className="field"><span>Fat (g)</span><input type="number" min={0} max={400} value={draft.fatG} onChange={(e) => setDraft((d) => ({ ...d, fatG: e.target.value }))} /></label>
                        <label className="field"><span>Total (g)</span><input type="number" min={0} max={10000} value={draft.grams} onChange={(e) => setDraft((d) => ({ ...d, grams: e.target.value }))} /></label>
                      </div>
                      <label className="field"><span>Note</span><input maxLength={500} value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} placeholder="e.g. chicken, rice, salad" /></label>
                      <button type="button" className="btn btn--primary btn--block" disabled={isBusy} onClick={() => void logMeal(slot.mealSlot, log?.status ?? 'done', draft)}>
                        {isBusy ? <Loader2 className="spin" size={16} /> : <Check size={16} />} Save details
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* ---------- Water & supplements ---------- */}
      <section className="card nut-habits">
        <p className="eyebrow">Water & supplements</p>
        <div className="nut-habits__water">
          <div className="nut-habits__water-info">
            <Droplets size={18} />
            <div>
              <strong>{waterMl} ml</strong>
              <small>of {waterTarget} ml target ({wPct}%)</small>
            </div>
          </div>
          <div className="nut-habits__water-actions">
            <button type="button" className="btn btn--ghost" disabled={waterBusy} onClick={() => void addWater(250)}>+250</button>
            <button type="button" className="btn btn--ghost" disabled={waterBusy} onClick={() => void addWater(500)}>+500</button>
            <button type="button" className="btn btn--ghost" disabled={waterBusy || waterMl === 0} onClick={() => void addWater(-250)} aria-label="Remove 250 ml">
              <Minus size={14} />
            </button>
          </div>
        </div>

        {(target?.supplementPlan.length ?? 0) > 0 ? (
          <div className="nut-habits__supps">
            {target!.supplementPlan.map((s) => {
              const taken = (habit?.supplementsTaken ?? []).includes(s.name);
              return (
                <button key={s.name} type="button" className={`nut-supp ${taken ? 'is-on' : ''}`} onClick={() => void toggleSupplement(s.name)}>
                  <Pill size={14} /> {s.name} {taken ? <Check size={14} /> : null}
                </button>
              );
            })}
          </div>
        ) : (user?.supplements?.length ?? 0) === 0 ? (
          <p className="nut-habits__hint">Add supplements in Profile to get a daily checklist here.</p>
        ) : null}
      </section>

      {/* ---------- Score explanation ---------- */}
      {score && score.score !== null ? (
        <section className="card nut-explain">
          <p className="eyebrow">Why this score</p>
          <p className="nut-explain__text">{score.explanation}</p>
          {score.positiveLabels.length > 0 ? (
            <ul className="nut-explain__list nut-explain__list--pos">
              {score.positiveLabels.map((l) => <li key={l}><Check size={13} /> {l}</li>)}
            </ul>
          ) : null}
          {score.negativeLabels.length > 0 ? (
            <ul className="nut-explain__list nut-explain__list--neg">
              {score.negativeLabels.map((l) => <li key={l}><X size={13} /> {l}</li>)}
            </ul>
          ) : null}
          <p className="nut-explain__next"><Target size={14} /> {score.nextAction}</p>
        </section>
      ) : null}

      {/* ---------- Timing notes ---------- */}
      {target && target.timingNotes.length > 0 ? (
        <section className="card nut-notes">
          <p className="eyebrow">Timing tips</p>
          <ul>
            {target.timingNotes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
