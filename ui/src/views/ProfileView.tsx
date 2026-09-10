import { Bot, LogOut, Pencil, Shield, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { API_BASE_URL, ApiError, authApi, chatApi } from '../api';
import { MeasurementsPanel } from '../components/MeasurementsPanel';
import { ProfileEditor } from '../components/ProfileEditor';
import { useApp } from '../hooks/useApp';
import { useRouter } from '../hooks/useRouter';
import { useTheme } from '../hooks/useTheme';
import { fa, goalLabel, levelLabel } from '../i18n/fa';
import type { GptQuota } from '../types';

export function ProfileView() {
  const { user, logout, token } = useApp();
  const { navigate } = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [editOpen, setEditOpen] = useState(false);
  const [quota, setQuota] = useState<GptQuota | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    chatApi.quota(token).then((r) => !cancelled && setQuota(r.quota)).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!user) return null;

  return (
    <div className="view-stack">
      <section className="card profile-card">
        <div className="profile-card__avatar">{user.name.slice(0, 1).toUpperCase()}</div>
        <h2>{user.name}</h2>
        <p className="ltr-field">{user.email}</p>
        <div className="profile-card__facts">
          <span>{goalLabel(user.goal)}</span>
          <span>{levelLabel(user.fitnessLevel)}</span>
          <span>{fa.profile.daysPerWeek(user.workoutDaysPerWeek)}</span>
          {user.sessionDuration ? <span>{fa.profile.minSessions(user.sessionDuration)}</span> : null}
        </div>
        <button type="button" className="btn btn--primary btn--block" onClick={() => setEditOpen(true)}>
          <Pencil size={16} /> {fa.profile.editProfile}
        </button>
      </section>

      <section className="card profile-details">
        <p className="eyebrow">{fa.profile.yourDetails}</p>
        <div className="profile-details__grid">
          <div><span>{fa.profile.gender}</span><strong>{user.gender ?? '—'}</strong></div>
          <div><span>{fa.profile.age}</span><strong>{user.age ?? '—'}</strong></div>
          <div><span>{fa.profile.height}</span><strong>{user.height ? fa.profile.cm(user.height) : '—'}</strong></div>
          <div><span>{fa.profile.weight}</span><strong>{user.weight ? fa.profile.kg(user.weight) : '—'}</strong></div>
          <div><span>{fa.profile.targetWeight}</span><strong>{user.targetWeight ? fa.profile.kg(user.targetWeight) : '—'}</strong></div>
          <div><span>{fa.profile.goalDeadline}</span><strong className="ltr-field">{user.goalDeadline ?? '—'}</strong></div>
        </div>
        <div className="profile-details__row">
          <span>{fa.profile.equipment}</span>
          <strong>{user.availableEquipment?.length ? user.availableEquipment.join('، ') : fa.notSet}</strong>
        </div>
        <div className="profile-details__row">
          <span>{fa.profile.preferredDays}</span>
          <strong>
            {user.preferredDays?.length
              ? user.preferredDays.map((d) => fa.weekdaysShort[d] ?? String(d)).join('، ')
              : fa.notSet}
          </strong>
        </div>
        <div className="profile-details__row">
          <span>{fa.profile.muscleFocus}</span>
          <strong>{user.muscleFocus?.length ? user.muscleFocus.join('، ') : fa.notSet}</strong>
        </div>
        <div className="profile-details__row">
          <span>{fa.profile.injuries}</span>
          <strong>{user.injuries?.length ? user.injuries.join('، ') : fa.none}</strong>
        </div>
        <div className="profile-details__row">
          <span>{fa.profile.limitations}</span>
          <strong>{user.physicalLimitations?.length ? user.physicalLimitations.join('، ') : fa.none}</strong>
        </div>
        <div className="profile-details__row">
          <span>{fa.profile.nutrition}</span>
          <strong>{user.nutritionPreference ? user.nutritionPreference.replace(/_/g, ' ') : fa.profile.noPreference}</strong>
        </div>
        <div className="profile-details__row">
          <span>{fa.profile.supplements}</span>
          <strong>{user.supplements?.length ? user.supplements.join('، ') : fa.none}</strong>
        </div>
        <div className="profile-details__row">
          <span>{fa.profile.waterTarget}</span>
          <strong>{user.waterTargetMl ? fa.profile.mlDay(user.waterTargetMl) : fa.notSet}</strong>
        </div>
        <div className="profile-details__row">
          <span>{fa.profile.walkingTarget}</span>
          <strong>
            {user.walkingTarget
              ? `${user.walkingTarget.value} ${
                  user.walkingTarget.metric === 'distanceKm' ? 'کیلومتر' : user.walkingTarget.metric
                }/روز`
              : fa.notSet}
          </strong>
        </div>
      </section>

      <section className="card gpt-cta">
        <div className="gpt-cta__icon"><Bot size={22} /></div>
        <div className="gpt-cta__text">
          <strong>{fa.profile.aiAllowance}</strong>
          <small>
            {quota ? fa.profile.messagesLeft(quota.remaining, quota.limit) : fa.profile.loadingQuota}
          </small>
        </div>
      </section>

      <MeasurementsPanel />

      {user.isAdmin ? (
        <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('admin')}>
          <Shield size={18} /> {fa.profile.adminPanel}
        </button>
      ) : null}

      <section className="card settings-card">
        <p className="eyebrow">{fa.profile.settings}</p>
        <div className="settings-row">
          <div>
            <strong>{fa.profile.restTimer}</strong>
            <small>
              {user.preferences?.autoRestTimer === false
                ? fa.profile.restOff
                : fa.profile.restDefault(user.preferences?.defaultRestSeconds ?? 60)}
            </small>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <strong>{fa.profile.restSound}</strong>
            <small>{user.preferences?.restCountdownSound === false ? fa.profile.restOff : fa.profile.restSoundOn}</small>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <strong>{fa.profile.missedWorkouts}</strong>
            <small>
              {user.missedWorkoutBehavior === 'skip' ? fa.profile.missedSkip : fa.profile.missedShift}
            </small>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <strong>{fa.profile.darkMode}</strong>
            <small>{fa.profile.darkModeHint}</small>
          </div>
          <button
            type="button"
            className={`switch ${theme === 'dark' ? 'is-on' : ''}`}
            onClick={toggleTheme}
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label={fa.profile.darkMode}
          >
            <span />
          </button>
        </div>
        {import.meta.env.DEV ? (
          <div className="system-list">
            <span>{fa.profile.apiBase}</span>
            <strong>{API_BASE_URL}</strong>
          </div>
        ) : null}
      </section>

      <section className="card settings-card danger-zone">
        <p className="eyebrow">{fa.profile.dangerZone}</p>
        {!deleteOpen ? (
          <button
            type="button"
            className="btn btn--danger btn--block"
            onClick={() => {
              setDeleteOpen(true);
              setDeleteConfirm('');
              setDeletePassword('');
              setDeleteError(null);
            }}
          >
            <Trash2 size={18} /> {fa.profile.deleteAccount}
          </button>
        ) : (
          <div className="danger-zone__form">
            <p className="danger-zone__warn">
              {fa.profile.deleteWarn}
            </p>
            <label className="field">
              <span>{fa.profile.confirm}</span>
              <input
                className="ltr-field"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                dir="ltr"
              />
            </label>
            <label className="field">
              <span>{fa.auth.password}</span>
              <input
                type="password"
                dir="ltr"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            {deleteError ? <p className="form-error">{deleteError}</p> : null}
            <div className="danger-zone__actions">
              <button
                type="button"
                className="btn btn--ghost"
                disabled={deleteBusy}
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteError(null);
                }}
              >
                {fa.cancel}
              </button>
              <button
                type="button"
                className="btn btn--danger"
                disabled={deleteBusy || deleteConfirm !== 'DELETE' || !deletePassword}
                onClick={async () => {
                  if (!token) return;
                  setDeleteBusy(true);
                  setDeleteError(null);
                  try {
                    await authApi.deleteAccount(token, { confirm: 'DELETE', password: deletePassword });
                    logout();
                  } catch (error) {
                    setDeleteError(
                      error instanceof ApiError
                        ? error.message
                        : error instanceof Error
                          ? error.message
                          : fa.profile.couldNotDelete,
                    );
                  } finally {
                    setDeleteBusy(false);
                  }
                }}
              >
                {deleteBusy ? fa.profile.deleting : fa.profile.permanentlyDelete}
              </button>
            </div>
          </div>
        )}
      </section>

      <button type="button" className="btn btn--ghost btn--block" onClick={logout}>
        <LogOut size={18} /> {fa.profile.signOut}
      </button>

      <ProfileEditor open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
