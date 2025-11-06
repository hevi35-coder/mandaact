import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'

export default function Navigation() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)

  // Don't show navigation on auth pages
  if (!user || location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup') {
    return null
  }

  const navItems = [
    { path: '/today', label: '오늘의 실천', icon: '✅' },
    { path: '/dashboard', label: '대시보드', icon: '🏠' },
    { path: '/mandalart/list', label: '만다라트 관리', icon: '📋' },
    { path: '/stats', label: '통계/리포트', icon: '📊' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <>
      {/* Desktop Navigation - Top */}
      <nav className="hidden md:block border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="text-xl font-bold">
              MandaAct
            </Link>
            <div className="flex items-center gap-2">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive(item.path) ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation - Bottom */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-white z-50">
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 text-xs transition-colors ${
                isActive(item.path)
                  ? 'text-primary font-medium bg-primary/5'
                  : 'text-muted-foreground hover:text-primary'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile Spacer */}
      <div className="md:hidden h-16" />
    </>
  )
}
