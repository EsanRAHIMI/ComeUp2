import { Bot, LogOut, Pencil, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { API_BASE_URL, chatApi } from '../api';
import { MeasurementsPanel } from '../components/MeasurementsPanel';
import { ProfileEditor } from '../components/ProfileEditor';
import { useApp } from '../hooks/useApp';
import { useRouter } from '../hooks/useRouter';
import { useTheme } from '../hooks/useTheme';
import type { GptQuota } from '../types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ProfileView() {
  const { user, logout, token } = useApp();
  const { navigate } = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [editOpen, setEditOpen] = useState(false);
  const [quota, setQuota] = useState<GptQuota | null>(null);

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
        <p>{user.email}</p>
        <div className="profile-card__facts">
          <span>{user.goal}</span>
          <span>{user.fitnessLevel}</span>
          <span>{user.workoutDaysPerWeek} days/week</span>
          {user.sessionDuration ? <span>{user.sessionDuration} min sessions</span> : null}
        </div>
        <button type="button" className="btn btn--primary btn--block" onClick={() => setEditOpen(true)}>
          <Pencil size={16} /> Edit profile
        </button>
      </section>

      <section className="card profile-details">
        <p className="eyebrow">Your details</p>
        <div className="profile-details__grid">
          <div><span>Gender</span><strong>{user.gender ?? '—'}</strong></div>
          <div><span>Age</span><strong>{user.age ?? '—'}</strong></div>
          <div><span>Height</span><strong>{user.height ? `${user.height} cm` : '—'}</strong></div>
          <div><span>Weight</span><strong>{user.weight ? `${user.weight} kg` : '—'}</strong></div>
          <div><span>Target weight</span><strong>{user.targetWeight ? `${user.targetWeight} kg` : '—'}</strong></div>
          <div><span>Goal deadline</span><strong>{user.goalDeadline ?? '—'}</strong></div>
        </div>
        <div className="profile-details__row">
          <span>Equipment</span>
          <strong>{user.availableEquipment?.length ? user.availableEquipment.join(', ') : 'Not set'}</strong>
        </div>
        <div className="profile-details__row">
          <span>Preferred days</span>
          <strong>{user.preferredDays?.length ? user.preferredDays.map((d) => WEEKDAYS[d]).join(', ') : 'Not set'}</strong>
        </div>
        <div className="profile-details__row">
          <span>Muscle focus</span>
          <strong>{user.muscleFocus?.length ? user.muscleFocus.join(', ') : 'Not set'}</strong>
        </div>
        <div className="profile-details__row">
          <span>Injuries</span>
          <strong>{user.injuries?.length ? user.injuries.join(', ') : 'None'}</strong>
        </div>
        <div className="profile-details__row">
          <span>Limitations</span>
          <strong>{user.physicalLimitations?.length ? user.physicalLimitations.join(', ') : 'None'}</strong>
        </div>
        <div className="profile-details__row">
          <span>Nutrition</span>
          <strong>{user.nutritionPreference ? user.nutritionPreference.replace(/_/g, ' ') : 'No preference'}</strong>
        </div>
        <div className="profile-details__row">
          <span>Supplements</span>
          <strong>{user.supplements?.length ? user.supplements.join(', ') : 'None'}</strong>
        </div>
        <div className="profile-details__row">
          <span>Water target</span>
          <strong>{user.waterTargetMl ? `${user.waterTargetMl} ml/day` : 'Not set'}</strong>
        </div>
        <div className="profile-details__row">
          <span>Walking target</span>
          <strong>
            {user.walkingTarget
              ? `${user.walkingTarget.value} ${
                  user.walkingTarget.metric === 'distanceKm' ? 'km' : user.walkingTarget.metric
                }/day`
              : 'Not set'}
          </strong>
        </div>
      </section>

      <section className="card gpt-cta">
        <div className="gpt-cta__icon"><Bot size={22} /></div>
        <div className="gpt-cta__text">
          <strong>AI weekly allowance</strong>
          <small>{quota ? `${quota.remaining} of ${quota.limit} messages left this week` : 'Loading…'}</small>
        </div>
      </section>

      <MeasurementsPanel />

      {user.isAdmin ? (
        <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('admin')}>
          <Shield size={18} /> Admin panel
        </button>
      ) : null}

      <section className="card settings-card">
        <p className="eyebrow">Settings</p>
        <div className="settings-row">
          <div>
            <strong>Rest timer</strong>
            <small>
              {user.preferences?.autoRestTimer === false
                ? 'Off'
                : `${user.preferences?.defaultRestSeconds ?? 60}s default between sets`}
            </small>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <strong>Rest countdown sound</strong>
            <small>{user.preferences?.restCountdownSound === false ? 'Off' : 'Three soft beeps before the next set'}</small>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <strong>Missed workouts</strong>
            <small>
              {user.missedWorkoutBehavior === 'skip'
                ? 'Skip to the next scheduled day'
                : 'Shift forward — program continues in order'}
            </small>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <strong>Dark mode</strong>
            <small>Best for dim gym lighting</small>
          </div>
          <button type="button" className={`switch ${theme === 'dark' ? 'is-on' : ''}`} onClick={toggleTheme} role="switch" aria-checked={theme === 'dark'} aria-label="Dark mode">
            <span />
          </button>
        </div>
        <div className="system-list">
          <span>API base</span>
          <strong>{API_BASE_URL}</strong>
        </div>
      </section>

      <button type="button" className="btn btn--ghost btn--block" onClick={logout}>
        <LogOut size={18} /> Sign out
      </button>

      <ProfileEditor open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
