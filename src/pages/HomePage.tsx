import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

// Gamification Components
import { UserProfileCard } from '@/components/stats/UserProfileCard'
import { StreakHero } from '@/components/stats/StreakHero'

import { LogOut } from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    // Check if first-time user or user without mandalarts
    const checkAndRedirect = async () => {
      try {
        // Check if tutorial has been completed
        const tutorialCompleted = localStorage.getItem('tutorial_completed')

        // Check if user has any mandalarts
        const { data: mandalarts } = await supabase
          .from('mandalarts')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)

        // If no tutorial completed AND no mandalarts, redirect to tutorial
        if (tutorialCompleted !== 'true' && (!mandalarts || mandalarts.length === 0)) {
          navigate('/tutorial', { replace: true })
          return
        }
      } catch (error) {
        console.error('Error checking first-time user status:', error)
      } finally {
        setIsChecking(false)
      }
    }

    checkAndRedirect()
  }, [user, navigate])

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  if (!user || isChecking) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-muted-foreground">
            {!user ? '로그인이 필요합니다...' : '로딩 중...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-3 md:py-6 px-4 pb-4">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold inline-block">홈</h1>
            <span className="text-muted-foreground ml-3 text-sm">성장 대시보드</span>
          </div>
        </div>

        {/* User Profile Card (with badges & XP) */}
        <UserProfileCard />

        {/* Streak Hero */}
        <StreakHero />

        {/* Tutorial Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/tutorial')}
        >
          튜토리얼
        </Button>

        {/* Logout Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          로그아웃
        </Button>
      </div>
    </div>
  )
}