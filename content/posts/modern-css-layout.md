---
title: 现代 CSS 布局全解：Grid、Flexbox 与容器查询实战
excerpt: 深入讲解 CSS Grid 和 Flexbox 的核心差异与配合使用，以及改变响应式设计思路的容器查询，附大量实战案例。
coverImage: https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&auto=format&fit=crop
category: 前端开发
tags: [CSS, React, Performance]
author: chenmeiling
createdAt: 2025-03-08
readTime: 16
views: 5430
featured: false
---

# 现代 CSS 布局全解：Grid、Flexbox 与容器查询实战

CSS 布局在过去十年经历了翻天覆地的变化。从 float 时代的各种 hack，到 Flexbox 的出现解放了一维布局，再到 Grid 带来的真正二维布局能力，如今容器查询的出现更是彻底改变了我们写响应式样式的方式。

本文不会从零介绍这些技术，而是聚焦于实战中最常遇到的场景和最容易犯的错误。

## 一、Flexbox vs Grid：选哪个？

这是最常被问到的问题，答案其实很简单：

- **Flexbox**：内容决定布局，一维方向，适合导航栏、按钮组、卡片内部布局
- **Grid**：布局决定内容，二维方向，适合页面整体结构、卡片网格、复杂对齐

但现实中两者经常配合使用：Grid 负责宏观布局，Flexbox 负责组件内部的元素排列。

## 二、Flexbox 实战：那些你可能不知道的技巧

### 用 flex-basis 而不是 width

```css
/* ❌ 在 flex 容器中用 width 会有意外行为 */
.item {
  width: 200px;
}

/* ✅ 用 flex-basis 明确表达意图 */
.item {
  flex: 0 0 200px; /* flex-grow flex-shrink flex-basis */
}
```

### 完美居中的三种方式

```css
/* 方式一：flex（最常用） */
.container {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 方式二：grid（更简洁） */
.container {
  display: grid;
  place-items: center;
}

/* 方式三：margin auto（配合 flex 使用） */
.container {
  display: flex;
}
.child {
  margin: auto; /* 上下左右均分剩余空间 */
}
```

### 圣杯布局（不用一行媒体查询）

```css
.holy-grail {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.sidebar {
  flex: 1 1 200px; /* 最小 200px，可以缩小 */
}

.main {
  flex: 3 1 400px; /* 最小 400px，优先占用空间 */
}

/* 当容器宽度不够时，sidebar 自动换行到 main 下方 */
/* 完全无需媒体查询！ */
```

### gap 替代 margin 间距

```css
/* ❌ 用 margin 处理间距，边界情况复杂 */
.item + .item {
  margin-left: 16px;
}

/* ✅ 用 gap，干净简洁 */
.container {
  display: flex;
  gap: 16px; /* 所有子元素之间的间距 */
  /* 也可以分别设置行列间距 */
  gap: 16px 24px; /* row-gap column-gap */
}
```

## 三、CSS Grid 实战

### grid-template-areas：让布局一目了然

```css
.page-layout {
  display: grid;
  grid-template-areas:
    "header  header  header"
    "sidebar main    main  "
    "footer  footer  footer";
  grid-template-columns: 240px 1fr 1fr;
  grid-template-rows: 64px 1fr 80px;
  min-height: 100vh;
  gap: 0;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.footer  { grid-area: footer; }

/* 响应式：移动端改变布局 */
@media (max-width: 768px) {
  .page-layout {
    grid-template-areas:
      "header"
      "main"
      "sidebar"
      "footer";
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }
}
```

### 自适应卡片网格（最实用的 Grid 技巧）

```css
/* 自动计算列数，每列最小 280px，最大 1fr */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

/* 
  容器 900px：生成 3 列（3×280=840 < 900）
  容器 600px：生成 2 列（2×280=560 < 600）
  容器 320px：生成 1 列（1×280=280 < 320）
  完全自适应，不需要任何媒体查询！
*/
```

### 用 Grid 实现复杂的卡片布局

```css
/* 杂志风格的不等高卡片布局 */
.magazine-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 200px;
  gap: 16px;
}

/* 精选文章横跨 2 列 2 行 */
.card--featured {
  grid-column: span 2;
  grid-row: span 2;
}

/* 普通文章横跨 1 列 1 行（默认） */
.card--normal {
  grid-column: span 1;
  grid-row: span 1;
}
```

在 React 中动态应用：

```tsx
function PostGrid({ posts }: { posts: Post[] }) {
  return (
    <div className="magazine-grid">
      {posts.map((post, index) => (
        <article
          key={post.id}
          className={index === 0 ? 'card card--featured' : 'card card--normal'}
        >
          <img src={post.coverImage} alt={post.title} />
          <div className="card__content">
            <span className="card__category">{post.category}</span>
            <h2 className="card__title">{post.title}</h2>
          </div>
        </article>
      ))}
    </div>
  )
}
```

## 四、容器查询：响应式设计的革命

传统媒体查询是基于**视口宽度**，但我们真正关心的是**组件所在容器的宽度**。

想象一个卡片组件，在侧边栏里应该竖排，在主内容区应该横排——但两种情况下视口宽度可能是一样的，传统媒体查询根本处理不了这种场景。

```css
/* 传统方式：基于视口，无法处理组件在不同容器中的情况 */
@media (min-width: 768px) {
  .card {
    flex-direction: row;
  }
}

/* 容器查询：基于父容器宽度 */
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 400px) {
  .card {
    flex-direction: row;
  }

  .card__image {
    width: 40%;
    flex-shrink: 0;
  }
}
```

### 完整的自适应卡片组件

```tsx
// PostCard.tsx
function PostCard({ post }: { post: Post }) {
  return (
    <div className="card-container">
      <article className="card">
        <div className="card__image-wrapper">
          <img src={post.coverImage} alt={post.title} />
        </div>
        <div className="card__body">
          <span className="card__category">{post.category}</span>
          <h3 className="card__title">{post.title}</h3>
          <p className="card__excerpt">{post.excerpt}</p>
          <div className="card__meta">
            <img src={post.author.avatar} alt={post.author.name} />
            <span>{post.author.name}</span>
            <span>{post.readTime} 分钟阅读</span>
          </div>
        </div>
      </article>
    </div>
  )
}
```

```css
/* PostCard.css */
.card-container {
  container-type: inline-size;
  container-name: post-card;
}

/* 默认：竖排（适合窄容器） */
.card {
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #f0f0f0;
}

.card__image-wrapper {
  aspect-ratio: 16/10;
  overflow: hidden;
}

.card__image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card__body {
  padding: 20px;
}

/* 容器宽度 > 480px：横排 */
@container post-card (min-width: 480px) {
  .card {
    flex-direction: row;
  }

  .card__image-wrapper {
    width: 45%;
    aspect-ratio: auto;
    flex-shrink: 0;
  }

  .card__excerpt {
    display: block; /* 宽容器才显示摘要 */
  }
}

/* 容器宽度 < 480px：隐藏摘要节省空间 */
@container post-card (max-width: 479px) {
  .card__excerpt {
    display: none;
  }
}
```

现在这个卡片组件无论放在哪里——侧边栏、主内容区、模态框——都能根据实际可用宽度自适应布局，完全不依赖视口宽度。

## 五、CSS 自定义属性（变量）驱动主题

```css
/* 设计令牌层 */
:root {
  --color-primary-50: #f5f3ff;
  --color-primary-500: #8b5cf6;
  --color-primary-700: #6d28d9;

  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 48px;

  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

/* 暗色主题：只需覆盖令牌 */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0f172a;
    --color-surface: #1e293b;
    --color-text: #f1f5f9;
    --color-text-muted: #94a3b8;
  }
}
```

在 JavaScript 中动态修改：

```typescript
// 实现用户可以自定义主色调
function applyTheme(primaryColor: string) {
  const root = document.documentElement
  root.style.setProperty('--color-primary-500', primaryColor)

  // 自动计算深浅变体（需要 color-mix 支持）
  root.style.setProperty(
    '--color-primary-700',
    `color-mix(in srgb, ${primaryColor} 70%, black)`
  )
  root.style.setProperty(
    '--color-primary-50',
    `color-mix(in srgb, ${primaryColor} 10%, white)`
  )
}
```

## 六、现代 CSS 特性速查

2024-2025 年值得关注的新特性：

```css
/* 1. :has() 伪类：根据子元素状态选择父元素 */
.card:has(img) {
  /* 有图片的卡片才显示特定样式 */
  padding-top: 0;
}

.form-group:has(input:invalid) label {
  color: red; /* 输入框无效时标签变红 */
}

/* 2. @layer：控制样式层叠顺序 */
@layer reset, base, components, utilities;

@layer base {
  h1 { font-size: 2rem; }
}

@layer components {
  .hero h1 { font-size: 3rem; } /* 优先级更高 */
}

/* 3. color-mix()：CSS 原生颜色混合 */
.button-hover {
  background: color-mix(in srgb, var(--color-primary) 80%, black);
}

/* 4. text-wrap: balance：标题自动平衡换行 */
h1, h2, h3 {
  text-wrap: balance; /* 避免孤行，让标题换行更美观 */
}
```

## 总结

现代 CSS 的能力已经远超很多人的认知，很多我们曾经用 JavaScript 实现的功能，现在纯 CSS 就能搞定：

- **Flexbox**：处理一维布局和组件内部排列
- **Grid**：处理二维布局和页面结构
- **容器查询**：让组件真正具备上下文感知能力，告别全局媒体查询
- **CSS 变量 + @layer**：构建可维护的设计系统

最好的建议：打开 [caniuse.com](https://caniuse.com) 看看这些特性的浏览器支持，现在的现代浏览器覆盖率已经足够高，可以放心使用了。
