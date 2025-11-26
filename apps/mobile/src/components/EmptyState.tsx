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
          className={`bg-primary rounded-xl mt-4 ${isCompact ? 'px-4 py-2' : 'px-6 py-3'}`}
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
  return (
    <EmptyState
      icon={Target}
      title="만다라트가 없습니다"
      description="첫 번째 만다라트를 만들어보세요"
      actionLabel="만다라트 만들기"
      onAction={onAction}
    />
  )
}

export function EmptyTodayActions() {
  return (
    <EmptyState
      icon={Calendar}
      title="오늘의 실천이 없습니다"
      description="활성화된 만다라트의 실천 항목이 표시됩니다"
    />
  )
}

export function EmptyReports() {
  return (
    <EmptyState
      icon={FileText}
      title="리포트가 없습니다"
      description="첫 번째 주간 리포트를 생성해보세요"
    />
  )
}

export function EmptyBadges() {
  return (
    <EmptyState
      icon={Award}
      title="획득한 뱃지가 없습니다"
      description="실천을 시작하면 뱃지를 획득할 수 있습니다"
    />
  )
}

// Network error state
export function NetworkErrorState({
  onRetry,
  message = '네트워크 연결을 확인해주세요',
}: {
  onRetry?: () => void
  message?: string
}) {
  return (
    <View className="items-center py-12">
      <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
        <WifiOff size={32} color="#ef4444" />
      </View>
      <Text className="text-lg font-semibold text-gray-900 text-center">
        연결 오류
      </Text>
      <Text className="text-sm text-gray-500 text-center mt-1">{message}</Text>
      {onRetry && (
        <Pressable
          className="bg-gray-100 rounded-xl px-6 py-3 mt-4 flex-row items-center"
          onPress={onRetry}
        >
          <RefreshCw size={18} color="#374151" />
          <Text className="text-gray-700 font-medium ml-2">다시 시도</Text>
        </Pressable>
      )}
    </View>
  )
}

// Generic error state
export function ErrorState({
  title = '오류가 발생했습니다',
  message,
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <View className="items-center py-12">
      <View className="w-16 h-16 bg-amber-100 rounded-full items-center justify-center mb-4">
        <Target size={32} color="#f59e0b" />
      </View>
      <Text className="text-lg font-semibold text-gray-900 text-center">{title}</Text>
      {message && (
        <Text className="text-sm text-gray-500 text-center mt-1">{message}</Text>
      )}
      {onRetry && (
        <Pressable
          className="bg-primary rounded-xl px-6 py-3 mt-4 flex-row items-center"
          onPress={onRetry}
        >
          <RefreshCw size={18} color="white" />
          <Text className="text-white font-medium ml-2">다시 시도</Text>
        </Pressable>
      )}
    </View>
  )
}
