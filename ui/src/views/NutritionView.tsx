import { CalendarDays, Camera, ClipboardList, Loader2, RefreshCw, Scale, Sun } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { nutritionApi } from '../api';
import { EmptyState } from '../components/EmptyState';
import { MealPlanPanel } from '../components/nutrition/MealPlanPanel';
import { NutritionToday } from '../components/nutrition/NutritionToday';
import { PlatePhotoArchive } from '../components/nutrition/PlatePhotoArchive';
import { WeighInLogger } from '../components/nutrition/WeighInLogger';
import { useApp } from '../hooks/useApp';
import { dateInputValue } from '../lib/format';
import type { NutritionPlan } from '@comeup/domain';
import { useT } from '../i18n/LocaleProvider';

type Tab = 'today' | 'plan' | 'log' | 'photos';

export function NutritionView() {
  const t = useT();
  const TABS = [
    { id: 'today' as const, label: t.nutrition.today, icon: Sun },
    { id: 'plan' as const, label: t.nutrition.plan, icon: ClipboardList },
    { id: 'log' as const, label: t.nutrition.log, icon: Scale },
    { id: 'photos' as const, label: t.nutrition.photos, icon: Camera },
  ];
  const { token, notify } = useApp();
  const [date, setDate] = useState(() => dateInputValue());
  const [tab, setTab] = useState<Tab>('today');
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planLoaded, setPlanLoaded] = useState(false);

  // The legacy plan is only needed for the plan/log/photos tabs — load lazily
  // so the Today dashboard renders instantly.
  const loadPlan = useCallback(async () => {
    if (!token) return;
    setPlanLoading(true);
    setPlanError(null);
    try {
      const result = await nutritionApi.activePlan(token);
      setPlan(result.plan);
      setPlanLoaded(true);
    } catch (error) {
      setPlan(null);
      const message = error instanceof Error ? error.message : t.nutrition.couldNotLoadPlan;
      setPlanError(message);
      notify(message, 'error');
    } finally {
      setPlanLoading(false);
    }
  }, [token, notify, t.nutrition.couldNotLoadPlan]);

  useEffect(() => {
    if (tab !== 'today' && !planLoaded && !planLoading) void loadPlan();
  }, [tab, planLoaded, planLoading, loadPlan]);

  const legacyNeedsPlan = tab === 'plan';

  return (
    <div className="view-stack nutrition-view">
      <section className="card">
        <div className="card__head">
          <div>
            <p className="eyebrow">{t.nutrition.eyebrow}</p>
            <h3>{t.nutrition.companion}</h3>
          </div>
          <span className="card__head-icon" aria-hidden>
            <CalendarDays size={20} />
          </span>
        </div>

        {(tab === 'log' || tab === 'photos') && (
          <label className="field nutrition-view__date">
            <span>{t.nutrition.date}</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        )}

        <div className="chip-toggle nutrition-view__tabs" role="tablist" aria-label={t.nutrition.sections}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`chip-toggle__item ${tab === id ? 'is-on' : ''}`}
              onClick={() => setTab(id)}
            >
              <span className="nutrition-view__tab-label">
                <Icon size={15} aria-hidden />
                {label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {tab === 'today' ? <NutritionToday /> : null}

      {tab !== 'today' && planLoading ? (
        <div className="loading-row">
          <Loader2 className="spin" size={22} />
          <span>{t.nutrition.loadingPlan}</span>
        </div>
      ) : null}

      {legacyNeedsPlan && !planLoading && (planError || !plan) ? (
        <section className="card nutrition-error-card">
          <EmptyState
            title={t.nutrition.planFailedTitle}
            description={planError ?? t.nutrition.planFailedBody}
          />
          <button type="button" className="btn btn--ghost btn--block" onClick={() => void loadPlan()}>
            <RefreshCw size={16} />
            {t.nutrition.retry}
          </button>
        </section>
      ) : null}

      {tab === 'plan' && plan && !planLoading ? <MealPlanPanel plan={plan} /> : null}
      {tab === 'log' && !planLoading ? <WeighInLogger date={date} /> : null}
      {tab === 'photos' && !planLoading ? <PlatePhotoArchive date={date} /> : null}
    </div>
  );
}
