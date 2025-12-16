import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import ErrorBoundary from '@/components/ErrorBoundary'
import Navigation from '@/components/Navigation'
import { Toaster } from '@/components/ui/toaster'
import { initPostHog, identifyUser, resetUser } from '@/lib/posthog'
import { initSentry, setSentryUser, clearSentryUser } from '@/lib/sentry'

// Lazy load pages for code splitting
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage'))
const TermsOfServicePage = lazy(() => import('@/pages/TermsOfServicePage'))

// Loading component
function PageLoader() {
  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">페이지 로딩 중...</p>
      </div>
    </div>
  )
}

// LandingPage component
function LandingPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">MandaAct</h1>
          <p className="text-muted-foreground mb-2">
            AI-powered Mandalart Action Tracker
          </p>
          <p className="text-sm text-muted-foreground">
            모바일 앱에서 더 나은 경험을 제공하고 있어요.
          </p>
        </div>

        {/* CTA */}
        <Card>
          <CardHeader>
            <CardTitle>앱에서 시작하기</CardTitle>
            <CardDescription>
              iOS 앱을 다운로드해 프리미엄 기능과 광고 제거 혜택을 이용하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href="https://apps.apple.com/app/id6756198473"
                target="_blank"
                rel="noreferrer"
                className="flex-1"
              >
                <Button className="w-full">App Store 열기</Button>
              </a>
              <a
                href="mailto:support@unwrittenbd.com"
                className="flex-1"
              >
                <Button variant="outline" className="w-full">지원 문의</Button>
              </a>
            </div>
            <div className="flex items-center justify-center gap-3 text-sm">
              <Link to="/terms" className="text-primary underline">이용약관</Link>
              <span className="text-muted-foreground">·</span>
              <Link to="/privacy" className="text-primary underline">개인정보처리방침</Link>
            </div>
          </CardContent>
        </Card>

        {/* Notice */}
        <Card>
          <CardHeader>
            <CardTitle>안내</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              웹에서는 소개/지원/약관 문서만 제공하며, 서비스 기능은 모바일 앱에서 이용할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - garbage collection time (renamed from cacheTime in v4+)
      refetchOnWindowFocus: false,
      retry: 1, // Reduce retry attempts from default 3 to 1
    },
  },
})

// Wrapper component to use useLocation inside Router
function AnimatedRoutes() {
  const location = useLocation()

  return (
    <>
      <Navigation />
      <AnimatePresence mode="wait" initial={false}>
        <Suspense fallback={<PageLoader />} key={location.pathname}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<LandingPage />} />
            {/* Short-term: web runs in "landing page mode" (block app routes) */}
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route
              path="/home"
              element={<Navigate to="/" replace />}
            />
            <Route
              path="/mandalart/create"
              element={<Navigate to="/" replace />}
            />
            <Route
              path="/mandalart/list"
              element={<Navigate to="/" replace />}
            />
            <Route
              path="/mandalart/:id"
              element={<Navigate to="/" replace />}
            />
            <Route
              path="/today"
              element={<Navigate to="/" replace />}
            />
            <Route
              path="/settings/notifications"
              element={<Navigate to="/" replace />}
            />
            <Route
              path="/reports"
              element={<Navigate to="/" replace />}
            />
            <Route path="/tutorial" element={<Navigate to="/" replace />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
            {/* More routes will be added in future phases */}
          </Routes>
        </Suspense>
      </AnimatePresence>

      {/* Mobile Bottom Spacer - ensures content isn't hidden behind bottom nav */}
      <div className="md:hidden h-16" aria-hidden="true" />

      <Toaster />
    </>
  )
}

function App() {
  const initialize = useAuthStore((state) => state.initialize)
  const user = useAuthStore((state) => state.user)

  // Initialize monitoring tools on app mount
  useEffect(() => {
    // Phase 8.1 - Event Tracking
    initPostHog()

    // Phase 8.1 - Error Tracking
    initSentry()
  }, [])

  // Initialize auth
  useEffect(() => {
    initialize()
  }, [initialize])

  // Track user identification/logout in both PostHog and Sentry
  useEffect(() => {
    if (user) {
      // User logged in - identify in monitoring tools
      identifyUser(user.id, {
        email: user.email,
        created_at: user.created_at
      })
      setSentryUser(user.id, user.email)
    } else {
      // User logged out - reset monitoring tools
      resetUser()
      clearSentryUser()
    }
  }, [user])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AnimatedRoutes />
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
