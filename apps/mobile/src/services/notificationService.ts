import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { logger } from '../lib/logger'
import { supabase } from '../lib/supabase'

const NOTIFICATION_TOKEN_KEY = '@mandaact/push_token'
const NOTIFICATION_ENABLED_KEY = '@mandaact/notifications_enabled'

/**
 * Get device name for push token identification
 */
function getDeviceName(): string {
  const brand = Device.brand || 'Unknown'
  const modelName = Device.modelName || 'Device'
  return `${brand} ${modelName}`
}

/**
 * Configure notification behavior
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

/**
 * Request notification permissions and get push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null

  // Check if physical device
  if (!Device.isDevice) {
    logger.info('Push notifications require a physical device')
    return null
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    logger.info('Failed to get push token for push notification')
    return null
  }

  // Get Expo push token
  try {
    const pushToken = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    })
    token = pushToken.data

    // Store token locally
    await AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, token)

    // Also save to database for server-side push notifications
    await savePushTokenToDatabase(token)
  } catch (error) {
    logger.error('Error getting push token', error)
  }

  // Configure Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
    })

    await Notifications.setNotificationChannelAsync('reminders', {
      name: '실천 리마인더',
      description: '오늘의 실천을 완료하도록 알려드립니다.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563eb',
    })
  }

  return token
}

/**
 * Get stored push token
 */
export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(NOTIFICATION_TOKEN_KEY)
  } catch {
    return null
  }
}

/**
 * Check if notifications are enabled
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(NOTIFICATION_ENABLED_KEY)
    return value === 'true'
  } catch {
    return false
  }
}

/**
 * Set notification enabled state
 */
export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, enabled ? 'true' : 'false')

  if (enabled) {
    await registerForPushNotificationsAsync()
  } else {
    // Cancel all scheduled notifications when disabled
    await cancelAllScheduledNotifications()
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
  } catch (error) {
    logger.error('Error canceling all notifications', error)
  }
}

/**
 * Send an immediate local notification
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<string | null> {
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data,
      },
      trigger: null, // Immediate
    })
    return identifier
  } catch (error) {
    logger.error('Error sending local notification', error)
    return null
  }
}

/**
 * Add notification response listener
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback)
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback)
}

/**
 * Save push token to Supabase database for server-side notifications
 * Uses upsert to handle token updates
 */
async function savePushTokenToDatabase(token: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      logger.info('No authenticated user, skipping push token save')
      return
    }

    const platform = Platform.OS as 'ios' | 'android' | 'web'
    const deviceName = getDeviceName()

    // Upsert the token - update if exists, insert if not
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: user.id,
          token,
          platform,
          device_name: deviceName,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,token',
        }
      )

    if (error) {
      logger.error('Error saving push token to database', error)
      return
    }

    logger.info('Push token saved to database successfully')
  } catch (error) {
    logger.error('Error in savePushTokenToDatabase', error)
  }
}

/**
 * Deactivate push token when user logs out or disables notifications
 */
export async function deactivatePushToken(): Promise<void> {
  try {
    const token = await getStoredPushToken()
    if (!token) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('push_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('token', token)

    if (error) {
      logger.error('Error deactivating push token', error)
    }
  } catch (error) {
    logger.error('Error in deactivatePushToken', error)
  }
}

/**
 * Refresh push token - call this on app launch to ensure token is up to date
 */
export async function refreshPushToken(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return null
    }

    // Check if notifications are enabled
    const enabled = await areNotificationsEnabled()
    if (!enabled) {
      return null
    }

    // Re-register to get latest token
    return await registerForPushNotificationsAsync()
  } catch (error) {
    logger.error('Error refreshing push token', error)
    return null
  }
}
