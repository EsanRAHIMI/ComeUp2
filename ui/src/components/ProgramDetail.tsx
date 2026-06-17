import { Target } from 'lucide-react';
import type { Program } from '../types';
import { formatSessionDate } from '../lib/format';

export function ProgramDetail({ program, nowMs }: { program: Program; nowMs: number }) {
  const upcoming = (program.schedule ?? [])
    .filter((item) => new Date(item.startsAt).getTime() >= nowMs)
    .slice(0, 4);

  const hasProtocol =
    program.nutrition || program.supplements?.length || program.executionRules?.length || program.longTermGoal;

  return (
    <section className="card detail">
      <div className="card__head">
        <div>
          <p className="eyebrow">Plan details</p>
          <h2>{program.name}</h2>
        </div>
        <Target size={20} />
      </div>

      <div className="exercise-list">
        {program.exercises.map((exercise, index) => (
          <div className="exercise-row" key={`${exercise.name}-${index}`}>
            <span className="exercise-row__num">{index + 1}</span>
            <div className="exercise-row__body">
              <strong>{exercise.name}</strong>
              <small>
                {exercise.sets} × {exercise.repRange || exercise.reps}{' '}
                {exercise.trackingType === 'time' ? 'sec' : 'reps'} · {exercise.restTime}s rest
              </small>
            </div>
            <em>{exercise.muscleGroups.slice(0, 2).join(', ')}</em>
          </div>
        ))}
      </div>

      {upcoming.length ? (
        <div className="detail__section">
          <h3>Upcoming sessions</h3>
          <div className="schedule-list">
            {upcoming.map((session) => (
              <div key={`${session.week}-${session.day}-${session.startsAt}`} className="schedule-row">
                <span className="schedule-row__tag">W{session.week} D{session.day}</span>
                <div className="schedule-row__body">
                  <strong>{session.title}</strong>
                  <small>{formatSessionDate(session.startsAt)}</small>
                </div>
                <em>{session.duration} min</em>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {hasProtocol ? (
        <div className="detail__section">
          <h3>Coach protocol</h3>
          <div className="protocol-grid">
            <div>
              <span>Nutrition</span>
              <strong>{program.nutrition?.calories || 'Not set'}</strong>
              <small>{program.nutrition?.protein || program.nutrition?.mealRule || 'Add nutrition notes'}</small>
            </div>
            <div>
              <span>Supplements</span>
              <strong>{program.supplements?.slice(0, 2).join(' · ') || 'Not set'}</strong>
              <small>{program.supplements?.slice(2).join(' · ') || 'Daily protocol'}</small>
            </div>
            <div>
              <span>Execution</span>
              <strong>{program.executionRules?.[0] || 'Controlled sets'}</strong>
              <small>{program.executionRules?.slice(1, 3).join(' · ')}</small>
            </div>
            <div>
              <span>Goal</span>
              <strong>{program.longTermGoal || 'Progressive overload'}</strong>
              <small>Tracked from coach import</small>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
