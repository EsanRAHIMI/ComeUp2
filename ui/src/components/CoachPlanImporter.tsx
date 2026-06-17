import { Bot, CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { dateInputValue } from '../lib/format';

export function CoachPlanImporter() {
  const { importCoachPlan, busy } = useApp();
  const [text, setText] = useState('');
  const [startDate, setStartDate] = useState(() => dateInputValue());
  const [workoutTime, setWorkoutTime] = useState('18:30');
  const [weeks, setWeeks] = useState(12);
  const [sessionDuration, setSessionDuration] = useState(75);
  const [open, setOpen] = useState(false);

  async function submit() {
    const program = await importCoachPlan({ text, startDate, workoutTime, weeks, sessionDuration });
    if (program) {
      setText('');
      setOpen(false);
    }
  }

  return (
    <section className="card coach-importer">
      <button type="button" className="coach-importer__toggle" onClick={() => setOpen((v) => !v)}>
        <span className="card__head-icon"><Bot size={20} /></span>
        <div>
          <p className="eyebrow">Coach plan import</p>
          <strong>Paste a coach program → dated plan</strong>
        </div>
        <span className="coach-importer__chevron">{open ? '−' : '+'}</span>
      </button>

      {open ? (
        <div className="coach-importer__body">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste DAY 1, DAY 2, nutrition, supplements, rest rules, and 3-month goal here…"
            rows={6}
          />
          <div className="coach-importer__controls">
            <label className="field">
              <span>Start date</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="field">
              <span>Gym time</span>
              <input type="time" value={workoutTime} onChange={(e) => setWorkoutTime(e.target.value)} />
            </label>
            <label className="field">
              <span>Weeks</span>
              <input type="number" min={1} max={24} value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Session min</span>
              <input
                type="number"
                min={30}
                max={180}
                step={5}
                value={sessionDuration}
                onChange={(e) => setSessionDuration(Number(e.target.value))}
              />
            </label>
          </div>
          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={submit}
            disabled={busy || text.trim().length < 40}
          >
            <CalendarDays size={18} />
            Build plan
          </button>
        </div>
      ) : null}
    </section>
  );
}
