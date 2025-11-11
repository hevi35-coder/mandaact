import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'

// Gamification Components
import { UserProfileCard } from '@/components/stats/UserProfileCard'
import { StreakHero } from '@/components/stats/StreakHero'
import { QuestLog } from '@/components/stats/QuestLog'
import { AIInsightCard } from '@/components/stats/AIInsightCard'
import { LiveInsights } from '@/components/stats/LiveInsights'
import { GoalPrediction } from '@/components/stats/GoalPrediction'
import { StrugglingGoals } from '@/components/stats/StrugglingGoals'

import { Sparkles, Scroll, Lightbulb, TrendingUp, LogOut } from 'lucide-react'

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
    <div className="container mx-auto py-3 md:py-6 px-4 pb-4">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold inline-block">홈</h1>
            <span className="text-muted-foreground ml-3 text-sm">성장 대시보드</span>
          </div>
        </div>

        {/* User Profile Card (with logout button) */}
        <UserProfileCard />

        {/* Streak Hero */}
        <StreakHero />

        {/* Tabbed Content */}
        <Tabs defaultValue="reports" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="reports" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">AI 리포트</span>
              <span className="sm:hidden">리포트</span>
            </TabsTrigger>
            <TabsTrigger value="quests" className="gap-2">
              <Scroll className="h-4 w-4" />
              <span className="hidden sm:inline">퀘스트</span>
              <span className="sm:hidden">퀘스트</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              <span className="hidden sm:inline">인사이트</span>
              <span className="sm:hidden">분석</span>
            </TabsTrigger>
            <TabsTrigger value="predictions" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">목표 예측</span>
              <span className="sm:hidden">예측</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: AI Reports */}
          <TabsContent value="reports" className="space-y-6">
            <AIInsightCard />
          </TabsContent>

          {/* Tab 2: Quests */}
          <TabsContent value="quests" className="space-y-6">
            <QuestLog />
          </TabsContent>

          {/* Tab 3: Live Insights & Struggling Goals */}
          <TabsContent value="insights" className="space-y-6">
            <LiveInsights />
            <StrugglingGoals />
          </TabsContent>

          {/* Tab 4: Goal Predictions */}
          <TabsContent value="predictions" className="space-y-6">
            <GoalPrediction />
          </TabsContent>
        </Tabs>

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
