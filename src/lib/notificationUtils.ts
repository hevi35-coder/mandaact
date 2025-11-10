/**
 * Notification utility functions for consistent toast usage
 *
 * These helpers ensure all notifications follow the same pattern
 * and make it easy to maintain consistency across the app.
 */

import { toast } from '@/hooks/use-toast'
import type { NotificationMessage } from './notificationMessages'

/**
 * Show a success notification
 */
export function showSuccess(message: NotificationMessage) {
  return toast({
    title: message.title,
    description: message.description,
    variant: message.variant || 'default',
    duration: message.duration || 3000,
  })
}

/**
 * Show an error notification
 */
export function showError(message: NotificationMessage) {
  return toast({
    title: message.title,
    description: message.description,
    variant: message.variant || 'destructive',
    duration: message.duration || 5000,
  })
}

/**
 * Show a warning notification
 */
export function showWarning(message: NotificationMessage) {
  return toast({
    title: message.title,
    description: message.description,
    variant: message.variant || 'destructive',
    duration: message.duration || 3000,
  })
}

/**
 * Show an info notification
 */
export function showInfo(message: NotificationMessage) {
  return toast({
    title: message.title,
    description: message.description,
    variant: message.variant || 'default',
    duration: message.duration || 3000,
  })
}

/**
 * Show a celebration/achievement notification
 */
export function showCelebration(message: NotificationMessage) {
  return toast({
    title: message.title,
    description: message.description,
    variant: message.variant || 'default',
    duration: message.duration || 5000,
  })
}

/**
 * Generic notification function
 * Use this when you need custom control over all parameters
 */
export function showNotification(message: NotificationMessage) {
  return toast({
    title: message.title,
    description: message.description,
    variant: message.variant,
    duration: message.duration,
  })
}
