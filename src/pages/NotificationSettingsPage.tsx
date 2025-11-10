import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Info } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/store/authStore'
import { showSuccess, showError, showWarning } from '@/lib/notificationUtils'
import { PERMISSION_MESSAGES } from '@/lib/notificationMessages'
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

// 프리셋 시간 정의
const PRESET_TIMES = [
  { label: '오전 9시', value: '09:00' },
  { label: '오후 12시', value: '12:00' },
  { label: '오후 8시', value: '20:00' },
]

// 시간 문자열을 시/분/오전오후로 파싱
const parseTime = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return { hour: hour12.toString(), minute: minutes.toString().padStart(2, '0'), period }
}

// 시/분/오전오후를 24시간 형식 문자열로 변환
const formatTime = (hour: string, minute: string, period: string) => {
  let hour24 = parseInt(hour)
  if (period === 'PM' && hour24 !== 12) {
    hour24 += 12
  } else if (period === 'AM' && hour24 === 12) {
    hour24 = 0
  }
  return `${hour24.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`
}

export default function NotificationSettingsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings())
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  // 시간 선택을 위한 state
  const initialTime = parseTime(settings.time)
  const [selectedHour, setSelectedHour] = useState(initialTime.hour)
  const [selectedMinute, setSelectedMinute] = useState(initialTime.minute)
  const [selectedPeriod, setSelectedPeriod] = useState(initialTime.period)

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
        showSuccess(PERMISSION_MESSAGES.granted())
      } else {
        showError(PERMISSION_MESSAGES.denied())
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

      showSuccess({
        title: '저장 완료',
        description: '설정이 저장되었습니다.',
        duration: 3000,
      })
    } catch (error) {
      console.error('Failed to save settings:', error)
      showError({
        title: '저장 실패',
        description: '설정 저장에 실패했습니다.',
        variant: 'destructive',
        duration: 3000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestNotification = async () => {
    console.log('handleTestNotification called')
    console.log('Current permission:', permission)

    if (permission !== 'granted') {
      showWarning(PERMISSION_MESSAGES.required())
      return
    }

    setIsTesting(true)

    try {
      console.log('Calling sendTestNotification...')
      await sendTestNotification()
      console.log('sendTestNotification completed')
      showSuccess(PERMISSION_MESSAGES.testSent())
    } catch (error) {
      console.error('Failed to send test notification:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
      showError(PERMISSION_MESSAGES.testFailed(errorMessage))
    } finally {
      setIsTesting(false)
    }
  }

  const handleToggleEnabled = (enabled: boolean) => {
    setSettings({ ...settings, enabled })
  }

  // 드롭다운 값 변경 시 settings의 time 업데이트
  useEffect(() => {
    const newTime = formatTime(selectedHour, selectedMinute, selectedPeriod)
    setSettings(prev => ({ ...prev, time: newTime }))
  }, [selectedHour, selectedMinute, selectedPeriod])

  // 프리셋 버튼 클릭 핸들러
  const handlePresetClick = (timeValue: string) => {
    const parsed = parseTime(timeValue)
    setSelectedHour(parsed.hour)
    setSelectedMinute(parsed.minute)
    setSelectedPeriod(parsed.period)
  }

  const handleFrequencyChange = (frequency: 'daily' | 'weekdays' | 'custom') => {
    setSettings({ ...settings, frequency })
  }

  const weekdays = [
    { value: 1, label: '월', short: '월' },
    { value: 2, label: '화', short: '화' },
    { value: 3, label: '수', short: '수' },
    { value: 4, label: '목', short: '목' },
    { value: 5, label: '금', short: '금' },
    { value: 6, label: '토', short: '토' },
    { value: 0, label: '일', short: '일' }
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
      <div className="container mx-auto py-3 md:py-6 px-4 pb-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold inline-block">알림 설정</h1>
            <span className="text-muted-foreground ml-3 text-sm">일일 실천 리마인더</span>
          </div>
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <div className="text-4xl">🔕</div>
              <div>
                <p className="text-lg font-medium">알림 기능 미지원</p>
                <p className="text-sm text-muted-foreground mt-1">
                  이 브라우저는 알림 기능을 지원하지 않습니다
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate('/home')}>
                홈으로 돌아가기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-3 md:py-6 px-4 pb-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold inline-block">알림 설정</h1>
          <span className="text-muted-foreground ml-3 text-sm">일일 실천 리마인더</span>
        </div>

        {/* Permission Status */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>알림 권한</CardTitle>
            <CardDescription>
              알림을 받으려면 먼저 권한을 허용해주세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
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
                <div className="space-y-2 pt-4 border-t">
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>알림 권한을 해제하려면 브라우저 설정에서 변경할 수 있습니다.</span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">{getBrowserSettingsInstruction().name}:</span> {getBrowserSettingsInstruction().path}</span>
                  </p>
                </div>
              )}

              {permission === 'denied' && (
                <div className="space-y-2 pt-4 border-t">
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>알림이 차단되어 있습니다. 알림을 받으려면 브라우저 설정에서 권한을 허용해주세요.</span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">{getBrowserSettingsInstruction().name}:</span> {getBrowserSettingsInstruction().path}</span>
                  </p>
                </div>
              )}

              {permission === 'default' && (
                <p className="text-xs text-muted-foreground flex items-start gap-1 pt-4 border-t">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>"권한 요청" 버튼을 눌러 알림을 활성화하세요.</span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>알림 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-0">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">실천 알림</p>
                <p className="text-sm text-muted-foreground">
                  설정한 시간과 요일에 실천 알림 받기
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

            {/* Frequency */}
            <div className="space-y-3">
              <label className="font-medium">알림 요일</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleFrequencyChange('daily')}
                  disabled={!settings.enabled || permission !== 'granted'}
                  className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                    settings.frequency === 'daily'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  매일
                </button>
                <button
                  onClick={() => handleFrequencyChange('weekdays')}
                  disabled={!settings.enabled || permission !== 'granted'}
                  className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                    settings.frequency === 'weekdays'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  평일 (월-금)
                </button>
                <button
                  onClick={() => handleFrequencyChange('custom')}
                  disabled={!settings.enabled || permission !== 'granted'}
                  className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                    settings.frequency === 'custom'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  선택
                </button>
              </div>

              {/* Custom Days Selection */}
              {settings.frequency === 'custom' && (
                <div className="grid grid-cols-7 gap-2 pt-2">
                  {weekdays.map((day) => (
                    <div key={day.value} className="flex items-center space-x-1">
                      <Checkbox
                        id={`weekday-${day.value}`}
                        checked={settings.customDays?.includes(day.value) || false}
                        onCheckedChange={() => handleCustomDayToggle(day.value)}
                        disabled={!settings.enabled || permission !== 'granted'}
                      />
                      <Label
                        htmlFor={`weekday-${day.value}`}
                        className="text-sm cursor-pointer"
                      >
                        {day.short}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Time Setting */}
            <div className="space-y-3">
              <label className="font-medium">알림 시간</label>

              {/* 빠른 선택 (프리셋) */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">빠른 선택</p>
                <div className="flex gap-2">
                  {PRESET_TIMES.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => handlePresetClick(preset.value)}
                      disabled={!settings.enabled || permission !== 'granted'}
                      className={`px-4 py-2 text-sm rounded-md border transition-colors whitespace-nowrap flex-1 ${
                        settings.time === preset.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 시간 설정 (드롭다운) */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">시간 설정</p>
                <div className="flex gap-2 items-center">
                  {/* 시간 선택 */}
                  <Select
                    value={selectedHour}
                    onValueChange={setSelectedHour}
                    disabled={!settings.enabled || permission !== 'granted'}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="시" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                        <SelectItem key={hour} value={hour.toString()}>
                          {hour}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <span className="text-muted-foreground">:</span>

                  {/* 분 선택 */}
                  <Select
                    value={selectedMinute}
                    onValueChange={setSelectedMinute}
                    disabled={!settings.enabled || permission !== 'granted'}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="분" />
                    </SelectTrigger>
                    <SelectContent>
                      {['00', '15', '30', '45'].map((minute) => (
                        <SelectItem key={minute} value={minute}>
                          {minute}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* 오전/오후 선택 */}
                  <Select
                    value={selectedPeriod}
                    onValueChange={setSelectedPeriod}
                    disabled={!settings.enabled || permission !== 'granted'}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="오전/오후" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">오전</SelectItem>
                      <SelectItem value="PM">오후</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t space-y-3">
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving || permission !== 'granted'}
                className="w-full"
              >
                {isSaving ? '저장 중...' : '설정 저장'}
              </Button>

              {/* Scheduling Limitation Notice */}
              {settings.enabled && permission === 'granted' && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p className="text-xs text-blue-900 dark:text-blue-100 flex items-start gap-1">
                    <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>
                      <span className="font-medium">알림 수신 안내:</span> 앱을 백그라운드에서 유지해야 알림을 받을 수 있습니다.
                      브라우저를 완전히 종료하면 예약된 알림이 작동하지 않습니다.
                    </span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/home')}
        >
          홈으로 돌아가기
        </Button>
      </div>
    </div>
  )
}
