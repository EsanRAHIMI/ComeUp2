import { CalendarClock, Dumbbell, LayoutDashboard, Play, UserRound } from 'lucide-react';
import { useDailyReport } from '../hooks/useDailyReport';
import { useActiveSession } from '../hooks/useActiveSession';
import { useRouter } from '../hooks/useRouter';
import type { ViewKey } from '../types';

const TABS: { key: ViewKey; label: string; icon: typeof Dumbbell }[] = [
  { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { key: 'programs', label: 'Programs', icon: Dumbbell },
  { key: 'workout', label: 'Train', icon: Play },
  { key: 'history', label: 'History', icon: CalendarClock },
  { key: 'profile', label: 'Profile', icon: UserRound },
];

export function BottomNav() {
  const { view, navigate } = useRouter();
  const { isRunning } = useActiveSession();
  const { workoutPendingToday } = useDailyReport();
  const trainCallToAction = workoutPendingToday && !(view === 'workout' && isRunning);

  return (
    <>
      <div className="bottom-nav-scrim" aria-hidden="true" />
      <div className="bottom-nav-shell" aria-hidden={false}>
        <nav className="bottom-nav" aria-label="Primary">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = view === key;
            const isTrain = key === 'workout';
            return (
              <button
                key={key}
                type="button"
                className={`bottom-nav__tab ${active ? 'is-active' : ''} ${isTrain ? 'is-train' : ''} ${isTrain && trainCallToAction ? 'is-train-cta' : ''}`}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
                onClick={() => navigate(key)}
              >
                <span className="bottom-nav__selection">
                  <span className={`bottom-nav__icon-wrap ${isTrain ? 'bottom-nav__icon-wrap--train' : ''}`}>
                    <Icon
                      size={22}
                      strokeWidth={active ? 2.35 : 1.85}
                      fill={active && isTrain ? 'currentColor' : 'none'}
                      aria-hidden
                    />
                  </span>
                  <span className="bottom-nav__label">{label}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
