-- 修复账号密码 + 关掉 app_users 的 RLS
-- 在 Supabase SQL Editor 里整段粘贴执行
--
-- 修改方式：只动下面 values 里那 3 列字符串：
--   - 第 1 列：账号（手机号）
--   - 第 2 列：你想要的明文密码
--   - 第 3 列：显示名（任意）
-- 不要再去改 digest(...) 里的字符串，前缀会自动用第 1 列的值拼。

with new_users(username, password, display_name) as (
  values
    ('15947231730'::text, '159472'::text, '老账号'::text),
    ('18065287388'::text, '180652'::text, '新账号'::text)
)
insert into app_users (username, password_hash, display_name)
select
  username,
  encode(digest(username || ':' || password, 'sha256'), 'hex'),
  display_name
from new_users
on conflict (username) do update
  set password_hash = excluded.password_hash,
      display_name  = excluded.display_name;

-- 关掉 RLS：dev server 用 anon key 才能查到这张表
alter table app_users disable row level security;


-- 验证
select username, display_name,
       password_hash = encode(digest(username || ':' || case
         when username = '15947231730' then '159472'
         when username = '18065287388' then '180652'
       end, 'sha256'), 'hex') as password_ok
  from app_users
 where username in ('15947231730', '18065287388')
 order by username;
