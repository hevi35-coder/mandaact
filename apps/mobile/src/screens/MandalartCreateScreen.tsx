/**
 * MandalartCreateScreen - Refactored
 * 
 * Main screen for creating new Mandalarts.
 * Orchestrates the creation flow: Method Selection -> Input -> Preview/Edit -> Save.
 */

import React, { useState, useCallback } from 'react'
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
  MethodSelector,
  ProgressOverlay,
  ImageInputStep,
  TextInputStep,
  PreviewStep,
  type InputMethod,
  type Step,
  type MandalartData,
} from '../components/MandalartCreate'
import { SafeAreaView } from 'react-native-safe-area-context'
import { View, Text, Pressable } from 'react-native'
import { ArrowLeft } from 'lucide-react-native'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export default function MandalartCreateScreen() {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // State
  const [step, setStep] = useState<Step>('select-method')
  const [inputMethod, setInputMethod] = useState<InputMethod>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [progressMessage, setProgressMessage] = useState('')
  const [mandalartData, setMandalartData] = useState<MandalartData | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Handlers
  const handleBack = useCallback(() => {
    if (step === 'select-method') {
      navigation.goBack()
    } else if (step === 'input') {
      setStep('select-method')
      setInputMethod(null)
    } else if (step === 'preview') {
      Alert.alert(
        t('common.confirm'),
        t('mandalart.create.confirmDiscard'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.discard'),
            style: 'destructive',
            onPress: () => {
              setStep('select-method')
              setInputMethod(null)
              setMandalartData(null)
            }
          }
        ]
      )
    }
  }, [step, navigation, t])

  const handleSelectMethod = useCallback((method: InputMethod) => {
    setInputMethod(method)
    if (method === 'manual') {
      // Initialize empty data for manual mode
      const emptyData: MandalartData = {
        title: '',
        center_goal: '',
        sub_goals: Array.from({ length: 8 }, (_, i) => ({
          position: i < 4 ? i : i + 1, // Skip center (4)
          title: '',
          actions: Array.from({ length: 8 }, (_, j) => ({
            position: j < 4 ? j : j + 1,
            title: '',
          })),
        })),
      }
      setMandalartData(emptyData)
      setStep('preview')
    } else {
      setStep('input')
    }
  }, [])

  const handleDataReady = useCallback((data: MandalartData) => {
    setMandalartData(data)
    setStep('preview')
  }, [])

  const handleLoading = useCallback((loading: boolean, message: string = '') => {
    setIsLoading(loading)
    setProgressMessage(message)
  }, [])

  const handleSave = useCallback(async () => {
    if (!user || !mandalartData) return
    if (!mandalartData.title.trim()) {
      Alert.alert(t('common.error'), t('mandalart.create.errors.titleRequired'))
      return
    }

    setIsSaving(true)
    try {
      // 1. Create Mandalart
      const { data: mandalart, error: mandalartError } = await supabase
        .from('mandalarts')
        .insert({
          user_id: user.id,
          title: mandalartData.title.trim(),
          center_goal: mandalartData.center_goal.trim() || mandalartData.title.trim(),
          start_date: new Date().toISOString(),
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
        const actionsToInsert: any[] = []

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
        input_method: inputMethod || 'manual',
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
  }, [user, mandalartData, inputMethod, navigation, queryClient, t])

  // Render
  return (
    <>
      <ProgressOverlay visible={isLoading} message={progressMessage} />

      {step === 'select-method' && (
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center px-5 h-16 border-b border-gray-100">
            <Pressable onPress={handleBack} className="p-2.5 -ml-2.5 rounded-full active:bg-gray-100">
              <ArrowLeft size={24} color="#374151" />
            </Pressable>
            <View className="flex-row items-center ml-2">
              <Text className="text-xl text-gray-900" style={{ fontFamily: 'Pretendard-Bold' }}>
                {t('mandalart.create.title')}
              </Text>
              <Text className="text-base text-gray-500 ml-3" style={{ fontFamily: 'Pretendard-Medium' }}>
                {t('mandalart.create.subtitle')}
              </Text>
            </View>
          </View>
          <MethodSelector onSelectMethod={handleSelectMethod} />
        </SafeAreaView>
      )}

      {step === 'input' && inputMethod === 'image' && (
        <ImageInputStep
          onBack={handleBack}
          onNext={handleDataReady}
          setLoading={handleLoading}
        />
      )}

      {step === 'input' && inputMethod === 'text' && (
        <TextInputStep
          onBack={handleBack}
          onNext={handleDataReady}
          setLoading={handleLoading}
        />
      )}

      {step === 'preview' && mandalartData && (
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
