export type PriceSource = 'xianyu' | 'qiandao' | 'dewu' | 'manual';
export type InventoryStatus = 'holding' | 'sold' | 'kept';

export interface Product {
  id: string;
  name: string;
  ip: string;
  series: string | null;
  is_secret: boolean;
  retail_price: number;
  released_at: string | null;
  image_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PricePoint {
  id: string;
  product_id: string;
  date: string;
  source: PriceSource;
  low_price: number;
  mid_price: number | null;
  high_price: number | null;
  volume_hint: number | null;
  note: string | null;
  created_at: string;
}

export interface InventoryRow {
  id: string;
  product_id: string;
  acquired_at: string;
  cost_per_unit: number;
  quantity: number;
  source: string | null;
  status: InventoryStatus;
  sold_at: string | null;
  sold_price_per_unit: number | null;
  sold_platform: string | null;
  sold_fee: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductWithLatest extends Product {
  latest_low_price: number | null;
  latest_date: string | null;
  latest_source: PriceSource | null;
}

export const PRICE_SOURCE_LABELS: Record<PriceSource, string> = {
  xianyu: '闲鱼',
  qiandao: '千岛',
  dewu: '得物',
  manual: '手动'
};

export const STATUS_LABELS: Record<InventoryStatus, string> = {
  holding: '持有中',
  sold: '已出',
  kept: '自留'
};
