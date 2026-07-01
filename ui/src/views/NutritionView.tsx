import { CalendarDays, Camera, ClipboardList, Loader2, RefreshCw, Scale } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { nutritionApi } from '../api';
import { EmptyState } from '../components/EmptyState';
import { MealPlanPanel } from '../components/nutrition/MealPlanPanel';
import { PlatePhotoArchive } from '../components/nutrition/PlatePhotoArchive';
import { WeighInLogger } from '../components/nutrition/WeighInLogger';
import { useApp } from '../hooks/useApp';
import { dateInputValue } from '../lib/format';
import type { NutritionPlan } from '@comeup/domain';

type Tab = 'plan' | 'log' | 'photos';

const TABS: Array<{ id: Tab; label: string; icon: typeof Scale }> = [
  { id: 'plan', label: 'برنامه', icon: ClipboardList },
  { id: 'log', label: 'ثبت وعده', icon: Scale },
  { id: 'photos', label: 'عکس بشقاب', icon: Camera },
];

export function NutritionView() {
  const { token, notify } = useApp();
  const [date, setDate] = useState(() => dateInputValue());
  const [tab, setTab] = useState<Tab>('log');
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPlan = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const result = await nutritionApi.activePlan(token);
      setPlan(result.plan);
    } catch (error) {
      setPlan(null);
      const message = error instanceof Error ? error.message : 'بارگذاری برنامه غذایی انجام نشد';
      setLoadError(message);
      notify(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, notify]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  if (loading) {
    return (
      <div className="view-stack">
        <div className="loading-row">
          <Loader2 className="spin" size={22} />
          <span>در حال بارگذاری برنامه غذایی…</span>
        </div>
      </div>
    );
  }

  if (loadError || !plan) {
    return (
      <div className="view-stack">
        <section className="card nutrition-error-card">
          <EmptyState
            title="برنامه غذایی بارگذاری نشد"
            description={
              loadError ??
              'برنامه پیش‌فرض هنوز آماده نیست. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.'
            }
          />
          <button type="button" className="btn btn--ghost btn--block" onClick={() => void loadPlan()}>
            <RefreshCw size={16} />
            تلاش مجدد
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="view-stack nutrition-view" dir="rtl">
      <section className="card">
        <div className="card__head">
          <div>
            <p className="eyebrow">پیگیری تغذیه</p>
            <h3>برنامه و ثبت وعده</h3>
          </div>
          <span className="card__head-icon" aria-hidden>
            <CalendarDays size={20} />
          </span>
        </div>

        {(tab === 'log' || tab === 'photos') && (
          <label className="field nutrition-view__date">
            <span>تاریخ</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        )}

        <div className="chip-toggle nutrition-view__tabs" role="tablist" aria-label="بخش‌های تغذیه">
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

      {tab === 'plan' ? <MealPlanPanel plan={plan} /> : null}
      {tab === 'log' ? <WeighInLogger date={date} /> : null}
      {tab === 'photos' ? <PlatePhotoArchive date={date} /> : null}
    </div>
  );
}
