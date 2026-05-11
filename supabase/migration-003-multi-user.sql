-- 多账户支持：库存私有 + 价格走势公用
-- 在 Supabase SQL Editor 中粘贴执行一次
--
-- 注意：执行前如需修改两个账号密码，请改下面两行 INSERT 里的明文密码。
-- 密码哈希算法：sha256(username + ':' + password)，与 src/lib/auth.ts 保持一致。

create extension if not exists pgcrypto;

-- 1) 账户表
create table if not exists app_users (
  id            uuid primary key default gen_random_uuid(),
  username      text not null unique,
  password_hash text not null,
  display_name  text,
  created_at    timestamptz not null default now()
);

-- 2) 插入两个账号（旧账号密码替换为你自己的真实密码）
insert into app_users (username, password_hash, display_name)
values (
  '18515616534',
  encode(digest('18515616534:' || 'CHANGE_ME_OLD_PASSWORD', 'sha256'), 'hex'),
  '老账号'
)
on conflict (username) do nothing;

insert into app_users (username, password_hash, display_name)
values (
  '18065287388',
  encode(digest('18065287388:' || '180652', 'sha256'), 'hex'),
  '新账号'
)
on conflict (username) do nothing;

-- 3) 给 inventory 加 user_id 列（先允许空，回填后再设 not null）
alter table inventory
  add column if not exists user_id uuid references app_users(id) on delete restrict;

-- 4) 回填：旧库存全部归原账号 18515616534
update inventory
   set user_id = (select id from app_users where username = '18515616534')
 where user_id is null;

-- 5) 设为必填
alter table inventory
  alter column user_id set not null;

create index if not exists idx_inventory_user on inventory(user_id);
create index if not exists idx_inventory_user_status on inventory(user_id, status);

-- 6) 视图 v_inventory_pnl 已按 inventory.id 计算，无需重建
--    （所有库存查询会在 SQL 之外通过 user_id 过滤）

-- 7) 关掉 app_users 的 RLS，dev server 用 anon key 才能查到
alter table app_users disable row level security;
