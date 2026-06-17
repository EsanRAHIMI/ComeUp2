import { LogOut } from 'lucide-react';
import { API_BASE_URL } from '../api';
import { useApp } from '../hooks/useApp';
import { useTheme } from '../hooks/useTheme';

export function ProfileView() {
  const { user, logout } = useApp();
  const { theme, toggleTheme } = useTheme();
  if (!user) return null;

  return (
    <div className="view-stack">
      <section className="card profile-card">
        <div className="profile-card__avatar">{user.name.slice(0, 1).toUpperCase()}</div>
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        <div className="profile-card__facts">
          <span>{user.goal}</span>
          <span>{user.fitnessLevel}</span>
          <span>{user.workoutDaysPerWeek} days/week</span>
        </div>
      </section>

      <section className="card settings-card">
        <p className="eyebrow">Settings</p>
        <div className="settings-row">
          <div>
            <strong>Dark mode</strong>
            <small>Best for dim gym lighting</small>
          </div>
          <button
            type="button"
            className={`switch ${theme === 'dark' ? 'is-on' : ''}`}
            onClick={toggleTheme}
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="Dark mode"
          >
            <span />
          </button>
        </div>
      </section>

      <section className="card settings-card">
        <p className="eyebrow">System</p>
        <div className="system-list">
          <span>API base</span>
          <strong>{API_BASE_URL}</strong>
          <span>Runtime</span>
          <strong>Vite + React</strong>
        </div>
      </section>

      <button type="button" className="btn btn--ghost btn--block" onClick={logout}>
        <LogOut size={18} />
        Sign out
      </button>
    </div>
  );
}
