import { getSupabase } from './supabase';
import type {
  Product,
  ProductWithLatest,
  PricePoint,
  PriceSource,
  InventoryRow
} from './types';

export async function listProducts(): Promise<ProductWithLatest[]> {
  const sb = getSupabase();
  const { data: products, error } = await sb
    .from('products')
    .select('*')
    .order('released_at', { ascending: false, nullsFirst: false });
  if (error) throw error;

  const { data: latest, error: e2 } = await sb.from('v_product_latest_price').select('*');
  if (e2) throw e2;

  const map = new Map<string, any>();
  (latest ?? []).forEach((r: any) => map.set(r.product_id, r));

  return ((products ?? []) as Product[]).map((p) => {
    const l = map.get(p.id);
    return {
      ...p,
      latest_low_price: l?.latest_low_price ?? null,
      latest_date: l?.latest_date ?? null,
      latest_source: l?.latest_source ?? null
    };
  });
}

export async function getProduct(id: string): Promise<Product | null> {
  const sb = getSupabase();
  const { data, error } = await sb.from('products').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Product;
}

export async function createProduct(input: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
  const sb = getSupabase();
  const { data, error } = await sb.from('products').insert(input).select().single();
  if (error) throw error;
  return data as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('products').delete().eq('id', id);
  if (error) {
    if (error.code === '23503') {
      throw new Error('该款式还有库存记录，先在库存页处理掉再删除');
    }
    throw error;
  }
}

export async function listPrices(productId: string, days = 90): Promise<PricePoint[]> {
  const sb = getSupabase();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await sb
    .from('prices')
    .select('*')
    .eq('product_id', productId)
    .gte('date', since.toISOString().slice(0, 10))
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PricePoint[];
}

export async function recordPrice(input: {
  product_id: string;
  date: string;
  source: PriceSource;
  low_price: number;
  mid_price?: number | null;
  high_price?: number | null;
  volume_hint?: number | null;
  note?: string | null;
}) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('prices')
    .upsert(input, { onConflict: 'product_id,date,source' })
    .select()
    .single();
  if (error) throw error;
  return data as PricePoint;
}

export async function listInventory(): Promise<InventoryRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('inventory')
    .select('*')
    .order('acquired_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as InventoryRow[];
}

export async function listInventoryPnL(): Promise<
  Array<InventoryRow & { latest_low_price: number | null; pnl: number; held_days: number }>
> {
  const sb = getSupabase();
  const [inv, pnl] = await Promise.all([
    sb.from('inventory').select('*'),
    sb.from('v_inventory_pnl').select('*')
  ]);
  if (inv.error) throw inv.error;
  if (pnl.error) throw pnl.error;
  const map = new Map<string, any>();
  (pnl.data ?? []).forEach((r: any) => map.set(r.id, r));
  return ((inv.data ?? []) as InventoryRow[]).map((row) => {
    const v = map.get(row.id);
    return {
      ...row,
      latest_low_price: v?.latest_low_price ?? null,
      pnl: Number(v?.pnl ?? 0),
      held_days: Number(v?.held_days ?? 0)
    };
  });
}

export async function createInventory(input: Omit<InventoryRow, 'id' | 'created_at' | 'updated_at'>) {
  const sb = getSupabase();
  const { data, error } = await sb.from('inventory').insert(input).select().single();
  if (error) throw error;
  return data as InventoryRow;
}

export async function uploadProductImage(file: File): Promise<string> {
  const sb = getSupabase();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safe = ext.replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safe}`;
  const { data, error } = await sb.storage
    .from('ppmt_img')
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (error) throw error;
  const { data: urlData } = sb.storage.from('ppmt_img').getPublicUrl(data.path);
  return urlData.publicUrl;
}

export interface SellPatch {
  sold_at: string;
  sold_price_per_unit: number;
  sold_platform?: string | null;
  sold_fee?: number;
  sale_method?: string | null;
  tracking_no?: string | null;
  buyer_info?: string | null;
}

export async function markSold(id: string, patch: SellPatch) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('inventory')
    .update({ ...patch, status: 'sold' })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as InventoryRow;
}

export async function markKept(id: string) {
  const sb = getSupabase();
  const { error } = await sb.from('inventory').update({ status: 'kept' }).eq('id', id);
  if (error) throw error;
}

export async function splitAndSell(id: string, sellQuantity: number, patch: SellPatch) {
  const sb = getSupabase();
  const { data: orig, error: e1 } = await sb.from('inventory').select('*').eq('id', id).single();
  if (e1) throw e1;
  const row = orig as InventoryRow;

  if (sellQuantity <= 0) throw new Error('出库数量必须大于 0');
  if (sellQuantity > row.quantity) throw new Error(`出库数量超过该批库存 (${row.quantity})`);

  if (sellQuantity === row.quantity) {
    return markSold(id, patch);
  }

  const remaining = row.quantity - sellQuantity;
  const { error: e2 } = await sb
    .from('inventory')
    .update({ quantity: remaining })
    .eq('id', id);
  if (e2) throw e2;

  const insertRow = {
    product_id: row.product_id,
    acquired_at: row.acquired_at,
    cost_per_unit: row.cost_per_unit,
    quantity: sellQuantity,
    source: row.source,
    status: 'sold' as const,
    notes: row.notes,
    sold_at: patch.sold_at,
    sold_price_per_unit: patch.sold_price_per_unit,
    sold_platform: patch.sold_platform ?? null,
    sold_fee: patch.sold_fee ?? 0,
    sale_method: patch.sale_method ?? null,
    tracking_no: patch.tracking_no ?? null,
    buyer_info: patch.buyer_info ?? null
  };
  const { error: e3 } = await sb.from('inventory').insert(insertRow);
  if (e3) throw e3;
}

export async function listInventoryByProduct(productId: string): Promise<InventoryRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('inventory')
    .select('*')
    .eq('product_id', productId)
    .order('acquired_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as InventoryRow[];
}
