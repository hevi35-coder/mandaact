/**
 * FilteredEmptyState Component
 *
 * Shows contextual empty states for Today screen when no actions match filters or criteria
 */

import React, { useMemo } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  Settings,
  Filter,
  CalendarX2,
  CheckCircle,
} from 'lucide-react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'

type EmptyStateScenario =
  | 'unconfigured'      // All actions are unconfigured
  | 'noFilterMatch'     // Active filters but no matches
  | 'noneToday'         // No actions scheduled for today
  | 'allCompleted'      // All period targets completed

interface FilteredEmptyStateProps {
  scenario: EmptyStateScenario
  onAction?: () => void
  hasCompletedActions?: boolean
}

export function FilteredEmptyState({
  scenario,
  onAction,
  hasCompletedActions = false,
}: FilteredEmptyStateProps) {
  const { t } = useTranslation()

  // Determine icon, color, and content based on scenario
  const config = useMemo(() => {
    switch (scenario) {
      case 'unconfigured':
        return {
          Icon: Settings,
          iconColor: '#f59e0b', // amber-500
          bgColor: 'bg-amber-100',
          titleKey: 'today.emptyStates.unconfigured.title',
          descKey: 'today.emptyStates.unconfigured.description',
          actionKey: 'today.emptyStates.unconfigured.action',
          showInfoBox: false,
        }
      case 'noFilterMatch':
        return {
          Icon: Filter,
          iconColor: '#6b7280', // gray-500
          bgColor: 'bg-gray-100',
          titleKey: 'today.emptyStates.noFilterMatch.title',
          descKey: 'today.emptyStates.noFilterMatch.description',
          actionKey: 'today.emptyStates.noFilterMatch.action',
          showInfoBox: false,
        }
      case 'noneToday':
        return {
          Icon: CalendarX2,
          iconColor: '#3b82f6', // blue-500
          bgColor: 'bg-blue-100',
          titleKey: 'today.emptyStates.noneToday.title',
          descKey: 'today.emptyStates.noneToday.description',
          actionKey: null,
          showInfoBox: true,
        }
      case 'allCompleted':
        return {
          Icon: CheckCircle,
          iconColor: '#16a34a', // green-600
          bgColor: 'bg-green-100',
          titleKey: 'today.emptyStates.allCompleted.title',
          descKey: 'today.emptyStates.allCompleted.description',
          actionKey: hasCompletedActions ? 'today.emptyStates.allCompleted.viewCompleted' : null,
          showInfoBox: false,
        }
    }
  }, [scenario, hasCompletedActions])

  const { Icon, iconColor, bgColor, titleKey, descKey, actionKey, showInfoBox } = config

  return (
    <Animated.View
      entering={FadeInUp.delay(100).duration(400)}
      className="bg-white rounded-2xl p-6"
    >
      {/* Icon */}
      <View className="items-center mb-4">
        <View className={`w-14 h-14 ${bgColor} rounded-full items-center justify-center`}>
          <Icon size={28} color={iconColor} />
        </View>
      </View>

      {/* Title */}
      <Text
        className="text-lg text-gray-900 text-center mb-2"
        style={{ fontFamily: 'Pretendard-SemiBold' }}
      >
        {t(titleKey)}
      </Text>

      {/* Description */}
      <Text
        className="text-sm text-gray-500 text-center mb-5"
        style={{ fontFamily: 'Pretendard-Regular' }}
      >
        {t(descKey)}
      </Text>

      {/* Info Box - Only for 'noneToday' scenario */}
      {showInfoBox && scenario === 'noneToday' && (
        <View className="bg-gray-50 rounded-xl p-4 mb-5">
          <Text
            className="text-sm text-gray-700 mb-3"
            style={{ fontFamily: 'Pretendard-SemiBold' }}
          >
            {t('today.emptyStates.noneToday.info.title')}
          </Text>
          <View className="flex-row items-start mb-2">
            <View className="w-1 h-1 rounded-full bg-gray-400 mr-2 mt-2" />
            <Text
              className="flex-1 text-sm text-gray-600"
              style={{ fontFamily: 'Pretendard-Regular' }}
            >
              {t('today.emptyStates.noneToday.info.routine')}
            </Text>
          </View>
          <View className="flex-row items-start">
            <View className="w-1 h-1 rounded-full bg-gray-400 mr-2 mt-2" />
            <Text
              className="flex-1 text-sm text-gray-600"
              style={{ fontFamily: 'Pretendard-Regular' }}
            >
              {t('today.emptyStates.noneToday.info.mission')}
            </Text>
          </View>
        </View>
      )}

      {/* Action Button */}
      {actionKey && onAction && (
        <Pressable
          className="py-3 rounded-xl border border-gray-200 bg-white"
          onPress={onAction}
        >
          <Text
            className="text-sm text-gray-700 text-center"
            style={{ fontFamily: 'Pretendard-SemiBold' }}
          >
            {t(actionKey)}
          </Text>
        </Pressable>
      )}
    </Animated.View>
  )
}
