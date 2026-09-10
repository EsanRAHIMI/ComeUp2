import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardList, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { ApiError, programsApi } from '../api';
import { useApp } from '../hooks/useApp';
import { dateInputValue } from '../lib/format';
import { useT } from '../i18n/LocaleProvider';
import type { ImportReviewItem } from '../types';

type Props = {
  /** When true, renders inline inside ProgramCreateHub (no accordion toggle). */
  embedded?: boolean;
  open?: boolean;
  onClose?: () => void;
};

export function CoachPlanImporter({ embedded = false, open: openProp = false, onClose }: Props) {
  const fa = useT();
  const { token, notify, refreshPrograms } = useApp();
  const [text, setText] = useState('');
  const [startDate, setStartDate] = useState(() => dateInputValue());
  const [workoutTime, setWorkoutTime] = useState('18:30');
  const [weeks, setWeeks] = useState(12);
  const [sessionDuration, setSessionDuration] = useState(75);
  const [internalOpen, setInternalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<ImportReviewItem[] | null>(null);

  const open = embedded ? openProp : internalOpen;

  const payload = () => ({ text, startDate, workoutTime, weeks, sessionDuration });

  async function preview() {
    if (!token) return;
    setBusy(true);
    try {
      const result = await programsApi.importCoachPlanPreview(token, payload());
      setReview(result.review);
      if (!result.flaggedCount) notify(fa.coachImportExtra.ready, 'success');
    } catch (error) {
      notify(error instanceof ApiError ? error.message : fa.coachImport.couldNotParse, 'error');
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
      notify(fa.coachImportExtra.imported, 'success');
      setText('');
      setReview(null);
      if (embedded) onClose?.();
      else setInternalOpen(false);
    } catch (error) {
      notify(error instanceof Error ? error.message : fa.coachImport.importFailed, 'error');
    } finally {
      setBusy(false);
    }
  }

  const flagged = review?.filter((r) => r.needsReview) ?? [];

  const body = (
    <div className="coach-importer__body">
      {!review ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={fa.coachImport.pastePh}
            rows={6}
          />
          <div className="coach-importer__controls">
            <label className="field"><span>{fa.coachImportExtra.startDate}</span><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
            <label className="field"><span>{fa.coachImportExtra.gymTime}</span><input type="time" value={workoutTime} onChange={(e) => setWorkoutTime(e.target.value)} /></label>
            <label className="field"><span>{fa.coachImportExtra.weeks}</span><input type="number" min={1} max={24} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} /></label>
            <label className="field"><span>{fa.coachImportExtra.sessionMin}</span><input type="number" min={30} max={180} step={5} value={sessionDuration} onChange={(e) => setSessionDuration(Number(e.target.value))} /></label>
          </div>
          <button type="button" className="btn btn--primary btn--block" onClick={() => void preview()} disabled={busy || text.trim().length < 40}>
            {busy ? <Loader2 className="spin" size={18} /> : <CalendarDays size={18} />}
            {fa.coachImport.reviewPlan}
          </button>
        </>
      ) : (
        <div className="import-review">
          <div className="import-review__head">
            <strong>{fa.coachImport.exercisesDetected(review.length)}</strong>
            {flagged.length ? (
              <span className="import-review__warn"><AlertTriangle size={15} /> {fa.coachImport.needLook(flagged.length)}</span>
            ) : (
              <span className="import-review__ok"><CheckCircle2 size={15} /> {fa.coachImportExtra.allOk}</span>
            )}
          </div>
          <div className="import-review__list">
            {review.map((item, i) => (
              <div key={i} className={`import-review__row ${item.needsReview ? 'is-flagged' : ''}`}>
                <div className="import-review__main">
                  <strong>{item.name || <em>{fa.coachImport.unnamed}</em>}</strong>
                  <small>D{item.day} · {item.sets} × {item.repRange || item.reps} · {item.restTime}s · {item.muscleGroups.join(', ')}</small>
                </div>
                {item.needsReview ? <small className="import-review__reason">{item.reason}</small> : null}
              </div>
            ))}
          </div>
          <div className="import-review__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setReview(null)} disabled={busy}>{fa.coachImportExtra.backEdit}</button>
            <button type="button" className="btn btn--primary" onClick={() => void confirmImport()} disabled={busy}>
              {busy ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
              {flagged.length ? fa.coachImport.importAnyway : fa.coachImport.importPlan}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    if (!open) return null;
    return (
      <div className="coach-importer coach-importer--embedded">
        <div className="program-create-hub__panel-head program-create-hub__panel-label">
          <div>
            <span className="program-create-hub__panel-step">{fa.coachImportExtra.step2}</span>
            <strong>{fa.coachImportExtra.enterText}</strong>
            <small>{fa.coachImportExtra.enterHint}</small>
          </div>
          {onClose ? (
            <button type="button" className="icon-btn" onClick={onClose} aria-label={fa.close}>
              <X size={18} />
            </button>
          ) : null}
        </div>
        {body}
      </div>
    );
  }

  return (
    <section className="card coach-importer">
      <button type="button" className="coach-importer__toggle" onClick={() => setInternalOpen((v) => !v)}>
        <span className="card__head-icon"><ClipboardList size={20} /></span>
        <div>
          <p className="eyebrow">{fa.coachImportExtra.eyebrow}</p>
          <strong>{fa.coachImportExtra.strong}</strong>
        </div>
        <span className="coach-importer__chevron">{open ? '−' : '+'}</span>
      </button>

      {open ? body : null}
    </section>
  );
}
