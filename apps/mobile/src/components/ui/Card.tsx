import React from 'react'
import { View, Text } from 'react-native'

interface CardProps {
  children: React.ReactNode
  className?: string
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

interface CardTitleProps {
  children: React.ReactNode
  className?: string
}

interface CardDescriptionProps {
  children: React.ReactNode
  className?: string
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <View
      className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}
    >
      {children}
    </View>
  )
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return <View className={`px-4 pt-4 pb-2 ${className}`}>{children}</View>
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <Text className={`text-base font-semibold text-gray-900 ${className}`}>
      {children}
    </Text>
  )
}

export function CardDescription({
  children,
  className = '',
}: CardDescriptionProps) {
  return <Text className={`text-sm text-gray-500 mt-1 ${className}`}>{children}</Text>
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <View className={`px-4 pb-4 ${className}`}>{children}</View>
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <View
      className={`px-4 py-3 border-t border-gray-100 flex-row items-center ${className}`}
    >
      {children}
    </View>
  )
}

export default Card
