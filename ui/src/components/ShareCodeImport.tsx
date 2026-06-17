import { Download, Loader2 } from 'lucide-react';
import { useState, type RefObject } from 'react';
import { ApiError, programsApi } from '../api';
import { useApp } from '../hooks/useApp';

type Props = {
  inputRef?: RefObject<HTMLInputElement | null>;
};

export function ShareCodeImport({ inputRef }: Props) {
  const { token, notify, refreshPrograms } = useApp();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!token || !code.trim()) return;
    setBusy(true);
    try {
      await programsApi.importByCode(token, code.trim().toUpperCase());
      await refreshPrograms();
      notify('Program imported', 'success');
      setCode('');
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'Invalid share code', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="share-import share-import--panel">
      <Download size={18} aria-hidden="true" />
      <input
        ref={inputRef}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="e.g. ABC12XYZ"
        onKeyDown={(e) => {
          if (e.key === 'Enter') void submit();
        }}
      />
      <button type="button" className="btn btn--primary" onClick={() => void submit()} disabled={busy || code.trim().length < 3}>
        {busy ? <Loader2 className="spin" size={16} /> : 'Import'}
      </button>
    </div>
  );
}
