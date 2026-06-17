import type { ReactNode } from 'react';

export function AiProgramResult({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`ai-result ${className}`.trim()}>
      {children}
    </div>
  );
}
