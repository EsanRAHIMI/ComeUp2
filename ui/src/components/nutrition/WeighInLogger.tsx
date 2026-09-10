import { Loader2, Plus, RefreshCw, Scale, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { nutritionApi } from '../../api';
import { EmptyState } from '../EmptyState';
import { useApp } from '../../hooks/useApp';
import type { MealSlotId, NutritionWeighLog } from '@comeup/domain';
import { useT } from '../../i18n/LocaleProvider';
import { NutritionMealSlotField } from './NutritionMealSlotField';

type Props = {
  date: string;
};

export function WeighInLogger({ date }: Props) {
  const t = useT();
  const { token, notify } = useApp();
  const [mealSlot, setMealSlot] = useState<MealSlotId>('lunch');
  const [foodName, setFoodName] = useState('');
  const [weight, setWeight] = useState('');
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [logs, setLogs] = useState<NutritionWeighLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const result = await nutritionApi.logs(token, date);
      setLogs(result.logs);
    } catch (error) {
      setLogs([]);
      setLoadError(error instanceof Error ? error.message : t.nutrition.couldNotLoadLogs);
    } finally {
      setLoading(false);
    }
  }, [token, date, t.nutrition.couldNotLoadLogs]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const mealCount = useMemo(() => new Set(logs.map((log) => log.mealSlot)).size, [logs]);
  const totalGrams = useMemo(
    () => Math.round(logs.reduce((sum, log) => sum + log.weightGrams, 0)),
    [logs],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !foodName || !weight) return;
    const weightGrams = parseFloat(weight);
    if (!Number.isFinite(weightGrams) || weightGrams <= 0) {
      notify(t.nutrition.weightMustBePositive, 'error');
      return;
    }
    setBusy(true);
    try {
      const result = await nutritionApi.createLog(token, {
        date,
        mealSlot,
        foodName,
        weightGrams,
      });
      setLogs((current) => [...current, result.log]);
      setFoodName('');
      setWeight('');
      notify(t.nutrition.mealLogged, 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : t.nutrition.couldNotLog, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function removeLog(id: string) {
    if (!token) return;
    setDeletingId(id);
    try {
      await nutritionApi.deleteLog(token, id);
      setLogs((current) => current.filter((log) => log.id !== id));
      notify(t.nutrition.logDeleted, 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : t.nutrition.couldNotDeleteLog, 'error');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="nutrition-panel">
      <section className="card">
        <div className="card__head">
          <div>
            <p className="eyebrow">{t.nutrition.scale}</p>
            <h3>{t.nutrition.log}</h3>
          </div>
          <span className="card__head-icon" aria-hidden>
            <Scale size={20} />
          </span>
        </div>

        <form className="nutrition-form" onSubmit={onSubmit}>
          <NutritionMealSlotField value={mealSlot} onChange={setMealSlot} />

          <label className="field">
            <span>{t.nutrition.foodName}</span>
            <input
              value={foodName}
              onChange={(event) => setFoodName(event.target.value)}
              placeholder={t.nutrition.foodNamePh}
              required
            />
          </label>

          <label className="field">
            <span>{t.nutrition.weightGrams}</span>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              step="any"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              placeholder="100"
              required
            />
          </label>

          <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy}>
            {busy ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
            {t.nutrition.logWeight}
          </button>
        </form>
      </section>

      {loading ? (
        <div className="loading-row">
          <Loader2 className="spin" size={20} />
          <span>{t.nutrition.loadingLogs}</span>
        </div>
      ) : loadError ? (
        <section className="card nutrition-error-card">
          <p>{loadError}</p>
          <button type="button" className="btn btn--ghost btn--block" onClick={() => void loadLogs()}>
            <RefreshCw size={16} />
            {t.nutrition.retry}
          </button>
        </section>
      ) : logs.length ? (
        <>
          <section className="history-summary">
            <div>
              <strong>{logs.length}</strong>
              <span>{t.nutrition.itemsLogged}</span>
            </div>
            <div>
              <strong>{mealCount}</strong>
              <span>{t.nutrition.mealsCount}</span>
            </div>
            <div>
              <strong>{totalGrams}</strong>
              <span>{t.nutrition.totalGramsLabel}</span>
            </div>
          </section>

          <div className="history-list">
            {logs.map((log) => (
              <article className="history-row" key={log.id}>
                <span className="history-row__icon" aria-hidden>
                  <Scale size={18} />
                </span>
                <div className="history-row__body">
                  <strong>{log.foodName}</strong>
                  <small>{t.nutrition.mealSlots[log.mealSlot]}</small>
                </div>
                <div className="history-row__stats">
                  <span>{Math.round(log.weightGrams)} g</span>
                  <button
                    type="button"
                    className="btn btn--icon btn--ghost nutrition-log-delete"
                    aria-label={t.nutrition.deleteFoodAria(log.foodName)}
                    disabled={deletingId === log.id}
                    onClick={() => void removeLog(log.id)}
                  >
                    {deletingId === log.id ? (
                      <Loader2 className="spin" size={16} />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <EmptyState title={t.nutrition.noLogsYet} description={t.nutrition.noLogsBody} />
      )}
    </div>
  );
}
