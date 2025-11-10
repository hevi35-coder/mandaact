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
import type { UserLevel, Achievement } from '@/types'
import { Trophy, Zap, Target, Edit2, ChevronDown, ChevronUp } from 'lucide-react'
import { BadgeDetailDialog } from './BadgeDetailDialog'

export function UserProfileCard() {
  const { user } = useAuthStore()
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null)
  const [allBadges, setAllBadges] = useState<Achievement[]>([])
  const [unlockedBadgeIds, setUnlockedBadgeIds] = useState<Set<string>>(new Set())
  const [unlockedBadgesMap, setUnlockedBadgesMap] = useState<Map<string, string>>(new Map())
  const [totalChecks, setTotalChecks] = useState(0)
  const [activeDays, setActiveDays] = useState(0)
  const [loading, setLoading] = useState(true)

  // Nickname editing state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [newNickname, setNewNickname] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [saving, setSaving] = useState(false)

  // XP info collapsible state (default closed)
  const [xpInfoOpen, setXpInfoOpen] = useState(false)

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
    } catch (err) {
      console.error('Nickname update error:', err)
      setNicknameError('닉네임 변경 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!user) return

    const loadUserProfile = async () => {
      setLoading(true)

      // Get user level
      const level = await getUserLevel(user.id)
      setUserLevel(level)

      // Get all achievements (for gallery)
      const { data: allAchievements } = await supabase
        .from('achievements')
        .select('*')
        .order('display_order', { ascending: true })

      setAllBadges(allAchievements || [])

      // Get user's unlocked achievements
      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievement:achievements(*)
        `)
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false })

      // Track unlocked badge IDs and dates
      const unlockedIds = new Set(userAchievements?.map(ua => ua.achievement_id) || [])
      const unlockedMap = new Map(userAchievements?.map(ua => [ua.achievement_id, ua.unlocked_at]) || [])
      setUnlockedBadgeIds(unlockedIds)
      setUnlockedBadgesMap(unlockedMap)

      // Get total checks
      const { count: checksCount } = await supabase
        .from('check_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      setTotalChecks(checksCount || 0)

      // Get active days (unique check dates)
      const { data: checks } = await supabase
        .from('check_history')
        .select('checked_at')
        .eq('user_id', user.id)

      const uniqueDates = new Set(
        checks?.map(check => {
          const date = new Date(check.checked_at)
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        }) || []
      )
      setActiveDays(uniqueDates.size)

      setLoading(false)
    }

    loadUserProfile()
  }, [user])

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
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
              <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                <li>• 실천 1회: <span className="font-semibold text-foreground">+10 XP</span></li>
                <li>• 7일+ 연속 시 실천 1회: <span className="font-semibold text-foreground">+15 XP</span> (보너스 +5)</li>
                <li>• 하루 100% 달성: <span className="font-semibold text-foreground">+50 XP</span></li>
                <li>• 뱃지 획득 시 추가 XP 보상</li>
              </ul>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 text-center p-3 bg-background/50 rounded-lg border">
              <div className="text-2xl font-bold text-primary">{totalChecks.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">총 실천 횟수</div>
            </div>
            <div className="space-y-1 text-center p-3 bg-background/50 rounded-lg border">
              <div className="text-2xl font-bold text-primary">{activeDays.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">활동 일수</div>
            </div>
          </div>

          {/* Badge Gallery - All Badges with Lock/Unlock States */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4" />
                뱃지 컬렉션
              </div>
              <span className="text-xs text-muted-foreground">
                {unlockedBadgeIds.size}/{allBadges.length} 획득
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {allBadges.map((badge) => {
                const isUnlocked = unlockedBadgeIds.has(badge.id)

                return (
                  <motion.div
                    key={badge.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    onClick={() => setSelectedBadge(badge)}
                    className={`
                      relative p-3 rounded-lg border text-center transition-all cursor-pointer
                      flex flex-col items-center justify-between min-h-[100px]
                      ${isUnlocked
                        ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-300 dark:border-yellow-700 shadow-sm hover:shadow-md'
                        : 'bg-muted/30 border-muted-foreground/10 opacity-50 hover:opacity-70'
                      }
                    `}
                  >
                    <div className={`text-3xl mb-1 ${isUnlocked ? '' : 'grayscale opacity-30'}`}>
                      {badge.icon}
                    </div>
                    <div className={`text-xs font-medium ${isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {badge.title}
                    </div>
                    {isUnlocked && (
                      <div className="text-[10px] text-yellow-600 dark:text-yellow-400 font-semibold mt-1">
                        +{badge.xp_reward} XP
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
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
        />
      )}
    </motion.div>
  )
}
