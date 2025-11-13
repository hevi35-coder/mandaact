import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { AIWeeklyReport } from '@/components/stats/AIWeeklyReport'

export default function ReportsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
  }, [user, navigate])

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
    <div className="container mx-auto py-3 md:py-6 px-4 pb-20 md:pb-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="text-center md:text-left">
          <h1 className="text-2xl font-bold">AI 리포트</h1>
          <p className="text-muted-foreground text-sm mt-1">
            실천 데이터를 기반으로 한 맞춤형 분석과 코칭
          </p>
        </div>

        {/* AI Weekly Report Card */}
        <AIWeeklyReport />
      </div>
    </div>
  )
}