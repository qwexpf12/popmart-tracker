'use client';

import { useRef, useState } from 'react';
import { uploadProductImage } from '@/lib/queries';
import { cx } from '@/lib/utils';

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
}

export default function ImagePicker({ value, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [draftUrl, setDraftUrl] = useState(value ?? '');

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErr('图片超过 5MB，换一张小点的');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const url = await uploadProductImage(file);
      onChange(url);
      setDraftUrl(url);
    } catch (e: any) {
      setErr(e?.message || '上传失败');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={cx(
            'px-3 py-1 rounded-lg text-xs',
            mode === 'upload' ? 'bg-ink text-white' : 'bg-line/60 text-muted'
          )}
        >
          上传图片
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={cx(
            'px-3 py-1 rounded-lg text-xs',
            mode === 'url' ? 'bg-ink text-white' : 'bg-line/60 text-muted'
          )}
        >
          贴 URL
        </button>
      </div>

      {mode === 'upload' ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="btn-ghost border border-line disabled:opacity-50"
          >
            {busy ? '上传中…' : value ? '更换图片' : '选择 / 拍照'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setDraftUrl('');
              }}
              className="text-xs text-down"
            >
              移除
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            className="field"
            placeholder="https://..."
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            onBlur={() => onChange(draftUrl.trim() || null)}
          />
          <button
            type="button"
            onClick={() => onChange(draftUrl.trim() || null)}
            className="btn-ghost border border-line text-sm"
          >
            应用
          </button>
        </div>
      )}

      {err && <p className="text-down text-xs">{err}</p>}

      {value && (
        <div className="mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="预览"
            className="w-32 h-32 object-cover rounded-xl border border-line"
            onError={() => setErr('图片加载失败，请确认链接可访问')}
          />
        </div>
      )}
    </div>
  );
}
