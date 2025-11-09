import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/authStore'
import { analyzeWeekdayPatterns, analyzeTimePatterns } from '@/lib/stats'
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Target,
  Zap,
} from 'lucide-react'

interface Insight {
  type: 'positive' | 'warning' | 'info'
  category: 'weekday' | 'time' | 'consistency'
  icon: React.ReactNode
  title: string
  message: string
  actionable: boolean
}

export function LiveInsights() {
  const { user } = useAuthStore()
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    analyzeInsights()
  }, [user])

  const analyzeInsights = async () => {
    if (!user) return

    setLoading(true)
    const discoveredInsights: Insight[] = []

    // Analyze weekday patterns
    const weekdayData = await analyzeWeekdayPatterns(user.id)
    if (weekdayData) {
      const { bestDay, worstDay, allDays } = weekdayData

      // Best day insight
      if (bestDay.count > 0) {
        const avgCount = allDays.reduce((sum, d) => sum + d.count, 0) / allDays.length
        const percentAbove = Math.round(((bestDay.count - avgCount) / avgCount) * 100)

        if (percentAbove > 20) {
          discoveredInsights.push({
            type: 'positive',
            category: 'weekday',
            icon: <TrendingUp className="h-5 w-5" />,
            title: `${bestDay.dayName}이 최강!`,
            message: `${bestDay.dayName}에 평균보다 ${percentAbove}% 더 많은 실천을 하고 있어요. 이 요일의 루틴을 다른 날에도 적용해보세요!`,
            actionable: true,
          })
        }
      }

      // Worst day insight
      if (worstDay.count < bestDay.count * 0.5) {
        discoveredInsights.push({
          type: 'warning',
          category: 'weekday',
          icon: <TrendingDown className="h-5 w-5" />,
          title: `${worstDay.dayName} 주의`,
          message: `${worstDay.dayName}의 실천율이 다른 요일보다 낮아요. 이 날만의 특별한 장애물이 있는지 확인해보세요.`,
          actionable: true,
        })
      }

      // Weekend vs Weekday
      const weekendDays = allDays.filter((d) => d.day === 0 || d.day === 6)
      const weekdayDays = allDays.filter((d) => d.day >= 1 && d.day <= 5)
      const weekendAvg = weekendDays.reduce((sum, d) => sum + d.count, 0) / weekendDays.length
      const weekdayAvg = weekdayDays.reduce((sum, d) => sum + d.count, 0) / weekdayDays.length

      if (weekendAvg > weekdayAvg * 1.3) {
        discoveredInsights.push({
          type: 'positive',
          category: 'weekday',
          icon: <Calendar className="h-5 w-5" />,
          title: '주말 전사',
          message: `주말에 평일보다 ${Math.round(((weekendAvg - weekdayAvg) / weekdayAvg) * 100)}% 더 활발해요! 주말의 에너지를 평일에도 조금씩 나눠보세요.`,
          actionable: false,
        })
      } else if (weekdayAvg > weekendAvg * 1.3) {
        discoveredInsights.push({
          type: 'positive',
          category: 'weekday',
          icon: <Target className="h-5 w-5" />,
          title: '평일 강자',
          message: `평일에 주말보다 ${Math.round(((weekdayAvg - weekendAvg) / weekendAvg) * 100)}% 더 활발해요! 주말에도 이 페이스를 유지해보세요.`,
          actionable: false,
        })
      }
    }

    // Analyze time patterns
    const timeData = await analyzeTimePatterns(user.id)
    if (timeData) {
      const periods = [
        { name: '아침', data: timeData.morning, emoji: '🌅' },
        { name: '오후', data: timeData.afternoon, emoji: '☀️' },
        { name: '저녁', data: timeData.evening, emoji: '🌆' },
        { name: '밤', data: timeData.night, emoji: '🌙' },
      ]

      const sorted = periods.sort((a, b) => b.data.percentage - a.data.percentage)
      const bestTime = sorted[0]
      const worstTime = sorted[sorted.length - 1]

      if (bestTime.data.percentage >= 40) {
        discoveredInsights.push({
          type: 'positive',
          category: 'time',
          icon: <Clock className="h-5 w-5" />,
          title: `${bestTime.emoji} ${bestTime.name} 타입`,
          message: `전체 실천의 ${bestTime.data.percentage}%가 ${bestTime.name} 시간대에 이루어져요. 당신의 골든 타임이네요!`,
          actionable: false,
        })
      }

      if (worstTime.data.percentage < 10 && worstTime.data.count > 0) {
        discoveredInsights.push({
          type: 'info',
          category: 'time',
          icon: <Zap className="h-5 w-5" />,
          title: `${worstTime.name} 시간대 활용`,
          message: `${worstTime.name}에는 실천이 적어요. 이 시간대를 활용하면 더 균형잡힌 실천이 가능할 거예요!`,
          actionable: true,
        })
      }
    }

    // Add default insight if no patterns found
    if (discoveredInsights.length === 0) {
      discoveredInsights.push({
        type: 'info',
        category: 'consistency',
        icon: <Lightbulb className="h-5 w-5" />,
        title: '패턴 분석 중',
        message: '더 많은 데이터가 쌓이면 맞춤형 인사이트를 제공해드릴게요. 꾸준히 실천해주세요!',
        actionable: false,
      })
    }

    setInsights(discoveredInsights)
    setLoading(false)
  }

  if (!user || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">인사이트 로딩 중...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const getTypeConfig = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return {
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          badgeVariant: 'default' as const,
          badgeText: '강점',
        }
      case 'warning':
        return {
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/30',
          badgeVariant: 'destructive' as const,
          badgeText: '개선',
        }
      default:
        return {
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/30',
          badgeVariant: 'secondary' as const,
          badgeText: '정보',
        }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          실시간 인사이트
        </CardTitle>
        <CardDescription>
          당신의 실천 패턴을 분석한 {insights.length}개의 인사이트
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {insights.map((insight, index) => {
            const config = getTypeConfig(insight.type)

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  p-4 rounded-lg border-2 transition-all
                  ${config.bgColor} ${config.borderColor}
                  hover:shadow-md
                `}
              >
                <div className="flex items-start gap-3">
                  <div className={`${config.color} mt-0.5`}>{insight.icon}</div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm leading-tight">{insight.title}</h4>
                      <Badge variant={config.badgeVariant} className="text-xs shrink-0">
                        {config.badgeText}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {insight.message}
                    </p>

                    {insight.actionable && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                        <Zap className="h-3 w-3" />
                        <span>실행 가능한 인사이트</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {insights.filter((i) => i.type === 'positive').length}
            </div>
            <div className="text-xs text-muted-foreground">강점</div>
          </div>
          <div className="text-center p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
              {insights.filter((i) => i.type === 'warning').length}
            </div>
            <div className="text-xs text-muted-foreground">개선 영역</div>
          </div>
          <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {insights.filter((i) => i.actionable).length}
            </div>
            <div className="text-xs text-muted-foreground">실행 가능</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
