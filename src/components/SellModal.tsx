'use client';

import { useState } from 'react';
import { splitAndSell } from '@/lib/queries';
import type { InventoryRow, SaleMethod } from '@/lib/types';
import { SALE_METHODS } from '@/lib/types';
import { todayISO, formatYuan, cx } from '@/lib/utils';

const PLATFORMS = ['闲鱼', '千岛', '得物', '微信好友', '同好群', '微店', '小红书', '其他'];

interface Props {
  row: InventoryRow;
  productName?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function SellModal({ row, productName, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    sell_quantity: row.quantity,
    sold_at: todayISO(),
    sold_price_per_unit: row.cost_per_unit,
    sold_platform: '闲鱼',
    sold_fee: 0,
    sale_method: '快递' as SaleMethod,
    tracking_no: '',
    buyer_info: ''
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isExpress = form.sale_method === '快递';
  const profit =
    (form.sold_price_per_unit - row.cost_per_unit) * form.sell_quantity - form.sold_fee;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (form.sell_quantity <= 0 || form.sell_quantity > row.quantity) {
      setErr(`出库数量必须在 1 ~ ${row.quantity} 之间`);
      return;
    }
    if (form.sold_price_per_unit <= 0) {
      setErr('出货单价必须大于 0');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await splitAndSell(row.id, form.sell_quantity, {
        sold_at: form.sold_at,
        sold_price_per_unit: form.sold_price_per_unit,
        sold_platform: form.sold_platform,
        sold_fee: form.sold_fee,
        sale_method: form.sale_method,
        tracking_no: isExpress ? form.tracking_no.trim() || null : null,
        buyer_info: isExpress ? form.buyer_info.trim() || null : null
      });
      onSaved();
    } catch (e: any) {
      setErr(e?.message || '保存失败');
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-t-2xl md:rounded-2xl w-full md:max-w-lg p-5 max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-medium mb-1">出库登记</h2>
        <p className="text-xs text-muted mb-4">
          {productName ?? ''} · 该批进货 {row.quantity} 件 · 成本 {formatYuan(row.cost_per_unit)}/件
        </p>

        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">出库数量</label>
              <input
                type="number"
                min={1}
                max={row.quantity}
                className="field"
                value={form.sell_quantity}
                onChange={(e) =>
                  setForm({ ...form, sell_quantity: Number(e.target.value) })
                }
              />
              {form.sell_quantity < row.quantity && (
                <p className="text-xs text-muted mt-1">
                  剩余 {row.quantity - form.sell_quantity} 件继续持有
                </p>
              )}
            </div>
            <div>
              <label className="label">出库日期</label>
              <input
                type="date"
                className="field"
                value={form.sold_at}
                onChange={(e) => setForm({ ...form, sold_at: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">单件出价 ¥</label>
              <input
                type="number"
                step="0.01"
                className="field"
                value={form.sold_price_per_unit}
                onChange={(e) =>
                  setForm({ ...form, sold_price_per_unit: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="label">手续费+运费 ¥</label>
              <input
                type="number"
                step="0.01"
                className="field"
                value={form.sold_fee}
                onChange={(e) => setForm({ ...form, sold_fee: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">成交平台</label>
              <input
                className="field"
                list="platform-list"
                value={form.sold_platform}
                onChange={(e) => setForm({ ...form, sold_platform: e.target.value })}
              />
              <datalist id="platform-list">
                {PLATFORMS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label">发货方式</label>
              <select
                className="field"
                value={form.sale_method}
                onChange={(e) =>
                  setForm({ ...form, sale_method: e.target.value as SaleMethod })
                }
              >
                {SALE_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isExpress && (
            <div className="space-y-2 p-3 rounded-xl bg-line/40">
              <div>
                <label className="label">快递单号</label>
                <input
                  className="field"
                  placeholder="如 SF1234567890"
                  value={form.tracking_no}
                  onChange={(e) => setForm({ ...form, tracking_no: e.target.value })}
                />
              </div>
              <div>
                <label className="label">买家信息</label>
                <textarea
                  className="field"
                  rows={2}
                  placeholder="买家昵称 · 手机末四 · 留言等"
                  value={form.buyer_info}
                  onChange={(e) => setForm({ ...form, buyer_info: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="text-sm pt-1">
            预计净利润：
            <span className={cx('font-mono ml-2', profit >= 0 ? 'text-up' : 'text-down')}>
              {profit >= 0 ? '+' : ''}
              {formatYuan(profit)}
            </span>
          </div>

          {err && <p className="text-down text-sm">{err}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              取消
            </button>
            <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
              {busy ? '保存中…' : '确认出库'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
