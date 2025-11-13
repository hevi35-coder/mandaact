import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'

// Gamification Components
import { UserProfileCard } from '@/components/stats/UserProfileCard'
import { StreakHero } from '@/components/stats/StreakHero'

import { LogOut, TrendingUp, Target, FileText } from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
  }, [user, navigate])

  const handleLogout = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-muted-foreground">로그인이 필요합니다...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-3 md:py-6 px-4 pb-20 md:pb-4">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold inline-block">홈</h1>
            <span className="text-muted-foreground ml-3 text-sm">성장 대시보드</span>
          </div>
        </div>

        {/* User Profile Card (with badges & XP) */}
        <UserProfileCard />

        {/* Streak Hero */}
        <StreakHero />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate('/today')}
          >
            <Target className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">오늘의 실천</div>
              <div className="text-xs text-muted-foreground">체크리스트 확인</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate('/mandalart/list')}
          >
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">만다라트 관리</div>
              <div className="text-xs text-muted-foreground">목표 편집</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2"
            onClick={() => navigate('/reports')}
          >
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <div className="font-medium">AI 리포트</div>
              <div className="text-xs text-muted-foreground">주간 분석 확인</div>
            </div>
          </Button>
        </div>

        {/* Logout Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          로그아웃
        </Button>
      </div>
    </div>
  )
}