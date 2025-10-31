import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import {
  getCompletionStats,
  getStreakStats,
  getGoalProgress,
  generateMotivationalMessage,
  type CompletionStats,
  type StreakStats,
  type GoalProgress,
  type MotivationalMessage
} from '@/lib/stats'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function StatsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  const [isLoading, setIsLoading] = useState(true)
  const [completionStats, setCompletionStats] = useState<CompletionStats | null>(null)
  const [streakStats, setStreakStats] = useState<StreakStats | null>(null)
  const [goalProgress, setGoalProgress] = useState<GoalProgress[]>([])
  const [motivationalMsg, setMotivationalMsg] = useState<MotivationalMessage | null>(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchAllStats()
  }, [user, navigate])

  const fetchAllStats = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const [completion, streak, progress] = await Promise.all([
        getCompletionStats(user.id),
        getStreakStats(user.id),
        getGoalProgress(user.id)
      ])

      setCompletionStats(completion)
      setStreakStats(streak)
      setGoalProgress(progress)
      setMotivationalMsg(generateMotivationalMessage(completion, streak))
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-muted-foreground">통계를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  const getVariantColor = (variant: string) => {
    switch (variant) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 70) return 'bg-green-500'
    if (percentage >= 40) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">진행 상황</h1>
            <p className="text-muted-foreground mt-1">나의 실천 통계와 진행도를 확인하세요</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            대시보드로
          </Button>
        </div>

        {/* Motivational Message */}
        {motivationalMsg && (
          <Card className={`border-2 ${getVariantColor(motivationalMsg.variant)}`}>
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{motivationalMsg.emoji}</div>
                <div>
                  <h3 className="text-lg font-bold">{motivationalMsg.title}</h3>
                  <p className="text-sm mt-1">{motivationalMsg.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Streak Card */}
        {streakStats && (
          <Card>
            <CardHeader>
              <CardTitle>연속 실천 스트릭</CardTitle>
              <CardDescription>꾸준함이 힘입니다!</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-6 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-5xl mb-2">🔥</div>
                  <div className="text-3xl font-bold text-orange-600">{streakStats.current}일</div>
                  <p className="text-sm text-muted-foreground mt-1">현재 스트릭</p>
                </div>
                <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-5xl mb-2">🏆</div>
                  <div className="text-3xl font-bold text-blue-600">{streakStats.longest}일</div>
                  <p className="text-sm text-muted-foreground mt-1">최장 스트릭</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completion Stats */}
        {completionStats && (
          <Card>
            <CardHeader>
              <CardTitle>완료율 통계</CardTitle>
              <CardDescription>기간별 실천 완료율을 확인하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Today */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">오늘</span>
                    <span className="text-sm text-muted-foreground">
                      {completionStats.today.checked}개 완료 / 전체 {completionStats.today.total}개
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${getProgressBarColor(completionStats.today.percentage)}`}
                      style={{ width: `${completionStats.today.percentage}%` }}
                    />
                  </div>
                  <p className="text-right text-sm font-medium mt-1">{completionStats.today.percentage}%</p>
                </div>

                {/* This Week */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">이번 주 (일요일부터)</span>
                    <span className="text-sm text-muted-foreground">
                      {completionStats.week.checked}개 완료 / 전체 {completionStats.week.total}개
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${getProgressBarColor(completionStats.week.percentage)}`}
                      style={{ width: `${completionStats.week.percentage}%` }}
                    />
                  </div>
                  <p className="text-right text-sm font-medium mt-1">{completionStats.week.percentage}%</p>
                </div>

                {/* This Month */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">이번 달 (1일부터)</span>
                    <span className="text-sm text-muted-foreground">
                      {completionStats.month.checked}개 완료 / 전체 {completionStats.month.total}개
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${getProgressBarColor(completionStats.month.percentage)}`}
                      style={{ width: `${completionStats.month.percentage}%` }}
                    />
                  </div>
                  <p className="text-right text-sm font-medium mt-1">{completionStats.month.percentage}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Goal Progress Chart */}
        {goalProgress.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>목표별 진행도</CardTitle>
              <CardDescription>각 세부 목표의 주간 실천율 (지난 7일)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={goalProgress} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="subGoalTitle"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    label={{ value: '완료율 (%)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, '완료율']}
                    labelFormatter={(label) => `세부 목표: ${label}`}
                  />
                  <Bar dataKey="weeklyPercentage" radius={[8, 8, 0, 0]}>
                    {goalProgress.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.weeklyPercentage >= 70
                            ? '#22c55e'
                            : entry.weeklyPercentage >= 40
                              ? '#f59e0b'
                              : '#ef4444'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Goal Progress Details */}
              <div className="mt-6 space-y-3">
                {goalProgress.map((goal) => (
                  <div key={goal.subGoalId} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{goal.subGoalTitle}</span>
                      <span className="text-xs text-muted-foreground">
                        이번 주: {goal.checkedThisWeek} / {goal.totalActions * 7}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getProgressBarColor(goal.weeklyPercentage)}`}
                        style={{ width: `${goal.weeklyPercentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {goalProgress.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">아직 만다라트가 없습니다.</p>
              <Button onClick={() => navigate('/mandalart/create')}>만다라트 만들기</Button>
            </CardContent>
          </Card>
        )}

        {/* Back Button */}
        <div className="pt-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  )
}
