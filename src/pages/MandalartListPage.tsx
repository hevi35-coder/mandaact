import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { Mandalart } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale/ko'

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

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 만다라트를 삭제하시겠습니까? 모든 하위 데이터가 함께 삭제됩니다.`)) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('mandalarts')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      // Remove from local state
      setMandalarts(mandalarts.filter(m => m.id !== id))
    } catch (err) {
      console.error('Delete error:', err)
      alert('삭제 중 오류가 발생했습니다')
    }
  }

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
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">내 만다라트</h1>
            <p className="text-muted-foreground mt-1">
              저장된 만다라트 {mandalarts.length}개
            </p>
          </div>
          <Button onClick={() => navigate('/mandalart/create')}>
            + 새로 만들기
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
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <div className="text-6xl">📝</div>
              <div>
                <p className="text-lg font-medium">아직 만다라트가 없습니다</p>
                <p className="text-sm text-muted-foreground mt-1">
                  첫 번째 만다라트를 만들어보세요
                </p>
              </div>
              <Button onClick={() => navigate('/mandalart/create')}>
                만다라트 만들기
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Mandalart List */}
        <div className="grid gap-4">
          {mandalarts.map((mandalart) => (
            <Card key={mandalart.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle>{mandalart.title}</CardTitle>
                    <CardDescription className="mt-2">
                      핵심 목표: {mandalart.center_goal}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {mandalart.input_method === 'manual' ? '📝' : '📸'}
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(mandalart.created_at), {
                    addSuffix: true,
                    locale: ko
                  })}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/mandalart/${mandalart.id}`)}
                  >
                    상세보기
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(mandalart.id, mandalart.title)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    삭제
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Back to Dashboard */}
        <div className="pt-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  )
}
