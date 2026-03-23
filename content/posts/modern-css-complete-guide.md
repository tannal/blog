---
title: 现代 CSS 完全指南：Container Queries、CSS Layers 与设计系统
excerpt: 2024 年的 CSS 已经脱胎换骨。Container Queries、CSS Layers、:has() 选择器……这些新特性正在彻底改变我们写样式的方式。
coverImage: https://images.unsplash.com/photo-1523437113738-bbd3cc89fb19?w=800&auto=format&fit=crop
category: 前端开发
tags: [CSS, Performance, React]
author: chenmeiling
createdAt: 2025-03-08
readTime: 16
views: 5430
featured: false
---

# 现代 CSS 完全指南

CSS 在过去两年经历了有史以来最大的一次飞跃。曾经需要 JavaScript 才能实现的功能，现在只需几行 CSS 就能搞定。本文带你全面了解这些改变游戏规则的新特性。

## Container Queries：组件级响应式

媒体查询（Media Queries）是根据视口宽度来响应布局，但这有一个根本性的问题：组件不知道自己被放在哪里。

```css
/* 传统做法：根据视口宽度 */
@media (max-width: 768px) {
  .card { flex-direction: column; }
}

/* 问题：如果 .card 在侧边栏里怎么办？
   侧边栏可能只有 300px 宽，但视口是 1440px */
```

Container Queries 解决了这个问题：

```css
/* 声明容器 */
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

/* 根据容器宽度而非视口宽度响应 */
@container card (min-width: 400px) {
  .card {
    display: flex;
    flex-direction: row;
  }

  .card-image {
    width: 200px;
    flex-shrink: 0;
  }
}

@container card (max-width: 399px) {
  .card {
    flex-direction: column;
  }

  .card-image {
    width: 100%;
    aspect-ratio: 16/9;
  }
}
```

### 容器查询单位

Container Queries 还引入了新的长度单位：

```css
.card-title {
  /* cqi = container query inline size 的 1% */
  font-size: clamp(1rem, 3cqi, 2rem);

  /* cqb = container query block size 的 1% */
  padding: 2cqb 3cqi;
}
```

### 实战：真正自适应的卡片组件

```css
.product-grid {
  container-type: inline-size;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.product-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

/* 小容器：竖版卡片 */
@container (max-width: 300px) {
  .product-card__body {
    padding: 0.75rem;
  }
  .product-card__price {
    font-size: 1.1rem;
  }
  .product-card__actions {
    flex-direction: column;
  }
}

/* 中等容器：横版卡片 */
@container (min-width: 301px) and (max-width: 500px) {
  .product-card {
    display: flex;
    align-items: center;
  }
  .product-card__image {
    width: 120px;
    flex-shrink: 0;
  }
}

/* 大容器：完整卡片 */
@container (min-width: 501px) {
  .product-card__body {
    padding: 1.5rem;
  }
  .product-card__description {
    display: block; /* 小尺寸时隐藏 */
  }
}
```

## CSS Cascade Layers：终结特异性战争

CSS 的特异性（Specificity）一直是开发者的噩梦。Cascade Layers 允许你明确控制样式的优先级：

```css
/* 定义层的顺序（后面的层优先级更高） */
@layer reset, base, components, utilities, overrides;

@layer reset {
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
}

@layer base {
  body {
    font-family: system-ui, sans-serif;
    line-height: 1.6;
    color: #333;
  }

  a {
    color: #0070f3;
    text-decoration: none;
  }
}

@layer components {
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #0070f3;
    color: white;
  }
}

@layer utilities {
  .mt-4 { margin-top: 1rem; }
  .text-center { text-align: center; }
  .hidden { display: none; }
}

@layer overrides {
  /* 这里的样式优先级最高，用于覆盖第三方库 */
  .third-party-widget .btn {
    border-radius: 0 !important; /* 现在不需要 !important 了！ */
    border-radius: 0;
  }
}
```

### 引入第三方 CSS 到指定层

```css
/* 把 Bootstrap 的样式放在低优先级层 */
@layer third-party {
  @import url('bootstrap.css');
}

/* 你的样式在更高优先级的层，不会被 Bootstrap 覆盖 */
@layer components {
  .card {
    border-radius: 12px; /* 即使 Bootstrap 也有 .card，这里也会胜出 */
  }
}
```

## :has() 选择器：父级选择器终于来了

CSS 长期缺少一个"父级选择器"，`:has()` 填补了这个空白：

```css
/* 选中包含图片的卡片 */
.card:has(img) {
  padding: 0; /* 有图片时去掉内边距 */
}

/* 选中包含必填输入框的表单组 */
.form-group:has(input:required) .label::after {
  content: ' *';
  color: red;
}

/* 选中包含选中复选框的列表项 */
li:has(input[type="checkbox"]:checked) {
  background: #f0f7ff;
  text-decoration: line-through;
  opacity: 0.7;
}

/* 根据子元素数量调整布局 */
.grid:has(> :nth-child(4)) {
  grid-template-columns: repeat(4, 1fr);
}

.grid:has(> :nth-child(3):last-child) {
  grid-template-columns: repeat(3, 1fr);
}

.grid:has(> :nth-child(2):last-child) {
  grid-template-columns: repeat(2, 1fr);
}
```

### 实战：纯 CSS 的暗色模式切换

```css
/* 根据复选框状态切换主题 */
:root:has(#dark-mode-toggle:checked) {
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a1a;
  --text-primary: #f0f0f0;
  --text-secondary: #a0a0a0;
  --border-color: #333;
  --accent-color: #7c3aed;
}

:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f8f8;
  --text-primary: #111111;
  --text-secondary: #666666;
  --border-color: #e5e5e5;
  --accent-color: #6d28d9;
}
```

## CSS 嵌套：原生支持了

不再需要 Sass 来写嵌套样式：

```css
.nav {
  display: flex;
  gap: 1rem;

  /* 嵌套选择器 */
  & a {
    color: var(--text-primary);
    text-decoration: none;

    &:hover {
      color: var(--accent-color);
    }

    &.active {
      font-weight: 600;
      border-bottom: 2px solid var(--accent-color);
    }
  }

  /* 媒体查询也可以嵌套 */
  @media (max-width: 768px) {
    flex-direction: column;

    & a {
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border-color);
    }
  }
}
```

## CSS 自定义属性的高级用法

CSS 变量远不止颜色这么简单：

```css
/* 1. 作为设计令牌系统 */
:root {
  /* 原始值 */
  --color-purple-500: #8b5cf6;
  --color-purple-600: #7c3aed;
  --spacing-4: 1rem;
  --spacing-8: 2rem;
  --radius-md: 6px;
  --radius-lg: 12px;

  /* 语义化别名 */
  --color-primary: var(--color-purple-600);
  --color-primary-hover: var(--color-purple-500);
  --space-component-padding: var(--spacing-4);
  --radius-component: var(--radius-md);
}

/* 2. 计算属性 */
.fluid-text {
  --min-size: 1rem;
  --max-size: 2rem;
  --min-width: 320;
  --max-width: 1200;

  font-size: clamp(
    var(--min-size),
    calc(var(--min-size) + (var(--max-size) - var(--min-size)) *
      ((100vw - calc(var(--min-width) * 1px)) /
      (var(--max-width) - var(--min-width)))),
    var(--max-size)
  );
}

/* 3. 组件变体 */
.btn {
  --btn-bg: var(--color-primary);
  --btn-color: white;
  --btn-padding-x: 1rem;
  --btn-padding-y: 0.5rem;
  --btn-radius: var(--radius-component);

  background: var(--btn-bg);
  color: var(--btn-color);
  padding: var(--btn-padding-y) var(--btn-padding-x);
  border-radius: var(--btn-radius);
}

.btn-lg {
  --btn-padding-x: 1.5rem;
  --btn-padding-y: 0.75rem;
  --btn-radius: var(--radius-lg);
}

.btn-outline {
  --btn-bg: transparent;
  --btn-color: var(--color-primary);
  border: 2px solid var(--color-primary);
}
```

## CSS Grid 进阶：subgrid

`subgrid` 让嵌套元素可以参与父网格的对齐：

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.card {
  display: grid;
  /* 参与父网格的行定义 */
  grid-row: span 3;
  grid-template-rows: subgrid;
  gap: 0;
}

/* 现在所有卡片的标题、正文、按钮都在同一水平线上 */
.card-header { /* 第一行 */ }
.card-body { /* 第二行 */ }
.card-footer { /* 第三行，始终在底部 */ }
```

## scroll-driven animations：滚动驱动动画

无需 JavaScript，纯 CSS 实现滚动动画：

```css
/* 进度条随滚动增长 */
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: var(--color-primary);
  transform-origin: left;

  animation: progress linear;
  animation-timeline: scroll(root);
}

@keyframes progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* 元素随滚动淡入 */
.fade-in-section {
  opacity: 0;
  transform: translateY(30px);
  animation: fade-in linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 30%;
}

@keyframes fade-in {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 视差效果 */
.hero-background {
  animation: parallax linear;
  animation-timeline: scroll(root block);
}

@keyframes parallax {
  from { transform: translateY(0); }
  to { transform: translateY(200px); }
}
```

## 实战：用现代 CSS 构建设计系统

把以上特性综合起来，构建一个真正现代的 CSS 设计系统：

```css
/* 1. 层级定义 */
@layer tokens, reset, base, layout, components, utilities;

/* 2. 设计令牌 */
@layer tokens {
  :root {
    --color-brand-50: #f5f3ff;
    --color-brand-500: #8b5cf6;
    --color-brand-600: #7c3aed;
    --color-brand-900: #4c1d95;

    --font-sans: 'PingFang SC', system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

    --text-xs: 0.75rem;
    --text-sm: 0.875rem;
    --text-base: 1rem;
    --text-lg: 1.125rem;
    --text-xl: 1.25rem;
    --text-2xl: 1.5rem;
    --text-3xl: 1.875rem;

    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-6: 1.5rem;
    --space-8: 2rem;
    --space-12: 3rem;

    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 16px;
    --radius-full: 9999px;

    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
    --shadow-lg: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --color-brand-500: #a78bfa;
      --color-brand-600: #8b5cf6;
    }
  }
}

/* 3. 响应式卡片组件 */
@layer components {
  .card-grid {
    container-type: inline-size;
    display: grid;
    gap: var(--space-4);
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  }

  .card {
    background: white;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    transition: box-shadow 0.2s, transform 0.2s;

    &:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }

    &:has(.card-image) {
      padding: 0;

      .card-body {
        padding: var(--space-4);
      }
    }
  }

  @container (min-width: 400px) {
    .card:has(.card-image) {
      display: grid;
      grid-template-columns: 160px 1fr;

      .card-image {
        height: 100%;
        object-fit: cover;
      }
    }
  }
}
```

## 总结

现代 CSS 已经具备了构建复杂、可维护样式系统所需的一切工具：

- **Container Queries**：真正的组件级响应式，告别视口依赖
- **CSS Layers**：明确的层级控制，终结特异性战争
- **:has() 选择器**：父级选择器，让样式逻辑更清晰
- **原生嵌套**：减少重复，提升可读性
- **scroll-driven animations**：零 JavaScript 的滚动动画

这些特性在主流浏览器的支持度已经超过 90%，可以放心在生产环境中使用。CSS 正在从一门"简单但难以驾驭"的语言，进化为一门真正强大的样式系统语言。
