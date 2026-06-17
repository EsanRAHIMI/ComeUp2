import { Plus, Sparkles } from 'lucide-react';

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <Sparkles size={22} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {actionLabel && onAction ? (
        <button type="button" className="btn btn--primary" onClick={onAction}>
          <Plus size={18} />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
