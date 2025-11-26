import React from 'react'
import { View, Text } from 'react-native'

type ProgressVariant = 'default' | 'success' | 'warning' | 'error' | 'info'
type ProgressSize = 'sm' | 'md' | 'lg'

interface ProgressProps {
  value: number
  max?: number
  variant?: ProgressVariant
  size?: ProgressSize
  showLabel?: boolean
  label?: string
  className?: string
}

const variantColors = {
  default: 'bg-gray-900',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
}

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
}

export function Progress({
  value,
  max = 100,
  variant = 'default',
  size = 'md',
  showLabel = false,
  label,
  className = '',
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const colorClass = variantColors[variant]
  const sizeClass = sizeStyles[size]

  return (
    <View className={className}>
      {(showLabel || label) && (
        <View className="flex-row justify-between mb-1">
          {label && (
            <Text className="text-sm text-gray-600">{label}</Text>
          )}
          {showLabel && (
            <Text className="text-sm font-medium text-gray-900">
              {Math.round(percentage)}%
            </Text>
          )}
        </View>
      )}
      <View className={`${sizeClass} bg-gray-200 rounded-full overflow-hidden`}>
        <View
          className={`h-full ${colorClass} rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </View>
    </View>
  )
}

export default Progress
