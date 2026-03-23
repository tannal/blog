import { createRootRoute, Link, Outlet, useNavigate } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { useState } from 'react'
import { Search, Menu, X, Rss, Github, Twitter } from 'lucide-react'
import { CATEGORIES } from '../data/blog'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate({ to: '/', search: { q: searchQuery.trim() } as any })
      setMobileOpen(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                <Rss size={16} className="text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-violet-700 to-indigo-600 bg-clip-text text-transparent">
                TechBlog
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/"
                className="px-3 py-2 text-sm text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all font-medium"
              >
                首页
              </Link>
              {CATEGORIES.slice(0, 5).map(cat => (
                <Link
                  key={cat}
                  to="/"
                  search={{ category: cat } as any}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all font-medium"
                >
                  {cat}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <form onSubmit={handleSearch} className="hidden sm:flex items-center">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索文章..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm bg-gray-100 rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:bg-white w-48 transition-all"
                  />
                </div>
              </form>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer"
                className="hidden sm:flex p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all">
                <Github size={18} />
              </a>
              <button className="md:hidden p-2 text-gray-500" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            <form onSubmit={handleSearch} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="搜索文章..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <button type="submit" className="px-3 py-2 bg-violet-600 text-white rounded-xl text-sm">搜索</button>
            </form>
            {CATEGORIES.map(cat => (
              <Link key={cat} to="/" search={{ category: cat } as any}
                className="block px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-violet-50"
                onClick={() => setMobileOpen(false)}>
                {cat}
              </Link>
            ))}
          </div>
        )}
      </header>

      <main><Outlet /></main>

      <footer className="mt-20 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <Rss size={14} className="text-white" />
                </div>
                <span className="text-white font-bold">TechBlog</span>
              </div>
              <p className="text-sm leading-relaxed">分享最前沿的技术见解，帮助开发者成长，共建技术社区。</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">文章分类</h4>
              <ul className="space-y-2 text-sm">
                {CATEGORIES.map(cat => (
                  <li key={cat}>
                    <Link to="/" search={{ category: cat } as any} className="hover:text-violet-400 transition-colors">{cat}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">关注我们</h4>
              <div className="flex gap-3">
                <a href="#" className="p-2 bg-gray-800 hover:bg-violet-600 rounded-lg transition-colors"><Github size={18} /></a>
                <a href="#" className="p-2 bg-gray-800 hover:bg-violet-600 rounded-lg transition-colors"><Twitter size={18} /></a>
                <a href="#" className="p-2 bg-gray-800 hover:bg-violet-600 rounded-lg transition-colors"><Rss size={18} /></a>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-sm text-center">
            © 2025 TechBlog. Built with TanStack Router + React.
          </div>
        </div>
      </footer>

      <TanStackRouterDevtools />
    </div>
  )
}
