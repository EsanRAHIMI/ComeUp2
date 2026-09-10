import { AlertTriangle, PlayCircle, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useActiveSession } from '../hooks/useActiveSession';
import { useApp } from '../hooks/useApp';
import { useRouter } from '../hooks/useRouter';
import { fa } from '../i18n/fa';
import { syncActiveSession } from '../lib/sessionSync';

export function ResumeBanner() {
  const { session, isRunning, isUnsaved, discard } = useActiveSession();
  const { view, navigate } = useRouter();
  const { token, notify } = useApp();
  const [saving, setSaving] = useState(false);

  // The runner view handles its own resume/save UI.
  if (!session || view === 'workout') return null;

  function confirmDiscard() {
    if (window.confirm(fa.resume.discardConfirm)) discard();
  }

  async function saveAgain() {
    setSaving(true);
    const result = await syncActiveSession(token);
    setSaving(false);
    notify(
      result === 'saved' ? fa.resume.saved : fa.resume.stillCouldNot,
      result === 'saved' ? 'success' : 'error',
    );
  }

  if (isUnsaved) {
    return (
      <div className="resume-banner resume-banner--warn" role="status">
        <span className="resume-banner__icon"><AlertTriangle size={18} /></span>
        <div className="resume-banner__text">
          <strong>{fa.resume.notSaved}</strong>
          <small>{fa.resume.storedLocal}</small>
        </div>
        <div className="resume-banner__actions">
          <button type="button" className="btn btn--ghost" onClick={confirmDiscard}>{fa.resume.discard}</button>
          <button type="button" className="btn btn--primary" onClick={() => void saveAgain()} disabled={saving}>
            <RotateCcw size={16} /> {fa.resume.saveAgain}
          </button>
        </div>
      </div>
    );
  }

  if (isRunning) {
    return (
      <div className="resume-banner" role="status">
        <span className="resume-banner__icon"><PlayCircle size={18} /></span>
        <div className="resume-banner__text">
          <strong>{fa.resume.inProgress}</strong>
          <small>{fa.resume.unfinished}</small>
        </div>
        <div className="resume-banner__actions">
          <button type="button" className="btn btn--ghost" onClick={confirmDiscard}>{fa.resume.discard}</button>
          <button type="button" className="btn btn--primary" onClick={() => navigate('workout')}>{fa.resume.resume}</button>
        </div>
      </div>
    );
  }

  return null;
}
