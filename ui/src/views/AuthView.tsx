import { Loader2, Lock, Mail, Zap } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { authApi } from '../api';
import { useApp } from '../hooks/useApp';
import { goalLabel, levelLabel } from '../i18n';
import { useT } from '../i18n/LocaleProvider';
import type { AuthMode } from '../types';

function readResetTokenFromUrl() {
  return new URLSearchParams(window.location.search).get('token');
}

function clearResetTokenFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('token');
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}

const GOAL_VALUES = ['General Fitness', 'Strength', 'Muscle Gain', 'Weight Loss'] as const;
const LEVEL_VALUES = ['Beginner', 'Intermediate', 'Advanced'] as const;

export function AuthView() {
  const fa = useT();
  const { authenticate, busy, notify } = useApp();
  const initialResetToken = useMemo(() => readResetTokenFromUrl(), []);
  const [mode, setMode] = useState<AuthMode>(initialResetToken ? 'reset' : 'login');
  const [resetToken] = useState(initialResetToken ?? '');
  const [forgotSent, setForgotSent] = useState(false);
  const [pending, setPending] = useState(false);

  const isBusy = busy || pending;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (mode === 'forgot') {
      setPending(true);
      try {
        const result = await authApi.forgotPassword({ email: String(formData.get('email')) });
        setForgotSent(true);
        notify(result.message, 'success');
      } catch (error) {
        notify(error instanceof Error ? error.message : fa.auth.couldNotSendReset, 'error');
      } finally {
        setPending(false);
      }
      return;
    }

    if (mode === 'reset') {
      const password = String(formData.get('password'));
      const confirmPassword = String(formData.get('confirmPassword'));
      if (password !== confirmPassword) {
        notify(fa.auth.passwordsMismatch, 'error');
        return;
      }

      setPending(true);
      try {
        const result = await authApi.resetPassword({ token: resetToken, password });
        clearResetTokenFromUrl();
        setMode('login');
        notify(result.message, 'success');
      } catch (error) {
        notify(error instanceof Error ? error.message : fa.auth.couldNotReset, 'error');
      } finally {
        setPending(false);
      }
      return;
    }

    try {
      await authenticate(mode, formData);
    } catch {
      /* error toast handled in store */
    }
  }

  const title =
    mode === 'login'
      ? fa.auth.welcomeBack
      : mode === 'register'
        ? fa.auth.createAccount
        : mode === 'forgot'
          ? fa.auth.resetPassword
          : fa.auth.chooseNewPassword;

  return (
    <div className="auth-view">
      <div className="auth-view__brand">
        <span className="auth-view__mark">
          <Zap size={26} />
        </span>
        <h1>{fa.appName}</h1>
        <p>{fa.auth.tagline}</p>
      </div>

      <form className="auth-form" onSubmit={onSubmit}>
        <h2>{title}</h2>

        {mode === 'forgot' && forgotSent ? <p className="auth-form__hint">{fa.auth.checkInbox}</p> : null}

        {mode === 'reset' && !resetToken ? (
          <p className="auth-form__hint auth-form__hint--error">{fa.auth.invalidReset}</p>
        ) : null}

        {mode === 'register' ? (
          <label className="field">
            <span>{fa.auth.fullName}</span>
            <input name="name" placeholder={fa.auth.namePh} autoComplete="name" minLength={2} required />
          </label>
        ) : null}

        {mode === 'login' || mode === 'register' || mode === 'forgot' ? (
          <label className="field">
            <span>{fa.auth.email}</span>
            <input
              name="email"
              type="email"
              dir="ltr"
              placeholder={fa.auth.emailPh}
              autoComplete="email"
              required
              readOnly={mode === 'forgot' && forgotSent}
            />
          </label>
        ) : null}

        {mode === 'login' || mode === 'register' || mode === 'reset' ? (
          <label className="field">
            <span>{mode === 'reset' ? fa.auth.newPassword : fa.auth.password}</span>
            <input
              name="password"
              type="password"
              dir="ltr"
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'login' ? 1 : 8}
              required
            />
          </label>
        ) : null}

        {mode === 'register' ? (
          <div className="field-row">
            <label className="field">
              <span>{fa.auth.goal}</span>
              <select name="goal" defaultValue="General Fitness">
                {GOAL_VALUES.map((g) => (
                  <option key={g} value={g}>
                    {goalLabel(g)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{fa.auth.level}</span>
              <select name="fitnessLevel" defaultValue="Beginner">
                {LEVEL_VALUES.map((l) => (
                  <option key={l} value={l}>
                    {levelLabel(l)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {mode === 'reset' ? (
          <label className="field">
            <span>{fa.auth.confirmPassword}</span>
            <input
              name="confirmPassword"
              type="password"
              dir="ltr"
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
        ) : null}

        <button
          type="submit"
          className="btn btn--primary btn--block btn--lg"
          disabled={isBusy || (mode === 'reset' && !resetToken) || (mode === 'forgot' && forgotSent)}
        >
          {isBusy ? (
            <Loader2 className="spin" size={18} />
          ) : mode === 'forgot' ? (
            <Mail size={18} />
          ) : (
            <Lock size={18} />
          )}
          {mode === 'login'
            ? fa.auth.signIn
            : mode === 'register'
              ? fa.auth.createAccountBtn
              : mode === 'forgot'
                ? fa.auth.sendResetLink
                : fa.auth.updatePassword}
        </button>

        {mode === 'login' ? (
          <>
            <button type="button" className="btn btn--text" onClick={() => setMode('forgot')}>
              {fa.auth.forgotPassword}
            </button>
            <button type="button" className="btn btn--text" onClick={() => setMode('register')}>
              {fa.auth.newHere}
            </button>
          </>
        ) : null}

        {mode === 'register' ? (
          <button type="button" className="btn btn--text" onClick={() => setMode('login')}>
            {fa.auth.haveAccount}
          </button>
        ) : null}

        {mode === 'forgot' ? (
          <button
            type="button"
            className="btn btn--text"
            onClick={() => {
              setForgotSent(false);
              setMode('login');
            }}
          >
            {fa.auth.backToSignIn}
          </button>
        ) : null}

        {mode === 'reset' ? (
          <>
            <button type="button" className="btn btn--text" onClick={() => setMode('login')}>
              {fa.auth.backToSignIn}
            </button>
            <button
              type="button"
              className="btn btn--text"
              onClick={() => {
                clearResetTokenFromUrl();
                setMode('forgot');
              }}
            >
              {fa.auth.requestNewReset}
            </button>
          </>
        ) : null}
      </form>
    </div>
  );
}
