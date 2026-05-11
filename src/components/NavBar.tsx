'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cx } from '@/lib/utils';
import { clearCurrentUserCache, useCurrentUser } from '@/lib/useCurrentUser';

const TABS = [
  { href: '/', label: '看板' },
  { href: '/products', label: '款式' },
  { href: '/quick-price', label: '录价' },
  { href: '/inventory', label: '库存' }
];

export default function NavBar() {
  const path = usePathname();
  const router = useRouter();
  const { user } = useCurrentUser();

  if (path === '/login') return null;

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    clearCurrentUserCache();
    router.replace('/login');
    router.refresh();
  }

  const masked = user ? `${user.username.slice(0, 3)}**` : '';

  return (
    <>
      <header className="hidden md:flex items-center justify-between px-6 py-4 border-b border-line bg-surface/80 backdrop-blur sticky top-0 z-30">
        <Link href="/" className="font-mono text-lg tracking-tight">
          泡泡 · 行情台
        </Link>
        <nav className="flex items-center gap-1">
          {TABS.map((t) => {
            const active = path === t.href || (t.href !== '/' && path.startsWith(t.href));
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cx(
                  'px-3 py-1.5 rounded-lg text-sm transition',
                  active ? 'bg-ink text-white' : 'text-muted hover:bg-line/60'
                )}
              >
                {t.label}
              </Link>
            );
          })}
          {user && (
            <span className="ml-3 inline-flex items-center gap-1.5 rounded-full bg-line/40 px-2.5 py-1 text-xs text-muted">
              <span className="size-1.5 rounded-full bg-up" aria-hidden />
              {masked}
            </span>
          )}
          <button
            onClick={logout}
            className="ml-2 px-3 py-1.5 rounded-lg text-sm text-muted hover:bg-line/60 transition"
          >
            退出
          </button>
        </nav>
      </header>

      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 border-b border-line bg-surface/90 backdrop-blur">
        <Link href="/" className="font-mono text-sm tracking-tight">
          泡泡 · 行情台
        </Link>
        <div className="flex items-center gap-2">
          {user && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-line/40 px-2 py-0.5 text-xs text-muted">
              <span className="size-1.5 rounded-full bg-up" aria-hidden />
              {masked}
            </span>
          )}
          <button onClick={logout} className="text-xs text-muted">
            退出
          </button>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-line">
        <ul className="grid grid-cols-4">
          {TABS.map((t) => {
            const active = path === t.href || (t.href !== '/' && path.startsWith(t.href));
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={cx(
                    'flex items-center justify-center py-3 text-sm',
                    active ? 'text-ink font-medium' : 'text-muted'
                  )}
                >
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
