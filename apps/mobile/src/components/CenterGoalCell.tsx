import React from 'react'
import { Text, Pressable, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Plus } from 'lucide-react-native'

interface CenterGoalCellProps {
  /** Center goal text to display */
  centerGoal: string
  /** Size of the cell (width and height) */
  size: number
  /** Callback when cell is pressed */
  onPress?: () => void
  /** Show placeholder icon when empty (for create mode) */
  showPlaceholder?: boolean
  /** Number of lines to show before truncating */
  numberOfLines?: number
}

/**
 * Shared component for displaying the center goal cell with gradient background.
 * Used in MandalartCreateScreen and MandalartDetailScreen for consistent UI.
 *
 * Gradient: Blue (#2563eb) to Purple (#9333ea) to Pink (#db2777) at 135deg
 */
export default function CenterGoalCell({
  centerGoal,
  size,
  onPress,
  showPlaceholder = false,
  numberOfLines = 3,
}: CenterGoalCellProps) {
  const content = (
    <LinearGradient
      colors={['#2563eb', '#9333ea', '#db2777']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.gradient,
        {
          width: size,
          height: size,
          borderRadius: 12,
        },
      ]}
    >
      {centerGoal ? (
        <Text
          className="text-white text-center"
          style={styles.text}
          numberOfLines={3}
          lineBreakStrategyIOS="hangul-word-priority"
        >
          {centerGoal}
        </Text>
      ) : showPlaceholder ? (
        <Plus size={24} color="rgba(255,255,255,0.5)" />
      ) : null}
    </LinearGradient>
  )

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.pressable}>
        {content}
      </Pressable>
    )
  }

  return content
}

const styles = StyleSheet.create({
  pressable: {
    // Active state handled by parent or custom styling
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    overflow: 'hidden',
  },
  text: {
    fontSize: 18,
    fontFamily: 'Pretendard-Bold',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
})
