import { ChevronLeft, Loader2, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { useTheme } from '../hooks/useTheme';
import { useRouter } from '../hooks/useRouter';
import { useT } from '../i18n/LocaleProvider';
import { formatHeaderDate, formatHeaderTime, formatHeaderWeekday } from '../lib/format';
import type { ViewKey } from '../types';

const SUB_VIEWS = new Set<ViewKey>(['profile', 'admin']);

export function AppHeader() {
  const fa = useT();
  const TITLES: Record<ViewKey, string> = {
    dashboard: fa.titles.dashboard,
    programs: fa.titles.programs,
    workout: fa.titles.workout,
    history: fa.titles.history,
    nutrition: fa.titles.nutrition,
    profile: fa.titles.profile,
    admin: fa.titles.admin,
  };
  const { busy, user } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { view, navigate } = useRouter();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (view !== 'dashboard') return;
    const tick = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(tick);
  }, [view]);

  const isHome = view === 'dashboard';
  const isSubView = SUB_VIEWS.has(view);
  const initials = user?.name?.trim().charAt(0).toUpperCase() || '?';

  function goBack() {
    navigate(view === 'admin' ? 'profile' : 'dashboard');
  }

  return (
    <header className="app-header">
      {isSubView ? (
        <div className="app-header__brand app-header__brand--back">
          <button type="button" className="icon-btn app-header__back" onClick={goBack} aria-label={fa.back}>
            <ChevronLeft size={22} strokeWidth={2.2} />
          </button>
          <h1>{TITLES[view]}</h1>
        </div>
      ) : isHome ? (
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
        {busy ? <Loader2 className="spin" size={18} aria-label={fa.working} /> : null}
        <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={fa.toggleTheme}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          type="button"
          className={`app-header__user-btn ${view === 'profile' ? 'is-active' : ''}`}
          onClick={() => navigate('profile')}
          aria-label={fa.profileSettings}
          aria-current={view === 'profile' ? 'page' : undefined}
          title={user?.name ?? fa.titles.profile}
        >
          <span className="app-header__user-avatar" aria-hidden>
            {initials}
          </span>
        </button>
      </div>
    </header>
  );
}
