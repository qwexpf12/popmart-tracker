'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listProducts, recordPrice } from '@/lib/queries';
import type { ProductWithLatest, PriceSource } from '@/lib/types';
import { PRICE_SOURCE_LABELS } from '@/lib/types';
import { formatYuan, todayISO, cx } from '@/lib/utils';

const SOURCES: PriceSource[] = ['xianyu', 'qiandao', 'dewu'];

interface DraftRow {
  productId: string;
  source: PriceSource;
  price: string;
}

export default function QuickPricePage() {
  const [products, setProducts] = useState<ProductWithLatest[]>([]);
  const [date, setDate] = useState(todayISO());
  const [defaultSource, setDefaultSource] = useState<PriceSource>('xianyu');
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setProducts(await listProducts());
      } catch (e: any) {
        setErr(e?.message || '加载失败');
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return products;
    const s = search.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(s) || p.ip.toLowerCase().includes(s)
    );
  }, [products, search]);

  function setRow(productId: string, patch: Partial<DraftRow>) {
    setDrafts((d) => ({
      ...d,
      [productId]: {
        productId,
        source: defaultSource,
        price: '',
        ...d[productId],
        ...patch
      }
    }));
  }

  async function submitAll() {
    const rows = Object.values(drafts).filter((r) => r.price && Number(r.price) > 0);
    if (rows.length === 0) {
      setErr('还没填任何价格');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await Promise.all(
        rows.map((r) =>
          recordPrice({
            product_id: r.productId,
            date,
            source: r.source,
            low_price: Number(r.price)
          })
        )
      );
      setSavedCount(rows.length);
      setDrafts({});
    } catch (e: any) {
      setErr(e?.message || '保存失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">快速录价</h1>
      <p className="text-sm text-muted">
        逛闲鱼/千岛时随手记录最低价。同款同日同源会覆盖。
      </p>

      <div className="card p-4 space-y-3 sticky top-0 md:top-16 z-10 bg-surface">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">日期</label>
            <input
              type="date"
              className="field"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">默认来源</label>
            <select
              className="field"
              value={defaultSource}
              onChange={(e) => setDefaultSource(e.target.value as PriceSource)}
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {PRICE_SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <input
          className="field"
          placeholder="搜款名/IP…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {err && <p className="text-down text-sm">{err}</p>}
      {savedCount !== null && (
        <p className="text-up text-sm">已保存 {savedCount} 条</p>
      )}

      {products.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-muted">还没有款式，先去新增</p>
          <Link href="/products/new" className="btn-primary mt-3">+ 新增款式</Link>
        </div>
      )}

      <ul className="space-y-2">
        {filtered.map((p) => {
          const draft = drafts[p.id];
          const filled = draft?.price && Number(draft.price) > 0;
          return (
            <li
              key={p.id}
              className={cx(
                'card p-3 flex items-center gap-3 transition',
                filled && 'ring-2 ring-up/30'
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted truncate">
                  {p.ip} · 上次 {formatYuan(p.latest_low_price)}
                </p>
              </div>
              <select
                className="field !py-1.5 !px-2 !w-20 text-xs"
                value={draft?.source ?? defaultSource}
                onChange={(e) => setRow(p.id, { source: e.target.value as PriceSource })}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {PRICE_SOURCE_LABELS[s]}
                  </option>
                ))}
              </select>
              <input
                type="number"
                inputMode="decimal"
                placeholder="¥"
                className="field !py-1.5 !w-24 text-right font-mono"
                value={draft?.price ?? ''}
                onChange={(e) => setRow(p.id, { price: e.target.value })}
              />
            </li>
          );
        })}
      </ul>

      <div className="fixed bottom-16 md:bottom-6 right-4 md:right-6 z-30">
        <button
          onClick={submitAll}
          disabled={busy || Object.keys(drafts).length === 0}
          className="btn-primary shadow-lg disabled:opacity-50"
        >
          {busy ? '保存…' : `保存 ${Object.values(drafts).filter((r) => Number(r.price) > 0).length} 条`}
        </button>
      </div>
    </div>
  );
}
