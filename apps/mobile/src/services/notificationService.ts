import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { logger } from '../lib/logger'

const NOTIFICATION_TOKEN_KEY = '@mandaact/push_token'
const NOTIFICATION_ENABLED_KEY = '@mandaact/notifications_enabled'

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
  } catch (error) {
    logger.error('Error getting push token', error)
  }

  // Configure Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#667eea',
    })

    await Notifications.setNotificationChannelAsync('reminders', {
      name: '실천 리마인더',
      description: '오늘의 실천을 완료하도록 알려드립니다.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#667eea',
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
 * Schedule a daily reminder notification
 */
export async function scheduleDailyReminder(
  hour: number = 20,
  minute: number = 0
): Promise<string | null> {
  try {
    // Cancel existing reminder
    await cancelScheduledNotification('daily-reminder')

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '오늘의 실천을 완료하세요! 💪',
        body: '아직 완료하지 않은 실천이 있어요. 지금 확인해보세요!',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
      identifier: 'daily-reminder',
    })

    return identifier
  } catch (error) {
    logger.error('Error scheduling daily reminder', error)
    return null
  }
}

/**
 * Cancel a specific scheduled notification
 */
export async function cancelScheduledNotification(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier)
  } catch (error) {
    logger.error('Error canceling notification', error)
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
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync()
  } catch (error) {
    logger.error('Error getting scheduled notifications', error)
    return []
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
