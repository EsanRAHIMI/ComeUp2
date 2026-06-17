import { AlertTriangle, Bot, CalendarDays, CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { ApiError, programsApi } from '../api';
import { useApp } from '../hooks/useApp';
import { dateInputValue } from '../lib/format';
import type { ImportReviewItem } from '../types';

export function CoachPlanImporter() {
  const { token, notify, refreshPrograms } = useApp();
  const [text, setText] = useState('');
  const [startDate, setStartDate] = useState(() => dateInputValue());
  const [workoutTime, setWorkoutTime] = useState('18:30');
  const [weeks, setWeeks] = useState(12);
  const [sessionDuration, setSessionDuration] = useState(75);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<ImportReviewItem[] | null>(null);

  const payload = () => ({ text, startDate, workoutTime, weeks, sessionDuration });

  async function preview() {
    if (!token) return;
    setBusy(true);
    try {
      const result = await programsApi.importCoachPlanPreview(token, payload());
      setReview(result.review);
      if (!result.flaggedCount) notify('No issues detected — ready to import', 'success');
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'Could not parse plan', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    if (!token) return;
    setBusy(true);
    try {
      await programsApi.importCoachPlan(token, payload());
      await refreshPrograms();
      notify('Coach plan imported', 'success');
      setText('');
      setReview(null);
      setOpen(false);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Import failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  const flagged = review?.filter((r) => r.needsReview) ?? [];

  return (
    <section className="card coach-importer">
      <button type="button" className="coach-importer__toggle" onClick={() => setOpen((v) => !v)}>
        <span className="card__head-icon"><Bot size={20} /></span>
        <div>
          <p className="eyebrow">Coach plan import</p>
          <strong>Paste a coach program → dated plan</strong>
        </div>
        <span className="coach-importer__chevron">{open ? '−' : '+'}</span>
      </button>

      {open ? (
        <div className="coach-importer__body">
          {!review ? (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste DAY 1, DAY 2, nutrition, supplements, rest rules, and 3-month goal here…"
                rows={6}
              />
              <div className="coach-importer__controls">
                <label className="field"><span>Start date</span><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
                <label className="field"><span>Gym time</span><input type="time" value={workoutTime} onChange={(e) => setWorkoutTime(e.target.value)} /></label>
                <label className="field"><span>Weeks</span><input type="number" min={1} max={24} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} /></label>
                <label className="field"><span>Session min</span><input type="number" min={30} max={180} step={5} value={sessionDuration} onChange={(e) => setSessionDuration(Number(e.target.value))} /></label>
              </div>
              <button type="button" className="btn btn--primary btn--block" onClick={() => void preview()} disabled={busy || text.trim().length < 40}>
                {busy ? <Loader2 className="spin" size={18} /> : <CalendarDays size={18} />}
                Review plan
              </button>
            </>
          ) : (
            <div className="import-review">
              <div className="import-review__head">
                <strong>{review.length} exercises detected</strong>
                {flagged.length ? (
                  <span className="import-review__warn"><AlertTriangle size={15} /> {flagged.length} need a look</span>
                ) : (
                  <span className="import-review__ok"><CheckCircle2 size={15} /> All clear</span>
                )}
              </div>
              <div className="import-review__list">
                {review.map((item, i) => (
                  <div key={i} className={`import-review__row ${item.needsReview ? 'is-flagged' : ''}`}>
                    <div className="import-review__main">
                      <strong>{item.name || <em>(unnamed)</em>}</strong>
                      <small>D{item.day} · {item.sets} × {item.repRange || item.reps} · {item.restTime}s · {item.muscleGroups.join(', ')}</small>
                    </div>
                    {item.needsReview ? <small className="import-review__reason">{item.reason}</small> : null}
                  </div>
                ))}
              </div>
              <div className="import-review__actions">
                <button type="button" className="btn btn--ghost" onClick={() => setReview(null)} disabled={busy}>Back &amp; edit</button>
                <button type="button" className="btn btn--primary" onClick={() => void confirmImport()} disabled={busy}>
                  {busy ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
                  Import {flagged.length ? 'anyway' : 'plan'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
