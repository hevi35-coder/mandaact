import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/authStore'
import { getUserLevel, getXPProgress } from '@/lib/stats'
import { supabase } from '@/lib/supabase'
import type { UserLevel, UserAchievement, Achievement } from '@/types'
import { Trophy, Zap, Target, Edit2 } from 'lucide-react'

export function UserProfileCard() {
  const { user } = useAuthStore()
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null)
  const [recentBadges, setRecentBadges] = useState<(UserAchievement & { achievement: Achievement })[]>([])
  const [totalChecks, setTotalChecks] = useState(0)
  const [activeDays, setActiveDays] = useState(0)
  const [loading, setLoading] = useState(true)

  // Nickname editing state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [newNickname, setNewNickname] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [saving, setSaving] = useState(false)

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

      // Get recent achievements (last 3)
      const { data: achievements } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievement:achievements(*)
        `)
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false })
        .limit(3)

      setRecentBadges(achievements || [])

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
              <CardDescription className="text-xs mt-0.5">
                {user.email}
              </CardDescription>
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
                다음 레벨까지
              </span>
              <span className="font-mono font-semibold">
                {xpProgress.progressXP.toLocaleString()} / {(xpProgress.nextLevelXP - xpProgress.currentLevelXP).toLocaleString()} XP
              </span>
            </div>
            <Progress value={xpProgress.progressPercentage} className="h-3" />
            <div className="text-xs text-right text-muted-foreground">
              {xpProgress.progressPercentage}% 완료
            </div>
          </div>

          {/* XP 획득 방법 안내 */}
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
            <div className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              XP 획득 방법
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 실천 1회: <span className="font-semibold text-foreground">+10 XP</span></li>
              <li>• 7일+ 연속 시 실천 1회: <span className="font-semibold text-foreground">+15 XP</span> (보너스 +5)</li>
              <li>• 하루 100% 달성: <span className="font-semibold text-foreground">+50 XP</span></li>
              <li className="text-[10px] pt-1 opacity-70">※ 뱃지 획득 시 추가 XP 보상</li>
            </ul>
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

          {/* Recent Badges */}
          {recentBadges.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4" />
                최근 획득 뱃지
              </div>
              <div className="flex flex-wrap gap-2">
                {recentBadges.map((userAch) => (
                  <motion.div
                    key={userAch.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <Badge
                      variant="secondary"
                      className="text-base px-3 py-1.5 cursor-help"
                      title={`${userAch.achievement.title} - ${userAch.achievement.description}`}
                    >
                      {userAch.achievement.icon} {userAch.achievement.title}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {recentBadges.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              아직 획득한 뱃지가 없습니다. 실천을 시작해보세요!
            </div>
          )}
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
    </motion.div>
  )
}
