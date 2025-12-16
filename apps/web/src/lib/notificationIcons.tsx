/* eslint-disable react-refresh/only-export-components */
import { CheckCircle2, XCircle, AlertTriangle, Info, Sparkles } from 'lucide-react'

/**
 * Notification icon components with semantic colors
 * Used in Toast notifications to replace emojis
 */

export type NotificationIconType = 'success' | 'error' | 'warning' | 'info' | 'celebration'

interface NotificationIconProps {
  type: NotificationIconType
  className?: string
}

/**
 * Get notification icon component based on type
 * @param type - The notification type
 * @param className - Optional additional CSS classes
 * @returns React icon component with semantic styling
 */
export function NotificationIcon({ type, className = '' }: NotificationIconProps) {
  const baseClasses = 'h-5 w-5 flex-shrink-0'
  const combinedClasses = `${baseClasses} ${className}`.trim()

  switch (type) {
    case 'success':
      return <CheckCircle2 className={`${combinedClasses} text-green-500`} aria-label="성공" />
    case 'error':
      return <XCircle className={`${combinedClasses} text-red-500`} aria-label="오류" />
    case 'warning':
      return <AlertTriangle className={`${combinedClasses} text-yellow-500`} aria-label="경고" />
    case 'info':
      return <Info className={`${combinedClasses} text-blue-500`} aria-label="정보" />
    case 'celebration':
      return <Sparkles className={`${combinedClasses} text-purple-500`} aria-label="축하" />
    default:
      return null
  }
}

/**
 * Utility function to get icon type from variant
 * @param variant - Toast variant ('default' or 'destructive')
 * @returns Corresponding icon type
 */
export function getIconTypeFromVariant(variant?: 'default' | 'destructive'): NotificationIconType {
  return variant === 'destructive' ? 'error' : 'success'
}
