import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { Mandalart } from '@/types'
import { ERROR_MESSAGES } from '@/lib/notificationMessages'
import { showError } from '@/lib/notificationUtils'
import { Plus, Grid3x3, ArrowRight, ImagePlus, Edit3, BookOpen } from 'lucide-react'

export default function MandalartListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  const [mandalarts, setMandalarts] = useState<Mandalart[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchMandalarts()
  }, [user, navigate])

  const fetchMandalarts = async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('mandalarts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setMandalarts(data || [])
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err instanceof Error ? err.message : '목록을 불러오는 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActive = async (id: string, currentIsActive: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('mandalarts')
        .update({ is_active: !currentIsActive })
        .eq('id', id)

      if (updateError) throw updateError

      // Update local state
      setMandalarts(mandalarts.map(m =>
        m.id === id ? { ...m, is_active: !currentIsActive } : m
      ))
    } catch (err) {
      console.error('Toggle error:', err)
      showError(ERROR_MESSAGES.activateToggleFailed())
    }
  }

  // Commented out - not currently used in UI
  // const handleDelete = async (id: string, title: string) => {
  //   if (!confirm(`"${title}" 만다라트를 삭제하시겠습니까? 모든 하위 데이터가 함께 삭제됩니다.`)) {
  //     return
  //   }

  //   try {
  //     const { error: deleteError } = await supabase
  //       .from('mandalarts')
  //       .delete()
  //       .eq('id', id)

  //     if (deleteError) throw deleteError

  //     // Remove from local state
  //     setMandalarts(mandalarts.filter(m => m.id !== id))
  //   } catch (err) {
  //     console.error('Delete error:', err)
  //     alert('삭제 중 오류가 발생했습니다')
  //   }
  // }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-3 md:py-6 px-4 pb-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold inline-block">만다라트</h1>
            <span className="text-muted-foreground ml-3 text-sm">목표 관리 • {mandalarts.length}개</span>
          </div>
          <Button onClick={() => navigate('/mandalart/create')} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-1.5" />
            새로 만들기
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && mandalarts.length === 0 && (
          <div className="relative min-h-[500px]">
            {/* Mock Preview Background - Mandalart Card Examples */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 0.3, y: 0 }}
              transition={{ duration: 0.5 }}
              className="pointer-events-none"
            >
              <Card className="blur-[2px]">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle>2025년 목표 달성</CardTitle>
                      <CardDescription className="mt-2">
                        핵심 목표: 건강한 삶과 커리어 성장
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked className="sr-only peer" readOnly />
                        <div className="w-11 h-6 bg-primary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                      </label>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 0.3, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="pointer-events-none mt-4"
            >
              <Card className="blur-[2px]">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle>영어 실력 향상</CardTitle>
                      <CardDescription className="mt-2">
                        핵심 목표: 토익 900점 달성
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" readOnly />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                      </label>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>

            {/* Overlay Card with Empty State Message */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="absolute inset-0 flex items-center justify-center p-4"
            >
              <Card className="w-full max-w-md shadow-xl bg-background/95 backdrop-blur-sm border-2">
                <CardContent className="text-center py-8 space-y-5">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <Grid3x3 className="h-8 w-8 text-primary" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xl font-semibold">아직 만다라트가 없어요</p>
                    <p className="text-sm text-muted-foreground">
                      만다라트를 만들면<br />
                      체계적으로 목표를 관리할 수 있어요
                    </p>
                  </div>

                  {/* Creation Methods */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-left">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      만다라트 만드는 방법
                    </p>
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      <p>• 이미지 업로드</p>
                      <p>• 텍스트 붙여넣기</p>
                      <p>• 직접 입력</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => navigate('/tutorial')}
                      className="flex-[0.4]"
                      size="lg"
                    >
                      튜토리얼
                    </Button>
                    <Button
                      onClick={() => navigate('/mandalart/create')}
                      className="flex-[0.6]"
                      size="lg"
                    >
                      만다라트 생성
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Mandalart List */}
        <div className="grid gap-4">
          {mandalarts.map((mandalart) => (
            <Card
              key={mandalart.id}
              className={`hover:shadow-md transition-shadow cursor-pointer ${!mandalart.is_active ? 'opacity-60' : ''}`}
              onClick={() => navigate(`/mandalart/${mandalart.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle>{mandalart.title}</CardTitle>
                    <CardDescription className="mt-2">
                      핵심 목표: {mandalart.center_goal}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={mandalart.is_active}
                        onChange={() => handleToggleActive(mandalart.id, mandalart.is_active)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
