'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createProduct } from '@/lib/queries';
import ImagePicker from '@/components/ImagePicker';

const COMMON_IPS = ['LABUBU', 'SKULLPANDA', 'MOLLY', 'DIMOO', 'CRYBABY', 'HIRONO', 'PUCKY', 'HACIPUPU'];

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    ip: 'LABUBU',
    series: '',
    is_secret: false,
    retail_price: 99,
    released_at: '',
    image_url: '',
    notes: ''
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.ip.trim()) {
      setErr('款名和 IP 必填');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const created = await createProduct({
        name: form.name.trim(),
        ip: form.ip.trim(),
        series: form.series.trim() || null,
        is_secret: form.is_secret,
        retail_price: Number(form.retail_price) || 0,
        released_at: form.released_at || null,
        image_url: form.image_url.trim() || null,
        notes: form.notes.trim() || null
      });
      router.push(`/products/${created.id}`);
    } catch (e: any) {
      setErr(e?.message || '创建失败');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">新增款式</h1>
        <Link href="/products" className="btn-ghost text-sm">取消</Link>
      </div>

      <div>
        <label className="label">款名 *</label>
        <input
          className="field"
          placeholder="例如：LABUBU 怦然心动 婚礼版"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">IP *</label>
          <input
            className="field"
            list="ip-list"
            value={form.ip}
            onChange={(e) => setForm({ ...form, ip: e.target.value })}
          />
          <datalist id="ip-list">
            {COMMON_IPS.map((ip) => (
              <option key={ip} value={ip} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label">系列</label>
          <input
            className="field"
            placeholder="如 怦然心动系列"
            value={form.series}
            onChange={(e) => setForm({ ...form, series: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">官方零售价（元）</label>
          <input
            type="number"
            className="field"
            value={form.retail_price}
            onChange={(e) => setForm({ ...form, retail_price: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="label">发售日</label>
          <input
            type="date"
            className="field"
            value={form.released_at}
            onChange={(e) => setForm({ ...form, released_at: e.target.value })}
          />
        </div>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.is_secret}
          onChange={(e) => setForm({ ...form, is_secret: e.target.checked })}
        />
        <span className="text-sm">隐藏款 / 限定款</span>
      </label>

      <div>
        <label className="label">图片</label>
        <ImagePicker
          value={form.image_url || null}
          onChange={(url) => setForm({ ...form, image_url: url ?? '' })}
        />
      </div>

      <div>
        <label className="label">备注</label>
        <textarea
          className="field"
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      {err && <p className="text-down text-sm">{err}</p>}

      <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
        {busy ? '保存中…' : '保存'}
      </button>
    </form>
  );
}
