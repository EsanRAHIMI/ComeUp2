import { CalendarClock, Dumbbell, LayoutDashboard, Play, UserRound } from 'lucide-react';
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

  return (
    <div className="bottom-nav-shell" aria-hidden={false}>
      <nav className="bottom-nav" aria-label="Primary">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = view === key;
          const isTrain = key === 'workout';
          return (
            <button
              key={key}
              type="button"
              className={`bottom-nav__tab ${active ? 'is-active' : ''} ${isTrain ? 'is-train' : ''}`}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              onClick={() => navigate(key)}
            >
              <span className="bottom-nav__selection">
                <span className={`bottom-nav__icon-wrap ${isTrain ? 'bottom-nav__icon-wrap--train' : ''}`}>
                  <Icon
                    size={isTrain ? 24 : 23}
                    strokeWidth={active ? 2.45 : isTrain ? 2.25 : 1.75}
                    fill={isTrain ? 'currentColor' : 'none'}
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
  );
}
