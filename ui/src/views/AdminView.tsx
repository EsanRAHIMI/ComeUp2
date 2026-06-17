import { Loader2, RefreshCw, Shield, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { adminApi, ApiError } from '../api';
import { AdminMediaPanel } from '../components/AdminMediaPanel';
import { useApp } from '../hooks/useApp';
import { useRouter } from '../hooks/useRouter';
import type { Program, User } from '../types';

type Tab = 'overview' | 'users' | 'programs' | 'media' | 'activity';

export function AdminView() {
  const { token, user, notify } = useApp();
  const { navigate } = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [busy, setBusy] = useState(false);
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof adminApi.overview>> | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [media, setMedia] = useState<Awaited<ReturnType<typeof adminApi.exerciseMedia>> | null>(null);
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof adminApi.sessions>>['sessions']>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user?.isAdmin) navigate('dashboard');
  }, [user, navigate]);

  const load = useCallback(async () => {
    if (!token || !user?.isAdmin) return;
    setBusy(true);
    try {
      if (tab === 'overview') setOverview(await adminApi.overview(token));
      if (tab === 'users') setUsers((await adminApi.users(token, search || undefined)).users);
      if (tab === 'programs') setPrograms((await adminApi.programs(token)).programs);
      if (tab === 'media') setMedia(await adminApi.exerciseMedia(token));
      if (tab === 'activity') setSessions((await adminApi.sessions(token, { limit: 80 })).sessions);
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'Admin load failed', 'error');
    } finally {
      setBusy(false);
    }
  }, [token, user, tab, search, notify]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user?.isAdmin) return null;

  async function removeUser(id: string) {
    if (!token || !window.confirm('Delete this user and all their programs/sessions?')) return;
    await adminApi.deleteUser(token, id);
    notify('User deleted', 'success');
    void load();
  }

  async function removeProgram(id: string) {
    if (!token || !window.confirm('Delete this program?')) return;
    await adminApi.deleteProgram(token, id);
    notify('Program deleted', 'success');
    void load();
  }

  const refreshMedia = useCallback(async () => {
    if (!token) return;
    setMedia(await adminApi.exerciseMedia(token));
  }, [token]);

  return (
    <div className="view-stack admin-view">
      <div className="admin-view__head">
        <div className="admin-view__title">
          <Shield size={20} />
          <div>
            <h2>Admin</h2>
            <small>Manage users, programs, media, and activity</small>
          </div>
        </div>
        <button type="button" className="btn btn--ghost" onClick={() => void load()} disabled={busy}>
          {busy ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
          Refresh
        </button>
      </div>

      <div className="admin-tabs">
        {(['overview', 'users', 'programs', 'media', 'activity'] as Tab[]).map((key) => (
          <button key={key} type="button" className={`admin-tabs__btn ${tab === key ? 'is-active' : ''}`} onClick={() => setTab(key)}>
            {key}
          </button>
        ))}
      </div>

      {tab === 'overview' && overview ? (
        <div className="admin-stats">
          {[
            ['Users', overview.users],
            ['Programs', overview.programs],
            ['Shared images', overview.communityMedia],
            ['Personal overrides', overview.personalMedia],
            ['Sessions', overview.sessions],
            ['Completed', overview.completedSessions],
            ['This week', overview.sessionsThisWeek],
          ].map(([label, value]) => (
            <div key={label} className="admin-stat card">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'users' ? (
        <div className="admin-panel card">
          <div className="admin-panel__toolbar">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…" />
            <button type="button" className="btn btn--ghost" onClick={() => void load()}>Search</button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Goal</th><th>Level</th><th /></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}{u.isAdmin ? ' · admin' : ''}</td>
                    <td>{u.email}</td>
                    <td>{u.goal}</td>
                    <td>{u.fitnessLevel}</td>
                    <td>
                      <button type="button" className="icon-btn" onClick={() => void removeUser(u.id)} aria-label="Delete user">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === 'programs' ? (
        <div className="admin-panel card">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Program</th><th>Owner</th><th>Days</th><th>Active</th><th /></tr>
              </thead>
              <tbody>
                {programs.map((p) => (
                  <tr key={p._id ?? p.id}>
                    <td>{p.name}</td>
                    <td>{(p as Program & { owner?: { email?: string } }).owner?.email ?? '—'}</td>
                    <td>{p.daysPerWeek}×/wk</td>
                    <td>{p.isActive ? 'Yes' : 'No'}</td>
                    <td>
                      <button type="button" className="icon-btn" onClick={() => void removeProgram(String(p._id ?? p.id))} aria-label="Delete program">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === 'media' && media && token ? (
        <AdminMediaPanel token={token} data={media} busy={busy} onRefresh={refreshMedia} notify={notify} />
      ) : null}

      {tab === 'activity' ? (
        <div className="admin-panel card">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>User</th><th>Program</th><th>Status</th><th>When</th><th>Min</th></tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.user?.email ?? '—'}</td>
                    <td>{s.program?.name ?? '—'}</td>
                    <td>{s.status}</td>
                    <td>{new Date(s.startTime).toLocaleString()}</td>
                    <td>{Math.round(s.totalDuration / 60)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
