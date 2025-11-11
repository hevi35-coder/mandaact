import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { getCompletionStats, getGoalProgress } from '@/lib/stats'
import { supabase } from '@/lib/supabase'
import { TrendingUp, Target, Calendar, Sparkles, Loader2 } from 'lucide-react'
import { CARD_ANIMATION, STAGGER, getStaggerDelay } from '@/lib/animations'

interface PredictionData {
  goalType: 'weekly_80' | 'monthly_90' | 'all_goals_complete'
  currentProgress: number
  targetProgress: number
  dailyRate: number
  daysToGoal: number
  estimatedDate: Date
  feasibility: 'excellent' | 'good' | 'challenging' | 'difficult'
  description: string
}

export function GoalPrediction() {
  const { user } = useAuthStore()
  const [predictions, setPredictions] = useState<PredictionData[]>([])
  const [aiMotivation, setAiMotivation] = useState<string>('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    calculatePredictions()
  }, [user])

  const calculatePredictions = async () => {
    if (!user) return

    setLoading(true)
    const predictionsList: PredictionData[] = []

    // Get stats
    const completionStats = await getCompletionStats(user.id)
    const goalProgress = await getGoalProgress(user.id)

    // Calculate daily rate (last 7 days)
    const { data: last7Days } = await supabase
      .from('check_history')
      .select('checked_at')
      .eq('user_id', user.id)
      .gte('checked_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    const uniqueDays = new Set(
      last7Days?.map((check) => new Date(check.checked_at).toDateString()) || []
    ).size

    const dailyRate = uniqueDays > 0 ? (last7Days?.length || 0) / uniqueDays : 0

    // Prediction 1: Weekly 80% goal
    if (completionStats.week.percentage < 80) {
      const currentChecks = completionStats.week.checked
      const totalWeeklyTarget = completionStats.week.total
      const neededFor80 = Math.ceil(totalWeeklyTarget * 0.8)
      const checksNeeded = neededFor80 - currentChecks

      if (checksNeeded > 0 && dailyRate > 0) {
        const daysNeeded = Math.ceil(checksNeeded / dailyRate)
        const estimatedDate = new Date(Date.now() + daysNeeded * 24 * 60 * 60 * 1000)

        // Check if achievable within the week
        const daysLeftInWeek = 7 - new Date().getDay()
        const feasibility: PredictionData['feasibility'] =
          daysNeeded <= daysLeftInWeek * 0.5
            ? 'excellent'
            : daysNeeded <= daysLeftInWeek * 0.7
            ? 'good'
            : daysNeeded <= daysLeftInWeek
            ? 'challenging'
            : 'difficult'

        predictionsList.push({
          goalType: 'weekly_80',
          currentProgress: completionStats.week.percentage,
          targetProgress: 80,
          dailyRate,
          daysToGoal: daysNeeded,
          estimatedDate,
          feasibility,
          description: '주간 80% 달성',
        })
      }
    }

    // Prediction 2: Monthly 90% goal
    if (completionStats.month.percentage < 90) {
      const currentChecks = completionStats.month.checked
      const totalMonthlyTarget = completionStats.month.total
      const neededFor90 = Math.ceil(totalMonthlyTarget * 0.9)
      const checksNeeded = neededFor90 - currentChecks

      if (checksNeeded > 0 && dailyRate > 0) {
        const daysNeeded = Math.ceil(checksNeeded / dailyRate)
        const estimatedDate = new Date(Date.now() + daysNeeded * 24 * 60 * 60 * 1000)

        const today = new Date()
        const daysLeftInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate()
        const feasibility: PredictionData['feasibility'] =
          daysNeeded <= daysLeftInMonth * 0.5
            ? 'excellent'
            : daysNeeded <= daysLeftInMonth * 0.7
            ? 'good'
            : daysNeeded <= daysLeftInMonth
            ? 'challenging'
            : 'difficult'

        predictionsList.push({
          goalType: 'monthly_90',
          currentProgress: completionStats.month.percentage,
          targetProgress: 90,
          dailyRate,
          daysToGoal: daysNeeded,
          estimatedDate,
          feasibility,
          description: '월간 90% 달성',
        })
      }
    }

    // Prediction 3: Complete all sub-goals (60%+ each)
    const strugglingGoals = goalProgress.filter((g) => g.weeklyPercentage < 60)
    if (strugglingGoals.length > 0 && strugglingGoals.length < goalProgress.length) {
      const avgStruggling =
        strugglingGoals.reduce((sum, g) => sum + g.weeklyPercentage, 0) / strugglingGoals.length

      // Estimate based on current growth rate
      const neededGrowth = 60 - avgStruggling
      const weeksNeeded = Math.ceil(neededGrowth / 10) // Assume 10% growth per week
      const daysNeeded = weeksNeeded * 7

      predictionsList.push({
        goalType: 'all_goals_complete',
        currentProgress: avgStruggling,
        targetProgress: 60,
        dailyRate,
        daysToGoal: daysNeeded,
        estimatedDate: new Date(Date.now() + daysNeeded * 24 * 60 * 60 * 1000),
        feasibility: weeksNeeded <= 2 ? 'good' : weeksNeeded <= 4 ? 'challenging' : 'difficult',
        description: '모든 목표 균형 달성 (60%+)',
      })
    }

    setPredictions(predictionsList)
    setLoading(false)
  }

  const generateAIMotivation = async (prediction: PredictionData) => {
    if (!user || loadingAI) return

    setLoadingAI(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) throw new Error('No active session')

      // AI-generated motivational messages based on prediction data
      // Using pre-defined templates for cost efficiency and instant response
      // For real-time personalized messages, integrate with Perplexity API:
      // const response = await fetch('/api/chat', {
      //   method: 'POST',
      //   body: JSON.stringify({ message: prompt, context: prediction })
      // })
      const motivationMessages: Record<string, string[]> = {
        excellent: [
          `훌륭해요! 현재 속도라면 ${prediction.daysToGoal}일 안에 충분히 달성할 수 있어요. 지금의 리듬을 계속 유지하세요!`,
          `완벽한 페이스입니다! 목표까지 ${prediction.daysToGoal}일 남았고, 당신은 이미 ${prediction.currentProgress.toFixed(0)}%를 완료했어요. 계속 나아가세요!`,
        ],
        good: [
          `좋은 진행이에요! ${prediction.daysToGoal}일 정도면 목표에 도달할 수 있어요. 매일 조금씩 꾸준히 하는 게 핵심이에요.`,
          `잘하고 있어요! 현재 속도를 유지하면 ${prediction.daysToGoal}일 후 목표를 달성할 거예요. 하루 ${Math.ceil(prediction.dailyRate)}개씩만 체크하세요!`,
        ],
        challenging: [
          `도전적이지만 가능해요! ${prediction.daysToGoal}일 안에 목표를 이루려면 조금 더 힘을 내야 해요. 하루 ${Math.ceil(prediction.dailyRate * 1.2)}개 정도를 목표로 해보세요!`,
          `약간의 가속이 필요해요. 현재보다 20% 정도만 더 노력하면 ${prediction.daysToGoal}일 내 달성 가능해요. 할 수 있어요!`,
        ],
        difficult: [
          `목표가 야심차네요! 현재 속도로는 ${prediction.daysToGoal}일 이상 걸려요. 하루 실천량을 늘리거나 기간을 조정해보는 건 어떨까요?`,
          `도전적인 목표예요. 일일 실천을 현재의 2배로 늘리면 ${Math.ceil(prediction.daysToGoal / 2)}일 만에 달성할 수 있어요. 작은 목표부터 시작해보세요!`,
        ],
      }

      const messages = motivationMessages[prediction.feasibility]
      const randomMessage = messages[Math.floor(Math.random() * messages.length)]
      setAiMotivation(randomMessage)
    } catch (error) {
      console.error('Error generating motivation:', error)
      setAiMotivation('계속 노력하세요! 당신은 할 수 있어요!')
    } finally {
      setLoadingAI(false)
    }
  }

  if (!user || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">예측 로딩 중...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (predictions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            목표 예측
          </CardTitle>
          <CardDescription>모든 목표를 이미 달성했어요! 🎉</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8 text-muted-foreground">
            <p>새로운 목표를 설정하거나 더 높은 기준에 도전해보세요!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getFeasibilityConfig = (feasibility: PredictionData['feasibility']) => {
    switch (feasibility) {
      case 'excellent':
        return {
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          label: '매우 달성 가능',
        }
      case 'good':
        return {
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/30',
          label: '달성 가능',
        }
      case 'challenging':
        return {
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          label: '도전적',
        }
      default:
        return {
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          label: '매우 도전적',
        }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          목표 달성 예측
        </CardTitle>
        <CardDescription>현재 속도로 분석한 목표 달성 시기</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {predictions.map((prediction, index) => {
          const config = getFeasibilityConfig(prediction.feasibility)

          return (
            // 📋 CARD: Prediction cards with slow stagger
            <motion.div
              key={index}
              {...CARD_ANIMATION}
              transition={{
                ...CARD_ANIMATION.transition,
                delay: getStaggerDelay(index, STAGGER.SLOW)
              }}
              className={`p-4 rounded-lg border-2 ${config.bgColor} ${config.borderColor}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold flex items-center gap-2">
                    <Target className={`h-4 w-4 ${config.color}`} />
                    {prediction.description}
                  </h4>
                  <p className={`text-xs mt-1 ${config.color} font-medium`}>{config.label}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{prediction.daysToGoal}</div>
                  <div className="text-xs text-muted-foreground">일 예상</div>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">현재 진행도</span>
                  <span className="font-mono font-semibold">
                    {prediction.currentProgress.toFixed(1)}% → {prediction.targetProgress}%
                  </span>
                </div>
                <Progress value={(prediction.currentProgress / prediction.targetProgress) * 100} className="h-2" />
              </div>

              {/* Stats */}
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">예상 달성일</div>
                    <div className="font-semibold">
                      {prediction.estimatedDate.toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">일일 평균</div>
                    <div className="font-semibold">{prediction.dailyRate.toFixed(1)}회</div>
                  </div>
                </div>
              </div>

              {/* AI Motivation Button */}
              <div className="mt-4 pt-4 border-t">
                {aiMotivation ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 bg-background/50 rounded-lg border text-sm leading-relaxed"
                  >
                    {aiMotivation}
                  </motion.div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateAIMotivation(prediction)}
                    disabled={loadingAI}
                    className="w-full"
                  >
                    {loadingAI ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        생성 중...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        AI 동기부여 메시지 받기
                      </>
                    )}
                  </Button>
                )}
              </div>
            </motion.div>
          )
        })}
      </CardContent>
    </Card>
  )
}
