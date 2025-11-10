import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { getStreakStats, getDailyCompletionData } from '@/lib/stats'
import type { StreakStats } from '@/lib/stats'
import { Flame, Trophy, AlertCircle, Calendar } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function StreakHero() {
  const { user } = useAuthStore()
  const [streakStats, setStreakStats] = useState<StreakStats | null>(null)
  const [heatmapData, setHeatmapData] = useState<Array<{ date: string; count: number; percentage: number }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const loadStreakData = async () => {
      setLoading(true)

      // Get streak stats
      const stats = await getStreakStats(user.id)
      setStreakStats(stats)

      // Get 28-day heatmap data (4 weeks)
      const heatmap = await getDailyCompletionData(user.id, 28)
      setHeatmapData(heatmap)

      setLoading(false)
    }

    loadStreakData()
  }, [user])

  if (!user || loading || !streakStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">스트릭 로딩 중...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  // Check if streak is at risk (last check was more than 20 hours ago)
  const now = new Date()
  const lastCheck = streakStats.lastCheckDate ? new Date(streakStats.lastCheckDate) : null
  const hoursSinceLastCheck = lastCheck ? (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60) : 0
  const streakAtRisk = streakStats.current > 0 && hoursSinceLastCheck > 20 && hoursSinceLastCheck < 24

  // Generate last 28 days for heatmap (4 weeks = 7×4)
  const last28Days = Array.from({ length: 28 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (27 - i))
    return date
  })

  const heatmapMap = new Map(heatmapData.map(d => [d.date, d]))

  return (
    <Card className="w-full border-l-4 border-orange-500">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Flame className="h-6 w-6 text-orange-500" />
          <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            스트릭
          </span>
        </CardTitle>
        <CardDescription>연속 실천 기록</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Streak - Hero Display */}
        <motion.div
          className="text-center py-8 px-4 rounded-xl border border-muted"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <Flame className="h-16 w-16 mx-auto text-orange-500 mb-4" />

          <div className="text-7xl md:text-8xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent mb-2">
            {streakStats.current}
          </div>
          <div className="text-2xl font-semibold text-muted-foreground">
            일 연속
          </div>

          {streakStats.current > 0 && lastCheck && (
            <div className="mt-4 text-sm text-muted-foreground">
              마지막 체크: {new Date(lastCheck).toLocaleDateString('ko-KR', {
                month: 'short',
                day: 'numeric',
                weekday: 'short',
              })} {new Date(lastCheck).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })}
            </div>
          )}
        </motion.div>

        {/* Streak At Risk Warning */}
        {streakAtRisk && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert variant="destructive" className="border-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-semibold">
                스트릭 위험! 오늘 안에 체크하지 않으면 {streakStats.current}일 연속 기록이 끊어집니다!
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Longest Streak */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <div>
              <div className="text-sm text-muted-foreground">최장 기록</div>
              <div className="text-2xl font-bold">{streakStats.longest}일</div>
            </div>
          </div>
          {streakStats.current === streakStats.longest && streakStats.current > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            >
              <div className="px-3 py-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-bold border border-yellow-500/30">
                신기록!
              </div>
            </motion.div>
          )}
        </div>

        {/* 28-Day Mini Heatmap (4 weeks) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            지난 4주 활동
          </div>

          <div className="grid grid-cols-7 gap-2">
            {last28Days.map((date, index) => {
              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
              const data = heatmapMap.get(dateStr)
              const intensity = data
                ? data.percentage >= 80
                  ? 'high'
                  : data.percentage >= 50
                  ? 'medium'
                  : data.percentage >= 20
                  ? 'low'
                  : 'minimal'
                : 'none'

              const isToday = dateStr === new Date().toISOString().split('T')[0]

              return (
                <motion.div
                  key={dateStr}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.01 }}
                  whileHover={{ scale: 1.2 }}
                  className={`
                    aspect-square rounded-sm cursor-help transition-all
                    ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''}
                    ${
                      intensity === 'high'
                        ? 'bg-green-500 dark:bg-green-600'
                        : intensity === 'medium'
                        ? 'bg-green-400 dark:bg-green-700'
                        : intensity === 'low'
                        ? 'bg-green-300 dark:bg-green-800'
                        : intensity === 'minimal'
                        ? 'bg-green-200 dark:bg-green-900'
                        : 'bg-muted-foreground/10 dark:bg-muted-foreground/20'
                    }
                  `}
                  title={`${date.toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric'
                  })}: ${data ? `${data.count}회 (${data.percentage}%)` : '활동 없음'}`}
                />
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center">
            <span>적음</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-muted-foreground/10 dark:bg-muted-foreground/20 rounded-sm" />
              <div className="w-3 h-3 bg-green-200 dark:bg-green-900 rounded-sm" />
              <div className="w-3 h-3 bg-green-300 dark:bg-green-800 rounded-sm" />
              <div className="w-3 h-3 bg-green-400 dark:bg-green-700 rounded-sm" />
              <div className="w-3 h-3 bg-green-500 dark:bg-green-600 rounded-sm" />
            </div>
            <span>많음</span>
          </div>
        </div>

        {/* Motivational Message */}
        {streakStats.current === 0 ? (
          <div className="text-center text-sm text-muted-foreground p-4 bg-muted/20 rounded-lg border-l-2 border-muted">
            오늘부터 새로운 스트릭을 시작해보세요! 🌱
          </div>
        ) : streakStats.current >= 7 ? (
          <div className="text-center text-sm font-medium p-4 bg-orange-500/5 rounded-lg border-l-2 border-orange-500">
            대단해요! 꾸준함이 습관이 되고 있어요 🎉
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground p-4 bg-muted/20 rounded-lg border-l-2 border-muted">
            7일 연속까지 {7 - streakStats.current}일 남았어요. 계속 이대로! 💪
          </div>
        )}
      </CardContent>
    </Card>
  )
}
