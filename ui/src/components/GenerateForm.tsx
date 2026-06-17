import { CheckCircle2, Loader2, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiError, chatApi, programsApi } from '../api';
import { AiGeneratingPanel } from './AiGeneratingPanel';
import { AiProgramResult } from './AiProgramResult';
import { DraftPreview } from './DraftPreview';
import { useApp } from '../hooks/useApp';
import { useRouter } from '../hooks/useRouter';
import { profileContextFromUser } from '../lib/aiProfile';
import type { FitnessLevel, Goal, GptDraftProgram, GptQuota } from '../types';

const GOALS: Goal[] = ['General Fitness', 'Strength', 'Muscle Gain', 'Weight Loss'];
const LEVELS: FitnessLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const EQUIPMENT = ['bodyweight', 'dumbbells', 'barbell', 'machine', 'cable machine', 'kettlebell', 'bands'];
const FOCUS = ['full body', 'legs', 'chest', 'back', 'shoulders', 'arms', 'core', 'cardio'];

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function GenerateForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, token, notify, refreshPrograms } = useApp();
  const { navigate } = useRouter();
  const [goal, setGoal] = useState<Goal>(user?.goal ?? 'General Fitness');
  const [level, setLevel] = useState<FitnessLevel>(user?.fitnessLevel ?? 'Beginner');
  const [duration, setDuration] = useState(user?.sessionDuration ?? 60);
  const [daysPerWeek, setDaysPerWeek] = useState(user?.workoutDaysPerWeek ?? 3);
  const [equipment, setEquipment] = useState<string[]>(user?.availableEquipment?.length ? user.availableEquipment : ['bodyweight', 'dumbbells']);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [quota, setQuota] = useState<GptQuota | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reply, setReply] = useState('');
  const [draft, setDraft] = useState<GptDraftProgram | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !token) return;
    chatApi.quota(token).then((r) => setQuota(r.quota)).catch(() => undefined);
  }, [open, token]);

  useEffect(() => {
    if (!open || !user) return;
    setGoal(user.goal);
    setLevel(user.fitnessLevel);
    setDuration(user.sessionDuration ?? 60);
    setDaysPerWeek(user.workoutDaysPerWeek);
    if (user.availableEquipment?.length) setEquipment(user.availableEquipment);
  }, [open, user]);

  if (!open) return null;

  const noQuota = quota !== null && quota.remaining <= 0;

  function resetPreview() {
    setReply('');
    setDraft(null);
    setConversationId(null);
  }

  async function generate() {
    if (!token || busy || noQuota) return;
    setBusy(true);
    resetPreview();
    try {
      const res = await programsApi.generate(token, {
        goal,
        fitnessLevel: level,
        duration,
        equipment,
        focusAreas,
        daysPerWeek,
        notes: notes.trim() || undefined,
      });
      setReply(res.reply);
      setDraft(res.draftProgram);
      setConversationId(res.conversationId);
      setQuota(res.quota);
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 429
          ? 'You have used all 5 AI generations this week.'
          : error instanceof ApiError && error.status === 503
            ? 'AI is not configured on the server yet.'
            : error instanceof ApiError && error.status === 504
              ? 'Generation took too long — please try again.'
              : error instanceof ApiError
                ? error.message
                : error instanceof Error
                  ? error.message
                  : 'Generation failed';
      notify(message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!token || !conversationId || !draft || confirming) return;
    setConfirming(true);
    try {
      await chatApi.convert(token, conversationId, { activate: true });
      await refreshPrograms();
      notify('Program saved and activated', 'success');
      onClose();
      navigate('dashboard');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save program', 'error');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-label="Quick generate program">
      <div className="modal-card modal-card--wide">
        <div className="modal-card__head">
          <div>
            <h2>Quick generate</h2>
            {quota ? (
              <small className="modal-card__sub">
                {quota.remaining} of {quota.limit} AI generations left this week
              </small>
            ) : null}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {busy ? (
          <AiGeneratingPanel
            active
            profile={{
              ...(profileContextFromUser(user) ?? {}),
              goal,
              fitnessLevel: level,
              workoutDaysPerWeek: daysPerWeek,
              sessionDuration: duration,
              equipment,
            }}
          />
        ) : !draft ? (
          <>
            <p className="modal-card__intro">
              Uses your profile (injuries, equipment, preferred days) plus the options below.
              Review the plan before it is saved and activated.
            </p>

            <div className="field-row">
              <label className="field">
                <span>Goal</span>
                <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
                  {GOALS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Level</span>
                <select value={level} onChange={(e) => setLevel(e.target.value as FitnessLevel)}>
                  {LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </label>
            </div>

            <div className="field-row">
              <label className="field">
                <span>Session (min)</span>
                <input type="number" min={20} max={180} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Days / week</span>
                <input type="number" min={1} max={7} value={daysPerWeek} onChange={(e) => setDaysPerWeek(Number(e.target.value))} />
              </label>
            </div>

            <div className="field">
              <span>Equipment</span>
              <div className="chip-toggle">
                {EQUIPMENT.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`chip-toggle__item ${equipment.includes(item) ? 'is-on' : ''}`}
                    onClick={() => setEquipment((list) => toggle(list, item))}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span>Focus areas <small className="field__hint">(optional)</small></span>
              <div className="chip-toggle">
                {FOCUS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`chip-toggle__item ${focusAreas.includes(item) ? 'is-on' : ''}`}
                    onClick={() => setFocusAreas((list) => toggle(list, item))}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <label className="field">
              <span>Extra notes <small className="field__hint">(optional)</small></span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. avoid overhead press, more glute work…"
                maxLength={500}
              />
            </label>

            <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => void generate()} disabled={busy || noQuota}>
              {busy ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
              {noQuota ? 'Weekly AI limit reached' : 'Generate with AI'}
            </button>
          </>
        ) : (
          <AiProgramResult>
            {reply ? <p className="gpt-msg gpt-msg--assistant ai-result__reply">{reply}</p> : null}
            <DraftPreview draft={draft} />
            <div className="modal-card__actions">
              <button type="button" className="btn btn--ghost" onClick={resetPreview} disabled={confirming}>
                Adjust &amp; regenerate
              </button>
              <button type="button" className="btn btn--success btn--lg" onClick={() => void confirm()} disabled={confirming}>
                {confirming ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
                Save &amp; activate
              </button>
            </div>
          </AiProgramResult>
        )}
      </div>
    </div>
  );
}
