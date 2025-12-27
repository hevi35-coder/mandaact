import React, { useMemo, useEffect } from 'react'
import { Modal, View, Text, Pressable, ScrollView } from 'react-native'
import { X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import type { Action, SubGoal } from '@mandaact/shared'
import { usePlanStore } from '../store/planStore'
import { supabase } from '../lib/supabase'

interface SubGoalWithActions extends SubGoal {
  actions: Action[]
}

interface MandalartWithDetails {
  id: string
  center_goal: string
  sub_goals: SubGoalWithActions[]
  current_plan_mode?: 'base' | 'minimum' | 'challenge'
}

interface PlanModalProps {
  visible: boolean
  mandalart: MandalartWithDetails
  userId: string
  onClose: () => void
  onSuccess?: () => void
}

function ToggleChip({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-1.5 rounded-full border ${selected ? 'border-primary bg-primary/10' : 'border-gray-200 bg-white'
        }`}
    >
      <Text
        className={`text-xs ${selected ? 'text-gray-900' : 'text-gray-600'
          }`}
        style={{ fontFamily: selected ? 'Pretendard-SemiBold' : 'Pretendard-Regular' }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

export default function PlanModal({ visible, mandalart, userId, onClose, onSuccess }: PlanModalProps) {
  const { t } = useTranslation()
  const {
    activeBySubGoal,
    minimumBySubGoal,
    mergePreferences,
    toggleActiveAction,
    toggleMinimumAction,
  } = usePlanStore()

  const sortedSubGoals = useMemo(() => {
    return [...mandalart.sub_goals].sort((a, b) => a.position - b.position)
  }, [mandalart.sub_goals])

  useEffect(() => {
    if (!visible || !userId) return

    const subGoalIds = mandalart.sub_goals.map((goal) => goal.id).filter(Boolean)
    if (subGoalIds.length === 0) return

    let isMounted = true

    const fetchPreferences = async () => {
      const { data, error } = await supabase
        .from('action_preferences')
        .select('sub_goal_id, active_action_id, minimum_action_id')
        .eq('user_id', userId)
        .in('sub_goal_id', subGoalIds)

      if (error || !data || !isMounted) return

      const nextActive: Record<string, string> = {}
      const nextMinimum: Record<string, string> = {}

      data.forEach((row) => {
        if (row.active_action_id) {
          nextActive[row.sub_goal_id] = row.active_action_id
        }
        if (row.minimum_action_id) {
          nextMinimum[row.sub_goal_id] = row.minimum_action_id
        }
      })

      mergePreferences({
        activeBySubGoal: nextActive,
        minimumBySubGoal: nextMinimum,
      })
    }

    fetchPreferences()

    return () => {
      isMounted = false
    }
  }, [mandalart.sub_goals, mergePreferences, visible])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white rounded-t-3xl max-h-[85%]">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <Text className="text-lg text-gray-900" style={{ fontFamily: 'Pretendard-SemiBold' }}>
              {t('mandalart.plan.title')}
            </Text>
            <Pressable onPress={onClose} className="p-2">
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>
          <ScrollView className="px-5 py-4">
            <Text className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'Pretendard-Regular' }}>
              {t('mandalart.plan.subtitle')}
            </Text>

            {/* Global Plan Mode Selector */}
            <View className="mb-6 bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <Text className="text-sm text-gray-900 mb-3" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                {t('mandalart.plan.globalModeTitle')}
              </Text>
              <View className="flex-row gap-2">
                {(['base', 'minimum', 'challenge'] as const).map((mode) => (
                  <ToggleChip
                    key={mode}
                    label={t(`mandalart.plan.modes.${mode}`)}
                    selected={(mandalart.current_plan_mode || 'base') === mode}
                    onPress={async () => {
                      try {
                        await supabase
                          .from('mandalarts')
                          .update({ current_plan_mode: mode })
                          .eq('id', mandalart.id)

                        onSuccess?.()
                      } catch (err) {
                        console.error('Failed to update plan mode', err)
                      }
                    }}
                  />
                ))}
              </View>
              <Text className="text-xs text-gray-400 mt-3" style={{ fontFamily: 'Pretendard-Regular' }}>
                {t('mandalart.plan.globalModeDesc')}
              </Text>
            </View>

            <View className="h-px bg-gray-100 mb-6" />

            <Text className="text-sm text-gray-900 mb-3" style={{ fontFamily: 'Pretendard-SemiBold' }}>
              {t('mandalart.plan.manualSelectionTitle')}
            </Text>
            {sortedSubGoals.length === 0 && (
              <Text className="text-sm text-gray-500" style={{ fontFamily: 'Pretendard-Regular' }}>
                {t('mandalart.plan.empty')}
              </Text>
            )}
            {sortedSubGoals.map((subGoal) => (
              <View key={subGoal.id} className="mb-5">
                <Text className="text-sm text-gray-900 mb-2" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                  {subGoal.title || t('mandalart.plan.subGoalFallback')}
                </Text>
                {subGoal.actions.length === 0 ? (
                  <Text className="text-sm text-gray-400" style={{ fontFamily: 'Pretendard-Regular' }}>
                    {t('mandalart.plan.noActions')}
                  </Text>
                ) : (
                  subGoal.actions
                    .slice()
                    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                    .map((action) => {
                      const activeSelected = activeBySubGoal[subGoal.id] === action.id
                      const minimumSelected = minimumBySubGoal[subGoal.id] === action.id
                      return (
                        <View
                          key={action.id}
                          className="flex-row items-start justify-between py-2 border-b border-gray-100"
                        >
                          <Text className="text-sm text-gray-700 flex-1 mr-3" style={{ fontFamily: 'Pretendard-Regular' }}>
                            {action.title}
                          </Text>
                          <View className="flex-row items-center gap-2">
                            <ToggleChip
                              label={t('mandalart.plan.active')}
                              selected={activeSelected}
                              onPress={async () => {
                                if (!userId) return
                                const nextActive = activeSelected ? '' : action.id
                                toggleActiveAction(subGoal.id, action.id)
                                try {
                                  await supabase
                                    .from('action_preferences')
                                    .upsert(
                                      {
                                        user_id: userId,
                                        sub_goal_id: subGoal.id,
                                        active_action_id: nextActive || null,
                                        minimum_action_id: minimumBySubGoal[subGoal.id] || null,
                                      },
                                      { onConflict: 'user_id,sub_goal_id' }
                                    )
                                } catch {
                                  // Best-effort sync; local state remains authoritative.
                                }
                              }}
                            />
                            <ToggleChip
                              label={t('mandalart.plan.minimum')}
                              selected={minimumSelected}
                              onPress={async () => {
                                if (!userId) return
                                const nextMinimum = minimumSelected ? '' : action.id
                                toggleMinimumAction(subGoal.id, action.id)
                                try {
                                  await supabase
                                    .from('action_preferences')
                                    .upsert(
                                      {
                                        user_id: userId,
                                        sub_goal_id: subGoal.id,
                                        active_action_id: activeBySubGoal[subGoal.id] || null,
                                        minimum_action_id: nextMinimum || null,
                                      },
                                      { onConflict: 'user_id,sub_goal_id' }
                                    )
                                } catch {
                                  // Best-effort sync; local state remains authoritative.
                                }
                              }}
                            />
                          </View>
                        </View>
                      )
                    })
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
