export interface Author {
  id: string
  name: string
  avatar: string
  bio: string
}

export interface PostMeta {
  title: string
  excerpt: string
  coverImage: string
  category: string
  tags: string[]
  author: string
  createdAt: string
  readTime: number
  views: number
  featured: boolean
}

export interface Post extends PostMeta {
  id: string
  slug: string
  content: string
  authorData: Author
}

export const AUTHORS: Record<string, Author> = {
  linxiaoyu: {
    id: 'linxiaoyu',
    name: '林晓雨',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lin',
    bio: '全栈工程师，热爱开源，专注于现代前端技术。',
  },
  zhangjian: {
    id: 'zhangjian',
    name: '张建国',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zhang',
    bio: '后端架构师，云计算专家，分布式系统爱好者。',
  },
  chenmeiling: {
    id: 'chenmeiling',
    name: '陈美玲',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chen',
    bio: 'UI/UX 设计师，关注用户体验与视觉设计。',
  },
}

export const CATEGORIES = ['前端开发', '后端架构', '云计算', 'UI设计', '人工智能', '开源项目']

export const ALL_TAGS = [
  'React', 'TypeScript', 'TanStack', 'Node.js', 'Go', 'Docker',
  'Kubernetes', 'AWS', 'Figma', 'AI', 'CSS', 'Performance',
  'Testing', 'GraphQL', 'REST', 'WebAssembly',
]

const mdModules = import.meta.glob('/content/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function parseFrontmatter(raw: string): { meta: Partial<PostMeta>; content: string } {
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!fmMatch) return { meta: {}, content: raw }
  const yamlBlock = fmMatch[1]
  const content = fmMatch[2].trim()
  const meta: Partial<PostMeta> = {}
  for (const line of yamlBlock.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const val = line.slice(colonIdx + 1).trim()
    if (key === 'tags') {
      const cleaned = val.replace(/[\[\]]/g, '')
      ;(meta as any)[key] = cleaned.split(',').map((t: string) => t.trim()).filter(Boolean)
    } else if (key === 'featured') {
      ;(meta as any)[key] = val === 'true'
    } else if (['readTime', 'views'].includes(key)) {
      ;(meta as any)[key] = parseInt(val, 10)
    } else {
      ;(meta as any)[key] = val
    }
  }
  return { meta, content }
}

function slugFromPath(path: string): string {
  return path.replace(/^.*\//, '').replace(/\.md$/, '')
}

function buildPosts(): Post[] {
  return Object.entries(mdModules).map(([path, raw]) => {
    const slug = slugFromPath(path)
    const { meta, content } = parseFrontmatter(raw)
    const authorKey = meta.author || 'linxiaoyu'
    return {
      id: slug,
      slug,
      title: meta.title || slug,
      excerpt: meta.excerpt || '',
      coverImage: meta.coverImage || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop',
      category: meta.category || '未分类',
      tags: meta.tags || [],
      author: authorKey,
      authorData: AUTHORS[authorKey] || AUTHORS['linxiaoyu'],
      createdAt: meta.createdAt || '',
      readTime: meta.readTime || 5,
      views: meta.views || 0,
      featured: meta.featured || false,
      content,
    }
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

const ALL_POSTS = buildPosts()

export async function fetchPosts(filters?: {
  category?: string
  tag?: string
  search?: string
}): Promise<Post[]> {
  await new Promise(r => setTimeout(r, 80))
  let posts = [...ALL_POSTS]
  if (filters?.category) posts = posts.filter(p => p.category === filters.category)
  if (filters?.tag) posts = posts.filter(p => p.tags.includes(filters.tag!))
  if (filters?.search) {
    const q = filters.search.toLowerCase()
    posts = posts.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.excerpt.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    )
  }
  return posts
}

export async function fetchPost(slug: string): Promise<Post | undefined> {
  await new Promise(r => setTimeout(r, 50))
  return ALL_POSTS.find(p => p.slug === slug)
}
