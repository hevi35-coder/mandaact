/**
 * Custom Toggle Component
 *
 * A more compact and elegant toggle switch
 */

import React from 'react'
import { Pressable, View, ActivityIndicator } from 'react-native'
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated'

interface ToggleProps {
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
  loading?: boolean
  size?: 'sm' | 'md'
}

const AnimatedView = Animated.createAnimatedComponent(View)

export function Toggle({
  value,
  onValueChange,
  disabled = false,
  loading = false,
  size = 'md',
}: ToggleProps) {
  const dimensions = size === 'sm'
    ? { width: 40, height: 22, thumbSize: 16, padding: 3 }
    : { width: 44, height: 24, thumbSize: 18, padding: 3 }

  const trackStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withSpring(
        value ? '#1f2937' : '#e5e7eb',
        { damping: 15, stiffness: 120 }
      ),
    }
  })

  const thumbStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: withSpring(
            value ? dimensions.width - dimensions.thumbSize - dimensions.padding * 2 : 0,
            { damping: 15, stiffness: 120 }
          ),
        },
      ],
    }
  })

  if (loading) {
    return (
      <View
        style={{
          width: dimensions.width,
          height: dimensions.height,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="small" color="#6b7280" />
      </View>
    )
  }

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <AnimatedView
        style={[
          {
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: dimensions.height / 2,
            padding: dimensions.padding,
            justifyContent: 'center',
          },
          trackStyle,
        ]}
      >
        <AnimatedView
          style={[
            {
              width: dimensions.thumbSize,
              height: dimensions.thumbSize,
              borderRadius: dimensions.thumbSize / 2,
              backgroundColor: 'white',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.15,
              shadowRadius: 2,
              elevation: 2,
            },
            thumbStyle,
          ]}
        />
      </AnimatedView>
    </Pressable>
  )
}
