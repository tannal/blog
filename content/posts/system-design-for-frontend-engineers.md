---
title: 前端工程师的系统设计：从组件设计到分布式架构
excerpt: 很多前端工程师在系统设计面试中折戟，不是因为不聪明，而是缺乏框架。本文从前端视角出发，系统讲解如何设计可扩展的 Web 应用。
coverImage: https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop
category: 后端架构
tags: [Performance, GraphQL, REST]
author: zhangjian
createdAt: 2025-03-01
readTime: 20
views: 11200
featured: true
---

# 前端工程师的系统设计

系统设计不只是后端工程师的事。随着前端承担越来越多的责任，理解整个系统的架构变得至关重要。本文从前端工程师的视角出发，系统介绍如何设计高可用、高性能的 Web 应用。

## 设计的起点：明确需求

好的系统设计从明确需求开始，需求分两类：

### 功能需求（做什么）

以设计一个"类微博"平台为例：

- 用户可以发布最多 280 字的动态
- 用户可以关注其他用户
- 用户可以看到关注者的动态（时间线）
- 支持点赞、评论、转发
- 支持图片和视频上传

### 非功能需求（怎么做）

- **规模**：DAU 5000 万，每天产生 1 亿条动态
- **性能**：时间线加载 < 200ms，发帖延迟 < 100ms
- **可用性**：99.99% uptime（全年不超过 52 分钟宕机）
- **一致性**：允许最终一致性（不要求实时同步）

## 容量估算

这是系统设计的关键步骤，决定了技术选型：

```
DAU: 5000 万用户
每用户每天平均发 2 条动态 → 每天 1 亿条动态
每条动态平均 100 字节 → 每天 10GB 文本数据
图片：每条动态 50% 概率有图，平均 200KB → 每天 10TB 图片
视频：每条动态 10% 概率有视频，平均 10MB → 每天 100TB 视频

QPS（每秒请求数）：
写入：1亿条 / 86400秒 ≈ 1200 QPS（峰值 3x ≈ 3600 QPS）
读取：写读比约 1:10 → 12000 QPS（峰值 36000 QPS）

存储（5年）：
文本：10GB × 365 × 5 = 18TB
图片 + 视频：(10TB + 100TB) × 365 × 5 ≈ 200PB（需要 CDN）
```

## 整体架构

```
Client
  │
  ├── CDN（静态资源、图片、视频）
  │
  └── API Gateway
        │
        ├── Auth Service（JWT 验证）
        │
        ├── Feed Service（时间线生成）
        │     ├── 推模式（写扩散）
        │     └── 拉模式（读扩散）
        │
        ├── Post Service（发帖、删帖）
        │     └── Message Queue（异步处理）
        │
        ├── Media Service（图片/视频上传）
        │     └── Object Storage（S3/OSS）
        │
        └── Notification Service（通知推送）
              └── WebSocket 长连接
```

## 时间线设计：推模式 vs 拉模式

这是本题最核心的设计决策。

### 推模式（写扩散/Fan-out on Write）

用户发帖时，立即将帖子写入所有关注者的时间线缓存：

```
用户 A 发帖
  │
  └── 查询 A 的所有关注者（假设 1000 人）
        │
        └── 将帖子 ID 写入这 1000 人的 Feed 缓存
              └── Redis List：LPUSH user:123:feed postId
```

**优点**：读取时间线极快（直接读缓存）
**缺点**：大 V 发帖（千万粉丝）时，写扩散造成巨大写压力

```javascript
// 推模式的写入逻辑
async function publishPost(userId: string, postId: string) {
  // 1. 保存帖子到数据库
  await db.posts.insert({ id: postId, userId, createdAt: new Date() })

  // 2. 获取所有关注者
  const followers = await db.follows.findMany({
    where: { followeeId: userId },
    select: { followerId: true },
  })

  // 3. 异步写入所有关注者的 Feed（通过消息队列）
  await messageQueue.publish('feed.fanout', {
    postId,
    followerIds: followers.map(f => f.followerId),
  })
}

// 消费者：将帖子写入 Feed 缓存
async function handleFanout({ postId, followerIds }: FanoutMessage) {
  const pipeline = redis.pipeline()
  for (const followerId of followerIds) {
    pipeline.lpush(`user:${followerId}:feed`, postId)
    pipeline.ltrim(`user:${followerId}:feed`, 0, 999) // 只保留最新 1000 条
  }
  await pipeline.exec()
}
```

### 拉模式（读扩散/Fan-out on Read）

读取时间线时，实时拉取所有关注者的最新帖子并合并：

```javascript
async function getTimeline(userId: string, page: number) {
  // 1. 获取所有关注的人
  const following = await db.follows.findMany({
    where: { followerId: userId },
    select: { followeeId: true },
  })

  // 2. 从每个人那里拉取最新帖子（并行）
  const postGroups = await Promise.all(
    following.map(f =>
      db.posts.findMany({
        where: { userId: f.followeeId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
    )
  )

  // 3. 合并、排序、分页
  const allPosts = postGroups.flat()
  return allPosts
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(page * 20, (page + 1) * 20)
}
```

**优点**：写入简单，大 V 无压力
**缺点**：关注了 2000 人时，读取需要合并 2000 个列表，延迟高

### 混合模式（Twitter 的实际方案）

```
普通用户（< 10万粉丝）：推模式
大 V（> 10万粉丝）：拉模式

读取时间线：
1. 从缓存读取推模式 Feed（普通用户的帖子）
2. 实时拉取用户关注的大 V 的最新帖子
3. 合并两个列表并排序
```

```javascript
async function getHybridTimeline(userId: string) {
  // 并行执行推拉两种方式
  const [cachedFeed, celebPosts] = await Promise.all([
    // 从缓存读取普通用户的推送
    redis.lrange(`user:${userId}:feed`, 0, 99),

    // 实时拉取大 V 的帖子
    getCelebPosts(userId),
  ])

  // 合并并去重
  const postIds = [...new Set([...cachedFeed, ...celebPosts.map(p => p.id)])]

  // 批量获取帖子详情
  const posts = await db.posts.findMany({
    where: { id: { in: postIds } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return posts
}
```

## 缓存策略

### 多级缓存

```
请求
  │
  ├── L1: 浏览器缓存（静态资源、HTTP Cache-Control）
  │
  ├── L2: CDN 缓存（图片、视频、静态 API 响应）
  │
  ├── L3: 应用层缓存（Redis）
  │     ├── 用户信息：key = user:${id}, TTL = 1小时
  │     ├── 时间线：key = feed:${userId}, TTL = 10分钟
  │     └── 热门帖子：key = post:${id}, TTL = 5分钟
  │
  └── L4: 数据库（PostgreSQL / MySQL）
```

### 缓存更新策略

```javascript
// Cache-aside（旁路缓存）：最常用的模式
async function getUser(id: string) {
  // 1. 先查缓存
  const cached = await redis.get(`user:${id}`)
  if (cached) return JSON.parse(cached)

  // 2. 缓存未命中，查数据库
  const user = await db.users.findUnique({ where: { id } })
  if (!user) return null

  // 3. 写入缓存
  await redis.setex(`user:${id}`, 3600, JSON.stringify(user))
  return user
}

// 更新时主动删除缓存（而不是更新）
async function updateUser(id: string, data: Partial<User>) {
  await db.users.update({ where: { id }, data })
  await redis.del(`user:${id}`) // 下次读取时重新加载
}
```

## API 设计

### RESTful vs GraphQL

对于这种社交平台，GraphQL 有明显优势：

**问题场景**：首页需要展示时间线，每条动态需要作者信息、点赞数、评论数、是否已关注作者……

RESTful 方案需要多次请求（N+1 问题）：

```
GET /feed              → 获取 20 条帖子 ID
GET /posts/1           → 帖子详情
GET /users/author_1    → 作者信息
GET /posts/1/stats     → 点赞数、评论数
... × 20
= 61 次请求！
```

GraphQL 方案一次搞定：

```graphql
query GetTimeline($userId: ID!, $cursor: String) {
  timeline(userId: $userId, first: 20, after: $cursor) {
    edges {
      node {
        id
        content
        createdAt
        author {
          id
          name
          avatar
          isFollowing
        }
        stats {
          likeCount
          commentCount
          shareCount
        }
        isLiked
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### 接口幂等性

发帖、点赞等写操作必须设计为幂等，防止重复提交：

```javascript
// 使用幂等键（Idempotency Key）
router.post('/posts', async (req, res) => {
  const idempotencyKey = req.headers['x-idempotency-key']

  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key required' })
  }

  // 检查是否已处理过这个请求
  const existing = await redis.get(`idempotency:${idempotencyKey}`)
  if (existing) {
    return res.json(JSON.parse(existing)) // 返回缓存的响应
  }

  // 处理请求
  const post = await createPost(req.body)

  // 缓存响应（24小时内相同 key 直接返回）
  await redis.setex(
    `idempotency:${idempotencyKey}`,
    86400,
    JSON.stringify(post)
  )

  return res.status(201).json(post)
})
```

## 实时通知：WebSocket vs SSE

### Server-Sent Events（适合单向推送）

```javascript
// 服务端
app.get('/notifications/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const userId = req.user.id

  // 订阅 Redis Pub/Sub
  const subscriber = redis.duplicate()
  subscriber.subscribe(`notifications:${userId}`)

  subscriber.on('message', (channel, message) => {
    res.write(`data: ${message}\n\n`)
  })

  // 连接断开时清理
  req.on('close', () => {
    subscriber.unsubscribe()
    subscriber.quit()
  })
})

// 客户端
const eventSource = new EventSource('/notifications/stream')

eventSource.onmessage = (event) => {
  const notification = JSON.parse(event.data)
  showNotification(notification)
}
```

### WebSocket（适合双向实时通信）

```javascript
// 服务端（使用 ws 库）
const wss = new WebSocket.Server({ port: 8080 })
const clients = new Map<string, WebSocket>()

wss.on('connection', (ws, req) => {
  const userId = authenticateConnection(req)
  clients.set(userId, ws)

  ws.on('message', async (data) => {
    const { type, payload } = JSON.parse(data.toString())

    if (type === 'SEND_MESSAGE') {
      const message = await saveMessage(userId, payload)
      // 推送给接收方
      const recipientWs = clients.get(payload.recipientId)
      if (recipientWs?.readyState === WebSocket.OPEN) {
        recipientWs.send(JSON.stringify({ type: 'NEW_MESSAGE', message }))
      }
    }
  })

  ws.on('close', () => clients.delete(userId))
})
```

## 故障容错

### 熔断器模式

```javascript
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private threshold: number = 5,    // 失败次数阈值
    private timeout: number = 60000   // 熔断持续时间（ms）
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failures = 0
    this.state = 'CLOSED'
  }

  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()
    if (this.failures >= this.threshold) {
      this.state = 'OPEN'
    }
  }
}

// 使用
const dbBreaker = new CircuitBreaker(5, 30000)

async function getUser(id: string) {
  return dbBreaker.execute(() =>
    db.users.findUnique({ where: { id } })
  )
}
```

## 前端的系统设计职责

前端工程师在系统设计中应该关注：

- **资源加载策略**：代码分割、懒加载、预加载的时机
- **缓存策略**：Service Worker、HTTP 缓存头、前端状态缓存
- **离线能力**：Progressive Web App，IndexedDB 本地存储
- **性能监控**：Core Web Vitals，Real User Monitoring
- **错误边界**：优雅降级，局部失败不影响整体

```javascript
// 前端的请求队列与重试
class RequestQueue {
  private queue: Array<() => Promise<any>> = []
  private processing = false

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await this.withRetry(request))
        } catch (error) {
          reject(error)
        }
      })
      this.process()
    })
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000
  ): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      if (retries <= 0) throw error
      await new Promise(r => setTimeout(r, delay))
      return this.withRetry(fn, retries - 1, delay * 2) // 指数退避
    }
  }

  private async process() {
    if (this.processing) return
    this.processing = true
    while (this.queue.length > 0) {
      const task = this.queue.shift()!
      await task()
    }
    this.processing = false
  }
}
```

## 总结

系统设计没有标准答案，关键是在各种约束条件下做出合理的权衡：

- **一致性 vs 可用性**：AP 系统（高可用）接受最终一致性
- **延迟 vs 吞吐量**：缓存降低延迟，但增加数据复杂度
- **简单性 vs 功能性**：从简单开始，按需扩展
- **推模式 vs 拉模式**：根据读写比和用户规模决定

对于前端工程师，理解系统设计不只是为了面试，更是为了在日常工作中做出更好的技术决策：什么时候该用 WebSocket，什么时候用 SSE；什么时候该缓存数据，什么时候该实时请求；什么时候该在前端做，什么时候该推给后端。
