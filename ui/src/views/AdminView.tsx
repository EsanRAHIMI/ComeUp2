import { Loader2, RefreshCw, Shield, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { adminApi, ApiError } from '../api';
import { AdminMediaPanel } from '../components/AdminMediaPanel';
import { useApp } from '../hooks/useApp';
import { useRouter } from '../hooks/useRouter';
import { useT } from '../i18n/LocaleProvider';
import type { Program, User } from '../types';

type Tab = 'overview' | 'users' | 'programs' | 'media' | 'activity';

export function AdminView() {
  const fa = useT();
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
      notify(error instanceof ApiError ? error.message : fa.admin.loadFailed, 'error');
    } finally {
      setBusy(false);
    }
  }, [token, user, tab, search, notify]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user?.isAdmin) return null;

  async function removeUser(id: string) {
    if (!token || !window.confirm(fa.admin.deleteUserConfirm)) return;
    await adminApi.deleteUser(token, id);
    notify(fa.admin.userDeleted, 'success');
    void load();
  }

  async function removeProgram(id: string) {
    if (!token || !window.confirm(fa.admin.deleteProgramConfirm)) return;
    await adminApi.deleteProgram(token, id);
    notify(fa.admin.programDeleted, 'success');
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
            <h2>{fa.admin.title}</h2>
            <small>{fa.admin.subtitle}</small>
          </div>
        </div>
        <button type="button" className="btn btn--ghost" onClick={() => void load()} disabled={busy}>
          {busy ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
          {fa.admin.refresh}
        </button>
      </div>

      <div className="admin-tabs">
        {([
          ['overview', fa.admin.tabs.overview],
          ['users', fa.admin.tabs.users],
          ['programs', fa.admin.tabs.programs],
          ['media', fa.admin.tabs.media],
          ['activity', fa.admin.tabs.activity],
        ] as Array<[Tab, string]>).map(([key, label]) => (
          <button key={key} type="button" className={`admin-tabs__btn ${tab === key ? 'is-active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && overview ? (
        <div className="admin-stats">
          {[
            [fa.admin.stats.users, overview.users],
            [fa.admin.stats.programs, overview.programs],
            [fa.admin.stats.sharedImages, overview.communityMedia],
            [fa.admin.stats.personalOverrides, overview.personalMedia],
            [fa.admin.stats.sessions, overview.sessions],
            [fa.admin.stats.completed, overview.completedSessions],
            [fa.admin.stats.thisWeek, overview.sessionsThisWeek],
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={fa.admin.searchUsers} />
            <button type="button" className="btn btn--ghost" onClick={() => void load()}>{fa.admin.search}</button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>{fa.admin.name}</th><th>{fa.admin.email}</th><th>{fa.admin.goal}</th><th>{fa.admin.level}</th><th /></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}{u.isAdmin ? ` · ${fa.admin.adminBadge}` : ''}</td>
                    <td>{u.email}</td>
                    <td>{u.goal}</td>
                    <td>{u.fitnessLevel}</td>
                    <td>
                      <button type="button" className="icon-btn" onClick={() => void removeUser(u.id)} aria-label={fa.admin.deleteUser}>
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
                <tr><th>{fa.admin.program}</th><th>{fa.admin.owner}</th><th>{fa.admin.days}</th><th>{fa.admin.active}</th><th /></tr>
              </thead>
              <tbody>
                {programs.map((p) => (
                  <tr key={p._id ?? p.id}>
                    <td>{p.name}</td>
                    <td>{(p as Program & { owner?: { email?: string } }).owner?.email ?? '—'}</td>
                    <td>{p.daysPerWeek}×/هفته</td>
                    <td>{p.isActive ? fa.common.yes : fa.common.no}</td>
                    <td>
                      <button type="button" className="icon-btn" onClick={() => void removeProgram(String(p._id ?? p.id))} aria-label={fa.admin.deleteProgram}>
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
                <tr><th>{fa.admin.userCol}</th><th>{fa.admin.program}</th><th>{fa.admin.status}</th><th>{fa.admin.when}</th><th>{fa.admin.min}</th></tr>
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
