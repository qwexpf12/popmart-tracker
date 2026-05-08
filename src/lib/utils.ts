import clsx, { type ClassValue } from 'clsx';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';

export function cx(...args: ClassValue[]) {
  return clsx(args);
}

export function formatYuan(n: number | null | undefined, opts: { decimals?: number } = {}) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const decimals = opts.decimals ?? 0;
  return `¥${n.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}

export function formatDate(d: string | null | undefined, pattern = 'MM-dd') {
  if (!d) return '—';
  try {
    return format(parseISO(d), pattern);
  } catch {
    return d;
  }
}

export function daysBetween(from: string, to: string = new Date().toISOString().slice(0, 10)) {
  try {
    return differenceInCalendarDays(parseISO(to), parseISO(from));
  } catch {
    return 0;
  }
}

export function pctChange(now: number | null | undefined, base: number | null | undefined) {
  if (!now || !base || base === 0) return null;
  return ((now - base) / base) * 100;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
