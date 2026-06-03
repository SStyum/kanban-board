import { useState } from 'react';
import { login, register } from '../lib/api';
import { useAuthStore } from '../store/authStore';

type Mode = 'login' | 'register';

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('demo@kanban.local');
  const [password, setPassword] = useState('kanban123');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSession = useAuthStore((s) => s.setSession);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const fn = mode === 'login' ? login : register;
      const { accessToken, user } = await fn(email, password);
      setSession(accessToken, user);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-card">
      <h1>Kanban Board</h1>
      <p className="auth-subtitle">
        {mode === 'login' ? 'Entre para acessar o board' : 'Crie uma conta'}
      </p>
      <form onSubmit={onSubmit} className="auth-form">
        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>
      <button
        type="button"
        className="auth-switch"
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setError(null);
        }}
      >
        {mode === 'login' ? 'Não tem conta? Registre-se' : 'Já tem conta? Entrar'}
      </button>
      <p className="auth-hint">
        Conta demo do seed: <code>demo@kanban.local</code> / <code>kanban123</code>
      </p>
    </div>
  );
}
