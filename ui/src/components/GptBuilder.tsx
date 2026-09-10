import { Bot, CheckCircle2, Loader2, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ApiError, chatApi } from '../api';
import { openPaywall } from '../lib/paywallBus';
import { AiGeneratingPanel } from './AiGeneratingPanel';
import { AiProgramResult } from './AiProgramResult';
import { DraftPreview } from './DraftPreview';
import { useApp } from '../hooks/useApp';
import { useRouter } from '../hooks/useRouter';
import { profileContextFromUser } from '../lib/aiProfile';
import { useT } from '../i18n/LocaleProvider';
import type { ChatMessage, GptDraftProgram, GptQuota } from '../types';


export function GptBuilder({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fa = useT();
  const SUGGESTIONS = fa.gpt.suggestions;
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
        notify(fa.gptExtra.savedActivated, 'success');
        onClose();
        navigate('dashboard');
      }
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.code === 'PREMIUM_REQUIRED' ||
          (error.status === 429 && !(error.body as { quota?: { isPremium?: boolean } } | undefined)?.quota?.isPremium))
      ) {
        openPaywall(fa.premium.quotaUpsell);
      }
      const message =
        error instanceof ApiError && error.status === 429
          ? fa.gpt.usedAll
          : error instanceof ApiError && error.status === 503
            ? fa.gpt.aiNotConfigured
            : error instanceof ApiError && error.status === 504
              ? fa.gpt.tookTooLong
              : error instanceof ApiError
                ? error.message
                : error instanceof Error
                  ? error.message
                  : fa.gpt.generationFailed;
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
      notify(fa.gptExtra.savedActivated, 'success');
      onClose();
      navigate('dashboard');
    } catch (error) {
      notify(error instanceof Error ? error.message : fa.gpt.couldNotSave, 'error');
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-label={fa.gpt.aria}>
      <div className="gpt-builder">
        <header className="gpt-builder__head">
          <div className="gpt-builder__title">
            <span className="card__head-icon"><Bot size={18} /></span>
            <div>
              <strong>{fa.gptExtra.title}</strong>
              {quota ? <small>{fa.gpt.quotaLeft(quota.remaining, quota.limit)}</small> : null}
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={fa.close}><X size={18} /></button>
        </header>

        <div className="gpt-builder__body" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="gpt-builder__intro">
              <Sparkles size={22} />
              <p>{fa.gpt.intro}</p>
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
            placeholder={noQuota ? fa.gpt.weeklyLimit : fa.gpt.placeholder}
            disabled={busy || noQuota}
          />
          <button type="button" className="btn btn--primary" onClick={() => void send(input)} disabled={busy || noQuota || !input.trim()}>
            <Send size={18} />
          </button>
        </div>

        {draft ? (
          <button type="button" className="btn btn--success btn--block btn--lg gpt-builder__save" onClick={() => void convert()} disabled={converting}>
            {converting ? <Loader2 className="spin" size={18} /> : <CheckCircle2 size={18} />}
            {fa.gpt.saveActivate}
          </button>
        ) : null}
      </div>
    </div>
  );
}
