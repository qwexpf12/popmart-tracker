'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getProduct, listPrices, recordPrice } from '@/lib/queries';
import type { Product, PricePoint, PriceSource } from '@/lib/types';
import { PRICE_SOURCE_LABELS } from '@/lib/types';
import { formatYuan, formatDate, todayISO, cx, pctChange } from '@/lib/utils';
import PriceChart from '@/components/PriceChart';

const SOURCES: PriceSource[] = ['xianyu', 'qiandao', 'dewu', 'manual'];

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [prices, setPrices] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    date: todayISO(),
    source: 'xianyu' as PriceSource,
    low_price: '' as string | number,
    note: ''
  });
  const [saving, setSaving] = useState(false);

  async function reload() {
    const [p, ps] = await Promise.all([getProduct(id), listPrices(id, 90)]);
    setProduct(p);
    setPrices(ps);
  }

  useEffect(() => {
    (async () => {
      try {
        await reload();
      } catch (e: any) {
        setErr(e?.message || '加载失败');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function submitPrice(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(draft.low_price);
    if (!v || v <= 0) return;
    setSaving(true);
    try {
      await recordPrice({
        product_id: id,
        date: draft.date,
        source: draft.source,
        low_price: v,
        note: draft.note || null
      });
      setDraft({ ...draft, low_price: '', note: '' });
      await reload();
    } catch (e: any) {
      setErr(e?.message || '录入失败');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted">加载中…</p>;
  if (err) return <p className="text-down">{err}</p>;
  if (!product) return <p className="text-muted">款式不存在</p>;

  const latest = prices[prices.length - 1]?.low_price ?? null;
  const earliest30d = prices.find(
    (p) => new Date(p.date) >= new Date(Date.now() - 30 * 86400_000)
  )?.low_price ?? null;
  const ch30 = pctChange(latest, earliest30d);
  const chRetail = pctChange(latest, product.retail_price);

  return (
    <div className="space-y-6">
      <Link href="/products" className="text-sm text-muted">← 返回款式</Link>

      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{product.name}</h1>
        <p className="text-sm text-muted">
          {product.ip} · {product.series ?? '—'} · 原价 {formatYuan(product.retail_price)}
          {product.released_at && ` · 发售 ${formatDate(product.released_at, 'yyyy-MM-dd')}`}
          {product.is_secret && (
            <span className="pill bg-accent/10 text-accent ml-2">隐藏</span>
          )}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="最新低价" value={formatYuan(latest)} />
        <Stat
          label="vs 30 天前"
          value={ch30 !== null ? `${ch30 >= 0 ? '+' : ''}${ch30.toFixed(1)}%` : '—'}
          accent={ch30 !== null ? (ch30 >= 0 ? 'up' : 'down') : undefined}
        />
        <Stat
          label="vs 原价"
          value={chRetail !== null ? `${chRetail >= 0 ? '+' : ''}${chRetail.toFixed(0)}%` : '—'}
          accent={chRetail !== null ? (chRetail >= 0 ? 'up' : 'down') : undefined}
        />
      </div>

      <section className="card p-4">
        <h2 className="font-medium mb-3">价格走势（90 天）</h2>
        <PriceChart points={prices} />
      </section>

      <section className="card p-4">
        <h2 className="font-medium mb-3">录入今日价格</h2>
        <form onSubmit={submitPrice} className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <input
            type="date"
            className="field"
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
          />
          <select
            className="field"
            value={draft.source}
            onChange={(e) => setDraft({ ...draft, source: e.target.value as PriceSource })}
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
            placeholder="最低价 ¥"
            className="field"
            value={draft.low_price}
            onChange={(e) => setDraft({ ...draft, low_price: e.target.value })}
          />
          <input
            className="field col-span-2 md:col-span-1"
            placeholder="备注（可选）"
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          />
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? '保存…' : '记录'}
          </button>
        </form>
        <p className="text-xs text-muted mt-2">
          相同日期 + 来源会覆盖；用作每日「全网最低」的快照。
        </p>
      </section>

      <section className="card p-4">
        <h2 className="font-medium mb-3">最近录入</h2>
        {prices.length === 0 ? (
          <p className="text-sm text-muted">还没有数据</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {[...prices].reverse().slice(0, 20).map((p) => (
              <li key={p.id} className="py-2 flex items-center justify-between">
                <span className="text-muted">
                  {formatDate(p.date, 'yyyy-MM-dd')} · {PRICE_SOURCE_LABELS[p.source]}
                </span>
                <span className="font-mono">{formatYuan(p.low_price)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent
}: {
  label: string;
  value: string;
  accent?: 'up' | 'down';
}) {
  return (
    <div className="card p-3">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={cx(
          'font-mono text-lg mt-0.5',
          accent === 'up' && 'text-up',
          accent === 'down' && 'text-down'
        )}
      >
        {value}
      </p>
    </div>
  );
}
