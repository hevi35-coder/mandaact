import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Plus } from 'lucide-react-native'

interface SubGoalCellProps {
  /** Sub-goal title to display */
  title: string
  /** Size of the cell (width and height) */
  size: number
  /** Position number (1-8) - no longer displayed but kept for API compatibility */
  position?: number
  /** Number of filled actions - no longer displayed but kept for API compatibility */
  filledActions?: number
  /** Total actions count (default 8) */
  totalActions?: number
  /** Callback when cell is pressed */
  onPress?: () => void
  /**
   * Variant determines the display style:
   * - 'overview': Used in main 3x3 grid (minimalist: title only)
   * - 'center': Used as center cell in expanded 3x3 action grid (larger text)
   */
  variant?: 'overview' | 'center'
  /** Number of lines to show before truncating */
  numberOfLines?: number
  /** Custom border radius (default: 12) */
  borderRadius?: number
}

/**
 * Shared component for displaying sub-goal cells with consistent styling.
 * Used in MandalartCreateScreen and MandalartDetailScreen.
 *
 * Design: Minimalist - only shows title when filled, + icon when empty
 * Light blue background (bg-blue-50) with blue border
 */
export default function SubGoalCell({
  title,
  size,
  onPress,
  variant = 'overview',
  borderRadius = 12,
}: SubGoalCellProps) {
  const isCenter = variant === 'center'

  const content = (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
        },
      ]}
    >
      {/* Minimalist design: only show title when filled */}
      {title ? (
        <Text
          style={[
            styles.title,
            isCenter && styles.titleCenter,
          ]}
          numberOfLines={3}
          lineBreakStrategyIOS="hangul-word-priority"
          textBreakStrategy="balanced"
        >
          {title}
        </Text>
      ) : (
        /* Empty state: show + icon to encourage filling */
        <Plus size={24} color="#d1d5db" strokeWidth={1.5} />
      )}
    </View>
  )

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          pressed && styles.pressed,
        ]}
      >
        {content}
      </Pressable>
    )
  }

  return content
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    backgroundColor: '#eff6ff', // bg-blue-50
    borderWidth: 1,
    borderColor: '#bfdbfe', // border-blue-200
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.8,
    backgroundColor: '#dbeafe', // bg-blue-100
  },
  title: {
    fontSize: 16,
    fontFamily: 'Pretendard-SemiBold',
    color: '#1f2937', // text-gray-800
    textAlign: 'center',
    lineHeight: 20,
  },
  titleCenter: {
    fontSize: 18, // Match CenterGoalCell
    fontFamily: 'Pretendard-Bold',
    lineHeight: 22,
  },
})
