import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
  corsHeaders,
} from '../_shared/errorResponse.ts'

/**
 * Comeback Notification
 *
 * Sends push notifications to users who haven't practiced in:
 * - 3 days (comeback_3d)
 * - 7 days (comeback_7d)
 * - 14 days (comeback_14d)
 *
 * Called by pg_cron at 19:00 KST daily
 */

interface UserForComeback {
  user_id: string
  nickname: string
  email: string
  push_token: string
  last_check_date: string
  days_since_last_check: number
  user_timezone: string
  user_language: string
}

const COMEBACK_DAYS = [3, 7, 14] as const

// Localized messages for comeback notification
const COMEBACK_MESSAGES = {
  ko: {
    3: (nickname: string) => ({
      title: `${nickname}님, 다시 시작해볼까요? 💪`,
      body: '오늘 1개만 실천해보세요.',
    }),
    7: (nickname: string) => ({
      title: `${nickname}님, 목표가 기다리고 있어요 🎯`,
      body: '언제든 다시 시작할 수 있어요.',
    }),
    14: (nickname: string) => ({
      title: `${nickname}님, 새로운 목표를 세워볼까요? ✨`,
      body: '만다라트를 수정하거나 새 목표를 만들어보세요.',
    }),
    default: (nickname: string) => ({
      title: `${nickname}님, 다시 시작해볼까요?`,
      body: '목표가 기다리고 있어요.',
    }),
  },
  en: {
    3: (nickname: string) => ({
      title: `${nickname}, ready to start again? 💪`,
      body: 'Try completing just 1 action today.',
    }),
    7: (nickname: string) => ({
      title: `${nickname}, your goals are waiting 🎯`,
      body: 'You can always start again.',
    }),
    14: (nickname: string) => ({
      title: `${nickname}, set a new goal? ✨`,
      body: 'Update your mandalart or create new goals.',
    }),
    default: (nickname: string) => ({
      title: `${nickname}, ready to start again?`,
      body: 'Your goals are waiting.',
    }),
  },
} as const

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('authorization')
    const cronSecret = Deno.env.get('CRON_SECRET')
    const isServiceRole = authHeader?.includes('service_role')
    const hasCronSecret = req.headers.get('x-cron-secret') === cronSecret

    if (!isServiceRole && !hasCronSecret && cronSecret) {
      console.warn('Unauthorized comeback-notification call attempt')
      return createErrorResponse(ErrorCodes.FORBIDDEN, 'Unauthorized access')
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    console.log('Starting comeback notification...')

    let totalNotificationsSent = 0
    const allErrors: Array<{ user_id: string; days: number; error: string }> = []
    const results: Record<number, { users: number; sent: number }> = {}

    // Process each comeback day (3, 7, 14)
    for (const days of COMEBACK_DAYS) {
      console.log(`Processing comeback_${days}d...`)

      // Get users who need comeback notification
      const { data: users, error: usersError } = await supabaseAdmin
        .rpc('get_users_for_comeback_notification', { days_inactive: days })

      if (usersError) {
        console.error(`Error getting users for ${days}d:`, usersError)
        continue
      }

      results[days] = { users: users?.length || 0, sent: 0 }

      if (!users || users.length === 0) {
        console.log(`No users need comeback_${days}d notification`)
        continue
      }

      console.log(`Found ${users.length} users for comeback_${days}d`)

      // Process each user
      for (const user of users as UserForComeback[]) {
        try {
          // Get personalized message based on language
          const { title, body } = getComebackMessage(user.nickname, days, user.user_language)

          // Send push notification
          const sent = await sendPushNotification(user.push_token, title, body, {
            type: `comeback_${days}d`,
            days_inactive: days,
          })

          if (sent) {
            // Record notification sent
            await supabaseAdmin.rpc('record_notification_sent', {
              p_user_id: user.user_id,
              p_notification_type: `comeback_${days}d`,
              p_metadata: { days_inactive: days, last_check_date: user.last_check_date },
            })

            results[days].sent++
            totalNotificationsSent++
            console.log(`Comeback_${days}d sent to user: ${user.user_id}`)
          }
        } catch (userError) {
          console.error(`Error processing user ${user.user_id}:`, userError)
          allErrors.push({
            user_id: user.user_id,
            days,
            error: userError instanceof Error ? userError.message : 'Unknown error',
          })
        }
      }
    }

    const result = {
      message: 'Comeback notification completed',
      results,
      total_notifications_sent: totalNotificationsSent,
      errors_count: allErrors.length,
      errors: allErrors.length > 0 ? allErrors : undefined,
    }

    console.log('Comeback notification result:', result)
    return createSuccessResponse(result)
  } catch (error) {
    console.error('Comeback notification error:', error)
    return createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to send comeback notifications',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
})

/**
 * Get personalized comeback message based on days inactive and language
 */
function getComebackMessage(
  nickname: string,
  days: number,
  language: string
): { title: string; body: string } {
  const lang = language === 'en' ? 'en' : 'ko'
  const messages = COMEBACK_MESSAGES[lang]

  const messageKey = days as 3 | 7 | 14
  const getMessage = messages[messageKey] || messages.default

  return getMessage(nickname)
}

/**
 * Send push notification via Expo Push API
 */
async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<boolean> {
  // Validate Expo push token format
  if (!expoPushToken.startsWith('ExponentPushToken[') && !expoPushToken.startsWith('ExpoPushToken[')) {
    console.warn('Invalid Expo push token format:', expoPushToken)
    return false
  }

  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data: data || {},
    priority: 'high',
  }

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Expo push error:', response.status, errorText)
    return false
  }

  const result = await response.json()
  if (result.data?.status === 'error') {
    console.error('Expo push error:', result.data.message)
    return false
  }

  return true
}
