import React from 'react'
import { View, Text, Pressable } from 'react-native'
import {
  Inbox,
  FileText,
  Target,
  Calendar,
  Award,
  WifiOff,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  variant?: 'default' | 'compact'
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default',
}: EmptyStateProps) {
  const isCompact = variant === 'compact'

  return (
    <View className={`items-center ${isCompact ? 'py-6' : 'py-12'}`}>
      <View
        className={`bg-gray-100 rounded-full items-center justify-center ${
          isCompact ? 'w-12 h-12 mb-3' : 'w-16 h-16 mb-4'
        }`}
      >
        <Icon size={isCompact ? 24 : 32} color="#9ca3af" />
      </View>
      <Text
        className={`font-semibold text-gray-900 text-center ${
          isCompact ? 'text-sm' : 'text-lg'
        }`}
      >
        {title}
      </Text>
      {description && (
        <Text
          className={`text-gray-500 text-center mt-1 ${isCompact ? 'text-xs' : 'text-sm'}`}
        >
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Pressable
          className={`bg-primary rounded-lg mt-4 ${isCompact ? 'px-4 py-2' : 'px-6 py-3'}`}
          onPress={onAction}
        >
          <Text className={`text-white font-medium ${isCompact ? 'text-sm' : ''}`}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

// Preset empty states
export function EmptyMandalarts({ onAction }: { onAction?: () => void }) {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={Target}
      title={t('emptyState.mandalart.title')}
      description={t('emptyState.mandalart.description')}
      actionLabel={t('emptyState.mandalart.action')}
      onAction={onAction}
    />
  )
}

export function EmptyTodayActions() {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={Calendar}
      title={t('emptyState.todayActions.title')}
      description={t('emptyState.todayActions.description')}
    />
  )
}

export function EmptyReports() {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={FileText}
      title={t('emptyState.reports.title')}
      description={t('emptyState.reports.description')}
    />
  )
}

export function EmptyBadges() {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={Award}
      title={t('emptyState.badges.title')}
      description={t('emptyState.badges.description')}
    />
  )
}

// Network error state
export function NetworkErrorState({
  onRetry,
  message,
}: {
  onRetry?: () => void
  message?: string
}) {
  const { t } = useTranslation()
  return (
    <View className="items-center py-12">
      <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
        <WifiOff size={32} color="#ef4444" />
      </View>
      <Text className="text-lg font-semibold text-gray-900 text-center">
        {t('emptyState.network.title')}
      </Text>
      <Text className="text-sm text-gray-500 text-center mt-1">
        {message || t('emptyState.network.description')}
      </Text>
      {onRetry && (
        <Pressable
          className="bg-gray-100 rounded-lg px-6 py-3 mt-4 flex-row items-center"
          onPress={onRetry}
        >
          <RefreshCw size={18} color="#374151" />
          <Text className="text-gray-700 font-medium ml-2">{t('common.retry')}</Text>
        </Pressable>
      )}
    </View>
  )
}

// Generic error state
export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  return (
    <View className="items-center py-12">
      <View className="w-16 h-16 bg-amber-100 rounded-full items-center justify-center mb-4">
        <Target size={32} color="#f59e0b" />
      </View>
      <Text className="text-lg font-semibold text-gray-900 text-center">
        {title || t('emptyState.error.title')}
      </Text>
      {message && (
        <Text className="text-sm text-gray-500 text-center mt-1">{message}</Text>
      )}
      {onRetry && (
        <Pressable
          className="bg-primary rounded-lg px-6 py-3 mt-4 flex-row items-center"
          onPress={onRetry}
        >
          <RefreshCw size={18} color="white" />
          <Text className="text-white font-medium ml-2">{t('common.retry')}</Text>
        </Pressable>
      )}
    </View>
  )
}
