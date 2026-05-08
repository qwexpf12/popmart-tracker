# 泡泡 · 行情台

个人专用的泡泡玛特行情与库存追踪站。

闲鱼、千岛、得物三个二级市场的价格手动录入 → 自动出价格曲线、库存浮盈、跳水预警。
不爬虫、不抢购，只解决一件事：**让你比凭感觉做决策的人更赚钱。**

## 功能

- 看板：库存总成本 / 当前估值 / 浮盈 / 30 天涨跌 TOP5 / 长期压货预警
- 款式：列表、新增、详情（90 天价格曲线、多源对比、最新低价）
- 快速录价：移动端友好，逛闲鱼/千岛时随手批量记录
- 库存：进货登记、自动估值、出货登记、净利润计算

## 技术栈

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres + 自动 REST)
- Recharts (图表)
- 部署：Vercel + Supabase 免费额度即可

## 准备工作

### 1. 创建 Supabase 项目

1. 去 https://supabase.com 注册（免费）
2. 新建项目，区域选 Singapore 或 Tokyo（亚洲访问快）
3. 等项目初始化（约 1 分钟）

### 2. 执行 schema

进入项目 → SQL Editor → 新 query → 把 `supabase/schema.sql` 全部内容粘贴进去 → Run。

会创建：

- `products` 款式表
- `prices` 二级市场每日价格快照
- `inventory` 个人进货/出货记录
- `v_product_latest_price` 最新价视图
- `v_inventory_pnl` 库存浮盈视图

### 3. 拿到 API 密钥

Settings → API → 复制：

- `Project URL`
- `anon public` key

### 4. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入上一步两个值。

## 本地启动

```bash
npm install
npm run dev
```

打开 http://localhost:3000

## 部署到 Vercel

1. push 到 GitHub 私有仓库（**别公开**，是给自己用的）
2. Vercel → New Project → 选这个仓库
3. Environment Variables 里填两个 Supabase 变量
4. Deploy

部署完会拿到一个 `xxx.vercel.app` 域名，手机浏览器打开即可。

### 装到手机桌面（PWA 体验）

iOS Safari / Android Chrome 打开你的 Vercel 域名 → 「分享」→「添加到主屏幕」。

之后点桌面图标就像 App 一样打开，全屏使用。

## 日常使用建议

### 一次性建数据（30 分钟）

1. 把你最关注的 20–30 款先在「款式」里建好
2. 把你手上已有的库存在「库存」录一遍

### 日常（每天 5 分钟）

- 早上刷闲鱼时打开「快速录价」，挨个填当日最低价 → 一次性提交
- 周末打开「看板」看 30 天涨跌 TOP5 + 长期压货预警，决定下周策略

### 决策建议

- 看板的「跌幅 TOP5」如果你正好持有 → 重点出货对象
- 看板的「压货 30 天以上」是资金被困的信号 → 哪怕亏一点也建议清掉
- 详情页的「vs 30 天前」决定要不要追

## 数据备份

Supabase 免费版每天自动备份，但建议每月手动导出一次：

```sql
select * from products;
select * from prices;
select * from inventory;
```

把结果导出 CSV 存本地。

## 隐私

- 这是个人工具，**不要做成对外网站**
- Vercel 域名虽然不公开搜索，但任何人知道地址都能访问 → 后续建议加 Basic Auth
- 数据库 RLS 默认关闭（单用户场景），如果打算多人用务必先启用 RLS

## 不做的事

- 不抢购、不批量下单（违反小程序服务条款 + 法律风险）
- 不爬闲鱼/千岛（违反平台 ToS，且容易被封 IP）
- 不公开分享数据（这是你的信息差，分享出去就不值钱了）

## 后续可扩展（按性价比）

- [ ] 海外 Pop Mart 发售公告 RSS 监控
- [ ] 微信通知（跳水预警、新品发售）
- [ ] 基于历史涨幅曲线的「同款新品预测」
- [ ] 多账号支持（开 RLS）
- [ ] 简单的 Basic Auth 防陌生人访问
