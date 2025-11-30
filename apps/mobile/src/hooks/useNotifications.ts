import { useState, useEffect, useCallback } from 'react'
import * as Notifications from 'expo-notifications'
import { useTranslation } from 'react-i18next'
import {
  registerForPushNotificationsAsync,
  areNotificationsEnabled,
  setNotificationsEnabled,
} from '../services/notificationService'
import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'

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

/**
 * Hook for managing notification settings
 * Settings are stored in Supabase `notification_settings` table
 * Daily reminders are sent via server push (pg_cron), not local notifications
 */
export function useNotifications() {
  const { i18n } = useTranslation()
  const [state, setState] = useState<NotificationState>({
    isEnabled: false,
    reminderEnabled: true,
    customMessageEnabled: true,
    permissionStatus: null,
    reminderTime: DEFAULT_REMINDER_TIME,
    isLoading: true,
  })

  // Load initial state from DB and local storage
  useEffect(() => {
    async function loadState() {
      try {
        const [enabled, permissions] = await Promise.all([
          areNotificationsEnabled(),
          Notifications.getPermissionsAsync(),
        ])

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setState((prev) => ({
            ...prev,
            isEnabled: false,
            permissionStatus: permissions.status,
            isLoading: false,
          }))
          return
        }

        // Load settings from DB
        const { data: settings } = await supabase
          .from('notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (settings) {
          setState({
            isEnabled: enabled && permissions.status === 'granted',
            reminderEnabled: settings.reminder_enabled,
            customMessageEnabled: settings.custom_message_enabled,
            permissionStatus: permissions.status,
            reminderTime: {
              hour: settings.reminder_hour,
              minute: settings.reminder_minute,
            },
            isLoading: false,
          })
        } else {
          // No settings yet, create default
          const { error } = await supabase
            .from('notification_settings')
            .insert({
              user_id: user.id,
              reminder_enabled: true,
              reminder_hour: DEFAULT_REMINDER_TIME.hour,
              reminder_minute: DEFAULT_REMINDER_TIME.minute,
              custom_message_enabled: true,
            })

          if (error) {
            logger.error('Error creating default notification settings', error)
          }

          setState({
            isEnabled: enabled && permissions.status === 'granted',
            reminderEnabled: true,
            customMessageEnabled: true,
            permissionStatus: permissions.status,
            reminderTime: DEFAULT_REMINDER_TIME,
            isLoading: false,
          })
        }
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
        // Request permissions and get push token
        const token = await registerForPushNotificationsAsync()

        if (!token) {
          const permissions = await Notifications.getPermissionsAsync()
          logger.info('Push token not available (Expo Go limitation), enabling UI state only')

          await setNotificationsEnabled(true)
          setState((prev) => ({
            ...prev,
            isEnabled: true,
            permissionStatus: permissions.status,
            isLoading: false,
          }))
          return true
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
  }, [])

  // Toggle reminder notifications (saves to DB)
  const toggleReminder = useCallback(async (enabled: boolean) => {
    setState((prev) => ({ ...prev, isLoading: true }))

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setState((prev) => ({ ...prev, isLoading: false }))
        return false
      }

      // Update DB
      const { error } = await supabase
        .from('notification_settings')
        .update({ reminder_enabled: enabled })
        .eq('user_id', user.id)

      if (error) {
        logger.error('Error updating reminder setting', error)
        setState((prev) => ({ ...prev, isLoading: false }))
        return false
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
  }, [])

  // Toggle custom message notifications (saves to DB)
  const toggleCustomMessage = useCallback(async (enabled: boolean) => {
    setState((prev) => ({ ...prev, isLoading: true }))

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setState((prev) => ({ ...prev, isLoading: false }))
        return false
      }

      // Update DB
      const { error } = await supabase
        .from('notification_settings')
        .update({ custom_message_enabled: enabled })
        .eq('user_id', user.id)

      if (error) {
        logger.error('Error updating custom message setting', error)
        setState((prev) => ({ ...prev, isLoading: false }))
        return false
      }

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

  // Update reminder time (saves to DB - server will use this for scheduling)
  const updateReminderTime = useCallback(async (hour: number, minute: number) => {
    setState((prev) => ({ ...prev, isLoading: true }))

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setState((prev) => ({ ...prev, isLoading: false }))
        return false
      }

      // Update DB
      const { error } = await supabase
        .from('notification_settings')
        .update({
          reminder_hour: hour,
          reminder_minute: minute,
        })
        .eq('user_id', user.id)

      if (error) {
        logger.error('Error updating reminder time', error)
        setState((prev) => ({ ...prev, isLoading: false }))
        return false
      }

      setState((prev) => ({
        ...prev,
        reminderTime: { hour, minute },
        isLoading: false,
      }))

      logger.info('Reminder time updated', { hour, minute })
      return true
    } catch (error) {
      logger.error('Error updating reminder time', error)
      setState((prev) => ({ ...prev, isLoading: false }))
      return false
    }
  }, [])

  // Check if permission was denied
  const isPermissionDenied = state.permissionStatus === 'denied'

  // Format time for display with locale support
  const formatReminderTime = useCallback(() => {
    const { hour, minute } = state.reminderTime
    const displayMinute = minute.toString().padStart(2, '0')
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour

    if (i18n.language === 'en') {
      const period = hour >= 12 ? 'PM' : 'AM'
      return `${displayHour}:${displayMinute} ${period}`
    }

    // Korean format (default)
    const period = hour >= 12 ? '오후' : '오전'
    return `${period} ${displayHour}:${displayMinute}`
  }, [state.reminderTime, i18n.language])

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
    formatReminderTime,
  }
}
