# popmart-tracker 技术总览

一个人 / 两人合用的泡泡玛特行情与库存追踪 MVP。下面把"它由什么搭起来"和"谁在背后帮你扛活"一次性梳理清楚。

## 一图理解整体架构

```
┌──────────────┐          ┌────────────────────┐         ┌────────────────────┐
│  浏览器/手机  │  HTTPS   │  Next.js 应用       │  REST   │  Supabase 项目      │
│  你 / 家人    │ ───────▶ │  (App Router)       │ ──────▶ │  Postgres + Auth-ish│
│              │          │  - /login           │         │  - app_users        │
│              │          │  - / 看板            │         │  - products / 公用 │
│              │          │  - /products        │         │  - prices   / 公用 │
│              │          │  - /inventory       │         │  - inventory(私有) │
│              │          │  - /quick-price     │         │  - v_inventory_pnl │
│              │          │  - /api/login,me    │         │  - Storage:ppmt_img│
└──────────────┘          └────────────────────┘         └────────────────────┘
                                                                 ▲
                                                                 │ 每 3 天 ping 一次
                                                          ┌──────┴──────┐
                                                          │ GitHub      │
                                                          │ Actions cron│
                                                          └─────────────┘
```

## 技术栈

### 前端 / 应用层

| 组件 | 版本 | 干什么用 |
|---|---|---|
| **Next.js** | 14.2 (App Router) | 同时承载前端 UI 和后端 API 路由（`/api/*`） |
| **React** | 18 | 视图层 |
| **TypeScript** | 5.7 | 类型安全，所有业务代码 `.ts` / `.tsx` |
| **Tailwind CSS** | 3.4 | 全部样式靠原子类，主题色定义在 `tailwind.config.ts`（`ink/muted/line/up/down/accent`） |
| **Recharts** | 2.13 | 价格走势折线图（款式详情页） |
| **date-fns** | 4.1 | 日期格式化 |
| **Zod** | 3.23 | 表单和接口边界的运行时校验（当前用得不重，预留位） |

### 数据层

| 组件 | 用处 |
|---|---|
| **Supabase JS Client** (`@supabase/supabase-js`) | 浏览器端直接对 Postgres REST 接口读写 |
| **`@supabase/ssr`** | 准备给 server 端 cookie 同步的工具（目前主要用浏览器 client） |

### 认证

不依赖 Supabase Auth，**自己实现的轻量 cookie 方案**：

| 文件 | 功能 |
|---|---|
| `src/lib/auth.ts` | `hashPassword(username, password)` → `sha256(username:password)`；`signSession / verifySession` 用 HMAC-SHA256 签 user_id |
| `src/middleware.ts` | 校验 cookie，未登录跳 `/login`，通过后把 user_id 塞进 `x-user-id` header |
| `src/app/api/login/route.ts` | 查 `app_users` 表验证密码，下发签名 cookie |
| `src/app/api/logout/route.ts` | 清 cookie |
| `src/app/api/me/route.ts` | 给浏览器侧返回当前 user_id / username |
| `src/lib/useCurrentUser.ts` | 客户端 hook，带模块级缓存避免重复请求 |

为什么不用 Supabase Auth：两人内部小工具，邮件验证 / 短信验证流程是浪费；手机号 + 密码极简够用。

### 部署相关（当前状态）

| 项 | 状态 |
|---|---|
| 本地开发 | `npm run dev`，端口 3000 |
| 生产部署 | 暂未部署。Next.js 默认推荐 Vercel；也可以放 Cloudflare Pages / 自建 Node 服务器 |
| 仓库 | `github.com/qwexpf12/popmart-tracker`，主分支 `main` |

## 外部服务 / 每个网站都扛了什么活

### Supabase（核心后端 BaaS）

地址 `https://oedgpvfcxffopozjtqoj.supabase.co`，新加坡区域，**Free Plan / nano 实例**。

它一个产品同时给你提供了三类能力：

1. **Postgres 数据库** — 你所有业务数据的家
   - 5 张表 + 2 个视图（结构见下）
   - 内置 `pgcrypto` 扩展（密码 hash 在 SQL 里直接算用得到）
   - RLS（Row Level Security）功能存在，但当前 disable（应用层用 `user_id` 过滤）

2. **Storage** — 文件存储
   - 一个 bucket：`ppmt_img`
   - 用途：商品图片上传，`src/lib/queries.ts` 的 `uploadProductImage()`
   - 公开读，签名 URL 直接挂在 `products.image_url` 字段

3. **REST + Realtime API** — 自动暴露
   - 你建表后无需写 server，浏览器直接通过 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 读写
   - 走 PostgREST 协议，复杂查询用视图来兜（`v_inventory_pnl` / `v_product_latest_price`）

**Free Plan 额度速查**：500 MB 数据库、1 GB Storage、5 GB/月出口流量、闲置 7 天自动暂停。按你的体量 10 年都用不完容量，只需防暂停。

### GitHub（代码 + 免费定时任务）

`github.com/qwexpf12/popmart-tracker`

1. **代码托管** — 私有 repo，main 分支
2. **GitHub Actions** — 免费的 cron 工具
   - 文件：`.github/workflows/supabase-keepalive.yml`
   - 频率：每 3 天 UTC 02:30（北京 10:30）触发一次
   - 行为：用 `SUPABASE_ANON_KEY` 调一次 REST API 查 `app_users` 表，刷新 Supabase 的活动时间戳，避免 7 天自动暂停
   - 失败会发邮件到你 GitHub 注册邮箱
   - 也可在 Actions 页签手动点 Run workflow 测试
3. **Secrets 管理** — 把 anon key 等敏感配置藏在 repo Settings → Secrets and variables → Actions，CI 才能用、代码看不到

## 数据库结构

### 表

| 表 | 归属 | 关键字段 | 说明 |
|---|---|---|---|
| `app_users` | 公共 | `id`, `username`, `password_hash`, `display_name` | 账号表，密码用 `sha256(username:password)` |
| `products` | 公用 | `id`, `name`, `ip`, `series`, `is_secret`, `retail_price`, `image_url` | 款式 / 商品。两个账号都能看、都能录入 |
| `prices` | 公用 | `id`, `product_id`, `date`, `source`, `low/mid/high_price` | 行情时间序列。`source = xianyu/qiandao/dewu/manual`，按 (产品×日期×来源) 唯一 |
| `inventory` | **按 `user_id` 私有** | `id`, `user_id`, `product_id`, `acquired_at`, `cost_per_unit`, `quantity`, `status` ('holding'/'sold'/'kept'), 出货相关字段 | 你的进货、出货、自留记录。两个账号互相看不到 |

### 视图（让前端少算一些）

- `v_product_latest_price` — 每款最新价格点的快照
- `v_inventory_pnl` — 每条库存的实时盈亏（持有按当前估值，已售按实际差价）

### 表 / 视图触发器

- `trg_products_updated` / `trg_inventory_updated` —— 自动维护 `updated_at` 字段

### 迁移文件

```
supabase/
├── schema.sql                       # 初始建库
├── migration-002-sale-fields.sql    # 增加 sale_method / tracking_no / buyer_info
├── migration-003-multi-user.sql     # 加 app_users + inventory.user_id（多账号）
└── fix-passwords.sql                # 应急：重置某账号密码 / 关 RLS
```

## 页面与权责

| 路由 | 文件 | 干什么 |
|---|---|---|
| `/login` | `src/app/login/page.tsx` | 手机号 + 密码登录 |
| `/` | `src/app/page.tsx` | 看板：浮盈、实现盈亏、近 30 天涨跌榜、压货超过 30 天的"老库存" |
| `/products` | `src/app/products/page.tsx` | 款式列表 + 新增 |
| `/products/[id]` | `src/app/products/[id]/page.tsx` | 单品页：价格走势图、录入新价、该款式当前的本人库存 |
| `/quick-price` | `src/app/quick-price/page.tsx` | 批量快速录价（多款一起录） |
| `/inventory` | `src/app/inventory/page.tsx` | 库存全览：tab 切持有/已出/自留/全部、进货登记、出货登记 |

公共组件：`src/components/NavBar.tsx`（含登录用户胶囊）、`SellModal.tsx`、`PriceChart.tsx`、`ImageUpload.tsx` 等。

## 一次完整的"操作链路"举例

例子：你登录后给"怦然心动婚礼版"添加 2 件库存

```
浏览器 /inventory 点 "+进货登记"
     │
     ├─ fetch GET /api/me               ──▶ middleware 验 cookie ──▶ 返回 user_id
     │
     └─ Supabase JS SDK
        .from('inventory').insert({user_id, product_id, ...})
                                        ──▶ Postgres 写入一行
                                        ──▶ 触发器更新 updated_at
                                        ──▶ 视图 v_inventory_pnl 自动反映新行
     │
     └─ reload() 重新 fetch listProducts + listInventoryPnL(user_id)
                                        ──▶ 列表刷新，看到新进货
```

家人那边登录另一个账号看不到这条记录（`inventory.user_id` 过滤）。
但她录价格 / 加新款式时，你这边能看到（`products` / `prices` 不过滤）。

## 安全模型（务实版）

| 风险 | 处理 |
|---|---|
| 密码明文泄露 | 库里只存 hash，不存明文 |
| Cookie 被篡改 | HMAC-SHA256 签名，篡改后服务端识别立即拒 |
| XSS 偷 cookie | cookie 设 `HttpOnly + sameSite=lax + secure(生产)` |
| Anon key 被反编译看到 | anon key 本身就是公开设计，真正的保护在 RLS 或应用层过滤（当前用应用层）|
| 家人误删别人数据 | 应用层 `user_id` 过滤；恶意场景没防（属于"信任合用人"的边界） |

如果以后想升级到"强隔离"（家人即使打开 devtools 改请求也偷不到你的库存）：把 `inventory` 表 enable RLS + 策略 `user_id = auth.uid()`，同时把认证切到 Supabase Auth。这是一次性中等工作量。

## 后续可能升级的路线（按性价比排序）

1. **部署到 Vercel** —— Free Plan 够用，5 分钟接好，可以在手机上随时打开
2. **图片懒加载 + 多尺寸** —— Supabase Storage 的 image transformation
3. **价格爬虫** —— 用 Cloudflare Workers / Vercel Cron 定时扒闲鱼 + 千岛公共数据自动入 `prices`
4. **多设备同步购物车 / 选品清单** —— 新加一张 `wishlists` 表
5. **升级 Supabase Pro ($25/月)** —— 解除闲置暂停 + 8 GB 数据库 + 自动每日备份；只有上爬虫或者数据 > 400MB 再考虑
6. **强账号隔离** —— Supabase Auth + RLS（同上"安全模型"段）

## 环境变量

`.env.local`（不进 git）：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://oedgpvfcxffopozjtqoj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
AUTH_SECRET=...   # cookie HMAC 用，32 字节 hex
```

`.env.example` 是模板，可以进 git。

## 常用命令

```bash
npm run dev          # 本地开发
npm run build        # 生产构建
npm run start        # 生产模式启动
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
```

## 给"忘了项目长什么样的未来你"的快速指南

- 想加新功能 → 先开 `src/app/` 找到对应路由
- 数据库要改字段 → 在 `supabase/` 新加一份 `migration-NNN-xxx.sql`，再去 SQL Editor 跑
- 想新加一个账号 → 跑一段 `insert into app_users ...`，参考 `fix-passwords.sql`
- Supabase 项目被暂停了 → 登 dashboard 点 Restore；同时检查 GitHub Actions 是不是连续失败
- 忘记密码 → 用 `fix-passwords.sql` 改 hash，不需要重启任何东西
