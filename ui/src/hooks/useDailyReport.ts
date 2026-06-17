import { useEffect, useState } from 'react';
import { reportsApi } from '../api';
import { subscribeActiveSession } from '../lib/sessionStore';
import type { DailyReport } from '../types';
import { useApp } from './useApp';

/** Lightweight daily report for global UI (e.g. bottom nav Train CTA). */
export function useDailyReport() {
  const { token, activeProgram } = useApp();
  const [daily, setDaily] = useState<DailyReport | null>(null);

  useEffect(() => {
    if (!token) {
      setDaily(null);
      return;
    }
    const refresh = () => reportsApi.daily(token).then(setDaily).catch(() => undefined);
    refresh();
    const unsubSession = subscribeActiveSession(refresh);
    window.addEventListener('focus', refresh);
    return () => {
      unsubSession();
      window.removeEventListener('focus', refresh);
    };
  }, [token]);

  const workoutPendingToday = Boolean(activeProgram && daily && !daily.completedToday);

  return { daily, workoutPendingToday };
}
