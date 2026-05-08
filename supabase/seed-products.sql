-- 启动 seed：常见热门款（请按实际情况增删改）
-- 在 Supabase SQL Editor 粘贴执行；执行前可先 select * from products; 看下是否已有数据

-- 注意：
--   1. 发售日期 released_at 是参考，不一定准确，建议核对官方资料后修正
--   2. is_secret 标记的是隐藏款 / 限定款（含部分 MEGA、限定联名）
--   3. 想清空重来：truncate products restart identity cascade;

insert into products (name, ip, series, is_secret, retail_price, released_at) values

-- ============ THE MONSTERS（LABUBU 母系列） ============
('LABUBU 前方高能',                       'LABUBU', '前方高能系列',     false, 79.00,  '2023-09-29'),
('LABUBU 大有来头',                       'LABUBU', '大有来头系列',     false, 79.00,  '2024-04-12'),
('LABUBU 心动马卡龙',                      'LABUBU', '心动马卡龙系列',   false, 79.00,  '2024-10-25'),
('LABUBU 心动马卡龙 隐藏款',                'LABUBU', '心动马卡龙系列',   true,  79.00,  '2024-10-25'),
('LABUBU 怦然心动',                       'LABUBU', '怦然心动系列',     false, 99.00,  '2025-04-25'),
('LABUBU 怦然心动 婚礼版（隐藏）',           'LABUBU', '怦然心动系列',     true,  99.00,  '2025-04-25'),
('LABUBU 时光宝盒',                       'LABUBU', '时光宝盒系列',     false, 99.00,  '2025-08-15'),
('LABUBU MEGA 1000% 经典款',              'LABUBU', 'MEGA 系列',       false, 1099.00,'2024-06-01'),
('LABUBU MEGA 400% 经典款',               'LABUBU', 'MEGA 系列',       false, 599.00, '2024-06-01'),

-- ============ SKULLPANDA ============
('SKULLPANDA 温度系列',                    'SKULLPANDA', '温度系列',       false, 69.00,  '2021-05-21'),
('SKULLPANDA 密林古堡',                    'SKULLPANDA', '密林古堡系列',    false, 69.00,  '2022-11-25'),
('SKULLPANDA 暗夜古堡',                    'SKULLPANDA', '暗夜古堡系列',    false, 69.00,  '2023-10-13'),
('SKULLPANDA 失重星球',                    'SKULLPANDA', '失重星球系列',    false, 69.00,  '2024-06-21'),

-- ============ MOLLY ============
('MOLLY 一二三木头人',                      'MOLLY', '一二三木头人系列',   false, 69.00,  '2022-07-29'),
('MOLLY 我的牛仔时代',                      'MOLLY', '我的牛仔时代系列',   false, 79.00,  '2024-05-17'),
('MEGA MOLLY 1000% 经典版',                'MOLLY', 'MEGA 系列',         false, 1099.00,'2021-11-01'),

-- ============ DIMOO ============
('DIMOO 太空旅行',                          'DIMOO', '太空旅行系列',       false, 59.00,  '2019-10-25'),
('DIMOO 童话日记',                          'DIMOO', '童话日记系列',       false, 69.00,  '2022-09-23'),
('DIMOO 沙漠之旅',                          'DIMOO', '沙漠之旅系列',       false, 79.00,  '2024-08-30'),

-- ============ CRYBABY ============
('CRYBABY 哭包系列',                        'CRYBABY', '哭包系列',         false, 69.00,  '2023-06-30'),
('CRYBABY 在我心里',                        'CRYBABY', '在我心里系列',      false, 79.00,  '2024-08-09'),

-- ============ HIRONO（小野） ============
('HIRONO 城市',                            'HIRONO', '城市系列',          false, 69.00,  '2023-05-26'),
('HIRONO 重生',                            'HIRONO', '重生系列',          false, 79.00,  '2024-03-22'),
('HIRONO 小小盆友',                        'HIRONO', '小小盆友系列',       false, 79.00,  '2024-12-20'),

-- ============ HACIPUPU ============
('HACIPUPU 心动秘境',                      'HACIPUPU', '心动秘境系列',     false, 79.00,  '2024-11-15'),

-- ============ PUCKY ============
('PUCKY 婴儿星球',                         'PUCKY', '婴儿星球系列',        false, 59.00,  '2020-08-21')

on conflict do nothing;

-- 检查
select count(*) as total, ip, count(*) filter (where is_secret) as secrets
from products
group by ip
order by total desc;
