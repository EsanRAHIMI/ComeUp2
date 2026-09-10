import { Target } from 'lucide-react';
import { useT } from '../i18n/LocaleProvider';
import type { Program } from '../types';
import { formatSessionDate } from '../lib/format';

export function ProgramDetail({ program, nowMs }: { program: Program; nowMs: number }) {
  const fa = useT();
  const upcoming = (program.schedule ?? [])
    .filter((item) => new Date(item.startsAt).getTime() >= nowMs)
    .slice(0, 4);

  const hasProtocol =
    program.nutrition || program.supplements?.length || program.executionRules?.length || program.longTermGoal;

  return (
    <section className="card detail">
      <div className="card__head">
        <div>
          <p className="eyebrow">{fa.programDetail.planDetails}</p>
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
                {fa.programDetail.setsRepsRest(
                  exercise.sets,
                  String(exercise.repRange || exercise.reps),
                  exercise.trackingType === 'time' ? fa.common.sec : fa.common.reps,
                  exercise.restTime,
                )}
              </small>
            </div>
            <em>{exercise.muscleGroups.slice(0, 2).join(', ')}</em>
          </div>
        ))}
      </div>

      {upcoming.length ? (
        <div className="detail__section">
          <h3>{fa.programDetail.upcoming}</h3>
          <div className="schedule-list">
            {upcoming.map((session) => (
              <div key={`${session.week}-${session.day}-${session.startsAt}`} className="schedule-row">
                <span className="schedule-row__tag">{fa.programDetail.weekDay(session.week, session.day)}</span>
                <div className="schedule-row__body">
                  <strong>{session.title}</strong>
                  <small>{formatSessionDate(session.startsAt)}</small>
                </div>
                <em>{fa.programDetail.durationMin(session.duration)}</em>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {hasProtocol ? (
        <div className="detail__section">
          <h3>{fa.programDetail.coachProtocol}</h3>
          <div className="protocol-grid">
            <div>
              <span>{fa.programDetail.nutrition}</span>
              <strong>{program.nutrition?.calories || fa.programDetail.notSet}</strong>
              <small>{program.nutrition?.protein || program.nutrition?.mealRule || fa.programDetail.addNutrition}</small>
            </div>
            <div>
              <span>{fa.programDetail.supplements}</span>
              <strong>{program.supplements?.slice(0, 2).join(' · ') || fa.programDetail.notSet}</strong>
              <small>{program.supplements?.slice(2).join(' · ') || fa.programDetail.dailyProtocol}</small>
            </div>
            <div>
              <span>{fa.programDetail.execution}</span>
              <strong>{program.executionRules?.[0] || fa.programDetail.controlledSets}</strong>
              <small>{program.executionRules?.slice(1, 3).join(' · ')}</small>
            </div>
            <div>
              <span>{fa.programDetail.goal}</span>
              <strong>{program.longTermGoal || fa.programDetail.progressiveOverload}</strong>
              <small>{fa.programDetail.trackedFromCoach}</small>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
