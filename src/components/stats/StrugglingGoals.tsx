import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/authStore'
import { getGoalProgress } from '@/lib/stats'
import type { GoalProgress } from '@/lib/stats'
import { AlertTriangle, Lightbulb, TrendingDown, ExternalLink, Sparkles } from 'lucide-react'
import { CARD_ANIMATION, LIST_ITEM_ANIMATION, STAGGER, getStaggerDelay, getNestedStaggerDelay } from '@/lib/animations'

interface StrugglingGoal extends GoalProgress {
  mandalartId: string
  mandalartTitle: string
  analysis: string
  suggestions: string[]
}

export function StrugglingGoals() {
  const { user } = useAuthStore()
  const [strugglingGoals, setStrugglingGoals] = useState<StrugglingGoal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    analyzeStrugglingGoals()
  }, [user])

  const analyzeStrugglingGoals = async () => {
    if (!user) return

    setLoading(true)

    // Get all goal progress
    const allProgress = await getGoalProgress(user.id)

    // Identify struggling goals (weekly completion < 30%)
    const struggling = allProgress
      .filter((goal) => goal.weeklyPercentage < 30)
      .slice(0, 5) // Limit to top 5 worst performing

    // Generate analysis and suggestions for each
    const analyzed: StrugglingGoal[] = struggling.map((goal) => {
      const analysis = generateAnalysis(goal)
      const suggestions = generateSuggestions(goal)

      return {
        ...goal,
        mandalartId: goal.mandalartId || '',
        mandalartTitle: goal.mandalartTitle || '만다라트',
        analysis,
        suggestions,
      }
    })

    setStrugglingGoals(analyzed)
    setLoading(false)
  }

  const generateAnalysis = (goal: GoalProgress): string => {
    const { weeklyPercentage, checkedThisWeek, totalActions } = goal

    if (weeklyPercentage === 0) {
      return '이번 주 아직 실천이 없습니다. 시작이 가장 어려운 법이에요.'
    }

    if (checkedThisWeek < totalActions) {
      const completedActions = checkedThisWeek / 7 // Actions per day
      if (completedActions < 1) {
        return '하루에 1개도 채우지 못하고 있어요. 목표가 너무 크거나 어려울 수 있어요.'
      }
      return `주간 ${weeklyPercentage.toFixed(0)}% 달성 중. 목표 대비 실천이 부족한 상태예요.`
    }

    return '이 목표에 집중이 필요해 보여요.'
  }

  const generateSuggestions = (goal: GoalProgress): string[] => {
    const { weeklyPercentage, checkedThisWeek, totalActions } = goal
    const suggestions: string[] = []

    // Suggestion based on performance level
    if (weeklyPercentage === 0) {
      suggestions.push('오늘 딱 1개만 체크해보세요. 시작이 반입니다!')
      suggestions.push('가장 쉬운 액션부터 골라 시작하세요')
      suggestions.push('알림을 설정해서 잊지 않도록 하세요')
    } else if (weeklyPercentage < 10) {
      suggestions.push('하루에 1개씩만 꾸준히 체크하는 것을 목표로 하세요')
      suggestions.push('아침 루틴에 이 목표를 포함시켜보세요')
      suggestions.push('너무 많은 액션이 부담된다면 개수를 줄여보세요')
    } else if (weeklyPercentage < 30) {
      suggestions.push('현재 속도의 2배만 해도 충분해요. 조금만 더 힘내세요!')
      suggestions.push('잘하고 있는 다른 목표의 방법을 이 목표에 적용해보세요')
      suggestions.push('특정 시간대를 정해서 집중적으로 실천해보세요')
    }

    // Practical suggestions
    if (totalActions > 6) {
      suggestions.push('액션이 너무 많을 수 있어요. 핵심 3-4개로 줄여보세요')
    }

    if (checkedThisWeek < 3) {
      suggestions.push('주 3회 이상을 최소 목표로 설정해보세요')
    }

    // Motivational suggestion
    suggestions.push('작은 진전도 진전입니다. 자신을 격려하세요!')

    return suggestions.slice(0, 4) // Max 4 suggestions
  }

  if (!user || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">분석 로딩 중...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (strugglingGoals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-500" />
            부진한 목표 없음
          </CardTitle>
          <CardDescription>모든 목표가 잘 진행되고 있어요! 🎉</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              모든 목표가 30% 이상 진행 중입니다. 훌륭해요!
            </p>
            <p className="text-sm text-muted-foreground">
              계속 이 페이스를 유지하거나 더 높은 목표에 도전해보세요.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          개선이 필요한 목표
        </CardTitle>
        <CardDescription>
          {strugglingGoals.length}개 목표가 주간 30% 미만 진행 중입니다
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {strugglingGoals.map((goal, index) => (
          // 📋 CARD: Struggling goal cards with slow stagger and side entry
          <motion.div
            key={goal.subGoalId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              ...CARD_ANIMATION.transition,
              delay: getStaggerDelay(index, STAGGER.SLOW)
            }}
            className="p-4 bg-orange-500/5 rounded-lg border-l-2 border-orange-500/30"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="destructive" className="text-xs">
                    {goal.weeklyPercentage.toFixed(0)}%
                  </Badge>
                  <h4 className="font-semibold text-sm">{goal.subGoalTitle}</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  이번 주: {goal.checkedThisWeek}/{goal.totalActions * 7}
                </p>
              </div>
              <TrendingDown className="h-5 w-5 text-orange-500 shrink-0" />
            </div>

            {/* Analysis */}
            <div className="mb-3 p-3 bg-background/50 rounded border">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground leading-relaxed">{goal.analysis}</p>
              </div>
            </div>

            {/* Suggestions */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                💡 개선 제안:
              </div>
              <ul className="space-y-1.5">
                {goal.suggestions.map((suggestion, idx) => (
                  // 📝 LIST_ITEM: Suggestion items with nested stagger
                  <motion.li
                    key={idx}
                    {...LIST_ITEM_ANIMATION}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      ...LIST_ITEM_ANIMATION.transition,
                      delay: getNestedStaggerDelay(index, idx, STAGGER.SLOW, STAGGER.NORMAL)
                    }}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="text-orange-500 shrink-0">•</span>
                    <span className="text-muted-foreground leading-relaxed">{suggestion}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-4 border-t flex items-center justify-between gap-2">
              {goal.mandalartId && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/mandalart/${goal.mandalartId}`}>
                    <ExternalLink className="mr-2 h-3 w-3" />
                    목표 보기
                  </Link>
                </Button>
              )}
              <span className="text-xs text-muted-foreground">위치: {index + 1}번째</span>
            </div>
          </motion.div>
        ))}

        {/* Overall Advice */}
        <div className="mt-6 p-4 bg-blue-500/5 rounded-lg border-l-2 border-blue-500/30">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">전체 조언</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                한 번에 모든 목표를 개선하려 하지 마세요. 가장 중요한 1-2개 목표에 집중하고,
                나머지는 천천히 개선하세요. 작은 승리를 쌓는 것이 장기적으로 더 효과적입니다.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                목표 자체를 수정하는 것도 방법입니다. 너무 어려운 목표는 동기를 떨어뜨릴 수
                있어요. 현실적이고 달성 가능한 수준으로 조정해보세요.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
