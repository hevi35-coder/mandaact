import { memo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { CalendarCheck, Home, Grid3x3, Bell, FileText } from 'lucide-react'

const Navigation = memo(function Navigation() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)

  // Don't show navigation on auth pages
  if (!user || location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup') {
    return null
  }

  const navItems = [
    { path: '/home', label: '홈', icon: Home },
    { path: '/today', label: '투데이', icon: CalendarCheck },
    { path: '/mandalart/list', label: '만다라트', icon: Grid3x3 },
    { path: '/reports', label: '리포트', icon: FileText },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <>
      {/* Desktop Navigation - Top */}
      <nav className="hidden md:block border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/home" className="text-2xl font-bold">
              <span className="text-black">Manda</span>
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Act</span>
            </Link>
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive(item.path) ? 'default' : 'ghost'}
                      size="sm"
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                )
              })}
              <Link to="/settings/notifications">
                <Button variant="ghost" size="sm">
                  <Bell className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Header - Top */}
      <nav className="md:hidden sticky top-0 border-b bg-white z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link to="/home" className="text-xl font-bold">
              <span className="text-black">Manda</span>
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Act</span>
            </Link>
            <Link to="/settings/notifications">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Bell className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation - Bottom */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-white z-50">
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 text-xs transition-colors ${
                  isActive(item.path)
                    ? 'text-primary font-medium bg-primary/5'
                    : 'text-muted-foreground hover:text-primary'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
})

export default Navigation
