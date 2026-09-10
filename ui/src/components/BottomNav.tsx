import { CalendarClock, Dumbbell, LayoutDashboard, Play, Salad } from 'lucide-react';
import { useDailyReport } from '../hooks/useDailyReport';
import { useActiveSession } from '../hooks/useActiveSession';
import { useRouter } from '../hooks/useRouter';
import { useT } from '../i18n/LocaleProvider';
import type { ViewKey } from '../types';

const TAB_DEFS: { key: ViewKey; navKey: 'home' | 'programs' | 'train' | 'history' | 'food'; icon: typeof Dumbbell }[] = [
  { key: 'dashboard', navKey: 'home', icon: LayoutDashboard },
  { key: 'programs', navKey: 'programs', icon: Dumbbell },
  { key: 'workout', navKey: 'train', icon: Play },
  { key: 'history', navKey: 'history', icon: CalendarClock },
  { key: 'nutrition', navKey: 'food', icon: Salad },
];

export function BottomNav() {
  const fa = useT();
  const { view, navigate } = useRouter();
  const { isRunning } = useActiveSession();
  const { workoutPendingToday } = useDailyReport();
  const trainCallToAction = workoutPendingToday && !(view === 'workout' && isRunning);

  return (
    <>
      <div className="bottom-nav-scrim" aria-hidden="true" />
      <div className="bottom-nav-shell" aria-hidden={false}>
        <nav className="bottom-nav" aria-label={fa.primaryNav}>
          {TAB_DEFS.map(({ key, navKey, icon: Icon }) => {
            const active = view === key;
            const isTrain = key === 'workout';
            const label = fa.nav[navKey];
            return (
              <button
                key={key}
                type="button"
                className={`bottom-nav__tab ${active ? 'is-active' : ''} ${isTrain ? 'is-train' : ''} ${isTrain && trainCallToAction ? 'is-train-cta' : ''}`}
                onClick={() => navigate(key)}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
              >
                <span className="bottom-nav__icon-wrap">
                  <Icon size={isTrain ? 22 : 20} strokeWidth={active || (isTrain && trainCallToAction) ? 2.4 : 2} />
                </span>
                <span className="bottom-nav__label">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
