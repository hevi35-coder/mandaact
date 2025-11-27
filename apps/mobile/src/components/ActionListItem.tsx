/**
 * Memoized Action List Item Component
 * Optimized for FlatList/map rendering performance
 */
import React, { memo } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import {
  CheckCircle2,
  Circle,
  RotateCw,
  Target,
  Lightbulb,
} from 'lucide-react-native'
import { getActionTypeLabel, formatTypeDetails, type ActionType } from '@mandaact/shared'
import type { ActionWithContext } from '../hooks/useActions'

// Action type icon component
const ActionTypeIcon = memo(function ActionTypeIcon({
  type,
  size = 14,
}: {
  type: ActionType
  size?: number
}) {
  switch (type) {
    case 'routine':
      return <RotateCw size={size} color="#3b82f6" />
    case 'mission':
      return <Target size={size} color="#10b981" />
    case 'reference':
      return <Lightbulb size={size} color="#f59e0b" />
    default:
      return null
  }
})

interface ActionListItemProps {
  action: ActionWithContext
  isChecking: boolean
  onToggle: (action: ActionWithContext) => void
}

function ActionListItemComponent({
  action,
  isChecking,
  onToggle,
}: ActionListItemProps) {
  const isReference = action.type === 'reference'
  const isDisabled = isReference || isChecking

  return (
    <Pressable
      onPress={() => onToggle(action)}
      disabled={isDisabled}
      className={`flex-row items-center p-4 bg-white rounded-xl border ${
        action.is_checked
          ? 'border-gray-200 bg-gray-50'
          : isReference
            ? 'border-gray-100 bg-gray-50/50'
            : 'border-gray-200'
      }`}
    >
      {/* Checkbox */}
      <View className="mr-3">
        {isChecking ? (
          <ActivityIndicator size="small" color="#10b981" />
        ) : action.is_checked ? (
          <CheckCircle2 size={24} color="#10b981" />
        ) : (
          <Circle
            size={24}
            color={isReference ? '#d1d5db' : '#9ca3af'}
          />
        )}
      </View>

      {/* Content */}
      <View className="flex-1">
        <Text
          className={`text-base ${
            action.is_checked
              ? 'text-gray-500 line-through'
              : 'text-gray-900'
          }`}
        >
          {action.title}
        </Text>
        <View className="flex-row items-center mt-1">
          <Text className="text-xs text-gray-400">
            {action.sub_goal.title}
          </Text>
        </View>
      </View>

      {/* Type Badge */}
      <View className="flex-row items-center bg-gray-100 px-2 py-1 rounded-lg">
        <ActionTypeIcon type={action.type} size={14} />
        <Text className="text-xs text-gray-600 ml-1">
          {formatTypeDetails(action) || getActionTypeLabel(action.type)}
        </Text>
      </View>
    </Pressable>
  )
}

// Custom comparison function for memo
function areEqual(
  prevProps: ActionListItemProps,
  nextProps: ActionListItemProps
) {
  return (
    prevProps.action.id === nextProps.action.id &&
    prevProps.action.is_checked === nextProps.action.is_checked &&
    prevProps.action.title === nextProps.action.title &&
    prevProps.isChecking === nextProps.isChecking
  )
}

export const ActionListItem = memo(ActionListItemComponent, areEqual)
export { ActionTypeIcon }
export default ActionListItem
