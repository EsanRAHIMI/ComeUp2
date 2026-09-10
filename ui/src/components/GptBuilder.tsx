import { Bot, CheckCircle2, Loader2, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ApiError, chatApi } from '../api';
import { AiGeneratingPanel } from './AiGeneratingPanel';
import { AiProgramResult } from './AiProgramResult';
import { DraftPreview } from './DraftPreview';
import { useApp } from '../hooks/useApp';
import { useRouter } from '../hooks/useRouter';
import { profileContextFromUser } from '../lib/aiProfile';
import type { ChatMessage, GptDraftProgram, GptQuota } from '../types';

const SUGGESTIONS = [
  'Make it 4 days instead of 5',
  'Reduce shoulder volume',
  'Increase arm focus',
  'Adjust for knee pain',
  'Make each session 60 minutes',
  'Use only dumbbells and machines',
];

export function GptBuilder({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { token, user, notify, refreshPrograms } = useApp();
  const { navigate } = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState<GptDraftProgram | null>(null);
  const [quota, setQuota] = useState<GptQuota | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [converting, setConverting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !token) return;
    chatApi.quota(token).then((r) => setQuota(r.quota)).catch(() => undefined);
  }, [open, token]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, draft, busy]);

  if (!open) return null;

  const noQuota = quota !== null && quota.remaining <= 0;

  async function send(content: string) {
    const text = content.trim();
    if (!text || !token || busy) return;
    setBusy(true);
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: text }]);
    try {
      let id = conversationId;
      if (!id) {
        const started = await chatApi.start(token);
        id = started.conversation._id;
        setConversationId(id);
      }
      const res = await chatApi.message(token, id, text);
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }]);
      setDraft(res.draftProgram);
      setQuota(res.quota);
      if (res.activated && res.program) {
        await refreshPrograms();
        notify('برنامه ذخیره و فعال شد', 'success');
        onClose();
        navigate('dashboard');
      }
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 429
          ? 'You have used all 5 AI messages this week.'
          : error instanceof ApiError && error.status === 503
            ? 'AI Coach is not configured on the server yet.'
            : error instanceof ApiError && error.status === 504
              ? 'AI Coach took too long — please try again.'
              : error instanceof ApiError
                ? error.message
                : error instanceof Error
                  ? error.message
                  : 'Generation failed';
      notify(message, 'error');
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${message}` }]);
    } finally {
      setBusy(false);
    }
  }

  async function convert() {
    if (!token || !conversationId || !draft) return;
    setConverting(true);
    try {
      await chatApi.convert(token, conversationId, { activate: true });
      await refreshPrograms();
      notify('برنامه ذخیره و فعال شد', 'success');
      onClose();
      navigate('dashboard');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save program', 'error');
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-label="AI Coach program builder">
      <div className="gpt-builder">
        <header className="gpt-builder__head">
          <div className="gpt-builder__title">
            <span className="card__head-icon"><Bot size={18} /></span>
            <div>
              <strong>مربی هوش مصنوعی</strong>
              {quota ? <small>{quota.remaining} of {quota.limit} AI messages left this week</small> : null}
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>

        <div className="gpt-builder__body" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="gpt-builder__intro">
              <Sparkles size={22} />
              <p>Describe your goals or just say “build my program”. I’ll use your profile, then you can ask for changes. Say “save and activate” when you’re ready.</p>
            </div>
          ) : null}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`gpt-msg gpt-msg--${m.role} ${m.role === 'assistant' && i === messages.length - 1 && !busy ? 'ai-result__reply' : ''}`}
            >
              {m.content}
            </div>
          ))}

          {busy ? (
            <AiGeneratingPanel active profile={profileContextFromUser(user)} />
          ) : null}

          {draft && !busy ? (
            <AiProgramResult>
              <DraftPreview draft={draft} />
            </AiProgramResult>
          ) : null}
        </div>

        <div className="gpt-builder__suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="chip-toggle__item" onClick={() => void send(s)} disabled={busy || noQuota}>
              {s}
            </button>
          ))}
        </div>

        <div className="gpt-builder__compose">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void send(input); }}
            placeholder={noQuota ? 'Weekly AI limit reached' : 'Message your AI coach…'}
            disabled={busy || noQuota}
          />
          <button type="button" className="btn btn--primary" onClick={() => void send(input)} disabled={busy || noQuota || !input.trim()}>
            <Send size={18} />
          </button>
        </div>

        {draft ? (
          <button type="button" className="btn btn--success btn--block btn--lg gpt-builder__save" onClick={() => void convert()} disabled={converting}>
            {converting ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
            Save &amp; activate this program
          </button>
        ) : null}
      </div>
    </div>
  );
}
