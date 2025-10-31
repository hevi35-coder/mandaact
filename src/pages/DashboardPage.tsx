import { Link, useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import NotificationPermissionPrompt from '@/components/NotificationPermissionPrompt'

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)

  const handleLogout = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">대시보드</h1>
            <p className="text-muted-foreground mt-1">
              환영합니다, {user?.email}님!
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            로그아웃
          </Button>
        </div>

        {/* Notification Permission Prompt */}
        <NotificationPermissionPrompt />

        {/* Welcome Card */}
        <Card>
          <CardHeader>
            <CardTitle>🎯 보호된 페이지입니다!</CardTitle>
            <CardDescription>
              로그인한 사용자만 이 페이지를 볼 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              이 페이지는 ProtectedRoute 컴포넌트로 보호되고 있습니다.
              로그인하지 않은 사용자가 이 페이지에 접근하면 자동으로 로그인 페이지로 리다이렉트됩니다.
            </p>

            <div className="pt-4 border-t">
              <h3 className="font-medium mb-2">현재 사용자 정보:</h3>
              <ul className="text-sm space-y-1">
                <li>📧 이메일: {user?.email}</li>
                <li>🆔 ID: {user?.id}</li>
                <li>📅 생성일: {user?.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : 'N/A'}</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>만다라트 관리</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Link to="/today">
                <Button className="w-full" size="lg">
                  ✅ 오늘의 실천
                </Button>
              </Link>
              <Link to="/mandalart/create">
                <Button className="w-full" variant="outline" size="lg">
                  + 새 만다라트 만들기
                </Button>
              </Link>
              <Link to="/mandalart/list">
                <Button className="w-full" variant="outline" size="lg">
                  📋 내 만다라트 목록
                </Button>
              </Link>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                설정:
              </p>
              <div className="grid gap-2">
                <Link to="/settings/notifications">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    🔔 알림 설정
                  </Button>
                </Link>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                앞으로 구현될 기능들:
              </p>
              <div className="grid gap-2">
                <div className="p-3 border rounded-lg opacity-50">
                  <p className="font-medium">📊 진행 상황 대시보드</p>
                  <p className="text-sm text-muted-foreground">실천율과 통계 확인</p>
                </div>
                <div className="p-3 border rounded-lg opacity-50">
                  <p className="font-medium">🤖 AI 코칭</p>
                  <p className="text-sm text-muted-foreground">맞춤형 동기부여 및 조언</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-2">
          <Link to="/" className="flex-1">
            <Button variant="outline" className="w-full">
              홈으로
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
