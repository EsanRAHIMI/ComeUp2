import { Loader2, Lock, Mail, Zap } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { authApi } from '../api';
import { useApp } from '../hooks/useApp';
import type { AuthMode } from '../types';

function readResetTokenFromUrl() {
  return new URLSearchParams(window.location.search).get('token');
}

function clearResetTokenFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('token');
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}

export function AuthView() {
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
        notify(error instanceof Error ? error.message : 'Could not send reset email', 'error');
      } finally {
        setPending(false);
      }
      return;
    }

    if (mode === 'reset') {
      const password = String(formData.get('password'));
      const confirmPassword = String(formData.get('confirmPassword'));
      if (password !== confirmPassword) {
        notify('Passwords do not match', 'error');
        return;
      }

      setPending(true);
      try {
        const result = await authApi.resetPassword({ token: resetToken, password });
        clearResetTokenFromUrl();
        setMode('login');
        notify(result.message, 'success');
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Could not reset password', 'error');
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
      ? 'Welcome back'
      : mode === 'register'
        ? 'Create your account'
        : mode === 'forgot'
          ? 'Reset your password'
          : 'Choose a new password';

  return (
    <div className="auth-view">
      <div className="auth-view__brand">
        <span className="auth-view__mark">
          <Zap size={26} />
        </span>
        <h1>ComeUp</h1>
        <p>Your training, tracked rep by rep.</p>
      </div>

      <form className="auth-form" onSubmit={onSubmit}>
        <h2>{title}</h2>

        {mode === 'forgot' && forgotSent ? (
          <p className="auth-form__hint">
            Check your inbox for a reset link. It expires in one hour.
          </p>
        ) : null}

        {mode === 'reset' && !resetToken ? (
          <p className="auth-form__hint auth-form__hint--error">
            This reset link is invalid. Request a new one below.
          </p>
        ) : null}

        {mode === 'register' ? (
          <label className="field">
            <span>Full name</span>
            <input name="name" placeholder="Your name" autoComplete="name" minLength={2} required />
          </label>
        ) : null}

        {mode === 'login' || mode === 'register' || mode === 'forgot' ? (
          <label className="field">
            <span>Email</span>
            <input
              name="email"
              type="email"
              placeholder="you@email.com"
              autoComplete="email"
              required
              readOnly={mode === 'forgot' && forgotSent}
            />
          </label>
        ) : null}

        {mode === 'login' || mode === 'register' || mode === 'reset' ? (
          <label className="field">
            <span>{mode === 'reset' ? 'New password' : 'Password'}</span>
            <input
              name="password"
              type="password"
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
              <span>Goal</span>
              <select name="goal" defaultValue="General Fitness">
                <option>General Fitness</option>
                <option>Strength</option>
                <option>Muscle Gain</option>
                <option>Weight Loss</option>
              </select>
            </label>
            <label className="field">
              <span>Level</span>
              <select name="fitnessLevel" defaultValue="Beginner">
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </label>
          </div>
        ) : null}

        {mode === 'reset' ? (
          <label className="field">
            <span>Confirm password</span>
            <input
              name="confirmPassword"
              type="password"
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
            ? 'Sign in'
            : mode === 'register'
              ? 'Create account'
              : mode === 'forgot'
                ? 'Send reset link'
                : 'Update password'}
        </button>

        {mode === 'login' ? (
          <>
            <button type="button" className="btn btn--text" onClick={() => setMode('forgot')}>
              Forgot password?
            </button>
            <button type="button" className="btn btn--text" onClick={() => setMode('register')}>
              New here? Create an account
            </button>
          </>
        ) : null}

        {mode === 'register' ? (
          <button type="button" className="btn btn--text" onClick={() => setMode('login')}>
            I already have an account
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
            Back to sign in
          </button>
        ) : null}

        {mode === 'reset' ? (
          <>
            <button type="button" className="btn btn--text" onClick={() => setMode('login')}>
              Back to sign in
            </button>
            <button
              type="button"
              className="btn btn--text"
              onClick={() => {
                clearResetTokenFromUrl();
                setMode('forgot');
              }}
            >
              Request a new reset link
            </button>
          </>
        ) : null}
      </form>
    </div>
  );
}
