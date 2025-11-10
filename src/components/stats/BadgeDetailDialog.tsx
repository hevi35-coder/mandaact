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
import type { Achievement } from '@/types'
import { Lock, Zap, Trophy } from 'lucide-react'

interface BadgeDetailDialogProps {
  badge: Achievement | null
  isUnlocked: boolean
  unlockedAt?: string
  userId: string
  onClose: () => void
}

export function BadgeDetailDialog({
  badge,
  isUnlocked,
  unlockedAt,
  userId,
  onClose
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
  const formattedCondition = formatUnlockCondition(badge.unlock_condition, hintLevel)
  const canShowProgress = !isUnlocked && progress && hintLevel !== 'hidden'

  return (
    <Dialog open={!!badge} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          {/* Badge Icon */}
          <motion.div
            className="flex justify-center pt-2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <div
              className={`text-7xl ${
                isUnlocked ? '' : 'grayscale opacity-40'
              }`}
            >
              {badge.icon}
            </div>
          </motion.div>

          {/* Title & Badges */}
          <div className="text-center space-y-2">
            <DialogTitle className="text-2xl">{badge.title}</DialogTitle>
            <div className="flex items-center justify-center gap-2">
              {badge.badge_type === 'monthly' && (
                <Badge variant="outline" className="text-xs">
                  월간 챌린지
                </Badge>
              )}
              {isUnlocked && (
                <Badge className="text-xs bg-green-600">
                  획득 완료
                </Badge>
              )}
            </div>
          </div>

          {/* Description */}
          <DialogDescription className="text-center text-base">
            {badge.description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Unlock Status with integrated progress */}
          {isUnlocked ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg border-2 border-green-500/30"
            >
              <div className="flex items-start gap-3">
                <Trophy className="h-6 w-6 text-green-600 shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-green-700 dark:text-green-400 mb-1 flex items-center gap-2">
                    🎉 뱃지 획득 완료!
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
            </motion.div>
          ) : (
            <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/30 space-y-3">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-orange-700 dark:text-orange-400 mb-1">
                    {hintLevel === 'hidden' ? '비밀 뱃지' : '잠금 해제 조건'}
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

          {/* XP Reward - Simplified single card */}
          <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">획득 보상</span>
            </div>
            <div className="text-4xl font-bold text-primary text-center">
              +{badge.xp_reward.toLocaleString()} XP
            </div>
            {badge.is_repeatable && (
              <div className="text-xs text-primary/70 mt-2 text-center">
                🔄 매월 반복 획득 가능 ({Math.round((badge.repeat_xp_multiplier || 0.5) * 100)}% 보상)
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
