/**
 * Notification utility functions for consistent toast usage
 *
 * These helpers ensure all notifications follow the same pattern
 * and make it easy to maintain consistency across the app.
 */

import { toast } from '@/hooks/use-toast'
import type { NotificationMessage } from './notificationMessages'
import { NotificationIcon } from './notificationIcons'

/**
 * Show a success notification
 */
export function showSuccess(message: NotificationMessage) {
  return toast({
    title: message.title,
    description: message.description,
    variant: message.variant || 'default',
    duration: message.duration || 3000,
    icon: <NotificationIcon type="success" />,
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
    icon: <NotificationIcon type="error" />,
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
    icon: <NotificationIcon type="warning" />,
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
    icon: <NotificationIcon type="info" />,
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
    icon: <NotificationIcon type="celebration" />,
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
