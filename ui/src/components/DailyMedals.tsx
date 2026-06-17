import { Dumbbell, Flame, Target } from 'lucide-react';
import type { DailyMedal } from '../types';

const ICONS = {
  workout: Dumbbell,
  volume: Target,
  streak: Flame,
} as const;

type Props = {
  medals: DailyMedal[];
  completedToday: boolean;
};

export function DailyMedals({ medals, completedToday }: Props) {
  const earnedCount = medals.filter((m) => m.earned).length;

  return (
    <section className="daily-medals" aria-label="Today's achievements">
      <div className="daily-medals__head">
        <div>
          <p className="eyebrow">Today's achievements</p>
          <strong>{earnedCount}/3 medals earned</strong>
        </div>
        {completedToday ? <span className="daily-medals__done">Great work today</span> : null}
      </div>
      <div className="daily-medals__row">
        {medals.map((medal) => {
          const Icon = ICONS[medal.id];
          return (
            <article key={medal.id} className={`daily-medal daily-medal--${medal.id} ${medal.earned ? 'is-earned' : ''}`}>
              <div className="daily-medal__ring" aria-hidden>
                <div className="daily-medal__icon">
                  <Icon size={22} strokeWidth={medal.earned ? 2.4 : 1.8} />
                </div>
              </div>
              <strong>{medal.label}</strong>
              <small>{medal.subtitle}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}
