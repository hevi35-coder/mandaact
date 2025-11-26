import React from 'react'
import { View, Text } from 'react-native'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  className?: string
}

const variantStyles = {
  default: {
    container: 'bg-gray-100',
    text: 'text-gray-700',
  },
  success: {
    container: 'bg-green-100',
    text: 'text-green-700',
  },
  warning: {
    container: 'bg-amber-100',
    text: 'text-amber-700',
  },
  error: {
    container: 'bg-red-100',
    text: 'text-red-700',
  },
  info: {
    container: 'bg-blue-100',
    text: 'text-blue-700',
  },
  outline: {
    container: 'bg-white border border-gray-300',
    text: 'text-gray-700',
  },
}

const sizeStyles = {
  sm: {
    container: 'px-2 py-0.5',
    text: 'text-xs',
  },
  md: {
    container: 'px-2.5 py-1',
    text: 'text-sm',
  },
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}: BadgeProps) {
  const variantStyle = variantStyles[variant]
  const sizeStyle = sizeStyles[size]

  return (
    <View
      className={`rounded-full ${variantStyle.container} ${sizeStyle.container} ${className}`}
    >
      {typeof children === 'string' ? (
        <Text className={`font-medium ${variantStyle.text} ${sizeStyle.text}`}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  )
}

export default Badge
