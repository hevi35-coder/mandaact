import { useWindowDimensions } from 'react-native'
import { useMemo } from 'react'

/**
 * Device breakpoints for responsive design
 * - phone: < 768px (iPhone)
 * - tablet: >= 768px (iPad)
 * - tabletLarge: >= 1024px (iPad Pro 12.9")
 */
export const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  tabletLarge: 1024,
} as const

export type DeviceType = 'phone' | 'tablet' | 'tabletLarge'

interface ResponsiveValues {
  /** Current screen width */
  width: number
  /** Current screen height */
  height: number
  /** Device type based on width */
  deviceType: DeviceType
  /** Is iPad (tablet or tabletLarge) */
  isTablet: boolean
  /** Is iPad Pro 12.9" or larger */
  isTabletLarge: boolean
  /** Is portrait orientation */
  isPortrait: boolean
  /** Is landscape orientation */
  isLandscape: boolean
  /** Content max width for centered layouts */
  contentMaxWidth: number
  /** Number of columns for grid layouts */
  gridColumns: number
  /** Horizontal padding */
  horizontalPadding: number
  /** Card width for list items */
  cardWidth: number | 'full'
  /** Font scale factor for tablets */
  fontScale: number
}

/**
 * Hook for responsive design across iPhone and iPad
 * Provides device type, breakpoints, and layout values
 */
export function useResponsive(): ResponsiveValues {
  const { width, height } = useWindowDimensions()

  return useMemo(() => {
    const isPortrait = height > width
    const isLandscape = !isPortrait

    // Determine device type based on width
    let deviceType: DeviceType = 'phone'
    if (width >= BREAKPOINTS.tabletLarge) {
      deviceType = 'tabletLarge'
    } else if (width >= BREAKPOINTS.tablet) {
      deviceType = 'tablet'
    }

    const isTablet = deviceType === 'tablet' || deviceType === 'tabletLarge'
    const isTabletLarge = deviceType === 'tabletLarge'

    // Content max width - limit content width on large screens
    const contentMaxWidth = isTabletLarge
      ? 900
      : isTablet
        ? 700
        : width

    // Grid columns based on device and orientation
    let gridColumns = 1
    if (isTabletLarge) {
      gridColumns = isLandscape ? 3 : 2
    } else if (isTablet) {
      gridColumns = isLandscape ? 2 : 2
    }

    // Horizontal padding
    const horizontalPadding = isTablet ? 32 : 20

    // Card width calculation
    const availableWidth = Math.min(width, contentMaxWidth) - (horizontalPadding * 2)
    const gap = 16
    const cardWidth: number | 'full' = gridColumns > 1
      ? (availableWidth - (gap * (gridColumns - 1))) / gridColumns
      : 'full'

    // Font scale for larger screens
    const fontScale = isTabletLarge ? 1.15 : isTablet ? 1.1 : 1

    return {
      width,
      height,
      deviceType,
      isTablet,
      isTabletLarge,
      isPortrait,
      isLandscape,
      contentMaxWidth,
      gridColumns,
      horizontalPadding,
      cardWidth,
      fontScale,
    }
  }, [width, height])
}

/**
 * Returns responsive value based on device type
 * @example
 * const padding = useResponsiveValue({ phone: 16, tablet: 24, tabletLarge: 32 })
 */
export function useResponsiveValue<T>(values: Partial<Record<DeviceType, T>>): T | undefined {
  const { deviceType } = useResponsive()

  // Fall back to smaller device value if not specified
  if (values[deviceType] !== undefined) {
    return values[deviceType]
  }
  if (deviceType === 'tabletLarge' && values.tablet !== undefined) {
    return values.tablet
  }
  if ((deviceType === 'tabletLarge' || deviceType === 'tablet') && values.phone !== undefined) {
    return values.phone
  }

  return undefined
}

/**
 * Responsive style helper - creates styles based on breakpoints
 */
export function createResponsiveStyle<T extends object>(
  deviceType: DeviceType,
  styles: Partial<Record<DeviceType, T>>
): T {
  const baseStyle = styles.phone || ({} as T)
  const tabletStyle = styles.tablet || {}
  const tabletLargeStyle = styles.tabletLarge || {}

  if (deviceType === 'tabletLarge') {
    return { ...baseStyle, ...tabletStyle, ...tabletLargeStyle }
  }
  if (deviceType === 'tablet') {
    return { ...baseStyle, ...tabletStyle }
  }
  return baseStyle
}
