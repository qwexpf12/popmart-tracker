-- 给 inventory 表加销售相关字段
-- 在 Supabase SQL Editor 粘贴执行；可重复执行（add column if not exists）

alter table inventory add column if not exists sale_method  text;     -- 快递 / 同城面交 / 自取 / 无需发货
alter table inventory add column if not exists tracking_no  text;     -- 快递单号（仅快递时填）
alter table inventory add column if not exists buyer_info   text;     -- 买家信息（昵称/手机末四/留言）

-- 检查
select column_name, data_type
from information_schema.columns
where table_name = 'inventory'
order by ordinal_position;
