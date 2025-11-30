import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  withErrorHandler,
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
  extractJWT,
  parseRequestBody,
} from '../_shared/errorResponse.ts'

/**
 * Send Push Notification Edge Function
 *
 * Sends push notifications via Expo Push API.
 * Can be called:
 * 1. By service role (for scheduled notifications)
 * 2. By authenticated users (for testing their own notifications)
 */

interface PushNotificationRequest {
  // For single notification
  user_id?: string
  push_token?: string
  title: string
  body: string
  data?: Record<string, unknown>

  // For batch notifications
  batch?: Array<{
    push_token: string
    title: string
    body: string
    data?: Record<string, unknown>
  }>
}

interface ExpoPushMessage {
  to: string
  sound?: string
  title: string
  body: string
  data?: Record<string, unknown>
  priority?: 'default' | 'normal' | 'high'
  badge?: number
  channelId?: string
}

interface ExpoPushTicket {
  id?: string
  status: 'ok' | 'error'
  message?: string
  details?: {
    error?: string
    fault?: string
  }
}

serve(withErrorHandler('send-push-notification', async (req) => {
  // Parse request
  const body = await parseRequestBody<PushNotificationRequest>(req)

  // Check authorization
  const authHeader = req.headers.get('authorization')
  const isServiceRole = authHeader?.includes('service_role')

  // Create Supabase client based on auth type
  let supabaseClient
  let userId: string | undefined

  if (isServiceRole) {
    // Service role can send to any user
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
    userId = body.user_id
  } else {
    // Regular user can only send to themselves (for testing)
    const jwt = extractJWT(req)
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: `Bearer ${jwt}` },
        },
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt)
    if (userError || !user) {
      return createErrorResponse(
        ErrorCodes.UNAUTHORIZED,
        'Invalid user token'
      )
    }
    userId = user.id
  }

  // Handle batch notifications
  if (body.batch && body.batch.length > 0) {
    const messages: ExpoPushMessage[] = body.batch.map(notification => ({
      to: notification.push_token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      priority: 'high',
    }))

    const result = await sendExpoPushNotifications(messages)
    return createSuccessResponse(result)
  }

  // Handle single notification
  let pushToken = body.push_token

  // If no token provided, look up user's token
  if (!pushToken && userId) {
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (tokenError || !tokenData) {
      return createErrorResponse(
        ErrorCodes.NOT_FOUND,
        'No active push token found for user'
      )
    }
    pushToken = tokenData.token
  }

  if (!pushToken) {
    return createErrorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'push_token or user_id is required'
    )
  }

  // Validate required fields
  if (!body.title || !body.body) {
    return createErrorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'title and body are required'
    )
  }

  // Send notification
  const message: ExpoPushMessage = {
    to: pushToken,
    sound: 'default',
    title: body.title,
    body: body.body,
    data: body.data || {},
    priority: 'high',
  }

  const result = await sendExpoPushNotifications([message])
  return createSuccessResponse(result)
}))

/**
 * Send notifications via Expo Push API
 * Handles batching for large numbers of notifications
 */
async function sendExpoPushNotifications(
  messages: ExpoPushMessage[]
): Promise<{
  total: number
  sent: number
  failed: number
  tickets: ExpoPushTicket[]
}> {
  // Validate tokens
  const validMessages = messages.filter(msg => {
    if (!msg.to.startsWith('ExponentPushToken[') && !msg.to.startsWith('ExpoPushToken[')) {
      console.warn('Invalid Expo push token format:', msg.to)
      return false
    }
    return true
  })

  if (validMessages.length === 0) {
    return {
      total: messages.length,
      sent: 0,
      failed: messages.length,
      tickets: [],
    }
  }

  // Expo Push API accepts max 100 messages per request
  const BATCH_SIZE = 100
  const allTickets: ExpoPushTicket[] = []

  for (let i = 0; i < validMessages.length; i += BATCH_SIZE) {
    const batch = validMessages.slice(i, i + BATCH_SIZE)

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Expo push API error:', response.status, errorText)

        // Add error tickets for this batch
        batch.forEach(() => {
          allTickets.push({
            status: 'error',
            message: `HTTP ${response.status}: ${errorText}`,
          })
        })
        continue
      }

      const result = await response.json()

      // Handle response format
      if (result.data) {
        // Batch response
        if (Array.isArray(result.data)) {
          allTickets.push(...result.data)
        } else {
          // Single response
          allTickets.push(result.data)
        }
      }
    } catch (error) {
      console.error('Expo push fetch error:', error)
      batch.forEach(() => {
        allTickets.push({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      })
    }
  }

  // Count results
  const sent = allTickets.filter(t => t.status === 'ok').length
  const failed = allTickets.filter(t => t.status === 'error').length

  // Log any errors for debugging
  allTickets
    .filter(t => t.status === 'error')
    .forEach((ticket, idx) => {
      console.error(`Push notification ${idx} failed:`, ticket.message, ticket.details)
    })

  return {
    total: messages.length,
    sent,
    failed,
    tickets: allTickets,
  }
}
