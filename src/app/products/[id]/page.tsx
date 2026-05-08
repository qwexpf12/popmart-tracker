'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getProduct,
  listPrices,
  recordPrice,
  listInventoryByProduct,
  markKept
} from '@/lib/queries';
import type { Product, PricePoint, PriceSource, InventoryRow } from '@/lib/types';
import { PRICE_SOURCE_LABELS, STATUS_LABELS } from '@/lib/types';
import { formatYuan, formatDate, todayISO, cx, pctChange, daysBetween } from '@/lib/utils';
import PriceChart from '@/components/PriceChart';
import SellModal from '@/components/SellModal';

const SOURCES: PriceSource[] = ['xianyu', 'qiandao', 'dewu', 'manual'];

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [prices, setPrices] = useState<PricePoint[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [sellingRow, setSellingRow] = useState<InventoryRow | null>(null);
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
    const [p, ps, inv] = await Promise.all([
      getProduct(id),
      listPrices(id, 90),
      listInventoryByProduct(id)
    ]);
    setProduct(p);
    setPrices(ps);
    setInventory(inv);
  }

  async function handleKeep(row: InventoryRow) {
    const ok = confirm(`把这批 ${row.quantity} 件标记为「自留」吗？\n（自留后将不再计入浮盈浮亏）`);
    if (!ok) return;
    try {
      await markKept(row.id);
      await reload();
    } catch (e: any) {
      setErr(e?.message || '操作失败');
    }
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
        <h2 className="font-medium mb-3">我的库存</h2>
        {inventory.length === 0 ? (
          <p className="text-sm text-muted">
            没有该款式的库存记录。在「库存」页『+ 进货登记』可以添加。
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {inventory.map((r) => {
              const days = daysBetween(r.acquired_at);
              return (
                <li key={r.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span
                        className={cx(
                          'pill mr-2',
                          r.status === 'holding' && 'bg-accent/10 text-accent',
                          r.status === 'sold' && 'bg-up/10 text-up',
                          r.status === 'kept' && 'bg-line text-muted'
                        )}
                      >
                        {STATUS_LABELS[r.status]}
                      </span>
                      <span className="font-medium">{r.quantity} 件</span>
                      <span className="text-muted">
                        {' '}· 成本 {formatYuan(r.cost_per_unit)}/件 · 进货{' '}
                        {formatDate(r.acquired_at, 'yyyy-MM-dd')}
                        {r.status === 'holding' && ` · 压 ${days} 天`}
                      </span>
                    </p>
                    {r.status === 'sold' && (
                      <p className="text-xs text-muted mt-1">
                        {formatDate(r.sold_at, 'yyyy-MM-dd')} 出 ·{' '}
                        {formatYuan(r.sold_price_per_unit)}/件
                        {r.sold_platform && ` · ${r.sold_platform}`}
                        {r.sale_method && ` · ${r.sale_method}`}
                        {r.tracking_no && ` · 单号 ${r.tracking_no}`}
                        {r.buyer_info && (
                          <span className="block">买家：{r.buyer_info}</span>
                        )}
                      </p>
                    )}
                  </div>
                  {r.status === 'holding' && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => setSellingRow(r)}
                        className="btn-primary text-xs px-3 py-1"
                      >
                        出库
                      </button>
                      <button
                        onClick={() => handleKeep(r)}
                        className="btn-ghost border border-line text-xs px-3 py-1"
                      >
                        自留
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {sellingRow && (
        <SellModal
          row={sellingRow}
          productName={product.name}
          onClose={() => setSellingRow(null)}
          onSaved={async () => {
            setSellingRow(null);
            await reload();
          }}
        />
      )}

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
