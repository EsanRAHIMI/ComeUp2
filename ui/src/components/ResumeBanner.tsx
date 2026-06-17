import { AlertTriangle, PlayCircle, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useActiveSession } from '../hooks/useActiveSession';
import { useApp } from '../hooks/useApp';
import { useRouter } from '../hooks/useRouter';
import { syncActiveSession } from '../lib/sessionSync';

export function ResumeBanner() {
  const { session, isRunning, isUnsaved, discard } = useActiveSession();
  const { view, navigate } = useRouter();
  const { token, notify } = useApp();
  const [saving, setSaving] = useState(false);

  // The runner view handles its own resume/save UI.
  if (!session || view === 'workout') return null;

  function confirmDiscard() {
    if (window.confirm('Discard this workout? Completed sets will be lost.')) discard();
  }

  async function saveAgain() {
    setSaving(true);
    const result = await syncActiveSession(token);
    setSaving(false);
    notify(
      result === 'saved' ? 'Workout saved' : 'Still could not save — will retry when online',
      result === 'saved' ? 'success' : 'error',
    );
  }

  if (isUnsaved) {
    return (
      <div className="resume-banner resume-banner--warn" role="status">
        <span className="resume-banner__icon"><AlertTriangle size={18} /></span>
        <div className="resume-banner__text">
          <strong>Workout not saved</strong>
          <small>Your last session is stored on this device.</small>
        </div>
        <div className="resume-banner__actions">
          <button type="button" className="btn btn--ghost" onClick={confirmDiscard}>Discard</button>
          <button type="button" className="btn btn--primary" onClick={() => void saveAgain()} disabled={saving}>
            <RotateCcw size={16} /> Save again
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
          <strong>Workout in progress</strong>
          <small>You have an unfinished session.</small>
        </div>
        <div className="resume-banner__actions">
          <button type="button" className="btn btn--ghost" onClick={confirmDiscard}>Discard</button>
          <button type="button" className="btn btn--primary" onClick={() => navigate('workout')}>Resume</button>
        </div>
      </div>
    );
  }

  return null;
}
