import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission
} from '@/lib/notifications'

interface NotificationPermissionPromptProps {
  onPermissionGranted?: () => void
  onPermissionDenied?: () => void
  onDismiss?: () => void
}

export default function NotificationPermissionPrompt({
  onPermissionGranted,
  onPermissionDenied,
  onDismiss
}: NotificationPermissionPromptProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isRequesting, setIsRequesting] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    if (isNotificationSupported()) {
      setPermission(getNotificationPermission())
    }
  }, [])

  const handleRequestPermission = async () => {
    setIsRequesting(true)

    try {
      const result = await requestNotificationPermission()
      setPermission(result)

      if (result === 'granted') {
        onPermissionGranted?.()
      } else if (result === 'denied') {
        onPermissionDenied?.()
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error)
    } finally {
      setIsRequesting(false)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  // Don't show if not supported, already granted, or dismissed
  if (!isNotificationSupported() || permission === 'granted' || isDismissed) {
    return null
  }

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🔔</span>
          <span>알림 설정</span>
        </CardTitle>
        <CardDescription>
          매일 설정한 시간에 실천 알림을 받아보세요
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-2">
          <p>• 설정한 시간에 실천 항목 리마인더</p>
          <p>• 어제 실천 현황 및 격려 메시지</p>
          <p>• 목표 달성을 위한 동기부여</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRequestPermission}
            disabled={isRequesting}
            className="flex-1"
          >
            {isRequesting ? '요청 중...' : '알림 받기'}
          </Button>
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={isRequesting}
          >
            나중에
          </Button>
        </div>
        {permission === 'denied' && (
          <p className="text-xs text-red-600">
            알림이 차단되었습니다. 브라우저 설정에서 알림 권한을 허용해주세요.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
