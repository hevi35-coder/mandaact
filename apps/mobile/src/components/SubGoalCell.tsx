import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'

interface SubGoalCellProps {
  /** Sub-goal title to display */
  title: string
  /** Size of the cell (width and height) */
  size: number
  /** Position number (1-8) - shown as label when variant is 'overview' */
  position?: number
  /** Number of filled actions (shown in overview variant) */
  filledActions?: number
  /** Total actions count (default 8) */
  totalActions?: number
  /** Callback when cell is pressed */
  onPress?: () => void
  /**
   * Variant determines the display style:
   * - 'overview': Used in main 3x3 grid (shows position label and action count)
   * - 'center': Used as center cell in expanded 3x3 action grid (no labels, larger text)
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
 * Design: Light blue background (bg-blue-50) with blue border
 * Consistent with web MandalartGrid.tsx
 */
export default function SubGoalCell({
  title,
  size,
  position,
  filledActions,
  totalActions = 8,
  onPress,
  variant = 'overview',
  numberOfLines = 2,
  borderRadius = 12,
}: SubGoalCellProps) {
  const { t } = useTranslation()
  const isOverview = variant === 'overview'
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

      {/* Position label - only in overview variant */}
      {isOverview && position !== undefined && (
        <Text style={styles.positionLabel}>{t('mandalart.cell.subGoalLabel', { position })}</Text>
      )}

      {/* Sub-goal title */}
      {title ? (
        <Text
          style={[
            styles.title,
            isCenter && styles.titleCenter,
          ]}
          numberOfLines={isCenter ? 3 : numberOfLines}
        >
          {title}
        </Text>
      ) : isOverview ? (
        <Text style={styles.emptyTitle}>-</Text>
      ) : (
        <Text style={styles.placeholder}>{t('mandalart.cell.subGoalPlaceholder')}</Text>
      )}

      {/* Action count - only in overview variant when title exists */}
      {isOverview && title && filledActions !== undefined && (
        <Text style={styles.actionCount}>
          {t('mandalart.cell.actionCount', { filled: filledActions, total: totalActions })}
        </Text>
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
    padding: 8,
    backgroundColor: '#eff6ff', // bg-blue-50
    borderWidth: 1,
    borderColor: '#bfdbfe', // border-blue-200
  },
  pressed: {
    opacity: 0.8,
    backgroundColor: '#dbeafe', // bg-blue-100
  },
  positionLabel: {
    fontSize: 10,
    color: '#9ca3af', // text-gray-400
    marginBottom: 2,
    fontFamily: 'Pretendard-Regular',
  },
  title: {
    fontSize: 12, // text-xs
    fontFamily: 'Pretendard-Medium',
    color: '#1f2937', // text-gray-800
    textAlign: 'center',
  },
  titleCenter: {
    fontSize: 14, // text-sm
    fontFamily: 'Pretendard-SemiBold',
  },
  emptyTitle: {
    fontSize: 12,
    fontFamily: 'Pretendard-Medium',
    color: '#1f2937',
    textAlign: 'center',
  },
  placeholder: {
    fontSize: 12,
    fontFamily: 'Pretendard-Regular',
    color: '#9ca3af', // text-gray-400
    textAlign: 'center',
  },
  actionCount: {
    fontSize: 10,
    color: '#9ca3af', // text-gray-400
    marginTop: 2,
    fontFamily: 'Pretendard-Regular',
  },
})
