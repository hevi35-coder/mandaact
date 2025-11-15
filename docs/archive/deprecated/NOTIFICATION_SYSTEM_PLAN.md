# 알림 시스템 Full Implementation Plan

## 📋 구현 범위
- **Full 구현** (3-4일, 28-32시간)
- **어제 실천 요약 포함** (개인화 메시지)
- **iOS 높은 우선순위** (PWA 설치 가이드 + Safari Push)
- **5가지 알림 타입**:
  1. ✅ 일일 실천 리마인더
  2. 🏆 업적 달성 알림
  3. ⚠️ 스트릭 위험 경고
  4. 💤 3일 미접속 알림 (무리한 실천항목 조정 안내)
  5. 📊 주간 리포트 알림

---

## 🎯 현재 상태 분석

### ✅ 이미 구현된 것
1. **Frontend Components**:
   - `NotificationPermissionPrompt.tsx`: 권한 요청 UI
   - `NotificationSettingsPage.tsx`: 설정 페이지 (시간, 빈도 선택)
   - `src/lib/notifications.ts`: 기본 알림 유틸리티

2. **PWA 설정**:
   - Vite PWA 플러그인 설치
   - Service Worker 자동 생성
   - 기본 캐싱 설정

### ❌ 구현 필요한 것
1. **Database Schema**: 알림 설정, 푸시 구독, 로그 테이블
2. **Custom Service Worker**: 푸시 이벤트 핸들러
3. **Push Subscription 관리**: Web Push API 연동
4. **Edge Functions**: 알림 발송 로직
5. **Cron Jobs**: 스케줄링
6. **iOS 지원**: PWA 설치 가이드

---

## 🗄️ Phase 1: Database Schema (2-3시간)

### 마이그레이션 파일
**File**: `supabase/migrations/20251108000005_notification_system.sql`

### 테이블 3개

#### 1. notification_settings
```sql
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- 기본 설정
  enabled BOOLEAN DEFAULT false NOT NULL,
  time TEXT DEFAULT '09:00' NOT NULL, -- HH:mm format
  timezone TEXT DEFAULT 'Asia/Seoul' NOT NULL,

  -- 빈도 설정
  frequency TEXT CHECK (frequency IN ('daily', 'weekdays', 'custom')) DEFAULT 'daily' NOT NULL,
  custom_days INTEGER[] DEFAULT NULL, -- 0-6 (Sunday-Saturday)

  -- 알림 타입별 토글
  enable_daily_reminder BOOLEAN DEFAULT true NOT NULL,
  enable_achievement BOOLEAN DEFAULT true NOT NULL,
  enable_streak_warning BOOLEAN DEFAULT true NOT NULL,
  enable_inactive_reminder BOOLEAN DEFAULT true NOT NULL,
  enable_weekly_report BOOLEAN DEFAULT true NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### 2. push_subscriptions
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Web Push 구독 정보
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL, -- Public key for encryption
  auth_key TEXT NOT NULL,    -- Authentication secret

  -- 디바이스 정보
  user_agent TEXT,
  device_name TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### 3. notification_logs
```sql
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- 알림 정보
  notification_type TEXT CHECK (notification_type IN (
    'daily_reminder',
    'achievement',
    'streak_warning',
    'inactive_reminder',
    'weekly_report'
  )) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,

  -- 발송 상태
  sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  delivery_status TEXT CHECK (delivery_status IN ('sent', 'failed', 'clicked')) DEFAULT 'sent' NOT NULL,
  error_message TEXT,

  -- 추가 데이터
  metadata JSONB DEFAULT '{}'
);
```

### 인덱스
```sql
CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX idx_notification_logs_sent_at ON notification_logs(sent_at DESC);
```

### RLS 정책
```sql
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their notification settings"
  ON notification_settings FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their notification logs"
  ON notification_logs FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 📱 Phase 2: Service Worker Setup (3-4시간)

### Custom Service Worker
**File**: `public/sw.js` (또는 Vite PWA 설정에 통합)

### 구현 내용

#### 1. Push Event Listener
```javascript
self.addEventListener('push', function(event) {
  const data = event.data.json()

  const options = {
    body: data.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || 'mandaact-notification',
    requireInteraction: false,
    data: {
      url: data.url || '/today',
      notificationId: data.id,
      notificationType: data.type
    },
    actions: [
      { action: 'open', title: '열기', icon: '/icons/open.png' },
      { action: 'dismiss', title: '닫기', icon: '/icons/close.png' }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})
```

#### 2. Notification Click Handler
```javascript
self.addEventListener('notificationclick', function(event) {
  event.notification.close()

  const url = event.notification.data.url
  const notificationId = event.notification.data.notificationId

  if (event.action === 'dismiss') {
    // Log dismiss event
    return
  }

  // Open or focus app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // If app is already open, focus it
        for (let client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus()
          }
        }
        // Otherwise, open new window
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
      .then(() => {
        // Log click event to backend
        return fetch('/api/notification-click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notificationId: notificationId,
            action: event.action || 'open'
          })
        })
      })
  )
})
```

#### 3. Background Sync (Optional)
```javascript
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications())
  }
})

async function syncNotifications() {
  // Fetch missed notifications when coming online
  const response = await fetch('/api/missed-notifications')
  const notifications = await response.json()

  for (const notification of notifications) {
    await self.registration.showNotification(notification.title, {
      body: notification.body,
      // ...options
    })
  }
}
```

---

## 🔧 Phase 3: Frontend Implementation (4-5시간)

### A. `src/lib/notifications.ts` 확장

#### 추가 함수

```typescript
/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(userId: string): Promise<boolean> {
  try {
    // Check if service worker is ready
    const registration = await navigator.serviceWorker.ready

    // Get VAPID public key from env
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    })

    // Send subscription to backend
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subscribe-push`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          userId,
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent
        })
      }
    )

    if (!response.ok) throw new Error('Failed to save subscription')

    console.log('✅ Push subscription created')
    return true
  } catch (error) {
    console.error('Push subscription failed:', error)
    return false
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (!subscription) return true

    // Unsubscribe from browser
    await subscription.unsubscribe()

    // Remove from backend
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/unsubscribe-push`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          userId,
          endpoint: subscription.endpoint
        })
      }
    )

    console.log('✅ Push subscription removed')
    return true
  } catch (error) {
    console.error('Unsubscribe failed:', error)
    return false
  }
}

/**
 * Get push subscription status
 */
export async function getPushSubscriptionStatus(): Promise<{
  subscribed: boolean
  endpoint?: string
}> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    return {
      subscribed: !!subscription,
      endpoint: subscription?.endpoint
    }
  } catch {
    return { subscribed: false }
  }
}

/**
 * Fetch yesterday's check summary for notification
 */
export async function getYesterdayCheckSummary(userId: string) {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get yesterday's check history
  const { data: checks } = await supabase
    .from('check_history')
    .select('action_id')
    .eq('user_id', userId)
    .gte('checked_at', yesterday.toISOString())
    .lt('checked_at', today.toISOString())

  // Get total actions count
  const { data: actions } = await supabase
    .from('actions')
    .select('id, sub_goal:sub_goals!inner(mandalart:mandalarts!inner(user_id, center_goal))')
    .eq('sub_goal.mandalart.user_id', userId)

  const totalActions = actions?.length || 0
  const checkedActions = new Set(checks?.map(c => c.action_id)).size
  const completionRate = totalActions > 0
    ? Math.round((checkedActions / totalActions) * 100)
    : 0

  const centerGoal = actions?.[0]?.sub_goal?.mandalart?.center_goal || '목표'

  return {
    totalActions,
    checkedActions,
    completionRate,
    centerGoal
  }
}

/**
 * Check if device is iOS
 */
export function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
}

/**
 * Check if iOS PWA is installed
 */
export function isIOSPWAInstalled(): boolean {
  return isIOSDevice() && (window.navigator as any).standalone === true
}

/**
 * Utility: Convert VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}
```

### B. `NotificationSettingsPage.tsx` 개선

#### 추가 기능
```tsx
// 1. 푸시 구독 상태 표시
const [subscriptionStatus, setSubscriptionStatus] = useState<{
  subscribed: boolean
  deviceCount: number
}>({ subscribed: false, deviceCount: 0 })

// 2. 알림 타입별 토글
const [notificationTypes, setNotificationTypes] = useState({
  daily_reminder: true,
  achievement: true,
  streak_warning: true,
  inactive_reminder: true,
  weekly_report: true
})

// 3. iOS 설치 가이드 모달
const [showIOSGuide, setShowIOSGuide] = useState(false)

// 4. 마지막 알림 시간 표시
const [lastNotification, setLastNotification] = useState<Date | null>(null)

// 5. 테스트 알림 (백엔드 통해 발송)
const handleTestNotification = async () => {
  await fetch('/functions/v1/send-test-notification', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ userId })
  })
  toast.success('테스트 알림이 발송되었습니다!')
}
```

### C. 새 컴포넌트: `IOSInstallGuide.tsx`

```tsx
export function IOSInstallGuide({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>iOS 알림 설정 가이드</DialogTitle>
          <DialogDescription>
            iPhone/iPad에서 알림을 받으려면 앱을 홈 화면에 추가해야 합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              1
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">Safari에서 열기</h4>
              <p className="text-sm text-muted-foreground">
                Safari 브라우저에서 mandaact.com을 열어주세요
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              2
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">공유 버튼 클릭</h4>
              <p className="text-sm text-muted-foreground">
                화면 하단 중앙의 <Share className="inline h-4 w-4" /> 버튼을 누르세요
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              3
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">홈 화면에 추가</h4>
              <p className="text-sm text-muted-foreground">
                "홈 화면에 추가" 옵션을 선택하고 "추가" 버튼을 누르세요
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              4
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">앱에서 알림 권한 허용</h4>
              <p className="text-sm text-muted-foreground">
                홈 화면의 MandaAct 아이콘으로 열고 알림을 허용해주세요
              </p>
            </div>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            iOS 16.4 이상에서만 웹 알림이 지원됩니다
          </AlertDescription>
        </Alert>
      </DialogContent>
    </Dialog>
  )
}
```

---

## ☁️ Phase 4: Supabase Edge Functions (8-10시간)

### A. `subscribe-push` (2시간)

**File**: `supabase/functions/subscribe-push/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt)
    if (userError || !user) throw new Error('Invalid user')

    const { subscription, userAgent } = await req.json()

    // Upsert subscription (by endpoint to handle re-subscribes)
    const { error } = await supabaseClient
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        user_agent: userAgent,
        last_used_at: new Date().toISOString()
      }, {
        onConflict: 'endpoint'
      })

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('subscribe-push error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### B. `send-daily-notifications` (4-5시간) ⭐ 핵심

**File**: `supabase/functions/send-daily-notifications/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.6'

// VAPID setup
webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? '',
  Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
  Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
)

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get current time
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    // Find users to notify (enabled, matching time, matching day)
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('enabled', true)
      .eq('enable_daily_reminder', true)
      .eq('time', currentTime)

    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ message: 'No users to notify' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const results = []

    for (const setting of settings) {
      try {
        // Check day of week
        const dayOfWeek = now.getDay()
        if (setting.frequency === 'weekdays' && (dayOfWeek === 0 || dayOfWeek === 6)) {
          continue // Skip weekends
        }
        if (setting.frequency === 'custom' && !setting.custom_days.includes(dayOfWeek)) {
          continue // Skip non-selected days
        }

        // Get yesterday's summary
        const summary = await getYesterdaySummary(supabase, setting.user_id)

        // Generate message
        const message = generateDailyMessage(summary)

        // Get user's push subscriptions
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', setting.user_id)

        if (!subscriptions || subscriptions.length === 0) {
          console.log(`No subscriptions for user ${setting.user_id}`)
          continue
        }

        // Send to all devices
        for (const subscription of subscriptions) {
          try {
            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: {
                  p256dh: subscription.p256dh_key,
                  auth: subscription.auth_key
                }
              },
              JSON.stringify({
                title: message.title,
                body: message.body,
                url: '/today',
                type: 'daily_reminder',
                tag: 'daily-reminder'
              })
            )

            // Log success
            await supabase.from('notification_logs').insert({
              user_id: setting.user_id,
              notification_type: 'daily_reminder',
              title: message.title,
              body: message.body,
              delivery_status: 'sent'
            })

            results.push({ userId: setting.user_id, status: 'sent' })
          } catch (pushError) {
            console.error('Push error:', pushError)

            // Log failure
            await supabase.from('notification_logs').insert({
              user_id: setting.user_id,
              notification_type: 'daily_reminder',
              title: message.title,
              body: message.body,
              delivery_status: 'failed',
              error_message: pushError.message
            })

            // If subscription expired, remove it
            if (pushError.statusCode === 410) {
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('id', subscription.id)
            }

            results.push({ userId: setting.user_id, status: 'failed', error: pushError.message })
          }
        }
      } catch (userError) {
        console.error(`Error for user ${setting.user_id}:`, userError)
        results.push({ userId: setting.user_id, status: 'error', error: userError.message })
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('send-daily-notifications error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

async function getYesterdaySummary(supabase: any, userId: string) {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get yesterday's checks
  const { data: checks } = await supabase
    .from('check_history')
    .select('action_id')
    .eq('user_id', userId)
    .gte('checked_at', yesterday.toISOString())
    .lt('checked_at', today.toISOString())

  // Get total actions
  const { data: actions } = await supabase
    .from('actions')
    .select('id, sub_goal:sub_goals!inner(mandalart:mandalarts!inner(user_id, center_goal))')
    .eq('sub_goal.mandalart.user_id', userId)

  const totalActions = actions?.length || 0
  const checkedActions = new Set(checks?.map((c: any) => c.action_id)).size
  const completionRate = totalActions > 0 ? Math.round((checkedActions / totalActions) * 100) : 0
  const centerGoal = actions?.[0]?.sub_goal?.mandalart?.center_goal || '목표'

  return { totalActions, checkedActions, completionRate, centerGoal }
}

function generateDailyMessage(summary: any) {
  const { totalActions, checkedActions, completionRate, centerGoal } = summary

  let title = '🌞 오늘의 실천을 시작하세요!'
  let body = ''

  if (completionRate === 0) {
    body = `어제는 쉬셨네요! 오늘은 "${centerGoal}" 목표를 향해 다시 시작해보세요.`
  } else if (completionRate < 50) {
    body = `어제 ${checkedActions}개 실천하셨네요! 오늘은 더 잘할 수 있어요! 💪`
  } else if (completionRate < 80) {
    body = `어제 ${checkedActions}/${totalActions}개 완료! 오늘도 이 기세를 이어가세요! 🔥`
  } else if (completionRate < 100) {
    body = `어제 ${completionRate}% 달성! 거의 완벽해요! 오늘은 100%에 도전해보세요! ⭐`
  } else {
    body = `어제 완벽한 100% 달성! 👏 오늘도 함께 완주해볼까요?`
  }

  return { title, body }
}
```

### C. `send-achievement-notification` (1-2시간)

**File**: `supabase/functions/send-achievement-notification/index.ts`

```typescript
// Purpose: Send notification when achievement is unlocked
// Trigger: Called from achievement unlock logic in app

serve(async (req) => {
  const { userId, achievementKey, achievementTitle, xpReward } = await req.json()

  // Get user's subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  // Send notification
  const message = {
    title: `🎉 업적 달성!`,
    body: `"${achievementTitle}" 업적을 달성했어요! +${xpReward} XP 획득!`,
    url: '/home', // Stats page with achievements
    type: 'achievement',
    tag: `achievement-${achievementKey}`
  }

  // ... send push notification to all subscriptions
  // ... log to notification_logs
})
```

### D. `send-streak-warning` (1-2시간)

**File**: `supabase/functions/send-streak-warning/index.ts`

```typescript
// Purpose: Warn users at risk of losing streak
// Trigger: Cron at 9PM KST (12:00 UTC)

serve(async (req) => {
  // Find users with:
  // 1. Current streak >= 7 days
  // 2. No checks today
  // 3. Notification enabled

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Query users at risk
  // ... complex SQL to find streak + no today checks

  const message = {
    title: '⚠️ 연속 기록이 위험해요!',
    body: `${streakDays}일 연속 기록이 끊길 수 있어요. 오늘 실천하러 가볼까요?`,
    url: '/today',
    type: 'streak_warning'
  }

  // ... send notifications
})
```

### E. `send-inactive-reminder` (1-2시간)

**File**: `supabase/functions/send-inactive-reminder/index.ts`

```typescript
// Purpose: Re-engage users inactive for 3+ days
// Trigger: Cron at 10AM KST (1:00 UTC)

serve(async (req) => {
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  // Find users with no checks in last 3 days
  const { data: inactiveUsers } = await supabase.rpc('get_inactive_users', {
    days: 3
  })

  const message = {
    title: '💤 잠깐! 쉬고 계신가요?',
    body: '3일째 쉬고 계시네요. 무리한 실천항목이 있다면 적절히 조정해보세요!',
    url: '/mandalart/list',
    type: 'inactive_reminder'
  }

  // ... send notifications
})
```

### F. `unsubscribe-push` (1시간)

**File**: `supabase/functions/unsubscribe-push/index.ts`

```typescript
serve(async (req) => {
  const { userId, endpoint } = await req.json()

  // Remove subscription
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint)

  // ... return success
})
```

---

## ⏰ Phase 5: Cron Jobs Setup (2시간)

### Supabase Cron 스케줄 설정

**방법 1: SQL (pg_cron)**
```sql
-- 1. 일일 리마인더 (매분 체크, 함수 내부에서 시간 필터링)
SELECT cron.schedule(
  'send-daily-notifications',
  '* * * * *',  -- Every minute
  $$
  SELECT
    net.http_post(
      url:='https://gxnvovnwlqjstpcsprqr.supabase.co/functions/v1/send-daily-notifications',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    ) as request_id;
  $$
);

-- 2. 스트릭 경고 (매일 21:00 KST = 12:00 UTC)
SELECT cron.schedule(
  'send-streak-warning',
  '0 12 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://gxnvovnwlqjstpcsprqr.supabase.co/functions/v1/send-streak-warning',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    ) as request_id;
  $$
);

-- 3. 미접속 알림 (매일 10:00 KST = 1:00 UTC)
SELECT cron.schedule(
  'send-inactive-reminder',
  '0 1 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://gxnvovnwlqjstpcsprqr.supabase.co/functions/v1/send-inactive-reminder',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    ) as request_id;
  $$
);

-- 4. 주간 리포트 (매주 일요일 20:00 KST = 11:00 UTC)
SELECT cron.schedule(
  'send-weekly-report',
  '0 11 * * 0',
  $$
  SELECT
    net.http_post(
      url:='https://gxnvovnwlqjstpcsprqr.supabase.co/functions/v1/send-weekly-report',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
    ) as request_id;
  $$
);
```

**방법 2: Supabase Dashboard**
- Database → Cron Jobs → New Cron Job
- 각 스케줄 등록

### 모니터링 쿼리
```sql
-- Cron job 실행 기록 확인
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 50;

-- 실패한 작업만 보기
SELECT * FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC;
```

---

## 🔐 Phase 6: VAPID Keys & Secrets (1시간)

### 1. VAPID Keys 생성

```bash
# 로컬에서 실행
npm install -g web-push
web-push generate-vapid-keys
```

**출력 예시**:
```
Public Key:
BJxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Private Key:
abcxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Supabase Secrets 저장

```bash
supabase secrets set VAPID_PUBLIC_KEY="BJxxxxxxxxx..."
supabase secrets set VAPID_PRIVATE_KEY="abcxxxxxxxxx..."
supabase secrets set VAPID_SUBJECT="mailto:support@mandaact.com"
```

### 3. Frontend 환경변수

**`.env.local`**:
```
VITE_VAPID_PUBLIC_KEY=BJxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**`.env.example`** 업데이트:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
```

---

## 🧪 Phase 7: Testing & Integration (3-4시간)

### 테스트 체크리스트

#### ✅ 기본 플로우
- [ ] 알림 권한 요청 → 승인
- [ ] 푸시 구독 생성 → `push_subscriptions` 테이블 확인
- [ ] 설정 저장 → `notification_settings` 테이블 확인
- [ ] 테스트 알림 버튼 클릭 → 알림 수신
- [ ] 알림 클릭 → 앱 열림 확인 (`/today`)

#### ✅ 예약 알림
- [ ] 시간 설정 (예: 1분 후) → 정확한 시간에 알림 수신
- [ ] Cron job 수동 트리거 (SQL) → 즉시 발송 확인
- [ ] `notification_logs` 테이블에 기록 확인

#### ✅ 알림 타입별 테스트
- [ ] **일일 리마인더**: 어제 요약 포함 확인
- [ ] **업적 달성**: 뱃지 획득 시 즉시 알림
- [ ] **스트릭 경고**: 오늘 미체크 + 스트릭 7일 이상
- [ ] **미접속 알림**: 3일 미접속 사용자

#### ✅ 멀티 디바이스
- [ ] 동일 계정 2개 디바이스 등록
- [ ] 두 디바이스 모두 알림 수신
- [ ] 한 디바이스 해제 → 해당 디바이스만 알림 중단

#### ✅ iOS 전용
- [ ] iOS 기기 감지 → 설치 가이드 표시
- [ ] Safari에서 "홈 화면에 추가"
- [ ] PWA로 실행 → 알림 권한 요청
- [ ] 알림 수신 확인 (iOS 16.4+)

#### ✅ 에러 핸들링
- [ ] 권한 거부 → 안내 메시지 표시
- [ ] 구독 만료 (410 error) → 자동 삭제 + 재구독 유도
- [ ] 네트워크 오류 → 재시도 로직
- [ ] iOS 구버전 → 지원 불가 안내

### 테스트 도구

#### 1. Manual Cron Trigger (개발용)
```sql
-- 수동으로 Edge Function 호출
SELECT
  net.http_post(
    url:='https://your-project.supabase.co/functions/v1/send-daily-notifications',
    headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
```

#### 2. Service Worker 디버깅
```javascript
// Chrome DevTools → Application → Service Workers
// "Update on reload" 체크
// Console에서 Push 시뮬레이션
navigator.serviceWorker.ready.then(registration => {
  registration.pushManager.getSubscription().then(subscription => {
    console.log('Subscription:', subscription.toJSON())
  })
})
```

#### 3. Push Notification Tester
[Web Push Testing Tool](https://web-push-codelab.glitch.me/)에서 수동 푸시 테스트

---

## 📊 Phase 8: Analytics & Monitoring (2-3시간)

### PostHog 이벤트 추가

```typescript
// src/lib/analytics.ts
export const trackNotificationEvent = (eventName: string, properties?: any) => {
  if (window.posthog) {
    window.posthog.capture(eventName, properties)
  }
}

// 사용 예시
trackNotificationEvent('notification_permission_requested')
trackNotificationEvent('notification_permission_granted', { platform: 'chrome' })
trackNotificationEvent('push_subscription_created', { deviceType: 'mobile' })
trackNotificationEvent('notification_sent', { type: 'daily_reminder' })
trackNotificationEvent('notification_clicked', { type: 'achievement', actionId: '123' })
```

### 이벤트 목록
- `notification_permission_requested`
- `notification_permission_granted`
- `notification_permission_denied`
- `push_subscription_created`
- `push_subscription_failed`
- `notification_sent` (타입별)
- `notification_received`
- `notification_clicked`
- `notification_dismissed`
- `ios_install_guide_shown`
- `ios_install_guide_completed`

### 대시보드 쿼리

#### 1. 알림 발송 성공률
```sql
SELECT
  notification_type,
  COUNT(*) as total_sent,
  SUM(CASE WHEN delivery_status='sent' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN delivery_status='failed' THEN 1 ELSE 0 END) as failed,
  ROUND(100.0 * SUM(CASE WHEN delivery_status='sent' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate_pct
FROM notification_logs
WHERE sent_at > NOW() - INTERVAL '7 days'
GROUP BY notification_type
ORDER BY total_sent DESC;
```

#### 2. 사용자 참여도 (CTR)
```sql
SELECT
  notification_type,
  COUNT(*) as sent,
  SUM(CASE WHEN delivery_status='clicked' THEN 1 ELSE 0 END) as clicked,
  ROUND(100.0 * SUM(CASE WHEN delivery_status='clicked' THEN 1 ELSE 0 END) / COUNT(*), 2) as ctr_pct
FROM notification_logs
WHERE sent_at > NOW() - INTERVAL '30 days'
GROUP BY notification_type;
```

#### 3. 시간대별 발송량
```sql
SELECT
  DATE_TRUNC('hour', sent_at) as hour,
  COUNT(*) as notifications_sent
FROM notification_logs
WHERE sent_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

#### 4. 구독 현황
```sql
SELECT
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_devices,
  ROUND(AVG(device_count), 2) as avg_devices_per_user
FROM (
  SELECT
    user_id,
    COUNT(*) as device_count
  FROM push_subscriptions
  GROUP BY user_id
) as user_devices;
```

### Supabase 알림 설정

**Alert 조건**:
1. 알림 실패율 > 20% (1시간 동안)
2. Cron job 실패 연속 3회
3. 푸시 구독 실패율 > 10%

---

## 🎨 Phase 9: UX Enhancements (2-3시간)

### A. 알림 히스토리 페이지 (선택사항)

**Route**: `/notifications/history`

**기능**:
- 최근 30일 수신 알림 목록
- 타입별 필터 (일일, 업적, 스트릭, 미접속, 리포트)
- 날짜 필터
- 클릭률 통계 표시

### B. 알림 미리보기

**위치**: `NotificationSettingsPage` 내부

**기능**:
- 각 알림 타입 예시 보기
- "이렇게 알림이 옵니다" 카드
- 실제 알림 스타일 시뮬레이션

### C. 고급 설정

**추가 옵션**:
- [ ] 알림음 켜기/끄기 (브라우저 지원 시)
- [ ] 진동 켜기/끄기 (모바일)
- [ ] Do Not Disturb 시간대 (예: 23:00-07:00)
- [ ] 알림 우선순위 (high/normal/low)

### D. 에러 처리 개선

**시나리오별 안내**:
1. **권한 거부됨**:
   ```
   알림 권한이 거부되었습니다.

   Chrome: 설정 > 사이트 설정 > 알림에서 허용
   Safari: 설정 > Safari > 웹사이트 > 알림에서 허용
   ```

2. **iOS 미지원**:
   ```
   iOS에서는 Safari 16.4 이상이 필요합니다.

   현재 버전: iOS 15.x
   업데이트 후 다시 시도해주세요.
   ```

3. **구독 만료**:
   ```
   알림 구독이 만료되었습니다.

   다시 활성화하려면 아래 버튼을 눌러주세요.
   [알림 다시 켜기]
   ```

---

## ⏱️ Implementation Timeline (3-4일)

### Day 1 (8-9시간)
- **Morning** (3-4시간):
  - Database schema 작성 및 마이그레이션
  - VAPID keys 생성 및 설정
  - Secrets 저장 (Supabase + .env)

- **Afternoon** (3-4시간):
  - Custom Service Worker 구현
  - Push event listener
  - Notification click handler

- **Evening** (2시간):
  - Frontend: `subscribeToPush()` 구현
  - Frontend: `unsubscribeFromPush()` 구현
  - 기본 테스트 (권한 요청 → 구독 생성)

### Day 2 (8-9시간)
- **Morning** (3시간):
  - `subscribe-push` Edge Function
  - `unsubscribe-push` Edge Function
  - 구독 플로우 테스트

- **Afternoon** (3-4시간):
  - `send-daily-notifications` Part 1: 기본 구조
  - 사용자 쿼리 로직
  - Web Push 발송 로직

- **Evening** (2시간):
  - `send-daily-notifications` Part 2: 어제 요약
  - `getYesterdaySummary()` 구현
  - 메시지 생성 로직
  - 테스트 알림 발송

### Day 3 (8-9시간)
- **Morning** (4시간):
  - `send-achievement-notification` 구현
  - `send-streak-warning` 구현
  - `send-inactive-reminder` 구현

- **Afternoon** (2-3시간):
  - Cron jobs 설정 (4개)
  - Cron 수동 트리거 테스트
  - 로그 확인

- **Evening** (2-3시간):
  - iOS 지원: `IOSInstallGuide` 컴포넌트
  - iOS PWA 설치 감지 로직
  - iOS Safari Push 테스트 (iOS 16.4+ 기기)

### Day 4 (4-5시간)
- **Morning** (2-3시간):
  - End-to-end 테스트 (모든 시나리오)
  - 멀티 디바이스 테스트
  - iOS 테스트

- **Afternoon** (1-2시간):
  - PostHog Analytics 연동
  - 대시보드 쿼리 작성
  - 모니터링 설정

- **Evening** (1시간):
  - Bug fixes
  - UX polish (미리보기, 안내 메시지)
  - 문서화

---

## 🚨 Critical Success Factors

### 필수 체크포인트

1. **VAPID Keys 생성** (Day 1 필수)
   - [ ] `web-push generate-vapid-keys` 실행
   - [ ] Public/Private key 안전하게 보관
   - [ ] Supabase secrets에 저장 확인

2. **Service Worker 작동** (Day 1 완료 필수)
   - [ ] SW 등록 성공
   - [ ] Push event 리스너 동작
   - [ ] Chrome DevTools에서 확인

3. **Database Schema** (Day 1 필수)
   - [ ] 3개 테이블 생성 완료
   - [ ] RLS 정책 적용
   - [ ] 마이그레이션 성공

4. **어제 요약 데이터** (Day 2)
   - [ ] `getYesterdaySummary()` 정확한 데이터 반환
   - [ ] 개인화 메시지 생성 확인

5. **Cron Jobs 정상 작동** (Day 3)
   - [ ] 4개 스케줄 등록
   - [ ] 첫 24시간 로그 집중 모니터링
   - [ ] 실패 시 즉시 대응

6. **iOS PWA 설치** (Day 3)
   - [ ] iOS 감지 로직
   - [ ] 설치 가이드 표시
   - [ ] 실제 기기 테스트

---

## 📦 Deliverables

### 완료 후 제공 파일

#### 1. Database
- `supabase/migrations/20251108000005_notification_system.sql`

#### 2. Service Worker
- `public/sw.js` (또는 Vite PWA config)

#### 3. Frontend
- `src/lib/notifications.ts` (enhanced)
- `src/pages/NotificationSettingsPage.tsx` (updated)
- `src/components/IOSInstallGuide.tsx` (new)

#### 4. Edge Functions (6개)
- `supabase/functions/subscribe-push/index.ts`
- `supabase/functions/unsubscribe-push/index.ts`
- `supabase/functions/send-daily-notifications/index.ts`
- `supabase/functions/send-achievement-notification/index.ts`
- `supabase/functions/send-streak-warning/index.ts`
- `supabase/functions/send-inactive-reminder/index.ts`

#### 5. Configuration
- Supabase Cron Jobs (4개 스케줄)
- VAPID keys 설정
- Environment variables

#### 6. Documentation
- 이 문서 (구현 계획)
- 사용자 가이드 (iOS 설치 포함)
- 트러블슈팅 가이드
- API 문서 (Edge Functions)

---

## 💡 Best Practices & Tips

### 개발 팁

1. **로컬 테스트**:
   - Chrome에서 `chrome://inspect/#service-workers` 확인
   - `chrome://gcm-internals/` Push 메시지 디버깅

2. **Cron Job 디버깅**:
   - 초기에는 짧은 간격 (1분)으로 설정
   - 로그 집중 모니터링
   - 안정화 후 실제 스케줄로 변경

3. **iOS 테스트**:
   - 실제 iOS 기기 필수 (시뮬레이터 불가)
   - iOS 16.4+ 확인
   - Safari에서만 테스트

4. **메시지 품질**:
   - 짧고 명확하게 (타이틀 40자, 본문 120자 이내)
   - Emoji 적절히 활용
   - Call-to-action 명확히

### 보안 고려사항

1. **VAPID Private Key**:
   - 절대 코드에 포함 금지
   - Supabase secrets에만 저장
   - 정기적으로 rotate (연 1회)

2. **Push Subscription Data**:
   - endpoint는 민감 정보
   - RLS로 보호
   - HTTPS 필수

3. **알림 내용**:
   - 개인정보 최소화
   - 잠금화면 노출 고려
   - 민감한 데이터는 앱에서만 표시

### 성능 최적화

1. **Batch Processing**:
   - 한 번에 100명씩 처리
   - 너무 많으면 pagination

2. **캐싱**:
   - 사용자 데이터 캐싱 (5분)
   - 불필요한 DB 쿼리 최소화

3. **Rate Limiting**:
   - 사용자당 하루 최대 알림 수 제한
   - 너무 잦은 알림 방지

---

## 🔧 Troubleshooting Guide

### 자주 발생하는 문제

#### 1. "Push subscription failed"
**원인**: VAPID key 불일치 또는 잘못된 형식
**해결**:
- VAPID public key가 정확한지 확인
- `urlBase64ToUint8Array()` 함수 사용
- Chrome DevTools Console에서 에러 확인

#### 2. "Notification not received"
**원인**: Service Worker 미등록 또는 권한 거부
**해결**:
- `chrome://serviceworker-internals/` 확인
- 권한 상태: `Notification.permission` 확인
- SW 강제 업데이트: "Update on reload" 체크

#### 3. "410 Gone error"
**원인**: Push subscription 만료
**해결**:
- Expired subscription 자동 삭제
- 사용자에게 재구독 유도
- `last_used_at` 정기적으로 업데이트

#### 4. "Cron job not running"
**원인**: 스케줄 설정 오류 또는 함수 실패
**해결**:
- `cron.job_run_details` 테이블 확인
- Edge Function 로그 확인
- 수동 트리거로 테스트

#### 5. "iOS not working"
**원인**: iOS 버전 미지원 또는 PWA 미설치
**해결**:
- iOS 16.4+ 확인
- "홈 화면에 추가" 필수
- Safari 전용 (Chrome/Firefox 불가)

---

## 📚 References & Resources

### Documentation
- [Web Push API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Cron Jobs](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [web-push Node.js Library](https://github.com/web-push-libs/web-push)

### Tools
- [Web Push Testing Tool](https://web-push-codelab.glitch.me/)
- [VAPID Key Generator](https://vapidkeys.com/)
- [Service Worker Cookbook](https://serviceworke.rs/)

### iOS Resources
- [Apple PWA Documentation](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [iOS 16.4 Push Notification Support](https://developer.apple.com/documentation/usernotifications)

---

## 🎯 Success Metrics

### 목표 지표 (4주 후)

| Metric | Target | Measurement |
|--------|--------|-------------|
| 알림 활성화율 | 60%+ | enabled users / total users |
| 알림 발송 성공률 | 95%+ | sent / (sent + failed) |
| 알림 클릭률 (CTR) | 15%+ | clicked / sent |
| 평균 기기 수/사용자 | 1.5 | devices / users |
| iOS 설치 완료율 | 40%+ | iOS PWA installs / iOS users |
| 일일 알림 참여율 | 20%+ | daily clicks / daily users |

### 비즈니스 임팩트

- **재방문율 증가**: 알림으로 일일 활성 사용자 30% 증가 기대
- **스트릭 유지율 향상**: 스트릭 경고 알림으로 7일+ 스트릭 20% 증가
- **목표 달성률 향상**: 일일 리마인더로 완료율 15% 증가
- **재참여 유도**: 3일 미접속 알림으로 이탈률 10% 감소

---

## 📝 Next Steps

### 구현 시작 전 체크리스트

- [ ] 이 문서 검토 완료
- [ ] 구현 범위 확정 (MVP vs Full)
- [ ] 일정 조율 (3-4일 확보)
- [ ] 팀원과 공유 (필요 시)
- [ ] 개발 환경 준비
  - [ ] Supabase 프로젝트 액세스
  - [ ] 로컬 개발 환경 설정
  - [ ] Chrome, iOS 기기 테스트 준비

### 구현 승인 시

1. Day 1 시작: Database + Service Worker
2. 매일 진행상황 체크포인트
3. Day 3 종료 시 기본 기능 작동
4. Day 4: 테스트 + 문서화

### 추후 개선 아이디어

- Rich Notifications (이미지, 액션 버튼)
- Notification Grouping (같은 타입 묶기)
- In-app Notification Center
- Push Notification A/B Testing
- Smart Timing (사용자별 최적 시간 학습)

---

**문서 작성일**: 2025-11-08
**예상 구현 기간**: 3-4일 (28-32시간)
**구현 우선순위**: 추후 확정

