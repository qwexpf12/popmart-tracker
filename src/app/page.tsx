'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listInventoryPnL, listProducts, listPrices } from '@/lib/queries';
import type { ProductWithLatest, InventoryRow } from '@/lib/types';
import { formatYuan, cx, daysBetween } from '@/lib/utils';
import { hasSupabaseConfig } from '@/lib/supabase';
import { fetchCurrentUser } from '@/lib/useCurrentUser';

type PnLRow = InventoryRow & { latest_low_price: number | null; pnl: number; held_days: number };

interface Movers {
  product: ProductWithLatest;
  change30d: number | null;
  latest: number | null;
}

export default function Dashboard() {
  const [configured] = useState(hasSupabaseConfig());
  const [products, setProducts] = useState<ProductWithLatest[]>([]);
  const [pnl, setPnl] = useState<PnLRow[]>([]);
  const [movers, setMovers] = useState<Movers[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const me = await fetchCurrentUser();
        const [ps, ip] = await Promise.all([listProducts(), listInventoryPnL(me.user_id)]);
        setProducts(ps);
        setPnl(ip);

        const moverData: Movers[] = await Promise.all(
          ps.slice(0, 30).map(async (p) => {
            const series = await listPrices(p.id, 30);
            const earliest = series[0]?.low_price ?? null;
            const latest = series[series.length - 1]?.low_price ?? p.latest_low_price ?? null;
            const ch =
              earliest && latest && earliest !== 0 ? ((latest - earliest) / earliest) * 100 : null;
            return { product: p, change30d: ch, latest };
          })
        );
        setMovers(moverData);
      } catch (e: any) {
        setErr(e?.message || '加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [configured]);

  if (!configured) return <SetupHint />;
  if (loading) return <p className="text-muted">加载中…</p>;
  if (err) return <p className="text-down">出错了：{err}</p>;

  const holding = pnl.filter((r) => r.status === 'holding');
  const totalCost = holding.reduce((s, r) => s + r.cost_per_unit * r.quantity, 0);
  const totalValue = holding.reduce(
    (s, r) => s + (r.latest_low_price ?? r.cost_per_unit) * r.quantity,
    0
  );
  const totalPnL = totalValue - totalCost;
  const realizedPnL = pnl.filter((r) => r.status === 'sold').reduce((s, r) => s + r.pnl, 0);

  const topGain = [...movers]
    .filter((m) => m.change30d !== null)
    .sort((a, b) => b.change30d! - a.change30d!)
    .slice(0, 5);
  const topLoss = [...movers]
    .filter((m) => m.change30d !== null)
    .sort((a, b) => a.change30d! - b.change30d!)
    .slice(0, 5);
  const stale = holding
    .map((r) => ({ ...r, days: daysBetween(r.acquired_at) }))
    .filter((r) => r.days > 30)
    .sort((a, b) => b.days - a.days)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">看板</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="持有款数" value={holding.length.toString()} />
        <Stat label="库存成本" value={formatYuan(totalCost)} />
        <Stat label="当前估值" value={formatYuan(totalValue)} />
        <Stat
          label="浮动盈亏"
          value={formatYuan(totalPnL)}
          accent={totalPnL >= 0 ? 'up' : 'down'}
          sub={`已实现 ${formatYuan(realizedPnL)}`}
        />
      </div>

      <section className="grid md:grid-cols-2 gap-4">
        <Panel title="30 日涨幅 TOP5">
          {topGain.length === 0 ? (
            <Empty hint="还没有足够价格数据，去『录价』录入吧" />
          ) : (
            <ul className="divide-y divide-line">
              {topGain.map((m) => (
                <Mover key={m.product.id} m={m} />
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="30 日跌幅 TOP5（小心手上有货）">
          {topLoss.length === 0 ? (
            <Empty hint="—" />
          ) : (
            <ul className="divide-y divide-line">
              {topLoss.map((m) => (
                <Mover key={m.product.id} m={m} />
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <Panel title="压货 30 天以上（建议出清）">
        {stale.length === 0 ? (
          <Empty hint="目前没有长期压货" />
        ) : (
          <ul className="divide-y divide-line">
            {stale.map((r) => {
              const product = products.find((p) => p.id === r.product_id);
              return (
                <li key={r.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{product?.name ?? '未知款式'}</p>
                    <p className="text-sm text-muted">
                      压货 {r.days} 天 · 数量 {r.quantity} · 成本 {formatYuan(r.cost_per_unit)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted">当前低价</p>
                    <p className="font-mono">{formatYuan(r.latest_low_price)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div className="flex flex-wrap gap-3">
        <Link href="/quick-price" className="btn-primary">+ 今日录价</Link>
        <Link href="/products/new" className="btn-ghost">+ 新增款式</Link>
        <Link href="/inventory" className="btn-ghost">查看库存</Link>
      </div>
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
          'text-xl md:text-2xl font-mono mt-1',
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h2 className="font-medium mb-2">{title}</h2>
      {children}
    </div>
  );
}

function Mover({ m }: { m: Movers }) {
  const ch = m.change30d ?? 0;
  return (
    <li className="py-2.5 flex items-center justify-between">
      <Link href={`/products/${m.product.id}`} className="flex-1">
        <p className="font-medium truncate">{m.product.name}</p>
        <p className="text-xs text-muted">{m.product.ip}</p>
      </Link>
      <div className="text-right">
        <p className="font-mono text-sm">{formatYuan(m.latest)}</p>
        <p className={cx('text-xs font-medium', ch >= 0 ? 'text-up' : 'text-down')}>
          {ch >= 0 ? '+' : ''}
          {ch.toFixed(1)}%
        </p>
      </div>
    </li>
  );
}

function Empty({ hint }: { hint: string }) {
  return <p className="text-sm text-muted py-4 text-center">{hint}</p>;
}

function SetupHint() {
  return (
    <div className="card p-6 max-w-xl">
      <h2 className="text-lg font-semibold mb-2">先连接 Supabase</h2>
      <ol className="list-decimal pl-5 text-sm space-y-1 text-muted">
        <li>去 supabase.com 创建免费项目</li>
        <li>在 SQL Editor 粘贴并执行 <code>supabase/schema.sql</code></li>
        <li>把 Project URL + anon key 填到根目录 <code>.env.local</code>（参考 <code>.env.example</code>）</li>
        <li>重启 <code>npm run dev</code></li>
      </ol>
    </div>
  );
}
