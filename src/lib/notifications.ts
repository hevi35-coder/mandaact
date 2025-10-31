// Notification utility functions for PWA Push Notifications

export interface NotificationSettings {
  enabled: boolean
  time: string // HH:mm format
  frequency: 'daily' | 'weekdays' | 'custom'
  customDays?: number[] // 0-6 (Sunday-Saturday)
}

const NOTIFICATION_SETTINGS_KEY = 'mandaact_notification_settings'

/**
 * Check if browser supports notifications
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied'
  }
  return Notification.permission
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    throw new Error('Notifications are not supported in this browser')
  }

  const permission = await Notification.requestPermission()
  return permission
}

/**
 * Send a test notification
 */
export async function sendTestNotification(): Promise<void> {
  console.log('sendTestNotification called')
  console.log('Permission:', getNotificationPermission())

  if (getNotificationPermission() !== 'granted') {
    console.error('Permission not granted')
    throw new Error('Notification permission not granted')
  }

  try {
    // Use basic Notification API for better compatibility
    const notification = new Notification('MandaAct 테스트', {
      body: '알림이 정상적으로 작동합니다! 🎉',
      icon: 'vite.svg',
      tag: 'test-notification',
      requireInteraction: false
    })

    console.log('Notification created:', notification)

    // Optional: Try Service Worker notification as well
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const registration = await navigator.serviceWorker.ready
        console.log('Service Worker ready:', registration)

        await registration.showNotification('MandaAct SW 테스트', {
          body: 'Service Worker를 통한 알림입니다',
          icon: 'vite.svg',
          tag: 'test-notification-sw',
          requireInteraction: false,
          vibrate: [200, 100, 200],
          data: {
            url: '/dashboard'
          }
        })
        console.log('SW notification shown')
      } catch (swError) {
        console.warn('SW notification failed, but basic notification should work:', swError)
      }
    }
  } catch (error) {
    console.error('Failed to show notification:', error)
    throw error
  }
}

/**
 * Schedule a daily reminder notification
 */
export async function scheduleDailyReminder(
  title: string,
  body: string,
  time: string // HH:mm format
): Promise<void> {
  if (getNotificationPermission() !== 'granted') {
    throw new Error('Notification permission not granted')
  }

  const [hours, minutes] = time.split(':').map(Number)
  const now = new Date()
  const scheduledTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0
  )

  // If scheduled time is in the past, schedule for tomorrow
  if (scheduledTime < now) {
    scheduledTime.setDate(scheduledTime.getDate() + 1)
  }

  const delay = scheduledTime.getTime() - now.getTime()

  // Use setTimeout for scheduling (Note: This is limited to session duration)
  // For production, use a backend service or service worker with periodic sync
  setTimeout(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        await registration.showNotification(title, {
          body,
          icon: 'vite.svg',
          tag: 'daily-reminder',
          requireInteraction: false,
          vibrate: [200, 100, 200],
          data: {
            url: '/today'
          }
        })
      } catch (error) {
        console.error('Failed to show scheduled notification:', error)
      }
    }
  }, delay)
}

/**
 * Get saved notification settings
 */
export function getNotificationSettings(): NotificationSettings {
  const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      console.error('Failed to parse notification settings:', e)
    }
  }

  // Default settings
  return {
    enabled: false,
    time: '09:00',
    frequency: 'daily'
  }
}

/**
 * Save notification settings
 */
export function saveNotificationSettings(settings: NotificationSettings): void {
  localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings))
}

/**
 * Generate personalized notification message based on user data
 */
export function generateNotificationMessage(data?: {
  centerGoal?: string
  yesterdayCheckCount?: number
  totalActions?: number
}): { title: string; body: string } {
  const patterns = [
    {
      title: 'MandaAct',
      body: data?.centerGoal
        ? `오늘도 "${data.centerGoal}" 향해 한 걸음! 실천 항목을 체크해보세요.`
        : '오늘의 실천 항목을 확인해보세요!'
    },
    {
      title: '실천 시간입니다!',
      body: data?.yesterdayCheckCount
        ? `어제 ${data.yesterdayCheckCount}개 완료하셨네요! 오늘도 화이팅!`
        : '작은 실천이 큰 변화를 만듭니다.'
    },
    {
      title: '목표를 향한 하루',
      body: data?.totalActions
        ? `${data.totalActions}개의 실천 항목이 기다리고 있어요.`
        : '오늘도 꾸준히 실천해봐요!'
    }
  ]

  const randomIndex = Math.floor(Math.random() * patterns.length)
  return patterns[randomIndex]
}
