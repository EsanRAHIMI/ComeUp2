import { Loader2, Lock, Zap } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useApp } from '../hooks/useApp';
import type { AuthMode } from '../types';

export function AuthView() {
  const { authenticate, busy } = useApp();
  const [mode, setMode] = useState<AuthMode>('login');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      await authenticate(mode, formData);
    } catch {
      /* error toast handled in store */
    }
  }

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
        <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>

        {mode === 'register' ? (
          <label className="field">
            <span>Full name</span>
            <input name="name" placeholder="Your name" autoComplete="name" minLength={2} required />
          </label>
        ) : null}

        <label className="field">
          <span>Email</span>
          <input name="email" type="email" placeholder="you@email.com" autoComplete="email" required />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={mode === 'register' ? 8 : 1}
            required
          />
        </label>

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

        <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy}>
          {busy ? <Loader2 className="spin" size={18} /> : <Lock size={18} />}
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <button
          type="button"
          className="btn btn--text"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? 'New here? Create an account' : 'I already have an account'}
        </button>
      </form>
    </div>
  );
}
