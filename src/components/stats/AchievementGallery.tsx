import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import type { Achievement } from '@/types'
import { Award, Lock, ChevronDown, ChevronUp } from 'lucide-react'

interface AchievementWithStatus extends Achievement {
  unlocked: boolean
  unlockedAt?: string
  progress?: string
}

export const AchievementGallery = React.memo(function AchievementGallery({ previewMode = false }: { previewMode?: boolean }) {
  const { user } = useAuthStore()
  const [achievements, setAchievements] = useState<AchievementWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (!user) return

    const loadAchievements = async () => {
      setLoading(true)

      // Get all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .order('display_order')

      if (achievementsError || !allAchievements) {
        console.error('Error fetching achievements:', achievementsError)
        setLoading(false)
        return
      }

      // Get user's unlocked achievements
      const { data: userAchievements, error: userAchError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)

      if (userAchError) {
        console.error('Error fetching user achievements:', userAchError)
      }

      const unlockedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || [])
      const unlockedMap = new Map(
        userAchievements?.map(ua => [ua.achievement_id, ua.unlocked_at]) || []
      )

      // Combine data
      const achievementsWithStatus: AchievementWithStatus[] = allAchievements.map(ach => ({
        ...ach,
        unlocked: unlockedIds.has(ach.id),
        unlockedAt: unlockedMap.get(ach.id)
      }))

      setAchievements(achievementsWithStatus)
      setLoading(false)
    }

    loadAchievements()
  }, [user])

  if (!user || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">업적 로딩 중...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  const displayAchievements = previewMode ? achievements.slice(0, 6) : achievements
  const unlockedCount = achievements.filter(a => a.unlocked).length
  const totalCount = achievements.length

  const categoryLabels: Record<string, string> = {
    streak: '스트릭',
    completion: '완료율',
    volume: '볼륨',
    special: '특수'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              업적
            </CardTitle>
            <CardDescription className="mt-1">
              {unlockedCount} / {totalCount} 획득 ({Math.round((unlockedCount / totalCount) * 100)}%)
            </CardDescription>
          </div>
          {previewMode && achievements.length > 6 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? (
                <>
                  접기 <ChevronUp className="ml-1 h-4 w-4" />
                </>
              ) : (
                <>
                  모두 보기 <ChevronDown className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <AnimatePresence>
            {(showAll ? achievements : displayAchievements).map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                className="relative"
              >
                <div
                  className={`
                    p-4 rounded-lg border-2 transition-all duration-300 h-full
                    ${
                      achievement.unlocked
                        ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 hover:border-primary/50'
                        : 'bg-muted/30 border-muted-foreground/20 hover:border-muted-foreground/30'
                    }
                  `}
                >
                  {/* Icon */}
                  <div className="text-center mb-2">
                    <div
                      className={`
                        text-4xl mb-1 transition-all duration-300
                        ${achievement.unlocked ? 'grayscale-0 opacity-100' : 'grayscale opacity-40'}
                      `}
                    >
                      {achievement.icon}
                    </div>
                    {!achievement.unlocked && (
                      <Lock className="h-4 w-4 mx-auto text-muted-foreground/50" />
                    )}
                  </div>

                  {/* Title */}
                  <div className="text-center space-y-1">
                    <div
                      className={`
                        font-semibold text-sm leading-tight
                        ${achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'}
                      `}
                    >
                      {achievement.title}
                    </div>

                    {/* Category Badge */}
                    <Badge
                      variant={achievement.unlocked ? 'default' : 'outline'}
                      className="text-xs"
                    >
                      {categoryLabels[achievement.category] || achievement.category}
                    </Badge>
                  </div>

                  {/* Description */}
                  <div className="text-xs text-muted-foreground text-center mt-2 line-clamp-2">
                    {achievement.description}
                  </div>

                  {/* XP Reward */}
                  <div className="text-center mt-2">
                    <span className="text-xs font-mono text-primary">
                      +{achievement.xp_reward} XP
                    </span>
                  </div>

                  {/* Unlocked Date */}
                  {achievement.unlocked && achievement.unlockedAt && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-center text-muted-foreground mt-2 pt-2 border-t"
                    >
                      {new Date(achievement.unlockedAt).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </motion.div>
                  )}

                  {/* Unlock Animation */}
                  {achievement.unlocked && (
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 1, delay: 0.5 }}
                    >
                      <div className="absolute inset-0 bg-yellow-400/20 rounded-lg" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(categoryLabels).map(([category, label]) => {
            const categoryAchs = achievements.filter(a => a.category === category)
            const unlockedInCategory = categoryAchs.filter(a => a.unlocked).length
            return (
              <div key={category} className="text-center p-3 bg-muted/30 rounded-lg border">
                <div className="text-lg font-bold">
                  {unlockedInCategory}/{categoryAchs.length}
                </div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
})
