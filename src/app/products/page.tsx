'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listProducts, deleteProduct } from '@/lib/queries';
import type { ProductWithLatest } from '@/lib/types';
import { formatYuan, formatDate, cx, pctChange } from '@/lib/utils';

export default function ProductsPage() {
  const [items, setItems] = useState<ProductWithLatest[]>([]);
  const [q, setQ] = useState('');
  const [filterIP, setFilterIP] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(p: ProductWithLatest) {
    const ok = confirm(`确定删除「${p.name}」?\n\n关联的价格记录会一并删除。\n如果该款式还有库存记录，将无法删除（请先在库存页处理）。`);
    if (!ok) return;
    setDeletingId(p.id);
    setErr(null);
    try {
      await deleteProduct(p.id);
      setItems((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e: any) {
      setErr(e?.message || '删除失败');
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setItems(await listProducts());
      } catch (e: any) {
        setErr(e?.message || '加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ips = useMemo(() => {
    const s = new Set(items.map((i) => i.ip));
    return ['all', ...Array.from(s).sort()];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (filterIP !== 'all' && i.ip !== filterIP) return false;
      if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, q, filterIP]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">款式</h1>
        <Link href="/products/new" className="btn-primary">+ 新增款式</Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        <input
          className="field md:max-w-xs"
          placeholder="搜款名…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="field md:max-w-[12rem]"
          value={filterIP}
          onChange={(e) => setFilterIP(e.target.value)}
        >
          {ips.map((ip) => (
            <option key={ip} value={ip}>
              {ip === 'all' ? '全部 IP' : ip}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-muted">加载中…</p>}
      {err && <p className="text-down">出错了：{err}</p>}

      {!loading && filtered.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-muted">还没有款式，先新增一个吧</p>
          <Link href="/products/new" className="btn-primary mt-3">+ 新增款式</Link>
        </div>
      )}

      <ul className="grid md:grid-cols-2 gap-3">
        {filtered.map((p) => {
          const ch = pctChange(p.latest_low_price, p.retail_price);
          return (
            <li key={p.id} className="relative group">
              <Link href={`/products/${p.id}`} className="card p-4 block hover:shadow-md transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 pr-6">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {p.ip} · {p.series ?? '—'}{' '}
                      {p.is_secret && (
                        <span className="pill bg-accent/10 text-accent ml-1">隐藏</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-lg">{formatYuan(p.latest_low_price)}</p>
                    <p className="text-xs text-muted">{formatDate(p.latest_date)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted">原价 {formatYuan(p.retail_price)}</span>
                  {ch !== null && (
                    <span className={cx('font-medium', ch >= 0 ? 'text-up' : 'text-down')}>
                      {ch >= 0 ? '+' : ''}
                      {ch.toFixed(0)}% vs 原价
                    </span>
                  )}
                </div>
              </Link>
              <button
                type="button"
                aria-label="删除该款式"
                disabled={deletingId === p.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete(p);
                }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-line/60 text-muted hover:bg-down hover:text-white text-sm leading-none flex items-center justify-center transition opacity-0 group-hover:opacity-100 md:opacity-60 disabled:opacity-30"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
