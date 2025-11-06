import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import NotificationPermissionPrompt from '@/components/NotificationPermissionPrompt'
import { getCompletionStats, getStreakStats, generateMotivationalMessage, type CompletionStats, type StreakStats } from '@/lib/stats'

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)

  const [completionStats, setCompletionStats] = useState<CompletionStats | null>(null)
  const [streakStats, setStreakStats] = useState<StreakStats | null>(null)

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user])

  const fetchStats = async () => {
    if (!user) return
    try {
      const [completion, streak] = await Promise.all([
        getCompletionStats(user.id),
        getStreakStats(user.id)
      ])
      setCompletionStats(completion)
      setStreakStats(streak)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  const motivationalMessage = completionStats && streakStats
    ? generateMotivationalMessage(completionStats, streakStats)
    : null

  return (
    <div className="container mx-auto pt-8 pb-24 md:pb-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">대시보드</h1>
            <p className="text-muted-foreground mt-1">
              환영합니다, {user?.email}님!
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            로그아웃
          </Button>
        </div>

        {/* Notification Permission Prompt */}
        <NotificationPermissionPrompt />

        {/* Motivational Message */}
        {motivationalMessage && (
          <Card className={
            motivationalMessage.variant === 'success' ? 'border-green-200 bg-green-50' :
            motivationalMessage.variant === 'warning' ? 'border-yellow-200 bg-yellow-50' :
            'border-blue-200 bg-blue-50'
          }>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="text-3xl">{motivationalMessage.emoji}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{motivationalMessage.title}</h3>
                  <p className="text-sm text-muted-foreground">{motivationalMessage.message}</p>
                  {motivationalMessage.showAIButton && (
                    <Link to="/chat" className="inline-block mt-3">
                      <Button size="sm">
                        🤖 AI 코치와 대화하기
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        {completionStats && streakStats && (
          <div className="grid grid-cols-2 gap-4">
            {/* Today */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600">{completionStats.today.percentage}%</div>
                  <p className="text-sm font-medium mt-2">오늘 완료율</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {completionStats.today.checked} / {completionStats.today.total}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Week */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-600">{completionStats.week.percentage}%</div>
                  <p className="text-sm font-medium mt-2">주간 완료율</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {completionStats.week.checked} / {completionStats.week.total}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Month */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">{completionStats.month.percentage}%</div>
                  <p className="text-sm font-medium mt-2">월간 완료율</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {completionStats.month.checked} / {completionStats.month.total}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Streak */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-orange-600">{streakStats.current}일</div>
                  <p className="text-sm font-medium mt-2">연속 실천</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    최장: {streakStats.longest}일
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Hub */}
        <Card>
          <CardHeader>
            <CardTitle>빠른 실행</CardTitle>
            <CardDescription>자주 사용하는 기능에 빠르게 접근하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/today">
                <Button className="w-full h-20 flex flex-col items-center justify-center gap-2" size="lg">
                  <span className="text-2xl">✅</span>
                  <span className="text-sm font-medium">오늘의 실천</span>
                </Button>
              </Link>
              <Link to="/mandalart/list">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2" size="lg">
                  <span className="text-2xl">📋</span>
                  <span className="text-sm font-medium">만다라트 관리</span>
                </Button>
              </Link>
              <Link to="/stats">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2" size="lg">
                  <span className="text-2xl">📊</span>
                  <span className="text-sm font-medium">통계/리포트</span>
                </Button>
              </Link>
              <Link to="/chat">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2" size="lg">
                  <span className="text-2xl">🤖</span>
                  <span className="text-sm font-medium">AI 코치</span>
                </Button>
              </Link>
            </div>

            <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3">
              <Link to="/mandalart/create">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  ➕ 새 만다라트 만들기
                </Button>
              </Link>
              <Link to="/settings/notifications">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  🔔 알림 설정
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
