import { Loader2, LogOut, Moon, Sun, Zap } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { useTheme } from '../hooks/useTheme';
import { useRouter } from '../hooks/useRouter';
import type { ViewKey } from '../types';

const TITLES: Record<ViewKey, string> = {
  dashboard: 'ComeUp',
  programs: 'Programs',
  workout: 'Train',
  history: 'History',
  profile: 'Profile',
};

export function AppHeader() {
  const { busy, logout, token } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { view } = useRouter();

  return (
    <header className="app-header">
      <div className="app-header__brand">
        {view === 'dashboard' ? (
          <span className="app-header__mark">
            <Zap size={18} />
          </span>
        ) : null}
        <h1>{TITLES[view]}</h1>
      </div>
      <div className="app-header__actions">
        {busy ? <Loader2 className="spin" size={18} aria-label="Working" /> : null}
        <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {token ? (
          <button type="button" className="icon-btn" onClick={logout} aria-label="Sign out">
            <LogOut size={18} />
          </button>
        ) : null}
      </div>
    </header>
  );
}
