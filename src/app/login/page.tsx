'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '登录失败');
      }
      router.replace(next);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || '登录失败');
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <form onSubmit={submit} className="card p-6 w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">泡泡 · 行情台</h1>
          <p className="text-sm text-muted mt-1">先登录</p>
        </div>
        <div>
          <label className="label">用户名</label>
          <input
            className="field"
            value={username}
            autoComplete="username"
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="label">密码</label>
          <input
            type="password"
            className="field"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {err && <p className="text-down text-sm">{err}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
          {busy ? '登录中…' : '登录'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-muted text-center mt-8">加载中…</p>}>
      <LoginForm />
    </Suspense>
  );
}
