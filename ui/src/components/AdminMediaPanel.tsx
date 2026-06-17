import { ImageOff, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { adminApi, ApiError } from '../api';
import { fallbackExerciseImage } from '../lib/exerciseImages';
import type { Exercise } from '../types';

export type AdminMediaData = Awaited<ReturnType<typeof adminApi.exerciseMedia>>;

type CatalogExercise = AdminMediaData['withImage'][number];
type MediaSection = 'gallery' | 'missing' | 'personal';

type EditState = {
  mode: 'create' | 'edit';
  exerciseName: string;
  imageUrl: string;
  mediaId?: string;
};

const GROUP_LABELS: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  glutes: 'Glutes',
  hamstrings: 'Hamstrings',
  legs: 'Legs',
  calves: 'Calves',
  core: 'Core',
  cardio: 'Cardio',
  'full body': 'Full body',
};

function labelGroup(group: string) {
  return GROUP_LABELS[group] ?? group;
}

function stubExercise(name: string, muscleGroups: string[]): Exercise {
  return {
    name,
    sets: 3,
    reps: 10,
    restTime: 60,
    instructions: '',
    muscleGroups,
    difficulty: 'Intermediate',
    equipment: [],
    category: 'Strength',
    trackingType: 'reps',
  };
}

type Props = {
  token: string;
  data: AdminMediaData;
  busy: boolean;
  onRefresh: () => Promise<void>;
  notify: (message: string, tone?: 'info' | 'success' | 'error') => void;
};

export function AdminMediaPanel({ token, data, busy, onRefresh, notify }: Props) {
  const [section, setSection] = useState<MediaSection>('gallery');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredWithImage = useMemo(() => filterItems(data.withImage, search, groupFilter), [data.withImage, search, groupFilter]);
  const filteredWithoutImage = useMemo(
    () => filterItems(data.withoutImage, search, groupFilter),
    [data.withoutImage, search, groupFilter],
  );

  const groupedWithImage = useMemo(() => groupItems(filteredWithImage), [filteredWithImage]);
  const groupedWithoutImage = useMemo(() => groupItems(filteredWithoutImage), [filteredWithoutImage]);

  async function saveMedia() {
    if (!edit?.exerciseName.trim() || !edit.imageUrl.trim()) return;
    setSaving(true);
    try {
      if (edit.mode === 'edit' && edit.mediaId) {
        await adminApi.updateCommunityMedia(token, edit.mediaId, {
          exerciseName: edit.exerciseName.trim(),
          imageUrl: edit.imageUrl.trim(),
        });
        notify('Image updated', 'success');
      } else {
        await adminApi.upsertCommunityMedia(token, {
          exerciseName: edit.exerciseName.trim(),
          imageUrl: edit.imageUrl.trim(),
        });
        notify('Image saved', 'success');
      }
      setEdit(null);
      await onRefresh();
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'Could not save image', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function removeCommunity(id: string) {
    if (!window.confirm('Remove this shared image?')) return;
    try {
      await adminApi.deleteCommunityMedia(token, id);
      notify('Image removed', 'success');
      await onRefresh();
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'Delete failed', 'error');
    }
  }

  async function removePersonal(id: string) {
    if (!window.confirm('Remove this personal override?')) return;
    try {
      await adminApi.deletePersonalMedia(token, id);
      notify('Override removed', 'success');
      await onRefresh();
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'Delete failed', 'error');
    }
  }

  return (
    <div className="admin-media">
      <div className="admin-media__stats">
        {[
          ['All exercises', data.stats.totalExercises],
          ['With image', data.stats.withImage],
          ['Missing image', data.stats.withoutImage],
          ['Personal overrides', data.stats.personalOverrides],
        ].map(([label, value]) => (
          <div key={label} className="admin-media__stat card">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="admin-media__toolbar card">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises…"
          className="admin-media__search"
        />
        <div className="admin-media__filters">
          <button
            type="button"
            className={`chip-toggle__item ${groupFilter === 'all' ? 'is-on' : ''}`}
            onClick={() => setGroupFilter('all')}
          >
            All groups
          </button>
          {data.groups.map((group) => (
            <button
              key={group}
              type="button"
              className={`chip-toggle__item ${groupFilter === group ? 'is-on' : ''}`}
              onClick={() => setGroupFilter(group)}
            >
              {labelGroup(group)}
            </button>
          ))}
        </div>
        <div className="admin-media__sections">
          {([
            ['gallery', `Gallery (${filteredWithImage.length})`],
            ['missing', `Missing (${filteredWithoutImage.length})`],
            ['personal', `Overrides (${data.personal.length})`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`admin-tabs__btn ${section === key ? 'is-active' : ''}`}
              onClick={() => setSection(key)}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setEdit({ mode: 'create', exerciseName: '', imageUrl: '' })}
          >
            <Plus size={16} /> Add image
          </button>
        </div>
      </div>

      {busy ? (
        <div className="admin-media__loading">
          <Loader2 className="spin" size={22} /> Loading media…
        </div>
      ) : null}

      {section === 'gallery' ? (
        <div className="admin-media__content">
          {groupedWithImage.length ? (
            groupedWithImage.map(([group, items]) => (
              <section key={group} className="admin-media__group card">
                <header className="admin-media__group-head">
                  <h3>{labelGroup(group)}</h3>
                  <span>{items.length} with image</span>
                </header>
                <div className="admin-media-mosaic">
                  {items.map((item) => (
                    <MediaCard
                      key={item.exerciseKey}
                      item={item}
                      onEdit={() =>
                        setEdit({
                          mode: 'edit',
                          exerciseName: item.exerciseName,
                          imageUrl: item.imageUrl ?? '',
                          mediaId: item.mediaId,
                        })
                      }
                      onDelete={() => item.mediaId && void removeCommunity(item.mediaId)}
                    />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <EmptyMedia message="No exercises with images match your filters." />
          )}
        </div>
      ) : null}

      {section === 'missing' ? (
        <div className="admin-media__content">
          {groupedWithoutImage.length ? (
            groupedWithoutImage.map(([group, items]) => (
              <section key={group} className="admin-media__group card">
                <header className="admin-media__group-head">
                  <h3>{labelGroup(group)}</h3>
                  <span>{items.length} missing</span>
                </header>
                <div className="admin-media-missing-grid">
                  {items.map((item) => (
                    <article key={item.exerciseKey} className="admin-media-missing">
                      <div className="admin-media-missing__icon">
                        <ImageOff size={22} />
                      </div>
                      <div className="admin-media-missing__body">
                        <strong>{item.exerciseName}</strong>
                        <small>
                          {labelGroup(item.primaryGroup)}
                          {item.programCount ? ` · ${item.programCount} program(s)` : ''}
                          {item.needsReview ? ' · needs review' : ''}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() =>
                          setEdit({ mode: 'create', exerciseName: item.exerciseName, imageUrl: '' })
                        }
                      >
                        <Plus size={14} /> Add
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <EmptyMedia message="All catalog exercises have images — great coverage." />
          )}
        </div>
      ) : null}

      {section === 'personal' ? (
        <div className="admin-media__content">
          {data.personal.length ? (
            <section className="admin-media__group card">
              <header className="admin-media__group-head">
                <h3>Personal overrides</h3>
                <span>{data.personal.length} custom images</span>
              </header>
              <div className="admin-media-mosaic admin-media-mosaic--compact">
                {data.personal.map((item) => (
                  <article key={item.id} className="admin-media-card">
                    <div className="admin-media-card__img">
                      <img src={item.imageUrl} alt={item.exerciseName} loading="lazy" />
                      <div className="admin-media-card__overlay">
                        <button type="button" className="icon-btn" onClick={() => void removePersonal(item.id)} aria-label="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="admin-media-card__meta">
                      <strong>{item.exerciseName}</strong>
                      <small>
                        {(item.owner as { email?: string } | undefined)?.email ?? 'User override'}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <EmptyMedia message="No personal image overrides yet." />
          )}
        </div>
      ) : null}

      {edit ? (
        <div className="modal-overlay" role="dialog" aria-label="Edit exercise image">
          <div className="modal-card admin-media-editor">
            <div className="modal-card__head">
              <h2>{edit.mode === 'edit' ? 'Edit shared image' : 'Add shared image'}</h2>
              <button type="button" className="icon-btn" onClick={() => setEdit(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <label className="field">
              <span>Exercise name</span>
              <input
                value={edit.exerciseName}
                onChange={(e) => setEdit((s) => (s ? { ...s, exerciseName: e.target.value } : s))}
                disabled={edit.mode === 'edit'}
              />
            </label>
            <label className="field">
              <span>Image URL</span>
              <input
                value={edit.imageUrl}
                onChange={(e) => setEdit((s) => (s ? { ...s, imageUrl: e.target.value } : s))}
                placeholder="https://…"
              />
            </label>
            {edit.imageUrl ? (
              <div className="admin-media-editor__preview">
                <img
                  src={edit.imageUrl}
                  alt="Preview"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = fallbackExerciseImage(
                      stubExercise(edit.exerciseName || 'Exercise', ['full body']),
                    );
                  }}
                />
              </div>
            ) : null}
            <button type="button" className="btn btn--primary btn--block" onClick={() => void saveMedia()} disabled={saving}>
              {saving ? <Loader2 className="spin" size={18} /> : null}
              Save shared image
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MediaCard({
  item,
  onEdit,
  onDelete,
}: {
  item: CatalogExercise;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const image = item.imageUrl ?? fallbackExerciseImage(stubExercise(item.exerciseName, item.muscleGroups));
  return (
    <article className="admin-media-card">
      <div className="admin-media-card__img">
        <img
          src={image}
          alt={item.exerciseName}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackExerciseImage(
              stubExercise(item.exerciseName, item.muscleGroups),
            );
          }}
        />
        <div className="admin-media-card__overlay">
          <button type="button" className="icon-btn" onClick={onEdit} aria-label="Edit">
            <Pencil size={16} />
          </button>
          <button type="button" className="icon-btn" onClick={onDelete} aria-label="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="admin-media-card__meta">
        <strong>{item.exerciseName}</strong>
        <small>
          {labelGroup(item.primaryGroup)}
          {item.programCount ? ` · ${item.programCount} program(s)` : ''}
        </small>
      </div>
    </article>
  );
}

function EmptyMedia({ message }: { message: string }) {
  return (
    <div className="admin-media__empty card">
      <ImageOff size={28} />
      <p>{message}</p>
    </div>
  );
}

function filterItems(items: CatalogExercise[], search: string, groupFilter: string) {
  const q = search.trim().toLowerCase();
  return items.filter((item) => {
    if (groupFilter !== 'all' && item.primaryGroup !== groupFilter) return false;
    if (!q) return true;
    return (
      item.exerciseName.toLowerCase().includes(q) ||
      item.muscleGroups.some((g) => g.includes(q)) ||
      item.primaryGroup.includes(q)
    );
  });
}

function groupItems(items: CatalogExercise[]) {
  const map = new Map<string, CatalogExercise[]>();
  for (const item of items) {
    const list = map.get(item.primaryGroup) ?? [];
    list.push(item);
    map.set(item.primaryGroup, list);
  }
  return [...map.entries()];
}
