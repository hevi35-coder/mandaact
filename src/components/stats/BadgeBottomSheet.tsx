import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { calculateBadgeProgress } from '@/lib/stats'
import { formatUnlockCondition, getBadgeHint, getProgressMessage } from '@/lib/badgeHints'
import type { Achievement } from '@/types'
import { Lock, Zap, Calendar, Trophy } from 'lucide-react'

interface BadgeBottomSheetProps {
  badge: Achievement | null
  isUnlocked: boolean
  unlockedAt?: string
  userId: string
  onClose: () => void
}

export function BadgeBottomSheet({
  badge,
  isUnlocked,
  unlockedAt,
  userId,
  onClose
}: BadgeBottomSheetProps) {
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
    <Sheet open={!!badge} onOpenChange={() => onClose()}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader className="space-y-4">
          {/* Badge Icon */}
          <motion.div
            className="flex justify-center"
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

          {/* Title & Category */}
          <div className="text-center space-y-2">
            <SheetTitle className="text-2xl">{badge.title}</SheetTitle>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {badge.category === 'streak' && '스트릭'}
                {badge.category === 'completion' && '달성'}
                {badge.category === 'volume' && '횟수'}
                {badge.category === 'special' && '특별'}
                {badge.category === 'milestone' && '마일스톤'}
              </Badge>
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
          <SheetDescription className="text-center text-base">
            {badge.description}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Unlock Status */}
          {isUnlocked ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-green-500/10 rounded-lg border border-green-500/30"
            >
              <div className="flex items-start gap-3">
                <Trophy className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-green-700 dark:text-green-400 mb-1">
                    뱃지 획득 완료!
                  </h4>
                  {unlockedAt && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(unlockedAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}에 획득
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/30">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-orange-700 dark:text-orange-400 mb-2">
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
            </div>
          )}

          {/* Progress Section */}
          {canShowProgress && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-3"
            >
              <h4 className="font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                현재 진행 상황
              </h4>

              {loading ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  진행 상황 로딩 중...
                </div>
              ) : progress ? (
                <>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">
                      {getProgressMessage(progress.current, progress.target)}
                    </span>
                    <span className="font-mono font-semibold">
                      {progress.current} / {progress.target}
                    </span>
                  </div>
                  <Progress value={progress.progress} className="h-3" />
                  <div className="text-xs text-right text-muted-foreground">
                    {Math.round(progress.progress)}% 완료
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-2">
                  이 뱃지는 진행률을 표시할 수 없습니다
                </div>
              )}
            </motion.div>
          )}

          {/* XP Reward */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-background/50 rounded-lg border text-center">
              <div className="text-2xl font-bold text-primary">
                +{badge.xp_reward.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                XP 보상
              </div>
            </div>

            {badge.is_repeatable && (
              <div className="p-4 bg-background/50 rounded-lg border text-center">
                <div className="text-2xl font-bold text-primary">
                  {Math.round((badge.repeat_xp_multiplier || 0.5) * 100)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  반복 시 보상
                </div>
              </div>
            )}
          </div>

          {/* Badge Details */}
          <div className="p-4 bg-muted/30 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">카테고리</span>
              <span className="font-medium">
                {badge.category === 'streak' && '스트릭'}
                {badge.category === 'completion' && '달성'}
                {badge.category === 'volume' && '횟수'}
                {badge.category === 'special' && '특별'}
                {badge.category === 'milestone' && '마일스톤'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">뱃지 타입</span>
              <span className="font-medium">
                {badge.badge_type === 'permanent' && '영구'}
                {badge.badge_type === 'monthly' && '월간'}
                {badge.badge_type === 'seasonal' && '시즌'}
                {badge.badge_type === 'event' && '이벤트'}
              </span>
            </div>
            {badge.is_repeatable && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">반복 가능</span>
                <span className="font-medium text-blue-600">가능</span>
              </div>
            )}
          </div>

          {/* Tip */}
          {!isUnlocked && hintLevel !== 'hidden' && (
            <div className="text-xs text-center text-muted-foreground p-4 bg-blue-500/5 rounded-lg border border-blue-500/10">
              💡 꾸준히 실천하면 언젠가 이 뱃지를 획득할 수 있습니다!
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
