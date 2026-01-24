/**
 * MandalartCreateScreen - Refactored
 * 
 * Main screen for creating new Mandalarts.
 * Simplified to only support Manual Input (Fresh Start).
 */

import React, { useState, useCallback, useEffect } from 'react'
import { Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { suggestActionType } from '@mandaact/shared'
import { logger, trackMandalartCreated } from '../lib'
import { mandalartKeys } from '../hooks/useMandalarts'
import {
  ProgressOverlay,
  PreviewStep,
  type MandalartData,
} from '../components/MandalartCreate'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export default function MandalartCreateScreen() {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // State
  const [isLoading, setIsLoading] = useState(false)
  const [progressMessage, setProgressMessage] = useState('')
  const [mandalartData, setMandalartData] = useState<MandalartData | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize empty data on mount
  useEffect(() => {
    // Position convention: 1-8 (consistent with web app and database)
    const emptyData: MandalartData = {
      title: '',
      center_goal: '',
      sub_goals: Array.from({ length: 8 }, (_, i) => ({
        position: i + 1,
        title: '',
        actions: Array.from({ length: 8 }, (_, j) => ({
          position: j + 1,
          title: '',
        })),
      })),
    }
    setMandalartData(emptyData)
  }, [])

  // Handlers
  const handleBack = useCallback(() => {
    Alert.alert(
      t('common.confirm'),
      t('mandalart.create.confirmDiscard'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.discard'),
          style: 'destructive',
          onPress: () => {
            navigation.goBack()
          }
        }
      ]
    )
  }, [navigation, t])

  const handleSave = useCallback(async () => {
    if (!user || !mandalartData) return
    if (!mandalartData.title.trim()) {
      Alert.alert(t('common.error'), t('mandalart.create.errors.titleRequired'))
      return
    }

    setIsSaving(true)
    try {
      // 1. Create Mandalart
      // Always 'manual' now
      const dbInputMethod = 'manual'

      const { data: mandalart, error: mandalartError } = await supabase
        .from('mandalarts')
        .insert({
          user_id: user.id,
          title: mandalartData.title.trim(),
          center_goal: mandalartData.center_goal.trim() || mandalartData.title.trim(),
          input_method: dbInputMethod,
        })
        .select()
        .single()

      if (mandalartError) throw mandalartError

      // 2. Create SubGoals
      const subGoalsToInsert = mandalartData.sub_goals
        .filter(sg => sg.title.trim())
        .map(sg => ({
          mandalart_id: mandalart.id,
          position: sg.position,
          title: sg.title.trim(),
        }))

      if (subGoalsToInsert.length > 0) {
        const { data: subGoals, error: subGoalsError } = await supabase
          .from('sub_goals')
          .insert(subGoalsToInsert)
          .select()

        if (subGoalsError) throw subGoalsError

        // 3. Create Actions
        const actionsToInsert: unknown[] = []

        subGoals?.forEach((dbSubGoal) => {
          const originalSubGoal = mandalartData.sub_goals.find(
            (sg) => sg.position === dbSubGoal.position
          )
          if (!originalSubGoal) return

          originalSubGoal.actions
            .filter((action) => action.title.trim())
            .forEach((action) => {
              const suggestion = suggestActionType(action.title)
              const isHighConfidence = suggestion.confidence === 'high'

              let routine_frequency = undefined
              let routine_weekdays = undefined
              let mission_completion_type = undefined

              if (suggestion.type === 'routine') {
                if (isHighConfidence && suggestion.routineFrequency) {
                  routine_frequency = suggestion.routineFrequency
                }
                if (isHighConfidence && suggestion.routineWeekdays) {
                  routine_weekdays = suggestion.routineWeekdays
                }
              } else if (suggestion.type === 'mission') {
                if (isHighConfidence && suggestion.missionCompletionType) {
                  mission_completion_type = suggestion.missionCompletionType
                }
              }

              actionsToInsert.push({
                sub_goal_id: dbSubGoal.id,
                position: action.position,
                title: action.title.trim(),
                type: suggestion.type,
                routine_frequency,
                routine_weekdays,
                mission_completion_type,
              })
            })
        })

        if (actionsToInsert.length > 0) {
          const { error: actionsError } = await supabase
            .from('actions')
            .insert(actionsToInsert)

          if (actionsError) throw actionsError
        }
      }

      // Invalidate cache
      await queryClient.invalidateQueries({ queryKey: mandalartKeys.lists() })

      // Track event
      const subGoalsCount = mandalartData.sub_goals.filter(sg => sg.title.trim()).length
      const actionsCount = mandalartData.sub_goals.reduce(
        (count, sg) => count + sg.actions.filter(a => a.title.trim()).length,
        0
      )
      trackMandalartCreated({
        mandalart_id: mandalart.id,
        input_method: 'manual',
        sub_goals_count: subGoalsCount,
        actions_count: actionsCount,
      })

      Alert.alert(t('mandalart.create.success.title'), t('mandalart.create.success.created'), [
        {
          text: t('common.confirm'),
          onPress: () => navigation.goBack(),
        },
      ])
    } catch (err) {
      logger.error('Save error', err)
      Alert.alert(t('common.error'), t('mandalart.create.errors.save'))
    } finally {
      setIsSaving(false)
    }
  }, [user, mandalartData, navigation, queryClient, t])

  // Render
  return (
    <>
      <ProgressOverlay visible={isLoading} message={progressMessage} />

      {mandalartData && (
        <PreviewStep
          data={mandalartData}
          onBack={handleBack}
          onSave={handleSave}
          onUpdateData={setMandalartData}
          isSaving={isSaving}
        />
      )}
    </>
  )
}

