'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import type { PricePoint, PriceSource } from '@/lib/types';
import { PRICE_SOURCE_LABELS } from '@/lib/types';

interface Props {
  points: PricePoint[];
  height?: number;
}

const COLORS: Record<PriceSource, string> = {
  xianyu: '#f59e0b',
  qiandao: '#3b82f6',
  dewu: '#10b981',
  manual: '#6b7280'
};

export default function PriceChart({ points, height = 240 }: Props) {
  const { data, sources } = useMemo(() => {
    const dateMap = new Map<string, any>();
    const srcSet = new Set<PriceSource>();
    points.forEach((p) => {
      srcSet.add(p.source);
      const row = dateMap.get(p.date) ?? { date: p.date };
      row[p.source] = p.low_price;
      dateMap.set(p.date, row);
    });
    return {
      data: Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
      sources: Array.from(srcSet)
    };
  }, [points]);

  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-muted text-sm">
        还没有价格数据
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke="oklch(92% 0.01 280)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => d.slice(5)}
          stroke="oklch(55% 0.02 280)"
          fontSize={11}
        />
        <YAxis stroke="oklch(55% 0.02 280)" fontSize={11} width={48} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid oklch(92% 0.01 280)' }}
          formatter={(v: number, name: string) => [`¥${v}`, PRICE_SOURCE_LABELS[name as PriceSource]]}
        />
        <Legend
          formatter={(value) => PRICE_SOURCE_LABELS[value as PriceSource]}
          wrapperStyle={{ fontSize: 12 }}
        />
        {sources.map((s) => (
          <Line
            key={s}
            type="monotone"
            dataKey={s}
            stroke={COLORS[s]}
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
