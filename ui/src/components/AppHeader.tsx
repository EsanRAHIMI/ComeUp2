import { Loader2, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { useTheme } from '../hooks/useTheme';
import { useRouter } from '../hooks/useRouter';
import { formatHeaderDate, formatHeaderTime, formatHeaderWeekday } from '../lib/format';
import type { ViewKey } from '../types';

const TITLES: Record<ViewKey, string> = {
  dashboard: 'ComeUp',
  programs: 'Programs',
  workout: 'Train',
  history: 'History',
  profile: 'Profile',
  admin: 'Admin',
};

export function AppHeader() {
  const { busy } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { view } = useRouter();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (view !== 'dashboard') return;
    const tick = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(tick);
  }, [view]);

  const isHome = view === 'dashboard';

  return (
    <header className="app-header">
      {isHome ? (
        <div className="app-header__datetime">
          <time className="app-header__clock" dateTime={now.toISOString()}>
            {formatHeaderTime(now)}
          </time>
          <div className="app-header__date">
            <span className="app-header__weekday">{formatHeaderWeekday(now)}</span>
            <span className="app-header__day">{formatHeaderDate(now)}</span>
          </div>
        </div>
      ) : (
        <div className="app-header__brand">
          <h1>{TITLES[view]}</h1>
        </div>
      )}
      <div className="app-header__actions">
        {busy ? <Loader2 className="spin" size={18} aria-label="Working" /> : null}
        <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
