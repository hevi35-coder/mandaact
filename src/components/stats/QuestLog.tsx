import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { getGoalProgress } from '@/lib/stats'
import { supabase } from '@/lib/supabase'
import type { GoalProgress } from '@/lib/stats'
import type { Mandalart } from '@/types'
import { Scroll, Target, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import { CARD_ANIMATION, LIST_ITEM_ANIMATION, HOVER_SCALE, STAGGER, getNestedStaggerDelay, getStaggerDelay } from '@/lib/animations'

interface QuestWithMandalart extends GoalProgress {
  mandalartId: string
  mandalartTitle: string
  centerGoal: string
}

export function QuestLog() {
  const { user } = useAuthStore()
  const [quests, setQuests] = useState<QuestWithMandalart[]>([])
  const [mandalarts, setMandalarts] = useState<Mandalart[]>([])
  const [loading, setLoading] = useState(true)
  const [totalMandalartCount, setTotalMandalartCount] = useState(0)

  useEffect(() => {
    if (!user) return

    const loadQuests = async () => {
      setLoading(true)

      // Get total mandalart count (including inactive)
      const { count: mandalartCount, error: countError } = await supabase
        .from('mandalarts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (countError) {
        console.error('Error fetching mandalart count:', countError)
      } else {
        setTotalMandalartCount(mandalartCount || 0)
      }

      // Get active mandalarts
      const { data: mandalartData, error: mandalartError } = await supabase
        .from('mandalarts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (mandalartError || !mandalartData) {
        console.error('Error fetching mandalarts:', mandalartError)
        setLoading(false)
        return
      }

      setMandalarts(mandalartData)

      // Get goal progress for all mandalarts
      const allQuests: QuestWithMandalart[] = []

      for (const mandalart of mandalartData) {
        const progress = await getGoalProgress(user.id, mandalart.id)
        const questsWithMandalart = progress.map(p => ({
          ...p,
          mandalartId: mandalart.id,
          mandalartTitle: mandalart.title,
          centerGoal: mandalart.center_goal
        }))
        allQuests.push(...questsWithMandalart)
      }

      setQuests(allQuests)
      setLoading(false)
    }

    loadQuests()
  }, [user])

  if (!user || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">퀘스트 로딩 중...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (quests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Scroll className="h-5 w-5" />
            퀘스트 로그
          </CardTitle>
          <CardDescription>진행 중인 퀘스트가 없습니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8 text-muted-foreground">
            <p className="mb-4">
              {totalMandalartCount === 0
                ? '만다라트를 생성하여 새로운 퀘스트를 시작하세요!'
                : '활성화된 만다라트가 없습니다. 만다라트를 활성화하거나 새로 만들어보세요'}
            </p>
            {totalMandalartCount === 0 ? (
              <Button asChild>
                <Link to="/mandalart/create">만다라트 만들기</Link>
              </Button>
            ) : (
              <div className="flex gap-2 justify-center">
                <Button variant="outline" asChild>
                  <Link to="/mandalart/list">만다라트 관리</Link>
                </Button>
                <Button asChild>
                  <Link to="/mandalart/create">새로 만들기</Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Determine quest status
  const getQuestStatus = (quest: QuestWithMandalart) => {
    if (quest.weeklyPercentage >= 80) return 'excellent'
    if (quest.weeklyPercentage >= 60) return 'good'
    if (quest.weeklyPercentage >= 40) return 'progress'
    if (quest.weeklyPercentage >= 20) return 'struggling'
    return 'inactive'
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'excellent':
        return {
          icon: <CheckCircle2 className="h-5 w-5" />,
          label: '완수 중',
          color: 'text-green-500',
          borderColor: 'border-l-green-500'
        }
      case 'good':
        return {
          icon: <Target className="h-5 w-5" />,
          label: '순조로움',
          color: 'text-blue-500',
          borderColor: 'border-l-blue-500'
        }
      case 'progress':
        return {
          icon: <Target className="h-5 w-5" />,
          label: '진행 중',
          color: 'text-yellow-500',
          borderColor: 'border-l-yellow-500'
        }
      case 'struggling':
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          label: '부진',
          color: 'text-orange-500',
          borderColor: 'border-l-orange-500'
        }
      default:
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          label: '정체',
          color: 'text-red-500',
          borderColor: 'border-l-red-500'
        }
    }
  }

  // Group quests by mandalart
  const questsByMandalart = quests.reduce((acc, quest) => {
    if (!acc[quest.mandalartId]) {
      acc[quest.mandalartId] = {
        mandalart: {
          id: quest.mandalartId,
          title: quest.mandalartTitle,
          centerGoal: quest.centerGoal
        },
        quests: []
      }
    }
    acc[quest.mandalartId].quests.push(quest)
    return acc
  }, {} as Record<string, { mandalart: { id: string; title: string; centerGoal: string }; quests: QuestWithMandalart[] }>)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Scroll className="h-5 w-5 text-purple-500" />
          퀘스트 로그
        </CardTitle>
        <CardDescription>
          {mandalarts.length}개의 메인 퀘스트, {quests.length}개의 사이드 퀘스트
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {Object.values(questsByMandalart).map(({ mandalart, quests: mandalartQuests }, mandalartIndex) => (
          // 📋 CARD: Mandalart group with slow stagger
          <motion.div
            key={mandalart.id}
            {...CARD_ANIMATION}
            transition={{
              ...CARD_ANIMATION.transition,
              delay: getStaggerDelay(mandalartIndex, STAGGER.SLOW)
            }}
            className="space-y-3"
          >
            {/* Main Quest (Center Goal) */}
            <div className="p-4 rounded-lg border border-l-4 border-l-purple-500">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default" className="bg-purple-500 hover:bg-purple-600">
                      메인 퀘스트
                    </Badge>
                    <h3 className="font-bold text-lg">{mandalart.centerGoal}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{mandalart.title}</p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/mandalart/${mandalart.id}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {/* Overall Progress */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">전체 진행도</span>
                  <span className="font-mono font-semibold">
                    {Math.round(
                      mandalartQuests.reduce((sum, q) => sum + q.weeklyPercentage, 0) / mandalartQuests.length
                    )}%
                  </span>
                </div>
                <Progress
                  value={
                    Math.round(
                      mandalartQuests.reduce((sum, q) => sum + q.weeklyPercentage, 0) / mandalartQuests.length
                    )
                  }
                  className="h-2"
                />
              </div>
            </div>

            {/* Side Quests (Sub Goals) */}
            <div className="grid gap-3 md:grid-cols-2">
              {mandalartQuests.map((quest, index) => {
                const status = getQuestStatus(quest)
                const statusConfig = getStatusConfig(status)

                return (
                  // 📝 LIST_ITEM: Quest items with nested stagger and hover
                  <motion.div
                    key={quest.subGoalId}
                    {...LIST_ITEM_ANIMATION}
                    {...HOVER_SCALE}
                    transition={{
                      ...LIST_ITEM_ANIMATION.transition,
                      delay: getNestedStaggerDelay(mandalartIndex, index, STAGGER.SLOW, STAGGER.NORMAL)
                    }}
                    className={`
                      p-3 rounded-lg border border-l-4 transition-all
                      ${statusConfig.borderColor}
                    `}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className={statusConfig.color}>{statusConfig.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm leading-tight truncate">
                          {quest.subGoalTitle}
                        </div>
                        <Badge variant="outline" className={`mt-1 text-xs ${statusConfig.color}`}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {/* Weekly Progress */}
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">주간 진행</span>
                          <span className="font-mono font-semibold">{quest.weeklyPercentage}%</span>
                        </div>
                        <Progress value={quest.weeklyPercentage} className="h-1.5" />
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>총 액션: {quest.totalActions}개</span>
                        <span>이번 주: {quest.checkedThisWeek}/{quest.totalActions * 7}</span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  )
}
