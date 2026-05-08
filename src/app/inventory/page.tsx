'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listProducts,
  listInventoryPnL,
  createInventory,
  markSold
} from '@/lib/queries';
import type { ProductWithLatest, InventoryRow, InventoryStatus } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/types';
import { formatYuan, formatDate, todayISO, cx, daysBetween } from '@/lib/utils';

type PnLRow = InventoryRow & { latest_low_price: number | null; pnl: number; held_days: number };

export default function InventoryPage() {
  const [products, setProducts] = useState<ProductWithLatest[]>([]);
  const [rows, setRows] = useState<PnLRow[]>([]);
  const [tab, setTab] = useState<InventoryStatus | 'all'>('holding');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [sellingId, setSellingId] = useState<string | null>(null);

  async function reload() {
    const [ps, ip] = await Promise.all([listProducts(), listInventoryPnL()]);
    setProducts(ps);
    setRows(ip);
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
  }, []);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const filtered = useMemo(() => {
    if (tab === 'all') return rows;
    return rows.filter((r) => r.status === tab);
  }, [rows, tab]);

  const summary = useMemo(() => {
    const holding = rows.filter((r) => r.status === 'holding');
    const sold = rows.filter((r) => r.status === 'sold');
    const cost = holding.reduce((s, r) => s + r.cost_per_unit * r.quantity, 0);
    const value = holding.reduce(
      (s, r) => s + (r.latest_low_price ?? r.cost_per_unit) * r.quantity,
      0
    );
    const realized = sold.reduce((s, r) => s + r.pnl, 0);
    return { cost, value, unrealized: value - cost, realized, holdingCount: holding.length };
  }, [rows]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">库存</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ 进货登记</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="持有款数" value={summary.holdingCount.toString()} />
        <Stat label="总成本" value={formatYuan(summary.cost)} />
        <Stat label="当前估值" value={formatYuan(summary.value)} />
        <Stat
          label="浮盈"
          value={formatYuan(summary.unrealized)}
          accent={summary.unrealized >= 0 ? 'up' : 'down'}
          sub={`已实现 ${formatYuan(summary.realized)}`}
        />
      </div>

      <div className="flex gap-1 border-b border-line">
        {(['holding', 'sold', 'kept', 'all'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              'px-3 py-2 text-sm border-b-2 -mb-px transition',
              tab === t ? 'border-ink text-ink font-medium' : 'border-transparent text-muted'
            )}
          >
            {t === 'all' ? '全部' : STATUS_LABELS[t]}
          </button>
        ))}
      </div>

      {loading && <p className="text-muted">加载中…</p>}
      {err && <p className="text-down">{err}</p>}

      {!loading && filtered.length === 0 && (
        <p className="text-muted text-center py-8">没有记录</p>
      )}

      <ul className="divide-y divide-line">
        {filtered.map((r) => {
          const p = productMap.get(r.product_id);
          const days = daysBetween(r.acquired_at);
          return (
            <li key={r.id} className="py-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link href={`/products/${r.product_id}`} className="font-medium truncate block">
                  {p?.name ?? '未知款式'}
                </Link>
                <p className="text-xs text-muted mt-0.5">
                  {formatDate(r.acquired_at, 'yyyy-MM-dd')} · {r.source ?? '—'} · {r.quantity}件 ·
                  成本 {formatYuan(r.cost_per_unit)}/件
                  {r.status === 'holding' && ` · 压 ${days} 天`}
                </p>
                {r.status === 'sold' && (
                  <p className="text-xs text-muted">
                    {formatDate(r.sold_at, 'yyyy-MM-dd')} 出 ·
                    {formatYuan(r.sold_price_per_unit)}/件 · 手续费 {formatYuan(r.sold_fee)}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className={cx('font-mono', r.pnl >= 0 ? 'text-up' : 'text-down')}>
                  {r.pnl >= 0 ? '+' : ''}
                  {formatYuan(r.pnl)}
                </p>
                {r.status === 'holding' && (
                  <button
                    onClick={() => setSellingId(r.id)}
                    className="text-xs text-accent mt-1"
                  >
                    标记已出
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {showAdd && (
        <AddInventoryModal
          products={products}
          onClose={() => setShowAdd(false)}
          onSaved={async () => {
            setShowAdd(false);
            await reload();
          }}
        />
      )}

      {sellingId && (
        <SellModal
          row={rows.find((r) => r.id === sellingId)!}
          product={productMap.get(rows.find((r) => r.id === sellingId)!.product_id)}
          onClose={() => setSellingId(null)}
          onSaved={async () => {
            setSellingId(null);
            await reload();
          }}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'up' | 'down';
}) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={cx(
          'text-xl font-mono mt-1',
          accent === 'up' && 'text-up',
          accent === 'down' && 'text-down'
        )}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}

function AddInventoryModal({
  products,
  onClose,
  onSaved
}: {
  products: ProductWithLatest[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    product_id: products[0]?.id ?? '',
    acquired_at: todayISO(),
    cost_per_unit: 0,
    quantity: 1,
    source: '泡泡玛特小程序',
    notes: ''
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.product_id) {
      setErr('请选款式');
      return;
    }
    setBusy(true);
    try {
      await createInventory({
        ...form,
        status: 'holding',
        sold_at: null,
        sold_price_per_unit: null,
        sold_platform: null,
        sold_fee: 0
      });
      onSaved();
    } catch (e: any) {
      setErr(e?.message || '保存失败');
      setBusy(false);
    }
  }

  return (
    <Modal title="进货登记" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="label">款式</label>
          <select
            className="field"
            value={form.product_id}
            onChange={(e) => setForm({ ...form, product_id: e.target.value })}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">进货日期</label>
            <input
              type="date"
              className="field"
              value={form.acquired_at}
              onChange={(e) => setForm({ ...form, acquired_at: e.target.value })}
            />
          </div>
          <div>
            <label className="label">渠道</label>
            <input
              className="field"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">单件成本 ¥</label>
            <input
              type="number"
              className="field"
              value={form.cost_per_unit}
              onChange={(e) => setForm({ ...form, cost_per_unit: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">数量</label>
            <input
              type="number"
              min={1}
              className="field"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            />
          </div>
        </div>
        <div>
          <label className="label">备注</label>
          <input
            className="field"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        {err && <p className="text-down text-sm">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            取消
          </button>
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
            {busy ? '保存…' : '保存'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SellModal({
  row,
  product,
  onClose,
  onSaved
}: {
  row: PnLRow;
  product?: ProductWithLatest;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    sold_at: todayISO(),
    sold_price_per_unit: row.latest_low_price ?? row.cost_per_unit,
    sold_platform: '闲鱼',
    sold_fee: 0
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await markSold(row.id, form);
      onSaved();
    } catch (e: any) {
      setErr(e?.message || '保存失败');
      setBusy(false);
    }
  }

  const profit = (form.sold_price_per_unit - row.cost_per_unit) * row.quantity - form.sold_fee;

  return (
    <Modal title={`标记已出 — ${product?.name ?? ''}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">出货日期</label>
            <input
              type="date"
              className="field"
              value={form.sold_at}
              onChange={(e) => setForm({ ...form, sold_at: e.target.value })}
            />
          </div>
          <div>
            <label className="label">平台</label>
            <input
              className="field"
              value={form.sold_platform}
              onChange={(e) => setForm({ ...form, sold_platform: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">单件出价 ¥</label>
            <input
              type="number"
              className="field"
              value={form.sold_price_per_unit}
              onChange={(e) =>
                setForm({ ...form, sold_price_per_unit: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="label">手续费+运费</label>
            <input
              type="number"
              className="field"
              value={form.sold_fee}
              onChange={(e) => setForm({ ...form, sold_fee: Number(e.target.value) })}
            />
          </div>
        </div>
        <p className="text-sm">
          预计净利润：
          <span className={cx('font-mono ml-2', profit >= 0 ? 'text-up' : 'text-down')}>
            {profit >= 0 ? '+' : ''}
            {formatYuan(profit)}
          </span>
        </p>
        {err && <p className="text-down text-sm">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            取消
          </button>
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
            {busy ? '保存…' : '确认出货'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({
  title,
  children,
  onClose
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-t-2xl md:rounded-2xl w-full md:max-w-lg p-5 max-h-[85vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-medium mb-3">{title}</h2>
        {children}
      </div>
    </div>
  );
}
