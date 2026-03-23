---
title: PostgreSQL 性能调优实战：从慢查询到毫秒级响应
excerpt: 通过真实案例讲解 PostgreSQL 索引设计、查询优化、执行计划分析和连接池配置，将查询从秒级优化到毫秒级。
coverImage: https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&auto=format&fit=crop
category: 后端架构
tags: [Go, REST, Testing]
author: zhangjian
createdAt: 2025-02-22
readTime: 19
views: 7680
featured: false
---

# PostgreSQL 性能调优实战：从慢查询到毫秒级响应

数据库是大多数应用的性能瓶颈所在。我见过太多团队在应用层做各种优化，却忽视了最关键的数据库层。本文将用真实案例，讲解如何系统地排查和解决 PostgreSQL 性能问题。

## 一、找到慢查询：slow query log

优化的第一步永远是找到问题所在。启用 PostgreSQL 的慢查询日志：

```sql
-- 记录执行时间超过 1 秒的查询
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_statement = 'none';  -- 只记录慢查询，不记录全部
SELECT pg_reload_conf();

-- 或者在 postgresql.conf 中设置
-- log_min_duration_statement = 1000
-- log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
```

更强大的工具是 `pg_stat_statements` 扩展，它会统计所有查询的执行次数、总时间、平均时间：

```sql
-- 启用扩展
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 找出最耗时的查询（按总执行时间排序）
SELECT
  round(total_exec_time::numeric, 2) AS total_ms,
  calls,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS percentage,
  left(query, 100) AS query_preview
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

## 二、理解执行计划：EXPLAIN ANALYZE

找到慢查询后，用 `EXPLAIN ANALYZE` 查看执行计划：

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  p.id,
  p.title,
  p.created_at,
  u.name AS author_name,
  COUNT(c.id) AS comment_count
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN comments c ON c.post_id = p.id
WHERE p.category = 'technology'
  AND p.published_at > NOW() - INTERVAL '30 days'
GROUP BY p.id, u.name
ORDER BY p.created_at DESC
LIMIT 20;
```

执行计划输出解读：

```
Limit  (cost=1523.45..1523.50 rows=20 width=68) (actual time=234.521..234.528 rows=20 loops=1)
  ->  Sort  (cost=1523.45..1525.95 rows=1000 width=68) (actual time=234.518..234.522 rows=20 loops=1)
        Sort Key: p.created_at DESC
        Sort Method: top-N heapsort  Memory: 27kB
        ->  HashAggregate  (cost=1478.45..1493.45 rows=1000 width=68) (actual time=233.812..234.071 rows=1000 loops=1)
              Group Key: p.id, u.name
              ->  Hash Left Join  (cost=523.00..1428.45 rows=10000 width=60) (actual time=5.234..228.456 rows=10000 loops=1)
                    Hash Cond: (c.post_id = p.id)
                    ->  Hash Join  (cost=12.50..823.50 rows=1000 width=52) (actual time=0.421..18.234 rows=1000 loops=1)
                          Hash Cond: (p.user_id = u.id)
                          ->  Seq Scan on posts p  (cost=0.00..800.00 rows=1000 width=44)
                                (actual time=0.012..15.234 rows=1000 loops=1)
                                Filter: ((category = 'technology') AND (published_at > (now() - '30 days'::interval)))
                                Rows Removed by Filter: 49000  -- ⚠️ 这里！过滤了 49000 行
```

重点关注：

- **Seq Scan**：全表扫描，通常是需要加索引的信号
- **Rows Removed by Filter**：过滤掉的行数越多，越需要索引
- **actual time**：实际执行时间，远超 cost 估算说明统计信息过时
- **Buffers: hit / read**：hit 是从缓存读，read 是从磁盘读，read 多说明缓存命中率低

## 三、索引设计：不只是加个索引那么简单

### 复合索引的列顺序至关重要

```sql
-- 查询条件
WHERE category = 'technology' AND published_at > '2025-01-01'

-- ❌ 错误的索引顺序（选择性低的列放前面）
CREATE INDEX idx_posts_published_category ON posts (published_at, category);
-- 先按时间范围筛选，结果集还是很大，再按 category 过滤效果差

-- ✅ 正确的索引顺序（选择性高的列放前面，等值条件在前，范围条件在后）
CREATE INDEX idx_posts_category_published ON posts (category, published_at DESC);
-- 先精确定位 category='technology' 的子集，再按时间范围过滤，效率大幅提升
```

### 覆盖索引：避免回表

```sql
-- 查询需要 id, title, created_at 三个字段
SELECT id, title, created_at
FROM posts
WHERE category = 'technology'
ORDER BY created_at DESC
LIMIT 20;

-- 普通索引：通过索引找到行 id，再回表查 title 等字段（Extra: Using filesort + 回表）
CREATE INDEX idx_posts_category ON posts (category);

-- 覆盖索引：索引中包含查询所需的所有字段，无需回表
CREATE INDEX idx_posts_category_covering
ON posts (category, created_at DESC)
INCLUDE (id, title);  -- INCLUDE 中的字段存储在叶子节点，不参与排序
```

### 部分索引：只索引需要的数据

```sql
-- 只有已发布的文章才会被查询
-- ❌ 对全表建索引，90% 的数据（草稿）永远不会被用到
CREATE INDEX idx_posts_published_at ON posts (published_at);

-- ✅ 部分索引：只索引已发布的文章，体积更小，效率更高
CREATE INDEX idx_posts_published_at_partial
ON posts (published_at DESC)
WHERE status = 'published';

-- 使用部分索引的查询必须包含索引条件
SELECT * FROM posts
WHERE status = 'published'  -- 必须有这个条件，否则不会用部分索引
  AND published_at > '2025-01-01'
ORDER BY published_at DESC;
```

### 函数索引

```sql
-- 查询用户时忽略大小写
-- ❌ 函数操作后索引失效
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';

-- ✅ 在函数结果上建索引
CREATE INDEX idx_users_email_lower ON users (LOWER(email));

-- JSON 字段索引
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);  -- 数组和 JSON
CREATE INDEX idx_posts_metadata ON posts USING GIN (metadata jsonb_path_ops);
```

## 四、真实案例：将 8 秒查询优化到 20ms

这是我们生产环境遇到的真实案例。电商订单列表查询：

```sql
-- 原始查询，执行时间 8 秒
SELECT
  o.id,
  o.order_no,
  o.status,
  o.total_amount,
  o.created_at,
  u.name AS user_name,
  u.phone,
  COUNT(oi.id) AS item_count
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON oi.order_id = o.id
WHERE o.merchant_id = 12345
  AND o.status IN ('pending', 'processing')
  AND o.created_at BETWEEN '2025-01-01' AND '2025-03-01'
GROUP BY o.id, u.name, u.phone
ORDER BY o.created_at DESC
LIMIT 20 OFFSET 0;
```

执行计划显示：
- `Seq Scan on orders`：扫描了 200 万行订单
- `Rows Removed by Filter: 1980000`：过滤掉了 99% 的数据

**优化步骤：**

```sql
-- 步骤 1：添加复合索引（选择性分析：merchant_id 过滤 ~99.9%，status 进一步过滤）
CREATE INDEX idx_orders_merchant_status_created
ON orders (merchant_id, status, created_at DESC)
WHERE status IN ('pending', 'processing');

-- 步骤 2：覆盖索引优化（避免回表）
CREATE INDEX idx_orders_merchant_status_created_covering
ON orders (merchant_id, created_at DESC)
INCLUDE (id, order_no, status, total_amount, user_id)
WHERE status IN ('pending', 'processing');

-- 步骤 3：优化 COUNT 子查询（避免 JOIN 后 GROUP BY）
SELECT
  o.id,
  o.order_no,
  o.status,
  o.total_amount,
  o.created_at,
  u.name AS user_name,
  u.phone,
  item_counts.count AS item_count
FROM orders o
JOIN users u ON o.user_id = u.id
-- 用子查询预先聚合，避免笛卡尔积
JOIN LATERAL (
  SELECT COUNT(*) AS count
  FROM order_items oi
  WHERE oi.order_id = o.id
) item_counts ON true
WHERE o.merchant_id = 12345
  AND o.status IN ('pending', 'processing')
  AND o.created_at BETWEEN '2025-01-01' AND '2025-03-01'
ORDER BY o.created_at DESC
LIMIT 20;
```

优化结果：8 秒 → 20ms，提升 400 倍。

## 五、连接池配置：pgBouncer

PostgreSQL 建立连接的开销很大（~5ms），高并发场景下频繁创建销毁连接会拖垮数据库。

```ini
# pgbouncer.ini
[databases]
myapp = host=localhost dbname=myapp

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 5432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# 连接池模式
# session：每个客户端连接独占一个 server 连接（最安全，性能提升有限）
# transaction：事务结束后归还连接（推荐，兼容大多数应用）
# statement：每条语句后归还（不支持事务，慎用）
pool_mode = transaction

# 最大 server 连接数（不能超过 PostgreSQL 的 max_connections）
max_client_conn = 1000
default_pool_size = 25      # 每个数据库的连接池大小
min_pool_size = 5           # 最小保持的连接数
reserve_pool_size = 5       # 紧急时的额外连接
reserve_pool_timeout = 5    # 等待 reserve 连接的超时秒数

server_idle_timeout = 600   # server 连接空闲超时
client_idle_timeout = 0     # client 连接空闲超时（0=不限制）
```

在 Go 中配置连接池：

```go
import "database/sql"
import _ "github.com/lib/pq"

func NewDB(dsn string) (*sql.DB, error) {
    db, err := sql.Open("postgres", dsn)
    if err != nil {
        return nil, err
    }

    // 连接池配置
    db.SetMaxOpenConns(25)       // 最大打开连接数（对应 pgbouncer 的 default_pool_size）
    db.SetMaxIdleConns(10)       // 最大空闲连接数
    db.SetConnMaxLifetime(1 * time.Hour)   // 连接最大存活时间
    db.SetConnMaxIdleTime(10 * time.Minute) // 连接最大空闲时间

    // 验证连接
    if err := db.PingContext(context.Background()); err != nil {
        return nil, fmt.Errorf("failed to ping database: %w", err)
    }

    return db, nil
}
```

## 六、定期维护：VACUUM 和统计信息

```sql
-- 查看表的膨胀情况
SELECT
  schemaname,
  tablename,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows,
  round(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_ratio,
  last_vacuum,
  last_autovacuum,
  last_analyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- 手动触发 VACUUM（不锁表）
VACUUM ANALYZE orders;

-- 重建索引（会锁表！用 CONCURRENTLY 避免）
REINDEX INDEX CONCURRENTLY idx_orders_merchant_status_created;

-- 更新统计信息（执行计划依赖统计信息做决策）
ANALYZE orders;
```

## 总结

PostgreSQL 性能优化是一个系统工程，按优先级排序：

- **首先**：用 `pg_stat_statements` 找出最慢的查询
- **然后**：用 `EXPLAIN ANALYZE` 分析执行计划，找出 Seq Scan 和高 cost 节点
- **接着**：设计合适的索引（注意列顺序、覆盖索引、部分索引）
- **最后**：配置 pgBouncer 连接池，定期 VACUUM 和 ANALYZE

记住：索引不是越多越好。每个索引都会占用磁盘空间，并在 INSERT/UPDATE/DELETE 时带来额外开销。只给真正需要的查询加索引。
