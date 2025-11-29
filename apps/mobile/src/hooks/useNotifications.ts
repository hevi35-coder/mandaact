import { useState, useEffect, useCallback } from 'react'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  registerForPushNotificationsAsync,
  scheduleDailyReminder,
  cancelAllScheduledNotifications,
  areNotificationsEnabled,
  setNotificationsEnabled,
  getScheduledNotifications,
} from '../services/notificationService'
import { logger } from '../lib/logger'

const REMINDER_TIME_KEY = '@mandaact/reminder_time'
const REMINDER_ENABLED_KEY = '@mandaact/reminder_enabled'
const CUSTOM_MESSAGE_ENABLED_KEY = '@mandaact/custom_message_enabled'

interface ReminderTime {
  hour: number
  minute: number
}

interface NotificationState {
  isEnabled: boolean // 전체 푸시 알림 권한
  reminderEnabled: boolean // 실천 리마인더 On/Off
  customMessageEnabled: boolean // 맞춤 메시지 On/Off
  permissionStatus: Notifications.PermissionStatus | null
  reminderTime: ReminderTime
  isLoading: boolean
}

const DEFAULT_REMINDER_TIME: ReminderTime = { hour: 20, minute: 0 }

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    isEnabled: false,
    reminderEnabled: true,
    customMessageEnabled: true,
    permissionStatus: null,
    reminderTime: DEFAULT_REMINDER_TIME,
    isLoading: true,
  })

  // Load initial state
  useEffect(() => {
    async function loadState() {
      try {
        const [enabled, permissions, storedTime, reminderEnabled, customMessageEnabled] = await Promise.all([
          areNotificationsEnabled(),
          Notifications.getPermissionsAsync(),
          AsyncStorage.getItem(REMINDER_TIME_KEY),
          AsyncStorage.getItem(REMINDER_ENABLED_KEY),
          AsyncStorage.getItem(CUSTOM_MESSAGE_ENABLED_KEY),
        ])

        const reminderTime = storedTime
          ? JSON.parse(storedTime)
          : DEFAULT_REMINDER_TIME

        setState({
          isEnabled: enabled && permissions.status === 'granted',
          reminderEnabled: reminderEnabled !== 'false', // default true
          customMessageEnabled: customMessageEnabled !== 'false', // default true
          permissionStatus: permissions.status,
          reminderTime,
          isLoading: false,
        })
      } catch (error) {
        logger.error('Error loading notification state', error)
        setState((prev) => ({ ...prev, isLoading: false }))
      }
    }

    loadState()
  }, [])

  // Enable/disable notifications (master switch)
  const toggleNotifications = useCallback(async (enabled: boolean) => {
    setState((prev) => ({ ...prev, isLoading: true }))

    try {
      if (enabled) {
        // Request permissions (may fail in Expo Go simulator)
        const token = await registerForPushNotificationsAsync()

        // Even if token is null (Expo Go limitation), allow enabling for UI testing
        // In production build, this will work properly
        if (!token) {
          const permissions = await Notifications.getPermissionsAsync()
          logger.info('Push token not available (Expo Go limitation), enabling UI state only')

          // Still enable the UI state for testing
          await setNotificationsEnabled(true)
          setState((prev) => ({
            ...prev,
            isEnabled: true,
            permissionStatus: permissions.status,
            isLoading: false,
          }))
          return true
        }

        // Schedule daily reminder if reminder is enabled
        if (state.reminderEnabled) {
          const { hour, minute } = state.reminderTime
          await scheduleDailyReminder(hour, minute)
        }
        await setNotificationsEnabled(true)

        setState((prev) => ({
          ...prev,
          isEnabled: true,
          permissionStatus: Notifications.PermissionStatus.GRANTED,
          isLoading: false,
        }))
        return true
      } else {
        // Disable notifications
        await cancelAllScheduledNotifications()
        await setNotificationsEnabled(false)

        setState((prev) => ({
          ...prev,
          isEnabled: false,
          isLoading: false,
        }))
        return true
      }
    } catch (error) {
      logger.error('Error toggling notifications', error)
      setState((prev) => ({ ...prev, isLoading: false }))
      return false
    }
  }, [state.reminderTime, state.reminderEnabled])

  // Toggle reminder notifications
  const toggleReminder = useCallback(async (enabled: boolean) => {
    setState((prev) => ({ ...prev, isLoading: true }))

    try {
      await AsyncStorage.setItem(REMINDER_ENABLED_KEY, String(enabled))

      if (state.isEnabled) {
        if (enabled) {
          // Schedule reminder
          const { hour, minute } = state.reminderTime
          await scheduleDailyReminder(hour, minute)
        } else {
          // Cancel scheduled reminders
          await cancelAllScheduledNotifications()
        }
      }

      setState((prev) => ({
        ...prev,
        reminderEnabled: enabled,
        isLoading: false,
      }))
      return true
    } catch (error) {
      logger.error('Error toggling reminder', error)
      setState((prev) => ({ ...prev, isLoading: false }))
      return false
    }
  }, [state.isEnabled, state.reminderTime])

  // Toggle custom message notifications
  const toggleCustomMessage = useCallback(async (enabled: boolean) => {
    setState((prev) => ({ ...prev, isLoading: true }))

    try {
      await AsyncStorage.setItem(CUSTOM_MESSAGE_ENABLED_KEY, String(enabled))

      setState((prev) => ({
        ...prev,
        customMessageEnabled: enabled,
        isLoading: false,
      }))
      return true
    } catch (error) {
      logger.error('Error toggling custom message', error)
      setState((prev) => ({ ...prev, isLoading: false }))
      return false
    }
  }, [])

  // Update reminder time
  const updateReminderTime = useCallback(async (hour: number, minute: number) => {
    setState((prev) => ({ ...prev, isLoading: true }))

    try {
      const newTime = { hour, minute }
      await AsyncStorage.setItem(REMINDER_TIME_KEY, JSON.stringify(newTime))

      // Reschedule if notifications and reminder are enabled
      if (state.isEnabled && state.reminderEnabled) {
        await scheduleDailyReminder(hour, minute)
      }

      setState((prev) => ({
        ...prev,
        reminderTime: newTime,
        isLoading: false,
      }))
      return true
    } catch (error) {
      logger.error('Error updating reminder time', error)
      setState((prev) => ({ ...prev, isLoading: false }))
      return false
    }
  }, [state.isEnabled, state.reminderEnabled])

  // Get scheduled notifications for debugging
  const getScheduled = useCallback(async () => {
    return getScheduledNotifications()
  }, [])

  // Check if permission was denied
  const isPermissionDenied = state.permissionStatus === 'denied'

  // Format time for display
  const formatReminderTime = useCallback(() => {
    const { hour, minute } = state.reminderTime
    const period = hour >= 12 ? '오후' : '오전'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    const displayMinute = minute.toString().padStart(2, '0')
    return `${period} ${displayHour}:${displayMinute}`
  }, [state.reminderTime])

  return {
    isEnabled: state.isEnabled,
    reminderEnabled: state.reminderEnabled,
    customMessageEnabled: state.customMessageEnabled,
    isLoading: state.isLoading,
    permissionStatus: state.permissionStatus,
    reminderTime: state.reminderTime,
    isPermissionDenied,
    toggleNotifications,
    toggleReminder,
    toggleCustomMessage,
    updateReminderTime,
    getScheduled,
    formatReminderTime,
  }
}
