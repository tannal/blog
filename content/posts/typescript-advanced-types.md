---
title: TypeScript 高级类型体操：从入门到写出让同事看不懂的代码
excerpt: 深入讲解 TypeScript 的条件类型、映射类型、模板字面量类型等高级特性，配合大量实战案例，让你的类型系统真正发挥作用。
coverImage: https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&auto=format&fit=crop
category: 前端开发
tags: [TypeScript, React, Testing]
author: linxiaoyu
createdAt: 2025-03-12
readTime: 22
views: 8910
featured: false
---

# TypeScript 高级类型体操

TypeScript 的类型系统是图灵完备的——这意味着你可以用类型来计算几乎任何东西。本文从实际问题出发，一步步探索那些让代码更安全、更优雅的高级类型技巧。

## 基础：类型是集合

理解 TypeScript 类型系统的关键是把类型看作值的集合。

- `string` = 所有字符串的集合
- `never` = 空集合
- `unknown` = 所有值的集合

```typescript
// 联合类型 = 集合并集
type StringOrNumber = string | number

// 交叉类型 = 集合交集
type Named = { name: string }
type Aged = { age: number }
type Person = Named & Aged // { name: string; age: number }

function assertNever(x: never): never {
  throw new Error('Unexpected value: ' + x)
}
```

## 条件类型：类型中的 if-else

```typescript
type IsString<T> = T extends string ? true : false

type A = IsString<'hello'>  // true
type B = IsString<42>       // false
```

### 分布式条件类型

当条件类型作用于联合类型时，会自动分发：

```typescript
type ToArray<T> = T extends any ? T[] : never

// 分发：对每个成员单独应用，然后合并
type Arr = ToArray<string | number>
// 等价于：ToArray<string> | ToArray<number>
// 结果：string[] | number[]
```

### 实战：提取函数返回类型

```typescript
type MyReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : never

async function fetchUser(id: string) {
  return { id, name: 'Alice', email: 'alice@example.com' }
}

type User = Awaited<MyReturnType<typeof fetchUser>>
// { id: string; name: string; email: string }
```

### 实战：深度只读

```typescript
type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T

interface Config {
  server: {
    host: string
    port: number
    ssl: { enabled: boolean; cert: string }
  }
  database: { url: string; pool: number }
}

type ReadonlyConfig = DeepReadonly<Config>
// 所有嵌套属性都变为 readonly
```

## infer：在类型中提取

`infer` 关键字允许你在条件类型中捕获类型的某个部分：

```typescript
// 提取 Promise 的值类型
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T

type Value = UnwrapPromise<Promise<string>>  // string

// 提取函数第一个参数类型
type FirstParam<T extends (...args: any) => any> =
  T extends (first: infer F, ...rest: any) => any ? F : never

function greet(name: string, age: number) {}
type Name = FirstParam<typeof greet>  // string
```

### 实战：类型安全的事件系统

```typescript
type EventMap = {
  'user:login': { userId: string; timestamp: Date }
  'user:logout': { userId: string }
  'post:created': { postId: string; title: string; authorId: string }
}

type EventName = keyof EventMap
type EventPayload<T extends EventName> = EventMap[T]

class TypedEventEmitter {
  private listeners = new Map<string, Set<Function>>()

  on<T extends EventName>(
    event: T,
    listener: (payload: EventPayload<T>) => void
  ): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
    return this
  }

  emit<T extends EventName>(event: T, payload: EventPayload<T>): void {
    this.listeners.get(event)?.forEach(fn => fn(payload))
  }
}

const emitter = new TypedEventEmitter()

// payload 类型自动推断
emitter.on('user:login', ({ userId, timestamp }) => {
  console.log(`User ${userId} logged in at ${timestamp}`)
})

// 类型错误：缺少 timestamp
emitter.emit('user:login', { userId: '123' })
```

## 映射类型：批量转换类型

```typescript
type Nullable<T> = { [K in keyof T]: T[K] | null }
type Optional<T> = { [K in keyof T]?: T[K] }
type Mutable<T> = { -readonly [K in keyof T]: T[K] }

// 键名转换
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
}

interface User {
  name: string
  age: number
  email: string
}

type UserGetters = Getters<User>
// { getName: () => string; getAge: () => number; getEmail: () => string }
```

### 实战：自动生成表单验证类型

```typescript
type ValidatorFn<T> = (value: T) => string | undefined

type FormValidators<T> = {
  [K in keyof T]?: ValidatorFn<T[K]>
}

type FormErrors<T> = {
  [K in keyof T]?: string
}

interface SignupForm {
  username: string
  email: string
  password: string
  age: number
}

const validators: FormValidators<SignupForm> = {
  username: (v) => v.length < 3 ? '用户名至少 3 个字符' : undefined,
  email: (v) => !v.includes('@') ? '邮箱格式不正确' : undefined,
  password: (v) => v.length < 8 ? '密码至少 8 位' : undefined,
  age: (v) => v < 18 ? '必须年满 18 岁' : undefined,
}
```

## 模板字面量类型

TypeScript 4.1 引入的模板字面量类型让字符串操作进入类型层面：

```typescript
type EventName<T extends string> = `on${Capitalize<T>}`
type Handler = EventName<'click' | 'focus' | 'blur'>
// 'onClick' | 'onFocus' | 'onBlur'

type Route = '/users' | '/posts' | '/comments'
type ApiRoute = `/api${Route}`
// '/api/users' | '/api/posts' | '/api/comments'
```

### 实战：类型安全的国际化

```typescript
// 从字符串中提取插值变量名
type ExtractParams<T extends string> =
  T extends `${string}{${infer Param}}${infer Rest}`
    ? Param | ExtractParams<Rest>
    : never

type GreetingParams = ExtractParams<'你好，{name}！'>  // 'name'
type CountParams = ExtractParams<'共 {count} 个项目'> // 'count'

function t<K extends string>(
  template: K,
  params: Record<ExtractParams<K>, string | number>
): string {
  let text = template
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(`{${k}}`, String(v)) as K
  }
  return text
}

// 正确：TypeScript 知道需要 name 参数
t('你好，{name}！', { name: '张三' })

// 错误：缺少 name 参数
t('你好，{name}！', {})
```

## 递归类型

```typescript
// JSON 类型
type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue }

// 深度路径访问
type Path<T, K extends keyof T = keyof T> =
  K extends string
    ? T[K] extends Record<string, any>
      ? K | `${K}.${Path<T[K]>}`
      : K
    : never

interface AppConfig {
  database: {
    host: string
    port: number
    credentials: { username: string; password: string }
  }
  cache: { ttl: number }
}

type ConfigPath = Path<AppConfig>
// 'database' | 'cache' | 'database.host' | 'database.port'
// | 'database.credentials' | 'database.credentials.username' ...
```

## 实战：类型安全的 API 客户端

```typescript
interface ApiSchema {
  '/users': {
    GET: {
      query: { page?: number; limit?: number; search?: string }
      response: { users: User[]; total: number }
    }
    POST: {
      body: { name: string; email: string; password: string }
      response: User
    }
  }
  '/users/:id': {
    GET: { params: { id: string }; response: User }
    DELETE: { params: { id: string }; response: { success: boolean } }
  }
}

type ApiPath = keyof ApiSchema
type ApiMethod<P extends ApiPath> = keyof ApiSchema[P]
type ResponseType<P extends ApiPath, M extends ApiMethod<P>> =
  ApiSchema[P][M] extends { response: infer R } ? R : never

async function apiRequest<P extends ApiPath, M extends ApiMethod<P>>(
  path: P,
  method: M,
  options?: object
): Promise<ResponseType<P, M>> {
  const res = await fetch(path, {
    method: method as string,
    body: JSON.stringify((options as any)?.body),
    headers: { 'Content-Type': 'application/json' },
  })
  return res.json()
}

// 完全类型推断
const { users } = await apiRequest('/users', 'GET')
// users 的类型是 User[]
```

## 总结

TypeScript 的高级类型系统背后都有实际的工程价值：

- **条件类型**：根据输入类型动态推导输出类型
- **infer**：从复杂类型中提取子类型，避免重复定义
- **映射类型**：批量转换接口，保持 DRY 原则
- **模板字面量**：在字符串层面保证类型安全
- **递归类型**：描述任意深度的嵌套结构

掌握这些工具，你的 TypeScript 代码将从防止低级错误进化为在编译时发现业务逻辑问题。
