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
import { fa } from '../i18n/fa';

type Tab = 'today' | 'plan' | 'log' | 'photos';

const TABS: Array<{ id: Tab; label: string; icon: typeof Scale }> = [
  { id: 'today', label: fa.nutrition.today, icon: Sun },
  { id: 'plan', label: fa.nutrition.plan, icon: ClipboardList },
  { id: 'log', label: fa.nutrition.log, icon: Scale },
  { id: 'photos', label: fa.nutrition.photos, icon: Camera },
];

export function NutritionView() {
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
      const message = error instanceof Error ? error.message : 'بارگذاری برنامه غذایی انجام نشد';
      setPlanError(message);
      notify(message, 'error');
    } finally {
      setPlanLoading(false);
    }
  }, [token, notify]);

  useEffect(() => {
    if (tab !== 'today' && !planLoaded && !planLoading) void loadPlan();
  }, [tab, planLoaded, planLoading, loadPlan]);

  const legacyNeedsPlan = tab === 'plan';

  return (
    <div className="view-stack nutrition-view">
      <section className="card">
        <div className="card__head">
          <div>
            <p className="eyebrow">{fa.nutrition.eyebrow}</p>
            <h3>{fa.nutrition.companion}</h3>
          </div>
          <span className="card__head-icon" aria-hidden>
            <CalendarDays size={20} />
          </span>
        </div>

        {(tab === 'log' || tab === 'photos') && (
          <label className="field nutrition-view__date" dir="rtl">
            <span>تاریخ</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        )}

        <div className="chip-toggle nutrition-view__tabs" role="tablist" aria-label={fa.nutrition.sections}>
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
          <span>در حال بارگذاری برنامه غذایی…</span>
        </div>
      ) : null}

      {legacyNeedsPlan && !planLoading && (planError || !plan) ? (
        <section className="card nutrition-error-card" dir="rtl">
          <EmptyState
            title="برنامه غذایی بارگذاری نشد"
            description={planError ?? 'برنامه پیش‌فرض هنوز آماده نیست. لطفاً دوباره تلاش کنید.'}
          />
          <button type="button" className="btn btn--ghost btn--block" onClick={() => void loadPlan()}>
            <RefreshCw size={16} />
            تلاش مجدد
          </button>
        </section>
      ) : null}

      {tab === 'plan' && plan && !planLoading ? (
        <div dir="rtl">
          <MealPlanPanel plan={plan} />
        </div>
      ) : null}
      {tab === 'log' && !planLoading ? (
        <div dir="rtl">
          <WeighInLogger date={date} />
        </div>
      ) : null}
      {tab === 'photos' && !planLoading ? (
        <div dir="rtl">
          <PlatePhotoArchive date={date} />
        </div>
      ) : null}
    </div>
  );
}
