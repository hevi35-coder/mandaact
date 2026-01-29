/**
 * FilteredEmptyState Component
 *
 * Shows contextual empty states for Today screen with Quick Chips for immediate action
 */

import React, { useMemo } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  Settings,
  Filter,
  CalendarX2,
  CheckCircle,
  Plus,
} from 'lucide-react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'

export type EmptyStateScenario =
  | 'unconfigured'      // All actions are unconfigured
  | 'noFilterMatch'     // Active filters but no matches
  | 'noneToday'         // No actions scheduled for today
  | 'allCompleted'      // All period targets completed

export interface SuggestionChip {
  id: string
  title: string
  color?: string
}

interface FilteredEmptyStateProps {
  scenario: EmptyStateScenario
  onAction?: () => void
  hasCompletedActions?: boolean
  suggestions?: SuggestionChip[]
  onSuggestionPress?: (id: string) => void
}

export function FilteredEmptyState({
  scenario,
  onAction,
  hasCompletedActions = false,
  suggestions = [],
  onSuggestionPress,
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
        }
      case 'noFilterMatch':
        return {
          Icon: Filter,
          iconColor: '#6b7280', // gray-500
          bgColor: 'bg-gray-100',
          titleKey: 'today.emptyStates.noFilterMatch.title',
          descKey: 'today.emptyStates.noFilterMatch.description',
          actionKey: 'today.emptyStates.noFilterMatch.action',
        }
      case 'noneToday':
        return {
          Icon: CalendarX2,
          iconColor: '#3b82f6', // blue-500
          bgColor: 'bg-blue-100',
          titleKey: 'today.emptyStates.noneToday.title',
          descKey: 'today.emptyStates.noneToday.description',
          actionKey: null,
        }
      case 'allCompleted':
        return {
          Icon: CheckCircle,
          iconColor: '#16a34a', // green-600
          bgColor: 'bg-green-100',
          titleKey: 'today.emptyStates.allCompleted.title',
          descKey: 'today.emptyStates.allCompleted.description',
          actionKey: hasCompletedActions ? 'today.emptyStates.allCompleted.viewCompleted' : null,
        }
    }
  }, [scenario, hasCompletedActions])

  const { Icon, iconColor, bgColor, titleKey, descKey, actionKey } = config

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
        className="text-sm text-gray-500 text-center mb-6 px-4"
        style={{ fontFamily: 'Pretendard-Regular' }}
      >
        {t(descKey)}
      </Text>

      {/* Quick Chips - Only for 'noneToday' scenario */}
      {scenario === 'noneToday' && suggestions.length > 0 && onSuggestionPress && (
        <View className="w-full mb-4">
          <Text className="text-xs text-gray-400 font-bold mb-3 text-center" style={{ fontFamily: 'Pretendard-Bold' }}>
            {t('today.emptyStates.noneToday.quickAdd')}
          </Text>
          <View className="flex-row flex-wrap justify-center gap-2">
            {suggestions.map((chip) => (
              <Pressable
                key={chip.id}
                onPress={() => onSuggestionPress(chip.id)}
                className="flex-row items-center bg-blue-50 border border-blue-100 px-3 py-2 rounded-full active:bg-blue-100"
              >
                <Text
                  className="text-sm text-blue-700 font-medium mr-1"
                  style={{ fontFamily: 'Pretendard-Medium' }}
                >
                  {chip.title}
                </Text>
                <Plus size={14} color="#3b82f6" />
              </Pressable>
            ))}
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
