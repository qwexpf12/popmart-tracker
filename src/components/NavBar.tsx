'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cx } from '@/lib/utils';

const TABS = [
  { href: '/', label: '看板' },
  { href: '/products', label: '款式' },
  { href: '/quick-price', label: '录价' },
  { href: '/inventory', label: '库存' }
];

export default function NavBar() {
  const path = usePathname();
  const router = useRouter();

  if (path === '/login') return null;

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

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
          <button
            onClick={logout}
            className="ml-2 px-3 py-1.5 rounded-lg text-sm text-muted hover:bg-line/60 transition"
          >
            退出
          </button>
        </nav>
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
