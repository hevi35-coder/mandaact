import React from 'react'
import { View, ScrollView, StyleSheet, type ViewStyle } from 'react-native'
import { useResponsive } from '../hooks/useResponsive'

interface ResponsiveContainerProps {
  children: React.ReactNode
  /** Additional style for the container */
  style?: ViewStyle
  /** Use ScrollView instead of View */
  scrollable?: boolean
  /** Disable max width constraint */
  fullWidth?: boolean
  /** Center content horizontally on tablets */
  centered?: boolean
}

/**
 * Responsive container that constrains content width on tablets
 * and centers content for better readability on large screens
 */
export function ResponsiveContainer({
  children,
  style,
  scrollable = false,
  fullWidth = false,
  centered = true,
}: ResponsiveContainerProps) {
  const { contentMaxWidth, horizontalPadding, isTablet, width } = useResponsive()

  const containerStyle: ViewStyle = {
    flex: 1,
    ...(isTablet && centered && !fullWidth
      ? {
          alignSelf: 'center',
          width: Math.min(contentMaxWidth, width),
          maxWidth: contentMaxWidth,
        }
      : {}),
    paddingHorizontal: horizontalPadding,
    ...style,
  }

  if (scrollable) {
    return (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          isTablet && centered && !fullWidth
            ? styles.scrollContentCentered
            : undefined,
        ]}
      >
        <View style={containerStyle}>{children}</View>
      </ScrollView>
    )
  }

  return <View style={containerStyle}>{children}</View>
}

interface ResponsiveGridProps {
  children: React.ReactNode
  /** Gap between items */
  gap?: number
  /** Override number of columns */
  columns?: number
  /** Additional style */
  style?: ViewStyle
}

/**
 * Responsive grid that adjusts columns based on device type
 */
export function ResponsiveGrid({
  children,
  gap = 16,
  columns,
  style,
}: ResponsiveGridProps) {
  const { gridColumns } = useResponsive()
  const actualColumns = columns ?? gridColumns

  const childArray = React.Children.toArray(children)

  return (
    <View style={[styles.grid, { gap }, style]}>
      {childArray.map((child, index) => (
        <View
          key={index}
          style={{
            width: actualColumns > 1 ? `${100 / actualColumns}%` : '100%',
            paddingRight: actualColumns > 1 && (index + 1) % actualColumns !== 0 ? gap / 2 : 0,
            paddingLeft: actualColumns > 1 && index % actualColumns !== 0 ? gap / 2 : 0,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  )
}

interface ResponsiveRowProps {
  children: React.ReactNode
  /** Gap between items */
  gap?: number
  /** Stack vertically on phones */
  stackOnPhone?: boolean
  /** Additional style */
  style?: ViewStyle
}

/**
 * Responsive row that can stack on phones
 */
export function ResponsiveRow({
  children,
  gap = 16,
  stackOnPhone = true,
  style,
}: ResponsiveRowProps) {
  const { isTablet } = useResponsive()
  const shouldStack = stackOnPhone && !isTablet

  return (
    <View
      style={[
        shouldStack ? styles.column : styles.row,
        { gap },
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContentCentered: {
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  row: {
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
})
