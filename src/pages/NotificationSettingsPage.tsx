import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/use-toast'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getNotificationSettings,
  saveNotificationSettings,
  sendTestNotification,
  scheduleDailyReminder,
  generateNotificationMessage,
  type NotificationSettings
} from '@/lib/notifications'

export default function NotificationSettingsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const { toast } = useToast()

  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings())
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    if (isNotificationSupported()) {
      setPermission(getNotificationPermission())
    }
  }, [user, navigate])

  const handleRequestPermission = async () => {
    try {
      const result = await requestNotificationPermission()
      setPermission(result)

      if (result === 'granted') {
        toast({
          title: "✅ 알림 권한 허용",
          description: "알림 권한이 허용되었습니다!",
        })
      } else {
        toast({
          title: "❌ 알림 권한 거부",
          description: "알림 권한이 거부되었습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Failed to request permission:', error)
    }
  }

  const handleSaveSettings = () => {
    setIsSaving(true)

    try {
      saveNotificationSettings(settings)

      // If enabled and permission granted, schedule notification
      if (settings.enabled && permission === 'granted') {
        const message = generateNotificationMessage()
        scheduleDailyReminder(message.title, message.body, settings.time)
      }

      toast({
        title: "✅ 저장 완료",
        description: "설정이 저장되었습니다!",
      })
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast({
        title: "❌ 저장 실패",
        description: "설정 저장에 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestNotification = async () => {
    console.log('handleTestNotification called')
    console.log('Current permission:', permission)

    if (permission !== 'granted') {
      toast({
        title: "⚠️ 알림 권한 필요",
        description: "먼저 알림 권한을 허용해주세요.",
        variant: "destructive",
      })
      return
    }

    setIsTesting(true)

    try {
      console.log('Calling sendTestNotification...')
      await sendTestNotification()
      console.log('sendTestNotification completed')
      toast({
        title: "✅ 테스트 알림 전송",
        description: "테스트 알림이 전송되었습니다!",
      })
    } catch (error) {
      console.error('Failed to send test notification:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
      toast({
        title: "❌ 전송 실패",
        description: `테스트 알림 전송 실패: ${errorMessage}`,
        variant: "destructive",
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleToggleEnabled = (enabled: boolean) => {
    setSettings({ ...settings, enabled })
  }

  const handleTimeChange = (time: string) => {
    setSettings({ ...settings, time })
  }

  const handleFrequencyChange = (frequency: 'daily' | 'weekdays' | 'custom') => {
    setSettings({ ...settings, frequency })
  }

  const weekdays = [
    { value: 0, label: '일' },
    { value: 1, label: '월' },
    { value: 2, label: '화' },
    { value: 3, label: '수' },
    { value: 4, label: '목' },
    { value: 5, label: '금' },
    { value: 6, label: '토' }
  ]

  const handleCustomDayToggle = (day: number) => {
    const customDays = settings.customDays || []
    const newCustomDays = customDays.includes(day)
      ? customDays.filter(d => d !== day)
      : [...customDays, day].sort()

    setSettings({ ...settings, customDays: newCustomDays })
  }

  // 브라우저별 설정 경로 반환
  const getBrowserSettingsInstruction = () => {
    const userAgent = navigator.userAgent.toLowerCase()

    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      return {
        name: 'Chrome',
        path: '설정 > 개인정보 및 보안 > 사이트 설정 > 알림'
      }
    } else if (userAgent.includes('firefox')) {
      return {
        name: 'Firefox',
        path: '설정 > 개인정보 및 보안 > 권한 > 알림'
      }
    } else if (userAgent.includes('edg')) {
      return {
        name: 'Edge',
        path: '설정 > 쿠키 및 사이트 권한 > 알림'
      }
    } else if (userAgent.includes('safari')) {
      return {
        name: 'Safari',
        path: '시스템 환경설정 > 알림'
      }
    }
    return {
      name: '브라우저',
      path: '설정에서 알림 권한 메뉴'
    }
  }

  if (!isNotificationSupported()) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                이 브라우저는 알림 기능을 지원하지 않습니다.
              </p>
              <Button variant="outline" onClick={() => navigate('/dashboard')} className="mt-4">
                대시보드로 돌아가기
              </Button>
            </CardContent>
          </Card>
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
            <h1 className="text-3xl font-bold">알림 설정</h1>
            <p className="text-muted-foreground mt-1">
              일일 실천 리마인더를 설정하세요
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            대시보드로
          </Button>
        </div>

        {/* Permission Status */}
        <Card>
          <CardHeader>
            <CardTitle>알림 권한</CardTitle>
            <CardDescription>
              알림을 받으려면 먼저 권한을 허용해주세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    현재 상태:{' '}
                    {permission === 'granted' && (
                      <span className="text-green-600">허용됨 ✓</span>
                    )}
                    {permission === 'denied' && (
                      <span className="text-red-600">거부됨 ✗</span>
                    )}
                    {permission === 'default' && (
                      <span className="text-gray-600">대기 중</span>
                    )}
                  </p>
                </div>
                {permission !== 'granted' && (
                  <Button onClick={handleRequestPermission}>
                    권한 요청
                  </Button>
                )}
                {permission === 'granted' && (
                  <Button
                    variant="outline"
                    onClick={handleTestNotification}
                    disabled={isTesting}
                  >
                    {isTesting ? '전송 중...' : '테스트 알림'}
                  </Button>
                )}
              </div>

              {/* 권한별 안내 메시지 */}
              {permission === 'granted' && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-900 mb-2 font-medium">
                    💡 알림 권한을 해제하려면 브라우저 설정에서 변경할 수 있습니다.
                  </p>
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">{getBrowserSettingsInstruction().name}:</span>{' '}
                    {getBrowserSettingsInstruction().path}
                  </p>
                </div>
              )}

              {permission === 'denied' && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <p className="text-sm text-amber-900 mb-2 font-medium">
                    ⚠️ 알림이 차단되어 있습니다. 알림을 받으려면 브라우저 설정에서 권한을 허용해주세요.
                  </p>
                  <p className="text-sm text-amber-800">
                    <span className="font-medium">{getBrowserSettingsInstruction().name}:</span>{' '}
                    {getBrowserSettingsInstruction().path}
                  </p>
                </div>
              )}

              {permission === 'default' && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                  <p className="text-sm text-gray-700">
                    📬 "권한 요청" 버튼을 눌러 알림을 활성화하세요.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>알림 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">일일 알림</p>
                <p className="text-sm text-muted-foreground">
                  매일 설정한 시간에 실천 알림 받기
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => handleToggleEnabled(e.target.checked)}
                  disabled={permission !== 'granted'}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Time Setting */}
            <div className="space-y-2">
              <label className="font-medium">알림 시간</label>
              <input
                type="time"
                value={settings.time}
                onChange={(e) => handleTimeChange(e.target.value)}
                disabled={!settings.enabled || permission !== 'granted'}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Frequency */}
            <div className="space-y-3">
              <label className="font-medium">알림 빈도</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="frequency"
                    value="daily"
                    checked={settings.frequency === 'daily'}
                    onChange={() => handleFrequencyChange('daily')}
                    disabled={!settings.enabled || permission !== 'granted'}
                    className="w-4 h-4 text-primary"
                  />
                  <span>매일</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="frequency"
                    value="weekdays"
                    checked={settings.frequency === 'weekdays'}
                    onChange={() => handleFrequencyChange('weekdays')}
                    disabled={!settings.enabled || permission !== 'granted'}
                    className="w-4 h-4 text-primary"
                  />
                  <span>평일만 (월-금)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="frequency"
                    value="custom"
                    checked={settings.frequency === 'custom'}
                    onChange={() => handleFrequencyChange('custom')}
                    disabled={!settings.enabled || permission !== 'granted'}
                    className="w-4 h-4 text-primary"
                  />
                  <span>커스텀</span>
                </label>

                {/* Custom Days Selection */}
                {settings.frequency === 'custom' && (
                  <div className="ml-6 flex gap-2 flex-wrap">
                    {weekdays.map((day) => (
                      <button
                        key={day.value}
                        onClick={() => handleCustomDayToggle(day.value)}
                        disabled={!settings.enabled || permission !== 'granted'}
                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                          settings.customDays?.includes(day.value)
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t">
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving || permission !== 'granted'}
                className="w-full"
              >
                {isSaving ? '저장 중...' : '설정 저장'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="pt-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            대시보드로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  )
}
