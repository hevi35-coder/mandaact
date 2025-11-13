import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'

// Gamification Components
import { UserProfileCard } from '@/components/stats/UserProfileCard'
import { StreakHero } from '@/components/stats/StreakHero'

import { LogOut } from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
  }, [user, navigate])

  const handleLogout = async () => {
    await signOut()
    navigate('/', { replace: true })
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