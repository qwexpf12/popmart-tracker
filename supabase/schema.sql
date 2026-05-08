-- 泡泡玛特行情与库存追踪：核心 schema
-- 在 Supabase 项目的 SQL Editor 中粘贴执行一次

do $$ begin
  create type price_source as enum ('xianyu', 'qiandao', 'dewu', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inventory_status as enum ('holding', 'sold', 'kept');
exception when duplicate_object then null; end $$;

create table if not exists products (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  ip            text not null,
  series        text,
  is_secret     boolean not null default false,
  retail_price  numeric(10,2) not null default 0,
  released_at   date,
  image_url     text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_products_ip on products(ip);
create index if not exists idx_products_released_at on products(released_at desc);

create table if not exists prices (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id) on delete cascade,
  date         date not null,
  source       price_source not null,
  low_price    numeric(10,2) not null,
  mid_price    numeric(10,2),
  high_price   numeric(10,2),
  volume_hint  integer,
  note         text,
  created_at   timestamptz not null default now(),
  unique (product_id, date, source)
);

create index if not exists idx_prices_product_date on prices(product_id, date desc);
create index if not exists idx_prices_date on prices(date desc);

create table if not exists inventory (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references products(id) on delete restrict,
  acquired_at         date not null,
  cost_per_unit       numeric(10,2) not null,
  quantity            integer not null check (quantity > 0),
  source              text,
  status              inventory_status not null default 'holding',
  sold_at             date,
  sold_price_per_unit numeric(10,2),
  sold_platform       text,
  sold_fee            numeric(10,2) not null default 0,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_inventory_product on inventory(product_id);
create index if not exists idx_inventory_status on inventory(status);
create index if not exists idx_inventory_acquired_at on inventory(acquired_at desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated on products;
create trigger trg_products_updated
  before update on products for each row execute function set_updated_at();

drop trigger if exists trg_inventory_updated on inventory;
create trigger trg_inventory_updated
  before update on inventory for each row execute function set_updated_at();

create or replace view v_product_latest_price as
select distinct on (p.id)
  p.id           as product_id,
  pr.date        as latest_date,
  pr.source      as latest_source,
  pr.low_price   as latest_low_price,
  pr.mid_price   as latest_mid_price
from products p
left join prices pr on pr.product_id = p.id
order by p.id, pr.date desc nulls last, pr.created_at desc nulls last;

create or replace view v_inventory_pnl as
select
  inv.id,
  inv.product_id,
  inv.acquired_at,
  inv.cost_per_unit,
  inv.quantity,
  inv.status,
  vlp.latest_low_price,
  case
    when inv.status = 'holding' then (coalesce(vlp.latest_low_price, 0) - inv.cost_per_unit) * inv.quantity
    when inv.status = 'sold'    then (coalesce(inv.sold_price_per_unit, 0) - inv.cost_per_unit) * inv.quantity - inv.sold_fee
    else 0
  end as pnl,
  current_date - inv.acquired_at as held_days
from inventory inv
left join v_product_latest_price vlp on vlp.product_id = inv.product_id;

alter table products  disable row level security;
alter table prices    disable row level security;
alter table inventory disable row level security;
