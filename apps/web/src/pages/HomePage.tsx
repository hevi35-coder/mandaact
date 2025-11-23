import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useMandalarts } from '@/hooks/useMandalarts'
import { PAGE_SLIDE, getStaggerDelay, CARD_ANIMATION, HOVER_SCALE } from '@/lib/animations'
import { ProfileCardSkeleton, CardSkeleton } from '@/components/ui/skeleton'

// Gamification Components
import { UserProfileCard } from '@/components/stats/UserProfileCard'
import { StreakHero } from '@/components/stats/StreakHero'

import { LogOut } from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()

  // Use TanStack Query hook for mandalarts
  const { data: mandalarts = [], isLoading: isLoadingMandalarts } = useMandalarts(user?.id)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
  }, [user, navigate])

  // Check if first-time user or user without mandalarts
  useEffect(() => {
    if (!user || isLoadingMandalarts) return

    const tutorialCompleted = localStorage.getItem('tutorial_completed')

    // If no tutorial completed AND no mandalarts, redirect to tutorial
    if (tutorialCompleted !== 'true' && mandalarts.length === 0) {
      navigate('/tutorial', { replace: true })
      return
    }

    setIsChecking(false)
  }, [user, mandalarts, isLoadingMandalarts, navigate])

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-muted-foreground">로그인이 필요합니다...</p>
        </div>
      </div>
    )
  }

  if (isChecking) {
    return (
      <motion.div
        className="container mx-auto py-3 md:py-6 px-4 pb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="h-10" /> {/* Header spacer */}
          <ProfileCardSkeleton />
          <CardSkeleton />
          <div className="flex gap-2">
            <div className="flex-1 h-10 rounded-md bg-muted animate-pulse" />
            <div className="flex-1 h-10 rounded-md bg-muted animate-pulse" />
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="container mx-auto py-3 md:py-6 px-4 pb-4"
      {...PAGE_SLIDE}
    >
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <motion.div
          className="flex flex-col md:flex-row items-center justify-between gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: getStaggerDelay(0) }}
        >
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold inline-block">홈</h1>
            <span className="text-muted-foreground ml-3 text-sm">성장 대시보드</span>
          </div>
        </motion.div>

        {/* User Profile Card (with badges & XP) */}
        <motion.div
          initial={CARD_ANIMATION.initial}
          animate={CARD_ANIMATION.animate}
          transition={{ ...CARD_ANIMATION.transition, delay: getStaggerDelay(1) }}
        >
          <UserProfileCard />
        </motion.div>

        {/* Streak Hero */}
        <motion.div
          initial={CARD_ANIMATION.initial}
          animate={CARD_ANIMATION.animate}
          transition={{ ...CARD_ANIMATION.transition, delay: getStaggerDelay(2) }}
        >
          <StreakHero />
        </motion.div>

        {/* Tutorial and Logout Buttons */}
        <motion.div
          className="flex gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: getStaggerDelay(3) }}
        >
          <motion.div className="flex-1" {...HOVER_SCALE}>
            <Button
              variant="outline"
              className="w-full bg-white border-gray-300 hover:border-blue-600"
              onClick={() => navigate('/tutorial')}
            >
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold">
                튜토리얼
              </span>
            </Button>
          </motion.div>
          <motion.div className="flex-1" {...HOVER_SCALE}>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}