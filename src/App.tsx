import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import ProtectedRoute from '@/components/ProtectedRoute'
import LoginPage from '@/pages/LoginPage'
import HomePage from '@/pages/HomePage'
import MandalartCreatePage from '@/pages/MandalartCreatePage'
import MandalartListPage from '@/pages/MandalartListPage'
import MandalartDetailPage from '@/pages/MandalartDetailPage'
import TodayChecklistPage from '@/pages/TodayChecklistPage'
import NotificationSettingsPage from '@/pages/NotificationSettingsPage'
import ReportsPage from '@/pages/ReportsPage'
import Navigation from '@/components/Navigation'
import { Toaster } from '@/components/ui/toaster'

// LandingPage component
function LandingPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)

  const handleLogout = async () => {
    await useAuthStore.getState().signOut()
    navigate('/login', { replace: true })
  }

  // Auto-redirect logic
  useEffect(() => {
    if (!loading) {
      if (user) {
        // Logged in -> go to home
        navigate('/home', { replace: true })
      } else {
        // Not logged in -> go to login
        navigate('/login', { replace: true })
      }
    }
  }, [loading, user, navigate])

  if (loading) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">MandaAct</h1>
          <p className="text-muted-foreground mb-2">
            AI-powered Mandalart Action Tracker
          </p>
          <div className="inline-flex gap-4 text-sm">
            <span>✅ Project setup complete</span>
            <span>✅ Git initialized</span>
            <span>✅ UI components ready</span>
          </div>
        </div>

        {/* Auth Status */}
        <Card>
          <CardHeader>
            <CardTitle>인증 상태</CardTitle>
            <CardDescription>
              {user ? `로그인됨: ${user.email}` : '로그인되지 않음'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!user ? (
              <div className="flex gap-2">
                <Link to="/login" className="flex-1">
                  <Button className="w-full">시작하기</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  환영합니다! 만다라트를 만들어보세요.
                </p>
                <div className="flex gap-2">
                  <Link to="/home" className="flex-1">
                    <Button className="w-full">홈으로 가기</Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleLogout}
                  >
                    로그아웃
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Phase 1 Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Phase 1 개발 진행 상황</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li className="text-green-600 font-medium">✅ 회원가입 기능</li>
              <li className="text-green-600 font-medium">✅ 로그인 기능</li>
              <li className="text-green-600 font-medium">✅ Protected Routes</li>
              <li className="text-green-600 font-medium">✅ 만다라트 직접 입력 (테스트 중)</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Navigation />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mandalart/create"
            element={
              <ProtectedRoute>
                <MandalartCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mandalart/list"
            element={
              <ProtectedRoute>
                <MandalartListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mandalart/:id"
            element={
              <ProtectedRoute>
                <MandalartDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/today"
            element={
              <ProtectedRoute>
                <TodayChecklistPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/notifications"
            element={
              <ProtectedRoute>
                <NotificationSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          {/* More routes will be added in future phases */}
        </Routes>

        {/* Mobile Bottom Spacer - ensures content isn't hidden behind bottom nav */}
        <div className="md:hidden h-16" aria-hidden="true" />

        <Toaster />
      </Router>
    </QueryClientProvider>
  )
}

export default App
