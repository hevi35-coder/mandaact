import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { calculateBadgeProgress } from '@/lib/stats'
import { formatUnlockCondition, getBadgeHint, getProgressMessage } from '@/lib/badgeHints'
import { getBadgeStage } from '@/lib/badgeStages'
import type { Achievement } from '@/types'
import { Lock, Zap, Trophy, Calendar, Repeat } from 'lucide-react'

interface BadgeDetailDialogProps {
  badge: Achievement | null
  isUnlocked: boolean
  unlockedAt?: string
  userId: string
  onClose: () => void
  repeatCount?: number
}

export function BadgeDetailDialog({
  badge,
  isUnlocked,
  unlockedAt,
  userId,
  onClose,
  repeatCount = 0
}: BadgeDetailDialogProps) {
  const [progress, setProgress] = useState<{ progress: number; current: number; target: number } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!badge || isUnlocked) return

    const loadProgress = async () => {
      setLoading(true)
      try {
        const progressData = await calculateBadgeProgress(userId, badge.key, badge.unlock_condition)
        setProgress(progressData)
      } catch (error) {
        console.error('Error calculating progress:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProgress()
  }, [badge, isUnlocked, userId])

  if (!badge) return null

  const hintLevel = badge.hint_level || 'full'
  const crypticHint = getBadgeHint(badge.key, hintLevel)
  const formattedCondition = formatUnlockCondition(badge.unlock_condition, hintLevel, badge.key)
  const canShowProgress = !isUnlocked && progress && hintLevel !== 'hidden'
  const stage = getBadgeStage(badge.xp_reward)

  return (
    <Dialog open={!!badge} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          {/* Badge Icon */}
          <motion.div
            className="flex justify-center pt-1"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <div
              className={`text-6xl ${
                isUnlocked ? '' : 'grayscale opacity-40'
              }`}
            >
              {badge.icon}
            </div>
          </motion.div>

          {/* Title & Badges */}
          <div className="text-center space-y-1.5">
            <DialogTitle className="text-2xl">{badge.title}</DialogTitle>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {/* Category Badge - Only show meaningful distinctions */}
              {badge.category === 'one_time' && (
                <Badge variant="outline" className="text-xs">
                  🏆 일회성
                </Badge>
              )}
              {badge.category === 'recurring' && (
                <Badge variant="outline" className="text-xs">
                  🔄 반복 획득
                </Badge>
              )}
              {badge.category === 'limited' && (
                <Badge variant="outline" className="text-xs bg-purple-100 dark:bg-purple-900">
                  ⭐ 한정판
                </Badge>
              )}
              {badge.category === 'hidden' && (
                <Badge variant="outline" className="text-xs bg-indigo-100 dark:bg-indigo-900">
                  🔮 히든
                </Badge>
              )}
              {badge.category === 'social' && (
                <Badge variant="outline" className="text-xs">
                  👥 소셜
                </Badge>
              )}
            </div>
          </div>

          {/* Description */}
          <DialogDescription className="text-center text-base">
            {badge.description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-3 space-y-3">
          {/* Unlock Status with integrated progress */}
          {isUnlocked ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg border-2 border-green-500/30 space-y-2.5"
            >
              <div className="flex items-start gap-2.5">
                <Trophy className="h-5 w-5 text-green-600 shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-green-700 dark:text-green-400 mb-1 flex items-center gap-2">
                    🎉 배지 획득 완료!
                  </h4>
                  {unlockedAt && (
                    <div className="text-sm text-muted-foreground">
                      {new Date(unlockedAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Repeat count for recurring badges */}
              {badge.category === 'recurring' && repeatCount > 1 && (
                <div className="pt-2 border-t border-green-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                      <Repeat className="h-4 w-4" />
                      <span>획득 횟수</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {repeatCount}회
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30 space-y-2.5">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-orange-700 dark:text-orange-400 mb-1">
                    {hintLevel === 'hidden' ? '비밀 배지' : '잠금 해제 조건'}
                  </h4>

                  {hintLevel === 'hidden' ? (
                    <p className="text-sm text-muted-foreground italic">
                      {crypticHint}
                    </p>
                  ) : hintLevel === 'cryptic' ? (
                    <p className="text-sm text-muted-foreground italic">
                      "{crypticHint}"
                    </p>
                  ) : (
                    <p className="text-sm text-foreground">
                      {formattedCondition}
                    </p>
                  )}
                </div>
              </div>

              {/* Progress integrated into unlock condition box */}
              {canShowProgress && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-2 pt-2 border-t border-orange-500/20"
                >
                  {loading ? (
                    <div className="text-center py-2 text-sm text-muted-foreground">
                      진행 상황 로딩 중...
                    </div>
                  ) : progress ? (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {getProgressMessage(progress.current, progress.target)}
                        </span>
                        <span className="font-mono font-semibold">
                          {progress.current} / {progress.target}
                        </span>
                      </div>
                      <Progress value={progress.progress} className="h-2" />
                    </>
                  ) : null}
                </motion.div>
              )}
            </div>
          )}

          {/* Limited Edition Info */}
          {badge.category === 'limited' && badge.valid_from && badge.valid_until && (
            <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
              <div className="flex items-start gap-2.5">
                <Calendar className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-purple-700 dark:text-purple-400 mb-1">
                    ⭐ 한정판 배지
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {new Date(badge.valid_from).toLocaleDateString('ko-KR')} ~ {new Date(badge.valid_until).toLocaleDateString('ko-KR')}
                  </p>
                  {!isUnlocked && new Date() > new Date(badge.valid_until) && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      ⚠️ 획득 기간이 종료되었습니다
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* XP Reward - Simplified single card */}
          <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">획득 보상</span>
            </div>
            <div className="text-4xl font-bold text-primary text-center">
              +{badge.xp_reward.toLocaleString()} XP
            </div>
            {badge.category === 'recurring' && (
              <div className="text-xs text-primary/70 mt-2 text-center">
                🔄 반복 획득 가능 (매회 동일 보상)
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
