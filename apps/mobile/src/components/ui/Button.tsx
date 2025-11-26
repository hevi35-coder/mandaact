import React from 'react'
import { Pressable, Text, View, ActivityIndicator } from 'react-native'

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'secondary'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  children: React.ReactNode
  onPress?: () => void
  disabled?: boolean
  loading?: boolean
  icon?: React.ReactNode
  className?: string
}

const variantStyles = {
  default: {
    container: 'bg-gray-900',
    text: 'text-white font-semibold',
  },
  outline: {
    container: 'bg-white border border-gray-300',
    text: 'text-gray-900 font-semibold',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-gray-600',
  },
  secondary: {
    container: 'bg-gray-100',
    text: 'text-gray-900 font-semibold',
  },
}

const sizeStyles = {
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'px-6 py-4',
}

export function Button({
  variant = 'default',
  size = 'md',
  children,
  onPress,
  disabled = false,
  loading = false,
  icon,
  className = '',
}: ButtonProps) {
  const variantStyle = variantStyles[variant]
  const sizeStyle = sizeStyles[size]

  return (
    <Pressable
      className={`rounded-lg items-center justify-center flex-row ${variantStyle.container} ${sizeStyle} ${disabled || loading ? 'opacity-50' : ''} ${className}`}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'default' ? '#ffffff' : '#374151'}
        />
      ) : (
        <>
          {icon && <View className="mr-2">{icon}</View>}
          {typeof children === 'string' ? (
            <Text className={variantStyle.text}>{children}</Text>
          ) : (
            children
          )}
        </>
      )}
    </Pressable>
  )
}

export default Button
