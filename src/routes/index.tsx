import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { Clock, Eye, Tag, TrendingUp, BookOpen, ChevronRight } from 'lucide-react'
import { fetchPosts, type Post, CATEGORIES, ALL_TAGS } from '../data/blog'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => ({
    category: search.category as string | undefined,
    tag: search.tag as string | undefined,
    q: search.q as string | undefined,
  }),
  component: HomePage,
})

function PostCard({ post, featured = false }: { post: Post; featured?: boolean }) {
  if (featured) {
    return (
      <Link to="/posts/$slug" params={{ slug: post.slug }} className="group block">
        <article className="relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
          <div className="aspect-[16/9] overflow-hidden">
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 bg-violet-600 text-white text-xs font-semibold rounded-full">
                {post.category}
              </span>
              <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs rounded-full">精选</span>
            </div>
            <h2 className="text-xl font-bold mb-2 leading-tight group-hover:text-violet-200 transition-colors">
              {post.title}
            </h2>
            <p className="text-sm text-gray-300 mb-4 line-clamp-2">{post.excerpt}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={post.authorData.avatar} alt={post.authorData.name} className="w-7 h-7 rounded-full border-2 border-white/30" />
                <span className="text-sm font-medium">{post.authorData.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-300">
                <span className="flex items-center gap-1"><Clock size={12} /> {post.readTime}分钟</span>
                <span className="flex items-center gap-1"><Eye size={12} /> {post.views.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </article>
      </Link>
    )
  }

  return (
    <Link to="/posts/$slug" params={{ slug: post.slug }} className="group block">
      <article className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden hover:-translate-y-0.5">
        <div className="aspect-[16/10] overflow-hidden">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full border border-violet-100">
              {post.category}
            </span>
          </div>
          <h3 className="font-bold text-gray-900 mb-2 leading-snug group-hover:text-violet-600 transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">{post.excerpt}</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {post.tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">{tag}</span>
            ))}
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-gray-50">
            <div className="flex items-center gap-2">
              <img src={post.authorData.avatar} alt={post.authorData.name} className="w-6 h-6 rounded-full" />
              <span className="text-xs text-gray-600 font-medium">{post.authorData.name}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Clock size={11} /> {post.readTime}分钟</span>
              <span className="flex items-center gap-1"><Eye size={11} /> {post.views.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}

function HomePage() {
  const search = useSearch({ from: '/' })
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchPosts({ category: search.category, tag: search.tag, search: search.q })
      .then(setPosts)
      .finally(() => setLoading(false))
  }, [search.category, search.tag, search.q])

  const featuredPosts = useMemo(() => posts.filter(p => p.featured).slice(0, 2), [posts])
  const featuredIds = useMemo(() => new Set(featuredPosts.map(p => p.id)), [featuredPosts])
  const regularPosts = useMemo(() => posts.filter(p => !featuredIds.has(p.id)), [posts, featuredIds])

  const isFiltered = search.category || search.tag || search.q

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero Banner - only on home */}
      {!isFiltered && (
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-full text-sm font-medium mb-4 border border-violet-100">
            <TrendingUp size={14} />
            <span>最新技术见解</span>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
            探索技术的无限可能
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            深度技术文章，帮助开发者在前沿技术领域持续成长
          </p>
        </div>
      )}

      {/* Filter Header */}
      {isFiltered && (
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {search.q ? `"${search.q}" 搜索结果` : search.category || search.tag}
            </h2>
            <p className="text-gray-500 mt-1">找到 {posts.length} 篇文章</p>
          </div>
          <Link to="/" className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700">
            全部文章 <ChevronRight size={16} />
          </Link>
        </div>
      )}

      <div className="flex gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="bg-gray-100 aspect-[16/10]" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-gray-100 rounded w-1/4" />
                    <div className="h-5 bg-gray-100 rounded" />
                    <div className="h-5 bg-gray-100 rounded w-4/5" />
                    <div className="h-4 bg-gray-100 rounded w-3/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen size={48} className="mx-auto text-gray-200 mb-4" />
              <h3 className="text-xl font-semibold text-gray-400">没有找到相关文章</h3>
              <p className="text-gray-400 mt-2 mb-6">试试其他关键词或分类</p>
              <Link to="/" className="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors">
                查看所有文章
              </Link>
            </div>
          ) : (
            <>
              {/* Featured Grid - only on home */}
              {!isFiltered && featuredPosts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {featuredPosts.map(post => (
                    <PostCard key={post.id} post={post} featured />
                  ))}
                </div>
              )}

              {/* Regular Posts */}
              <div className={!isFiltered && featuredPosts.length > 0 ? 'mb-2' : ''}>
                {!isFiltered && regularPosts.length > 0 && (
                  <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <BookOpen size={18} className="text-violet-500" />
                    全部文章
                  </h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(isFiltered ? posts : regularPosts).map(post => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:block w-72 flex-shrink-0 space-y-6">
          {/* Categories */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen size={16} className="text-violet-500" />
              文章分类
            </h3>
            <ul className="space-y-1">
              {CATEGORIES.map(cat => (
                <li key={cat}>
                  <Link
                    to="/"
                    search={{ category: cat } as any}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                      search.category === cat
                        ? 'bg-violet-600 text-white font-medium'
                        : 'text-gray-700 hover:bg-violet-50 hover:text-violet-700'
                    }`}
                  >
                    <span>{cat}</span>
                    <ChevronRight size={14} className="opacity-50" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Tag size={16} className="text-violet-500" />
              热门标签
            </h3>
            <div className="flex flex-wrap gap-2">
              {ALL_TAGS.map(tag => (
                <Link
                  key={tag}
                  to="/"
                  search={{ tag } as any}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                    search.tag === tag
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-violet-100 hover:text-violet-700'
                  }`}
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl p-5 text-white">
            <h3 className="font-bold mb-4">博客统计</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: '文章总数', value: '50+' },
                { label: '月阅读量', value: '12K' },
                { label: '技术分类', value: '6个' },
                { label: '作者人数', value: '3位' },
              ].map(stat => (
                <div key={stat.label} className="bg-white/10 backdrop-blur rounded-xl p-3">
                  <div className="text-xl font-bold">{stat.value}</div>
                  <div className="text-xs text-violet-200 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
