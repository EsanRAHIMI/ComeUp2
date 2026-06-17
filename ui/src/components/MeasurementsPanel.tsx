import { Loader2, Plus, Ruler } from 'lucide-react';
import { useEffect, useState } from 'react';
import { measurementsApi } from '../api';
import { useApp } from '../hooks/useApp';
import { dateInputValue, formatDate } from '../lib/format';
import type { Measurement } from '../types';

const FIELDS: Array<{ key: keyof Measurement; label: string }> = [
  { key: 'weight', label: 'Weight (kg)' },
  { key: 'bodyFat', label: 'Body fat %' },
  { key: 'chest', label: 'Chest (cm)' },
  { key: 'waist', label: 'Waist (cm)' },
  { key: 'hips', label: 'Hips (cm)' },
  { key: 'arms', label: 'Arms (cm)' },
  { key: 'thighs', label: 'Thighs (cm)' },
];

function num(value: string) {
  const n = Number(value);
  return value.trim() === '' || Number.isNaN(n) ? undefined : n;
}

export function MeasurementsPanel() {
  const { token, notify } = useApp();
  const [items, setItems] = useState<Measurement[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(() => dateInputValue());
  const [values, setValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    measurementsApi.list(token).then((r) => !cancelled && setItems(r.measurements)).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function save() {
    if (!token) return;
    const body: Partial<Measurement> = { measuredAt: new Date(`${date}T12:00:00`).toISOString(), notes: note.trim() || undefined };
    for (const f of FIELDS) {
      const v = num(values[f.key] ?? '');
      if (v !== undefined) (body as Record<string, unknown>)[f.key] = v;
    }
    if (Object.keys(body).length <= 2) {
      notify('Enter at least one measurement', 'error');
      return;
    }
    setBusy(true);
    try {
      const { measurement } = await measurementsApi.create(token, body);
      setItems((list) => [measurement, ...list]);
      setValues({});
      setNote('');
      setOpen(false);
      notify('Measurement saved', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save', 'error');
    } finally {
      setBusy(false);
    }
  }

  const latest = items[0];

  return (
    <section className="card measurements">
      <div className="card__head">
        <div>
          <p className="eyebrow">Body metrics</p>
          <h3>Measurements</h3>
        </div>
        <button type="button" className="icon-btn" onClick={() => setOpen((v) => !v)} aria-label="Add measurement"><Plus size={18} /></button>
      </div>

      {latest ? (
        <div className="measurements__latest">
          <span><Ruler size={14} /> Latest · {formatDate(latest.measuredAt)}</span>
          <div className="measurements__chips">
            {FIELDS.map((f) => (latest[f.key] !== undefined ? <span key={f.key}>{f.label.split(' ')[0]}: {String(latest[f.key])}</span> : null))}
          </div>
        </div>
      ) : (
        <p className="measurements__empty">No measurements yet. Add your first to track progress.</p>
      )}

      {open ? (
        <div className="measurements__form">
          <label className="field"><span>Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <div className="measurements__grid">
            {FIELDS.map((f) => (
              <label key={f.key} className="field">
                <span>{f.label}</span>
                <input type="number" inputMode="decimal" value={values[f.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
              </label>
            ))}
          </div>
          <label className="field"><span>Note</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" /></label>
          <button type="button" className="btn btn--primary btn--block" onClick={() => void save()} disabled={busy}>
            {busy ? <Loader2 className="spin" size={18} /> : <Plus size={18} />} Save measurement
          </button>
        </div>
      ) : null}

      {items.length > 1 ? (
        <div className="measurements__history">
          {items.slice(0, 6).map((m) => (
            <div key={m._id} className="measurements__row">
              <strong>{formatDate(m.measuredAt)}</strong>
              <small>{m.weight ? `${m.weight} kg` : ''}{m.bodyFat ? ` · ${m.bodyFat}% bf` : ''}</small>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
