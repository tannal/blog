import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Clock, Eye, Tag, ArrowLeft, Heart, Share2, MessageSquare, Send } from 'lucide-react'
import { fetchPost, fetchPosts, type Post } from '../../data/blog'
import { supabase, type DbComment } from '../../lib/supabase'

export const Route = createFileRoute('/posts/$slug')({
  component: PostPage,
})

// Block-aware Markdown renderer
type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'code'; lang: string; lines: string[] }
  | { type: 'ul'; items: string[] }
  | { type: 'p'; text: string }
  | { type: 'spacer' }

function slugify(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '')
}

function parseMarkdown(content: string): Block[] {
  const lines = content.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: line.slice(2) })
      i++
    } else if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3) })
      i++
    } else if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.slice(4) })
      i++
    } else if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      blocks.push({ type: 'code', lang, lines: codeLines })
    } else if (line.startsWith('- ')) {
      const items: string[] = [line.slice(2)]
      i++
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2))
        i++
      }
      blocks.push({ type: 'ul', items })
    } else if (line.trim() === '') {
      blocks.push({ type: 'spacer' })
      i++
    } else {
      blocks.push({ type: 'p', text: line })
      i++
    }
  }
  return blocks
}

function CodeBlock({ lang, lines }: { lang: string; lines: string[] }) {
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const code = lines.join('\n')

  useEffect(() => {
    let cancelled = false
    import('shiki').then(({ createHighlighter }) =>
      createHighlighter({
        themes: ['one-dark-pro'],
        langs: [lang || 'text'].filter(Boolean),
      })
    ).then(highlighter => {
      if (cancelled) return
      const html = highlighter.codeToHtml(code, {
        lang: lang || 'text',
        theme: 'one-dark-pro',
      })
      setHighlighted(html)
    }).catch(() => {
      // fallback: no highlight
    })
    return () => { cancelled = true }
  }, [code, lang])

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-6 rounded-xl overflow-hidden shadow-lg border border-gray-700/50">
      <div className="bg-[#1e2227] px-4 py-2.5 text-xs text-gray-400 font-mono flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          </span>
          {lang && <span className="text-gray-500">{lang}</span>}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-white/10 transition-colors text-gray-400 hover:text-gray-200"
        >
          {copied ? (
            <><span className="text-green-400">✓</span><span className="text-green-400">已复制</span></>
          ) : (
            <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>复制</span></>
          )}
        </button>
      </div>
      {highlighted ? (
        <div
          className="text-sm overflow-x-auto [&>pre]:!m-0 [&>pre]:!rounded-none [&>pre]:px-5 [&>pre]:py-4 [&>pre]:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      ) : (
        <pre className="bg-[#282c34] px-5 py-4 text-sm text-gray-100 font-mono overflow-x-auto leading-relaxed">
          <code>{code}</code>
        </pre>
      )}
    </div>
  )
}

function MarkdownRenderer({ content }: { content: string }) {
  const blocks = parseMarkdown(content)

  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'h1':
            return <h1 key={i} id={slugify(block.text)} className="text-3xl font-extrabold text-gray-900 mt-8 mb-4 scroll-mt-24">{block.text}</h1>
          case 'h2':
            return <h2 key={i} id={slugify(block.text)} className="text-2xl font-bold text-gray-900 mt-7 mb-3 pb-2 border-b border-gray-100 scroll-mt-24">{block.text}</h2>
          case 'h3':
            return <h3 key={i} id={slugify(block.text)} className="text-xl font-bold text-gray-800 mt-6 mb-2 scroll-mt-24">{block.text}</h3>
          case 'code':
            return <CodeBlock key={i} lang={block.lang} lines={block.lines} />
          case 'ul':
            return (
              <ul key={i} className="my-4 space-y-2 pl-2">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-gray-700">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            )
          case 'p':
            return <p key={i} className="text-gray-700 leading-relaxed mb-3">{block.text}</p>
          case 'spacer':
            return <div key={i} className="h-2" />
          default:
            return null
        }
      })}
    </>
  )
}


function CommentSection({ postId }: { postId: string }) {
  const [comments, setComments] = useState<DbComment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [author, setAuthor] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())

  // Load comments from Supabase
  useEffect(() => {
    setLoading(true)
    supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('Failed to load comments:', error)
        else setComments(data ?? [])
        setLoading(false)
      })
  }, [postId])

  // Realtime subscription: new comments appear instantly
  useEffect(() => {
    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        (payload) => {
          setComments(prev => {
            // avoid duplicate if it was optimistically added
            if (prev.some(c => c.id === payload.new.id)) return prev
            return [...prev, payload.new as DbComment]
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        (payload) => {
          setComments(prev => prev.map(c => c.id === payload.new.id ? payload.new as DbComment : c))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [postId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !author.trim()) return
    setSubmitting(true)
    setError(null)

    const optimistic: DbComment = {
      id: `optimistic-${Date.now()}`,
      post_id: postId,
      author: author.trim(),
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(author.trim())}`,
      content: newComment.trim(),
      likes: 0,
      created_at: new Date().toISOString(),
    }

    // Optimistic update
    setComments(prev => [...prev, optimistic])
    setNewComment('')
    setAuthor('')

    const { data, error: insertError } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author: optimistic.author,
        avatar_url: optimistic.avatar_url,
        content: optimistic.content,
        likes: 0,
      })
      .select()
      .single()

    if (insertError) {
      // Rollback optimistic update
      setComments(prev => prev.filter(c => c.id !== optimistic.id))
      setNewComment(optimistic.content)
      setAuthor(optimistic.author)
      setError('评论发送失败，请稍后重试')
    } else {
      // Replace optimistic with real data
      setComments(prev => prev.map(c => c.id === optimistic.id ? data : c))
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
    }
    setSubmitting(false)
  }

  const handleLike = async (comment: DbComment) => {
    const isLiked = likedIds.has(comment.id)
    const delta = isLiked ? -1 : 1
    // Optimistic update
    setLikedIds(prev => {
      const next = new Set(prev)
      isLiked ? next.delete(comment.id) : next.add(comment.id)
      return next
    })
    setComments(prev => prev.map(c =>
      c.id === comment.id ? { ...c, likes: Math.max(0, c.likes + delta) } : c
    ))
    await supabase
      .from('comments')
      .update({ likes: Math.max(0, comment.likes + delta) })
      .eq('id', comment.id)
  }

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <MessageSquare size={20} className="text-violet-500" />
        评论 ({comments.length})
      </h2>

      {/* Comment Form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">发表评论</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="你的昵称"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            required
            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:bg-white text-sm transition-all"
          />
          <textarea
            placeholder="分享你的想法..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            required
            rows={4}
            className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:bg-white text-sm transition-all resize-none"
          />
          <div className="flex items-center justify-between">
            {submitted && (
              <span className="text-green-600 text-sm font-medium">✓ 评论发表成功！</span>
            )}
            {error && (
              <span className="text-red-500 text-sm">{error}</span>
            )}
            <button
              type="submit"
              disabled={submitting || !newComment.trim() || !author.trim()}
              className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send size={15} />
              {submitting ? '发送中...' : '发表评论'}
            </button>
          </div>
        </form>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-24" />
                  <div className="h-3 bg-gray-100 rounded w-16" />
                </div>
              </div>
              <div className="h-4 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <MessageSquare size={40} className="mx-auto mb-3 text-gray-200" />
          <p>暂无评论，来发表第一条吧！</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <div key={comment.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start gap-4">
                <img src={comment.avatar_url} alt={comment.author} className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900 text-sm">{comment.author}</span>
                    <span className="text-xs text-gray-400">{comment.created_at.slice(0, 10)}</span>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">{comment.content}</p>
                  <button
                    onClick={() => handleLike(comment)}
                    className={`mt-3 flex items-center gap-1.5 text-xs transition-colors ${likedIds.has(comment.id) ? 'text-violet-500' : 'text-gray-400 hover:text-violet-500'}`}
                  >
                    <Heart size={13} className={likedIds.has(comment.id) ? 'fill-violet-500' : ''} />
                    {comment.likes > 0 && <span>{comment.likes}</span>}
                    <span>{likedIds.has(comment.id) ? '取消点赞' : '点赞'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function TocPanel({ content }: { content: string }) {
  const [activeId, setActiveId] = useState<string>('')

  const headings = useMemo(() => {
    return content.split('\n')
      .filter(line => line.match(/^#{1,3} /))
      .map(line => {
        const level = line.match(/^(#{1,3})/)?.[1].length ?? 2
        const text = line.replace(/^#{1,3} /, '')
        return { text, level, id: slugify(text) }
      })
  }, [content])

  // Highlight active heading on scroll
  useEffect(() => {
    if (headings.length === 0) return
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        })
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    )
    headings.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [headings])

  const handleClick = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveId(id)
  }

  if (headings.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-bold text-gray-900 mb-4">文章目录</h3>
      <ul className="space-y-1">
        {headings.map(({ text, level, id }) => (
          <li key={id}>
            <button
              onClick={() => handleClick(id)}
              className={`w-full text-left text-sm flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all ${
                activeId === id
                  ? 'text-violet-600 bg-violet-50 font-medium'
                  : 'text-gray-600 hover:text-violet-600 hover:bg-gray-50'
              } ${level === 3 ? 'pl-6' : level === 1 ? 'pl-0' : 'pl-2'}`}
            >
              <span className={`rounded-full flex-shrink-0 transition-colors ${
                activeId === id ? 'bg-violet-500' : 'bg-violet-200'
              } ${level === 1 ? 'w-2 h-2' : level === 2 ? 'w-1.5 h-1.5' : 'w-1 h-1'}`} />
              <span className="flex-1 truncate">{text}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}


function PostPage() {
  const { slug } = Route.useParams()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    setLoading(true)
    fetchPost(slug).then(p => {
      setPost(p || null)
      setLoading(false)
    })
  }, [slug])

  const [allPosts, setAllPosts] = useState<Post[]>([])
  useEffect(() => { fetchPosts().then(setAllPosts) }, [])
  const relatedPosts = allPosts.filter(p => p.id !== post?.id && (
    p.category === post?.category || p.tags.some(t => post?.tags.includes(t))
  )).slice(0, 3)

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 animate-pulse">
        <div className="h-8 bg-gray-100 rounded w-3/4 mb-4" />
        <div className="h-4 bg-gray-100 rounded w-1/2 mb-8" />
        <div className="aspect-[16/9] bg-gray-100 rounded-2xl mb-8" />
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-4 bg-gray-100 rounded" />)}
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-400 mb-4">文章不存在</h2>
        <Link to="/" className="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors">
          返回首页
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex gap-8">
        {/* Article */}
        <article className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 mb-6 group">
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            返回文章列表
          </Link>

          {/* Header */}
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Link to="/" search={{ category: post.category } as any}
                className="px-3 py-1 bg-violet-600 text-white text-xs font-semibold rounded-full hover:bg-violet-700 transition-colors">
                {post.category}
              </Link>
              {post.featured && (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">精选</span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
              {post.title}
            </h1>
            <p className="text-lg text-gray-500 mb-6">{post.excerpt}</p>

            <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-gray-100">
              <div className="flex items-center gap-3">
                <img src={post.authorData.avatar} alt={post.authorData.name} className="w-10 h-10 rounded-full border-2 border-violet-100" />
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{post.authorData.name}</div>
                  <div className="text-xs text-gray-400">{post.createdAt}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1.5"><Clock size={14} /> {post.readTime} 分钟阅读</span>
                <span className="flex items-center gap-1.5"><Eye size={14} /> {post.views.toLocaleString()} 次阅读</span>
              </div>
            </div>
          </header>

          {/* Cover Image */}
          <div className="rounded-2xl overflow-hidden mb-8 shadow-md">
            <img src={post.coverImage} alt={post.title} className="w-full aspect-[16/9] object-cover" />
          </div>

          {/* Content */}
          <div className="prose prose-gray max-w-none mb-8">
            <MarkdownRenderer content={post.content} />
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2 mb-8 pb-8 border-b border-gray-100">
            <Tag size={15} className="text-gray-400" />
            {post.tags.map(tag => (
              <Link key={tag} to="/" search={{ tag } as any}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-violet-100 hover:text-violet-700 transition-colors">
                {tag}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 mb-10">
            <button
              onClick={() => setLiked(!liked)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                liked ? 'bg-red-500 text-white shadow-md shadow-red-100' : 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-500'
              }`}
            >
              <Heart size={16} className={liked ? 'fill-white' : ''} />
              {liked ? '已点赞' : '点赞'}
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                alert('链接已复制！')
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-violet-50 hover:text-violet-600 transition-all"
            >
              <Share2 size={16} />
              分享
            </button>
          </div>

          {/* Author Card */}
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-6 mb-10 border border-violet-100">
            <div className="flex items-start gap-4">
              <img src={post.authorData.avatar} alt={post.authorData.name} className="w-16 h-16 rounded-2xl border-2 border-white shadow-sm" />
              <div>
                <div className="text-xs text-violet-500 font-medium mb-1">文章作者</div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{post.authorData.name}</h3>
                <p className="text-gray-600 text-sm">{post.authorData.bio}</p>
              </div>
            </div>
          </div>

          {/* Comments */}
          <CommentSection postId={post.id} />
        </article>

        {/* Sidebar */}
        <aside className="hidden lg:block w-72 flex-shrink-0">
          <div className="sticky top-24 space-y-6">
            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-4">相关文章</h3>
                <div className="space-y-4">
                  {relatedPosts.map(related => (
                    <Link key={related.id} to="/posts/$slug" params={{ slug: related.slug }} className="group flex gap-3">
                      <img src={related.coverImage} alt={related.title}
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                      <div className="min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 group-hover:text-violet-600 transition-colors line-clamp-2 leading-snug">
                          {related.title}
                        </h4>
                        <span className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Clock size={11} /> {related.readTime}分钟
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Table of Contents */}
            <TocPanel content={post.content} />
          </div>
        </aside>
      </div>
    </div>
  )
}
