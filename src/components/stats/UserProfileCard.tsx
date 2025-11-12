import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/authStore'
import { getUserLevel, getXPProgress } from '@/lib/stats'
import { supabase } from '@/lib/supabase'
import { evaluateAndUnlockBadges } from '@/lib/badgeEvaluator'
import { useToast } from '@/hooks/use-toast'
import { SUCCESS_MESSAGES } from '@/lib/notificationMessages'
import { showSuccess } from '@/lib/notificationUtils'
import { getActiveMultipliers, formatMultiplier, getMultiplierColor } from '@/lib/xpMultipliers'
import { getBadgeStage } from '@/lib/badgeStages'
import type { UserLevel, Achievement, UserAchievement } from '@/types'
import type { XPMultiplier } from '@/lib/xpMultipliers'
import { Trophy, Zap, Target, Edit2, ChevronDown, ChevronUp, Sparkles, Info } from 'lucide-react'
import { BadgeDetailDialog } from './BadgeDetailDialog'
import { HERO_ANIMATION, BADGE_ANIMATION, BADGE_NEW_ANIMATION } from '@/lib/animations'

export function UserProfileCard() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null)
  const [allBadges, setAllBadges] = useState<Achievement[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [unlockedBadgeIds, setUnlockedBadgeIds] = useState<Set<string>>(new Set())
  const [unlockedBadgesMap, setUnlockedBadgesMap] = useState<Map<string, string>>(new Map())
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<Set<string>>(new Set())
  const [totalChecks, setTotalChecks] = useState(0)
  const [activeDays, setActiveDays] = useState(0)
  const [loading, setLoading] = useState(true)
  const [badgesLoading, setBadgesLoading] = useState(false)
  const [badgesLoaded, setBadgesLoaded] = useState(false)

  // Nickname editing state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [newNickname, setNewNickname] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [saving, setSaving] = useState(false)

  // XP info collapsible state (default closed)
  const [xpInfoOpen, setXpInfoOpen] = useState(false)

  // Active XP multipliers
  const [activeMultipliers, setActiveMultipliers] = useState<XPMultiplier[]>([])

  // Badge collection collapsible state (default closed)
  const [badgeCollectionOpen, setBadgeCollectionOpen] = useState(false)

  // Badge bottom sheet state
  const [selectedBadge, setSelectedBadge] = useState<Achievement | null>(null)

  const openEditDialog = () => {
    setNewNickname(userLevel?.nickname || '')
    setNicknameError('')
    setEditDialogOpen(true)
  }

  const validateNickname = (nickname: string): string | null => {
    if (nickname.length < 2) return '닉네임은 최소 2자 이상이어야 합니다'
    if (nickname.length > 12) return '닉네임은 최대 12자까지 가능합니다'
    if (!/^[가-힣a-zA-Z0-9]+$/.test(nickname)) return '닉네임은 한글, 영문, 숫자만 사용 가능합니다'
    return null
  }

  const handleSaveNickname = async () => {
    if (!user || !userLevel) return

    const error = validateNickname(newNickname)
    if (error) {
      setNicknameError(error)
      return
    }

    // Check if nickname is the same
    if (newNickname === userLevel.nickname) {
      setEditDialogOpen(false)
      return
    }

    setSaving(true)
    setNicknameError('')

    try {
      // Check if nickname is already taken (case-insensitive)
      const { data: existing } = await supabase
        .from('user_levels')
        .select('nickname')
        .ilike('nickname', newNickname)
        .neq('user_id', user.id)
        .single()

      if (existing) {
        setNicknameError('이미 사용 중인 닉네임입니다')
        setSaving(false)
        return
      }

      // Update nickname
      const { error: updateError } = await supabase
        .from('user_levels')
        .update({ nickname: newNickname })
        .eq('user_id', user.id)

      if (updateError) throw updateError

      // Update local state
      setUserLevel({ ...userLevel, nickname: newNickname })
      setEditDialogOpen(false)

      // Show success feedback
      showSuccess(SUCCESS_MESSAGES.nicknameUpdated())
    } catch (err) {
      console.error('Nickname update error:', err)
      setNicknameError('닉네임 변경 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  // Load badges collection (lazy)
  const loadBadgesCollection = async () => {
    if (!user || badgesLoaded || badgesLoading) return

    setBadgesLoading(true)

    try {
      // Get all achievements and user achievements in parallel
      const [allAchievementsRes, userAchievementsRes] = await Promise.all([
        supabase
          .from('achievements')
          .select('*')
          .or('is_active.is.null,is_active.eq.true') // Only active badges (is_active = TRUE or NULL)
          .order('display_order', { ascending: true }),
        supabase
          .from('user_achievements')
          .select(`
            *,
            achievement:achievements(*)
          `)
          .eq('user_id', user.id)
          .order('unlocked_at', { ascending: false })
      ])

      // Filter active badges only (is_active = TRUE or NULL)
      const activeBadges = (allAchievementsRes.data || []).filter(
        badge => badge.is_active === true || badge.is_active === null
      )
      setAllBadges(activeBadges)
      setUserAchievements(userAchievementsRes.data || [])

      // Track unlocked badge IDs and dates
      const unlockedIds = new Set(userAchievementsRes.data?.map(ua => ua.achievement_id) || [])
      const unlockedMap = new Map(userAchievementsRes.data?.map(ua => [ua.achievement_id, ua.unlocked_at]) || [])
      setUnlockedBadgeIds(unlockedIds)
      setUnlockedBadgesMap(unlockedMap)

      setBadgesLoaded(true)
    } catch (error) {
      console.error('Error loading badges collection:', error)
    } finally {
      setBadgesLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return

    const loadUserProfile = async () => {
      setLoading(true)

      try {
        // 1. Load critical data first (parallel)
        const [level, statsResults] = await Promise.all([
          getUserLevel(user.id),
          Promise.all([
            supabase
              .from('check_history')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id),
            supabase
              .from('check_history')
              .select('checked_at')
              .eq('user_id', user.id)
          ])
        ])

        setUserLevel(level)

        // Set stats
        const [checksResult, checksData] = statsResults
        setTotalChecks(checksResult.count || 0)

        const uniqueDates = new Set(
          checksData.data?.map(check => {
            const date = new Date(check.checked_at)
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          }) || []
        )
        setActiveDays(uniqueDates.size)

        // Load active multipliers
        const multipliers = await getActiveMultipliers(user.id)
        setActiveMultipliers(multipliers)

        setLoading(false)

        // 2. Run badge evaluation in background (non-blocking)
        evaluateAndUnlockBadges(user.id)
          .then(evaluationResults => {
            // Show toast notifications for newly unlocked badges
            for (const result of evaluationResults) {
              if (result.wasUnlocked) {
                // Use emotional message if available, otherwise use default
                const description = result.emotionalMessage
                  ? `${result.emotionalMessage}\n\n${result.badgeTitle} (+${result.xpAwarded} XP)`
                  : `${result.badgeTitle} (+${result.xpAwarded} XP)`

                toast({
                  title: `🎉 새로운 배지 획득!`,
                  description,
                  duration: 6000, // Longer duration for emotional messages
                })
              }
            }

            // Track newly unlocked badge keys for NEW indicator
            const newlyUnlocked = new Set(
              evaluationResults
                .filter(r => r.wasUnlocked)
                .map(r => r.badgeKey)
            )
            setNewlyUnlockedBadges(newlyUnlocked)

            // Refresh user level if any badges were unlocked (XP changed)
            if (evaluationResults.some(r => r.wasUnlocked)) {
              getUserLevel(user.id).then(updatedLevel => {
                setUserLevel(updatedLevel)
              })
            }
          })
          .catch(error => {
            console.error('Error during badge evaluation:', error)
          })

      } catch (error) {
        console.error('Error loading user profile:', error)
        setLoading(false)
      }
    }

    loadUserProfile()
  }, [user, toast])

  if (!user || loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">프로필 로딩 중...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (!userLevel) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">프로필</CardTitle>
          <CardDescription>데이터를 불러올 수 없습니다</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const xpProgress = getXPProgress(userLevel.total_xp)

  return (
    // 🎯 HERO: Profile card emphasizes user identity with slower (0.5s) animation
    <motion.div {...HERO_ANIMATION}>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                  레벨 {xpProgress.currentLevel}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <CardDescription className="text-base font-medium">
                  {userLevel.nickname}
                </CardDescription>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openEditDialog}
                  className="h-6 px-2 text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">총 XP</div>
              <div className="text-2xl font-bold text-primary">{userLevel.total_xp.toLocaleString()}</div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* XP Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Zap className="h-4 w-4" />
                레벨 {xpProgress.currentLevel + 1}까지
              </span>
              <span className="font-mono font-semibold">
                {xpProgress.progressXP.toLocaleString()} / {(xpProgress.nextLevelXP - xpProgress.currentLevelXP).toLocaleString()} XP
              </span>
            </div>
            <Progress value={xpProgress.progressPercentage} className="h-3" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 text-center p-3 bg-background/50 rounded-lg border">
              <div className="text-2xl font-bold text-primary">{totalChecks.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">총 실천 횟수</div>
            </div>
            <div className="space-y-1 text-center p-3 bg-background/50 rounded-lg border">
              <div className="text-2xl font-bold text-primary">{activeDays.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">누적 실천일수</div>
            </div>
          </div>

          {/* XP 획득 방법 안내 - Collapsible */}
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
            <button
              onClick={() => setXpInfoOpen(!xpInfoOpen)}
              className="w-full text-xs font-semibold text-primary flex items-center justify-between hover:opacity-80 transition-opacity"
            >
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                XP 획득 방법
              </span>
              {xpInfoOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {xpInfoOpen && (
              <div className="space-y-3 mt-2">
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• 실천 1회: <span className="font-semibold text-foreground">+10 XP</span></li>
                  <li>• 스트릭 (7일+): <span className="font-semibold text-foreground">+5 XP</span> 추가</li>
                  <li>• 완벽한 하루 (100%): <span className="font-semibold text-foreground">+50 XP</span></li>
                  <li>• 완벽한 주 (80%+): <span className="font-semibold text-foreground">+200 XP</span></li>
                  <li>• 배지 획득: 배지별 상이</li>
                </ul>

                {/* XP 배율 안내 - 항상 표시 */}
                <div className="pt-2 border-t border-primary/10">
                  <div className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    XP 배율 보너스
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>• 주말 (토·일): <span className="font-semibold text-blue-500">1.5배</span></li>
                    <li>• 복귀 환영 (3일 부재 후): <span className="font-semibold text-green-500">1.5배</span> <span className="text-[10px]">(3일간)</span></li>
                    <li>• 레벨 달성 축하 (5, 10, 15...): <span className="font-semibold text-yellow-500">2배</span> <span className="text-[10px]">(7일간)</span></li>
                    <li>• 완벽한 주 달성 후: <span className="font-semibold text-purple-500">2배</span> <span className="text-[10px]">(7일간)</span></li>
                    <li>• 배율은 중복 적용 시 합산됩니다</li>
                    <li className="ml-3">(예: 1.5배 + 2배 = 3.5배)</li>
                  </ul>
                </div>

                {/* 현재 활성 중인 배율 */}
                {activeMultipliers.length > 0 && (
                  <div className="pt-2 border-t border-primary/10">
                    <div className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      현재 활성 중인 배율
                    </div>
                    <div className="space-y-1">
                      {activeMultipliers.map((multiplier, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-xs p-1.5 bg-background/50 rounded"
                        >
                          <span className="text-muted-foreground">{multiplier.name}</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${getMultiplierColor(multiplier.type)}`}>
                              {formatMultiplier(multiplier.multiplier)}
                            </span>
                            {multiplier.daysRemaining && (
                              <span className="text-[10px] text-muted-foreground">
                                {multiplier.daysRemaining}일 남음
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 공정한 XP 정책 안내 */}
                <div className="pt-2 border-t border-primary/10">
                  <div className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    공정한 XP 정책
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>• 각 실천은 하루 3회까지 체크/해제 가능</li>
                    <li>• 동일 실천은 10초 후 재체크 가능</li>
                    <li>• 짧은 시간 내 과도한 체크 시 제한</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Badge Collection - Collapsible */}
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
            <button
              onClick={() => {
                const willOpen = !badgeCollectionOpen
                setBadgeCollectionOpen(willOpen)
                if (willOpen && !badgesLoaded) {
                  loadBadgesCollection()
                }
              }}
              className="w-full text-xs font-semibold text-primary flex items-center justify-between hover:opacity-80 transition-opacity"
            >
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                배지 컬렉션
              </span>
              <div className="flex items-center gap-2">
                {badgesLoaded && (
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {unlockedBadgeIds.size}/{allBadges.length} 획득
                  </span>
                )}
                {badgeCollectionOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </div>
            </button>
            {badgeCollectionOpen && (
              <>
                {badgesLoading ? (
                  <div className="mt-3 text-center text-sm text-muted-foreground py-8">
                    배지 컬렉션 로딩 중...
                  </div>
                ) : badgesLoaded ? (
                  <div className="space-y-4 mt-3">
                    {/* Group badges by category */}
                    {(() => {
                      const badgesByCategory = allBadges.reduce((groups, badge) => {
                        const category = badge.category || 'one_time'
                        if (!groups[category]) groups[category] = []
                        groups[category].push(badge)
                        return groups
                      }, {} as Record<string, typeof allBadges>)

                      const categoryLabels = {
                        one_time: '일회성 배지',
                        recurring: '반복 획득',
                        limited: '한정판',
                        hidden: '히든',
                        social: '소셜'
                      }

                      const categoryIcons = {
                        one_time: '🏆',
                        recurring: '🔄',
                        limited: '⭐',
                        hidden: '🔮',
                        social: '👥'
                      }

                      return Object.entries(badgesByCategory).map(([category, badges]) => (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <span>{categoryIcons[category as keyof typeof categoryIcons]}</span>
                            <span>{categoryLabels[category as keyof typeof categoryLabels]}</span>
                            <span className="ml-auto text-[10px]">
                              {badges.filter(b => unlockedBadgeIds.has(b.id)).length}/{badges.length}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {badges.map((badge) => {
                              const isUnlocked = unlockedBadgeIds.has(badge.id)
                              const isNew = newlyUnlockedBadges.has(badge.key)
                              const userBadge = userAchievements?.find(ua => ua.achievement_id === badge.id)
                              const repeatCount = userBadge?.count || 0

                              // Emotional stage based on XP (v5.0)
                              const stage = getBadgeStage(badge.xp_reward)
                              const stageColors = {
                                beginner: 'from-green-100 to-emerald-100 dark:from-green-950/30 dark:to-emerald-950/30 border-green-300 dark:border-green-700',
                                forming: 'from-orange-100 to-red-100 dark:from-orange-950/30 dark:to-red-950/30 border-orange-300 dark:border-orange-700',
                                growth: 'from-blue-100 to-cyan-100 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-300 dark:border-blue-700',
                                mastery: 'from-purple-100 to-pink-100 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-300 dark:border-purple-700',
                                transcendence: 'from-amber-100 to-yellow-100 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-400 dark:border-amber-600'
                              }

                              return (
                                // 🏆 BADGE: Spring animation for playful achievement feel
                                <motion.div
                                  key={badge.id}
                                  {...BADGE_ANIMATION}
                                  onClick={() => setSelectedBadge(badge)}
                                  className={`
                                    relative p-3 rounded-lg border text-center transition-all cursor-pointer
                                    flex flex-col items-center justify-between min-h-[100px]
                                    ${isUnlocked
                                      ? `bg-gradient-to-br ${stageColors[stage.stage]} shadow-sm hover:shadow-md`
                                      : 'bg-muted/30 border-muted-foreground/10 opacity-50 hover:opacity-70'
                                    }
                                  `}
                                >
                                  {/* NEW Badge Indicator */}
                                  {isNew && (
                                    // ⭐ BADGE_NEW: Stronger spring for newly unlocked badges
                                    <motion.div
                                      {...BADGE_NEW_ANIMATION}
                                      className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5"
                                    >
                                      <Sparkles className="h-2.5 w-2.5" />
                                      NEW
                                    </motion.div>
                                  )}

                                  {/* Repeat count for recurring badges */}
                                  {isUnlocked && category === 'recurring' && repeatCount > 1 && (
                                    <div className="absolute -top-1.5 -left-1.5 bg-blue-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                                      {repeatCount}
                                    </div>
                                  )}

                                  <div className={`text-3xl mb-1 ${isUnlocked ? '' : 'grayscale opacity-30'}`}>
                                    {category === 'hidden' && !isUnlocked ? '❓' : badge.icon}
                                  </div>
                                  <div className={`text-xs font-medium ${isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {category === 'hidden' && !isUnlocked ? '???' : badge.title}
                                  </div>
                                  {isUnlocked && (
                                    <>
                                      <div className="text-[10px] text-yellow-600 dark:text-yellow-400 font-semibold mt-1">
                                        +{badge.xp_reward} XP
                                      </div>
                                      <div className={`text-[9px] ${stage.textColor} font-medium mt-0.5`}>
                                        {stage.icon} {stage.label}
                                      </div>
                                    </>
                                  )}
                                </motion.div>
                              )
                            })}
                          </div>
                        </div>
                      ))
                    })()}

                    {/* 배지 획득 정책 안내 */}
                    <div className="mt-4 pt-3 border-t border-primary/10">
                      <div className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        공정한 배지 정책
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        <li>• 최소 16개 실천 항목 (5자 이상)</li>
                        <li>• 정상적인 체크 패턴 (자동화 감지)</li>
                        <li>• 빈 만다라트 생성 불가</li>
                      </ul>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Nickname Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>닉네임 변경</DialogTitle>
            <DialogDescription>
              새로운 닉네임을 입력해주세요 (2~12자, 한글/영문/숫자)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">닉네임</Label>
              <Input
                id="nickname"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                placeholder="2~12자 (한글/영문/숫자)"
                maxLength={12}
                disabled={saving}
              />
              {nicknameError && (
                <p className="text-sm text-red-600">{nicknameError}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
            >
              취소
            </Button>
            <Button
              onClick={handleSaveNickname}
              disabled={saving}
            >
              {saving ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Badge Detail Dialog */}
      {selectedBadge && (
        <BadgeDetailDialog
          badge={selectedBadge}
          isUnlocked={unlockedBadgeIds.has(selectedBadge.id)}
          unlockedAt={unlockedBadgesMap.get(selectedBadge.id)}
          userId={user.id}
          onClose={() => setSelectedBadge(null)}
          repeatCount={userAchievements.find(ua => ua.achievement_id === selectedBadge.id)?.count || 0}
        />
      )}
    </motion.div>
  )
}
