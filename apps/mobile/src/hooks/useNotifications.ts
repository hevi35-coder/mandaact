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

const REMINDER_TIME_KEY = '@mandaact/reminder_time'

interface ReminderTime {
  hour: number
  minute: number
}

interface NotificationState {
  isEnabled: boolean
  permissionStatus: Notifications.PermissionStatus | null
  reminderTime: ReminderTime
  isLoading: boolean
}

const DEFAULT_REMINDER_TIME: ReminderTime = { hour: 20, minute: 0 }

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    isEnabled: false,
    permissionStatus: null,
    reminderTime: DEFAULT_REMINDER_TIME,
    isLoading: true,
  })

  // Load initial state
  useEffect(() => {
    async function loadState() {
      try {
        const [enabled, permissions, storedTime] = await Promise.all([
          areNotificationsEnabled(),
          Notifications.getPermissionsAsync(),
          AsyncStorage.getItem(REMINDER_TIME_KEY),
        ])

        const reminderTime = storedTime
          ? JSON.parse(storedTime)
          : DEFAULT_REMINDER_TIME

        setState({
          isEnabled: enabled && permissions.status === 'granted',
          permissionStatus: permissions.status,
          reminderTime,
          isLoading: false,
        })
      } catch (error) {
        console.error('Error loading notification state:', error)
        setState((prev) => ({ ...prev, isLoading: false }))
      }
    }

    loadState()
  }, [])

  // Enable/disable notifications
  const toggleNotifications = useCallback(async (enabled: boolean) => {
    setState((prev) => ({ ...prev, isLoading: true }))

    try {
      if (enabled) {
        // Request permissions
        const token = await registerForPushNotificationsAsync()

        if (!token) {
          // Permission denied
          const permissions = await Notifications.getPermissionsAsync()
          setState((prev) => ({
            ...prev,
            isEnabled: false,
            permissionStatus: permissions.status,
            isLoading: false,
          }))
          return false
        }

        // Schedule daily reminder
        const { hour, minute } = state.reminderTime
        await scheduleDailyReminder(hour, minute)
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
      console.error('Error toggling notifications:', error)
      setState((prev) => ({ ...prev, isLoading: false }))
      return false
    }
  }, [state.reminderTime])

  // Update reminder time
  const updateReminderTime = useCallback(async (hour: number, minute: number) => {
    setState((prev) => ({ ...prev, isLoading: true }))

    try {
      const newTime = { hour, minute }
      await AsyncStorage.setItem(REMINDER_TIME_KEY, JSON.stringify(newTime))

      // Reschedule if notifications are enabled
      if (state.isEnabled) {
        await scheduleDailyReminder(hour, minute)
      }

      setState((prev) => ({
        ...prev,
        reminderTime: newTime,
        isLoading: false,
      }))
      return true
    } catch (error) {
      console.error('Error updating reminder time:', error)
      setState((prev) => ({ ...prev, isLoading: false }))
      return false
    }
  }, [state.isEnabled])

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
    isLoading: state.isLoading,
    permissionStatus: state.permissionStatus,
    reminderTime: state.reminderTime,
    isPermissionDenied,
    toggleNotifications,
    updateReminderTime,
    getScheduled,
    formatReminderTime,
  }
}
