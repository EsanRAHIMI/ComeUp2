import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useApp } from '../hooks/useApp';

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info } as const;

export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  const Icon = ICONS[toast.tone];
  return (
    <div className={`toast toast--${toast.tone}`} role="status" aria-live="polite">
      <Icon size={18} />
      <span>{toast.message}</span>
    </div>
  );
}
