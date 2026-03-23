import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Clock, Eye, Tag, ArrowLeft, Heart, Share2, MessageSquare, Send } from 'lucide-react'
import { fetchPost, fetchComments, Post, Comment, POSTS } from '../../data/blog'

export const Route = createFileRoute('/posts/$slug')({
  component: PostPage,
})

function CommentSection({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [author, setAuthor] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetchComments(postId).then(setComments).finally(() => setLoading(false))
  }, [postId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !author.trim()) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 600))
    const comment: Comment = {
      id: Date.now().toString(),
      postId,
      author: author.trim(),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(author)}`,
      content: newComment.trim(),
      createdAt: new Date().toISOString().split('T')[0],
      likes: 0,
    }
    setComments(prev => [...prev, comment])
    setNewComment('')
    setAuthor('')
    setSubmitting(false)
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
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
                <img src={comment.avatar} alt={comment.author} className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900 text-sm">{comment.author}</span>
                    <span className="text-xs text-gray-400">{comment.createdAt}</span>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">{comment.content}</p>
                  <button className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 hover:text-violet-500 transition-colors">
                    <Heart size={13} />
                    {comment.likes > 0 && <span>{comment.likes}</span>}
                    <span>点赞</span>
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

  const relatedPosts = POSTS.filter(p => p.id !== post?.id && (
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
                <img src={post.author.avatar} alt={post.author.name} className="w-10 h-10 rounded-full border-2 border-violet-100" />
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{post.author.name}</div>
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
            {post.content.split('\n').map((line, i) => {
              if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-extrabold text-gray-900 mt-8 mb-4">{line.slice(2)}</h1>
              if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold text-gray-900 mt-7 mb-3">{line.slice(3)}</h2>
              if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-bold text-gray-800 mt-6 mb-2">{line.slice(4)}</h3>
              if (line.startsWith('```')) return <div key={i} className="bg-gray-900 rounded-xl px-4 py-3 my-4 text-sm text-gray-100 font-mono overflow-x-auto">{''}</div>
              if (line.startsWith('- ')) return <li key={i} className="ml-4 text-gray-700 mb-1 list-disc">{line.slice(2)}</li>
              if (line.trim() === '') return <div key={i} className="h-3" />
              return <p key={i} className="text-gray-700 leading-relaxed mb-3">{line}</p>
            })}
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
              <img src={post.author.avatar} alt={post.author.name} className="w-16 h-16 rounded-2xl border-2 border-white shadow-sm" />
              <div>
                <div className="text-xs text-violet-500 font-medium mb-1">文章作者</div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{post.author.name}</h3>
                <p className="text-gray-600 text-sm">{post.author.bio}</p>
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4">文章目录</h3>
              <ul className="space-y-2">
                {post.content.split('\n')
                  .filter(line => line.startsWith('## '))
                  .map((line, i) => (
                    <li key={i} className="text-sm text-gray-600 hover:text-violet-600 cursor-pointer flex items-center gap-2 transition-colors">
                      <span className="w-1.5 h-1.5 bg-violet-300 rounded-full flex-shrink-0" />
                      {line.slice(3)}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
