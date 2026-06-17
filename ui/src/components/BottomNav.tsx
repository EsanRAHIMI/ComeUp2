import { CalendarClock, Dumbbell, LayoutDashboard, PlayCircle, UserRound } from 'lucide-react';
import { useRouter } from '../hooks/useRouter';
import type { ViewKey } from '../types';

const TABS: { key: ViewKey; label: string; icon: typeof Dumbbell }[] = [
  { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { key: 'programs', label: 'Programs', icon: Dumbbell },
  { key: 'workout', label: 'Train', icon: PlayCircle },
  { key: 'history', label: 'History', icon: CalendarClock },
  { key: 'profile', label: 'Profile', icon: UserRound },
];

export function BottomNav() {
  const { view, navigate } = useRouter();
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {TABS.map(({ key, label, icon: Icon }) => {
        const isTrain = key === 'workout';
        return (
          <button
            key={key}
            type="button"
            className={`bottom-nav__tab ${view === key ? 'is-active' : ''} ${isTrain ? 'is-train' : ''}`}
            aria-current={view === key ? 'page' : undefined}
            onClick={() => navigate(key)}
          >
            <Icon size={isTrain ? 26 : 22} strokeWidth={view === key ? 2.4 : 2} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
