import React from 'react'
import { View, Animated, Easing, ViewStyle, DimensionValue } from 'react-native'

interface SkeletonProps {
  width?: DimensionValue
  height?: DimensionValue
  borderRadius?: number
  style?: ViewStyle
}

// Animated skeleton placeholder
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const animatedValue = React.useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [animatedValue])

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  })

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#e5e7eb',
          opacity,
        },
        style,
      ]}
    />
  )
}

// Card skeleton
export function SkeletonCard() {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3">
      <View className="flex-row items-center mb-3">
        <Skeleton width={40} height={40} borderRadius={20} />
        <View className="flex-1 ml-3">
          <Skeleton width="60%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={12} />
        </View>
      </View>
      <Skeleton height={12} style={{ marginBottom: 8 }} />
      <Skeleton width="80%" height={12} />
    </View>
  )
}

// List item skeleton
export function SkeletonListItem() {
  return (
    <View className="flex-row items-center py-4 px-4 border-b border-gray-100">
      <Skeleton width={24} height={24} borderRadius={6} />
      <View className="flex-1 ml-3">
        <Skeleton width="70%" height={16} style={{ marginBottom: 6 }} />
        <Skeleton width="40%" height={12} />
      </View>
      <Skeleton width={60} height={24} borderRadius={12} />
    </View>
  )
}

// Stats card skeleton
export function SkeletonStatsCard() {
  return (
    <View className="flex-1 bg-white rounded-2xl p-4">
      <Skeleton width={60} height={12} style={{ marginBottom: 8 }} />
      <Skeleton width={80} height={32} style={{ marginBottom: 4 }} />
      <Skeleton width={40} height={10} />
    </View>
  )
}

// Action list skeleton
export function SkeletonActionList({ count = 5 }: { count?: number }) {
  return (
    <View className="bg-white rounded-2xl overflow-hidden">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonListItem key={index} />
      ))}
    </View>
  )
}

// Full screen skeleton for Today page
export function TodayScreenSkeleton() {
  return (
    <View className="flex-1 px-4 pt-4">
      {/* Header */}
      <View className="mb-4">
        <Skeleton width={150} height={28} style={{ marginBottom: 8 }} />
        <Skeleton width={200} height={16} />
      </View>

      {/* Stats row */}
      <View className="flex-row gap-3 mb-4">
        <SkeletonStatsCard />
        <SkeletonStatsCard />
      </View>

      {/* Filter buttons */}
      <View className="flex-row gap-2 mb-4">
        <Skeleton width={60} height={32} borderRadius={16} />
        <Skeleton width={60} height={32} borderRadius={16} />
        <Skeleton width={60} height={32} borderRadius={16} />
      </View>

      {/* Action list */}
      <SkeletonActionList count={6} />
    </View>
  )
}

// Full screen skeleton for Home page
export function HomeScreenSkeleton() {
  return (
    <View className="flex-1 px-4 pt-4">
      {/* Header */}
      <View className="mb-6">
        <Skeleton width={180} height={28} style={{ marginBottom: 8 }} />
        <Skeleton width={250} height={16} />
      </View>

      {/* Stats card */}
      <SkeletonCard />

      {/* Level card */}
      <View className="bg-gray-200 rounded-2xl p-6 mb-4">
        <View className="flex-row justify-between mb-4">
          <View>
            <Skeleton width={60} height={12} style={{ marginBottom: 8 }} />
            <Skeleton width={80} height={32} />
          </View>
          <View className="items-end">
            <Skeleton width={40} height={12} style={{ marginBottom: 8 }} />
            <Skeleton width={100} height={24} />
          </View>
        </View>
        <Skeleton height={8} borderRadius={4} />
      </View>

      {/* Quick actions */}
      <View className="flex-row gap-3">
        <Skeleton height={56} borderRadius={12} style={{ flex: 1 }} />
        <Skeleton height={56} borderRadius={12} style={{ flex: 1 }} />
      </View>
    </View>
  )
}
