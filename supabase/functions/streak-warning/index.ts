import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
  corsHeaders,
} from '../_shared/errorResponse.ts'

/**
 * Streak Warning Notification
 *
 * Sends push notifications to users who:
 * - Have current streak >= 3 days
 * - Have 0 checks today
 * - Haven't received streak_warning today
 *
 * Called by pg_cron at 21:00 KST daily
 */

interface UserForStreakWarning {
  user_id: string
  nickname: string
  email: string
  push_token: string
  current_streak: number
}

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
      console.warn('Unauthorized streak-warning call attempt')
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

    console.log('Starting streak warning notification...')

    // Get users who need streak warning
    const { data: users, error: usersError } = await supabaseAdmin
      .rpc('get_users_for_streak_warning')

    if (usersError) {
      console.error('Error getting users:', usersError)
      return createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to get users for streak warning',
        { error: usersError }
      )
    }

    if (!users || users.length === 0) {
      console.log('No users need streak warning')
      return createSuccessResponse({
        message: 'No users need streak warning',
        processed: 0,
      })
    }

    console.log(`Found ${users.length} users for streak warning`)

    let notificationsSent = 0
    const errors: Array<{ user_id: string; error: string }> = []

    // Process each user
    for (const user of users as UserForStreakWarning[]) {
      try {
        // Get personalized message based on streak length
        const { title, body } = getStreakWarningMessage(
          user.nickname,
          user.current_streak
        )

        // Send push notification
        const sent = await sendPushNotification(user.push_token, title, body, {
          type: 'streak_warning',
          streak: user.current_streak,
        })

        if (sent) {
          // Record notification sent
          await supabaseAdmin.rpc('record_notification_sent', {
            p_user_id: user.user_id,
            p_notification_type: 'streak_warning',
            p_metadata: { streak: user.current_streak },
          })

          notificationsSent++
          console.log(`Streak warning sent to user: ${user.user_id} (streak: ${user.current_streak})`)
        }
      } catch (userError) {
        console.error(`Error processing user ${user.user_id}:`, userError)
        errors.push({
          user_id: user.user_id,
          error: userError instanceof Error ? userError.message : 'Unknown error',
        })
      }
    }

    const result = {
      message: 'Streak warning notification completed',
      total_users: users.length,
      notifications_sent: notificationsSent,
      errors_count: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    }

    console.log('Streak warning result:', result)
    return createSuccessResponse(result)
  } catch (error) {
    console.error('Streak warning error:', error)
    return createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to send streak warnings',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
})

/**
 * Get personalized streak warning message based on streak length
 */
function getStreakWarningMessage(
  nickname: string,
  streak: number
): { title: string; body: string } {
  if (streak >= 30) {
    return {
      title: `${nickname}님, 🏆 ${streak}일 대기록을 지켜주세요!`,
      body: '한 달 넘게 이어온 스트릭이에요.',
    }
  } else if (streak >= 7) {
    return {
      title: `${nickname}님, ${streak}일 스트릭이 위험해요! 🔥`,
      body: '오늘 놓치면 처음부터예요.',
    }
  } else {
    // streak 3-6
    return {
      title: `${nickname}님, ${streak}일 스트릭을 이어가세요! 🔥`,
      body: '자정 전에 1개만 실천하면 유지돼요.',
    }
  }
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
