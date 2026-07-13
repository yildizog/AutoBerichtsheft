'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Anmeldung fehlgeschlagen.');
        setShake(true);
        setTimeout(() => setShake(false), 400);
        return;
      }
      router.replace(params.get('next') || '/');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6">
      <div
        className={`w-full max-w-sm rounded-ios-xl border border-separator bg-surface-secondary p-7 shadow-ios animate-pop ${
          shake ? 'animate-shake' : ''
        }`}
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[18px] bg-gradient-to-br from-ios-blue to-ios-indigo shadow-ios">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="text-center text-[22px] font-bold tracking-tight">Berichtsheft</h1>
        <p className="mt-1 text-center text-[14px] text-label-secondary">
          Mit Passwort entsperren, um fortzufahren
        </p>

        <form onSubmit={submit} className="mt-7 space-y-3">
          <div className="rounded-ios border border-separator bg-surface-tertiary px-3.5 py-3">
            <input
              type="password"
              inputMode="text"
              autoFocus
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ios-input"
            />
          </div>

          {error && <p className="px-1 text-[13px] font-medium text-ios-red">{error}</p>}

          <button type="submit" disabled={loading || !password} className="ios-btn-filled w-full py-3">
            {loading ? <span className="ios-spinner" /> : 'Entsperren'}
          </button>
        </form>

        <p className="mt-6 text-center text-[12px] leading-relaxed text-label-secondary">
          Alle Zugangsdaten (GitHub, Gemini, IHK) werden ausschließlich serverseitig über
          Vercel Environment Variables verwaltet – niemals im Browser gespeichert.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
