import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  ArrowLeft,
  Image as ImageIcon,
  FileText,
  PenLine,
  Check,
  Upload,
  ChevronLeft,
} from 'lucide-react-native'
import { useQueryClient } from '@tanstack/react-query'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { runOCRFlowFromUri, parseMandalartText, type UploadProgress } from '../services/ocrService'
import * as ImagePicker from 'expo-image-picker'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { suggestActionType } from '@mandaact/shared'
import { logger, trackMandalartCreated } from '../lib'
import CoreGoalModal from '../components/CoreGoalModal'
import SubGoalModal from '../components/SubGoalModal'
import { CenterGoalCell, SubGoalCell, MandalartFullGrid } from '../components'
import { mandalartKeys } from '../hooks/useMandalarts'
import { useResponsive } from '../hooks/useResponsive'
import {
  MethodSelector,
  ProgressOverlay,
  type InputMethod,
  type MandalartData,
} from '../components/MandalartCreate'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

type Step = 'select' | 'input' | 'preview' | 'saving'

// Grid layout constants
const CONTAINER_PADDING = 16
const CARD_PADDING = 16
const CELL_GAP = 8

export default function MandalartCreateScreen() {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const { width: screenWidth, height: screenHeight } = useWindowDimensions()
  const { isTablet } = useResponsive()

  // Calculate cell size dynamically
  const gridWidth = screenWidth - (CONTAINER_PADDING * 2) - (CARD_PADDING * 2)
  const cellSize = Math.floor((gridWidth - (CELL_GAP * 2)) / 3)

  const [step, setStep] = useState<Step>('select')
  const [inputMethod, setInputMethod] = useState<InputMethod | null>(null)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [mandalartData, setMandalartData] = useState<MandalartData | null>(null)
  const [title, setTitle] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Image preview state
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null)
  const [isProcessingOCR, setIsProcessingOCR] = useState(false)

  // 3x3 Grid state
  const [expandedSection, setExpandedSection] = useState<number | null>(null)
  const [coreGoalModalOpen, setCoreGoalModalOpen] = useState(false)
  const [subGoalModalOpen, setSubGoalModalOpen] = useState(false)
  const [selectedSubGoalPosition, setSelectedSubGoalPosition] = useState<number | null>(null)

  const handleBack = useCallback(() => {
    if (step === 'select') {
      navigation.goBack()
    } else if (step === 'input' || step === 'preview') {
      setStep('select')
      setInputMethod(null)
      setMandalartData(null)
      setProgress(null)
      setSelectedImageUri(null)
      setPasteText('')
    }
  }, [step, navigation])

  const handleSelectMethod = useCallback((method: InputMethod) => {
    setInputMethod(method)
    setStep('input')
  }, [])

  // Image picker handler (opens action sheet)
  const handleImageSourceSelect = useCallback(() => {
    Alert.alert(t('mandalart.create.imageUpload.selectImage'), '', [
      {
        text: t('mandalart.create.imageUpload.camera'),
        onPress: () => handleImagePick('camera'),
      },
      {
        text: t('mandalart.create.imageUpload.gallery'),
        onPress: () => handleImagePick('library'),
      },
      { text: t('common.cancel'), style: 'cancel' },
    ])
  }, [t])

  // Pick image and show preview (without OCR yet)
  const handleImagePick = useCallback(
    async (source: 'camera' | 'library') => {
      if (!user) return

      try {
        let result
        if (source === 'camera') {
          const { status } = await ImagePicker.requestCameraPermissionsAsync()
          if (status !== 'granted') {
            Alert.alert(t('mandalart.create.imageUpload.permissionRequired'), t('mandalart.create.imageUpload.cameraPermission'))
            return
          }
          result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
          })
        } else {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
          if (status !== 'granted') {
            Alert.alert(t('mandalart.create.imageUpload.permissionRequired'), t('mandalart.create.imageUpload.galleryPermission'))
            return
          }
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
          })
        }

        if (!result.canceled && result.assets[0]) {
          setSelectedImageUri(result.assets[0].uri)
        }
      } catch (err) {
        logger.error('Image pick error', err)
        Alert.alert(t('common.error'), t('mandalart.create.errors.imageSelect'))
      }
    },
    [user, t]
  )

  // Process OCR from selected image
  const handleProcessOCR = useCallback(async () => {
    if (!user || !selectedImageUri) return

    setIsProcessingOCR(true)
    setProgress({ stage: 'processing', message: t('mandalart.create.imageUpload.processing') })

    try {
      const result = await runOCRFlowFromUri(user.id, selectedImageUri, setProgress)
      if (result) {
        setMandalartData({
          title: result.center_goal.slice(0, 50),
          ...result,
        })
        setTitle(result.center_goal.slice(0, 50))
        setStep('preview')
      }
    } catch (err) {
      logger.error('OCR error', err)
      const errorMessage = err instanceof Error ? err.message : 'unknownError'
      // Try to translate the error key, fallback to raw message
      const translatedError = t(`mandalart.create.ocr.${errorMessage}`, errorMessage)
      Alert.alert(t('common.error'), translatedError)
    } finally {
      setIsProcessingOCR(false)
      setProgress(null)
    }
  }, [user, selectedImageUri, t])

  const handleTextParse = useCallback(async () => {
    if (!pasteText.trim()) {
      Alert.alert(t('common.error'), t('mandalart.create.textPaste.enterText'))
      return
    }

    setProgress({ stage: 'processing', message: t('mandalart.create.textPaste.processing') })

    try {
      const result = await parseMandalartText(pasteText)
      setMandalartData({
        title: result.center_goal.slice(0, 50),
        ...result,
      })
      setTitle(result.center_goal.slice(0, 50))
      setStep('preview')
    } catch (err) {
      logger.error('Parse error', err)
      const errorMessage = err instanceof Error ? err.message : 'unknownError'
      // Try to translate the error key, fallback to generic parse error
      const translatedError = t(`mandalart.create.ocr.${errorMessage}`, t('mandalart.create.textPaste.parseError'))
      Alert.alert(t('common.error'), translatedError)
    } finally {
      setProgress(null)
    }
  }, [pasteText, t])

  const handleManualCreate = useCallback(() => {
    // For manual, start with empty template
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
    setStep('preview')
    // Auto-open core goal modal for manual create
    setTimeout(() => setCoreGoalModalOpen(true), 300)
  }, [])

  // Grid handlers
  const handleCoreGoalClick = useCallback(() => {
    setCoreGoalModalOpen(true)
  }, [])

  const handleSectionTap = useCallback((sectionPos: number) => {
    // Always open modal directly when tapping a section
    // After modal close, show expanded 3x3 grid view
    setSelectedSubGoalPosition(sectionPos)
    setSubGoalModalOpen(true)
    setExpandedSection(sectionPos)
  }, [])

  const handleGridBack = useCallback(() => {
    setExpandedSection(null)
  }, [])

  const handleCoreGoalSave = useCallback((data: { title: string; centerGoal: string }) => {
    setTitle(data.title)
    if (mandalartData) {
      setMandalartData({
        ...mandalartData,
        center_goal: data.centerGoal,
      })
    }
  }, [mandalartData])

  const handleSubGoalSave = useCallback((data: {
    position: number
    title: string
    actions: Array<{ position: number; title: string }>
  }) => {
    if (!mandalartData) return

    const newSubGoals = [...mandalartData.sub_goals]
    const existingIndex = newSubGoals.findIndex(sg => sg.position === data.position)

    if (existingIndex >= 0) {
      newSubGoals[existingIndex] = {
        position: data.position,
        title: data.title,
        actions: data.actions,
      }
    } else {
      newSubGoals.push({
        position: data.position,
        title: data.title,
        actions: data.actions,
      })
    }

    setMandalartData({
      ...mandalartData,
      sub_goals: newSubGoals,
    })
  }, [mandalartData])

  // Get sub-goal by position
  const getSubGoalByPosition = useCallback((position: number) => {
    return mandalartData?.sub_goals.find(sg => sg.position === position)
  }, [mandalartData])

  // Section positions for 3x3 grid (position 0 = center)
  const _sectionPositions = [1, 2, 3, 4, 0, 5, 6, 7, 8]

  const handleSave = useCallback(async () => {
    if (!user || !mandalartData) return

    if (!title.trim()) {
      Alert.alert(t('common.error'), t('mandalart.create.validation.enterTitle'))
      return
    }

    if (!mandalartData.center_goal.trim()) {
      Alert.alert(t('common.error'), t('mandalart.create.validation.enterCoreGoal'))
      return
    }

    setIsSaving(true)
    setStep('saving')

    try {
      // 1. Create mandalart
      const { data: mandalart, error: mandalartError } = await supabase
        .from('mandalarts')
        .insert({
          user_id: user.id,
          title: title.trim(),
          center_goal: mandalartData.center_goal.trim(),
          input_method: inputMethod || 'manual',
          is_active: true,
        })
        .select()
        .single()

      if (mandalartError) throw mandalartError

      // 2. Create sub_goals
      const subGoalsToInsert = mandalartData.sub_goals
        .filter((sg) => sg.title.trim())
        .map((sg) => ({
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

        // 3. Create actions for each sub_goal
        const actionsToInsert: Array<{
          sub_goal_id: string
          position: number
          title: string
          type: string
          routine_frequency?: string
          routine_weekdays?: number[]
          mission_completion_type?: string
        }> = []

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

              // Only auto-set frequency/weekdays if AI confidence is 'high'
              // This ensures meaningful diagnosis results (not all 100%)
              let routine_frequency: string | undefined = undefined
              let routine_weekdays: number[] | undefined = undefined
              let mission_completion_type: string | undefined = undefined

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

      // Invalidate mandalart list cache so list screen refreshes
      await queryClient.invalidateQueries({ queryKey: mandalartKeys.lists() })

      // Track mandalart creation
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
      setStep('preview')
    } finally {
      setIsSaving(false)
    }
  }, [user, mandalartData, title, inputMethod, navigation, queryClient, t])

  // Render method selection
  if (step === 'select') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Progress overlay */}
        <ProgressOverlay
          visible={!!progress}
          message={progress?.message ? t(`mandalart.create.ocr.${progress.message}`, progress.message) : ''}
        />

        {/* Header */}
        <View className="flex-row items-center px-5 h-16 border-b border-gray-100">
          <Pressable onPress={handleBack} className="p-2.5 -ml-2.5 rounded-full active:bg-gray-100">
            <ArrowLeft size={24} color="#374151" />
          </Pressable>
          <View className="flex-row items-center ml-2">
            <Text
              className="text-xl text-gray-900"
              style={{ fontFamily: 'Pretendard-Bold' }}
            >
              {t('mandalart.create.title')}
            </Text>
            <Text
              className="text-base text-gray-500 ml-3"
              style={{ fontFamily: 'Pretendard-Medium' }}
            >
              {t('mandalart.create.subtitle')}
            </Text>
          </View>
        </View>

        <MethodSelector onSelectMethod={handleSelectMethod} />
      </SafeAreaView>
    )
  }

  // Render image input with preview
  if (step === 'input' && inputMethod === 'image') {
    // iPad uses fullScreenModal, so use full width. Phone uses modal with limited width.
    const imageWidth = isTablet
      ? screenWidth - 40 // iPad: full width minus padding
      : screenWidth - 40 // Phone: full width minus padding (modal takes full width on phone)

    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Processing overlay */}
        {(progress || isProcessingOCR) && (
          <View className="absolute inset-0 bg-black/50 z-50 items-center justify-center">
            <View className="bg-white rounded-2xl p-6 mx-4 items-center">
              <ActivityIndicator size="large" color="#2563eb" />
              <Text className="text-gray-900 font-semibold mt-4">
                {progress?.message ? t(`mandalart.create.ocr.${progress.message}`, progress.message) : t('mandalart.create.imageUpload.processing')}
              </Text>
            </View>
          </View>
        )}

        {/* Header */}
        <View className="flex-row items-center justify-between px-5 h-16 border-b border-gray-100">
          <View className="flex-row items-center">
            <Pressable onPress={handleBack} className="p-2.5 -ml-2.5 rounded-full active:bg-gray-100">
              <ArrowLeft size={24} color="#374151" />
            </Pressable>
            <Text
              className="text-xl text-gray-900 ml-2"
              style={{ fontFamily: 'Pretendard-Bold' }}
            >
              {t('mandalart.create.imageUpload.title')}
            </Text>
          </View>
          {selectedImageUri && (
            <Pressable
              onPress={handleProcessOCR}
              disabled={isProcessingOCR}
              className="rounded-2xl overflow-hidden"
            >
              <LinearGradient
                colors={['#2563eb', '#9333ea', '#db2777']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ padding: 1, borderRadius: 16 }}
              >
                <View className="bg-white rounded-2xl px-5 py-2.5 items-center justify-center">
                  <MaskedView
                    maskElement={
                      <Text style={{ fontFamily: 'Pretendard-SemiBold' }}>
                        {t('mandalart.create.imageUpload.extractText')}
                      </Text>
                    }
                  >
                    <LinearGradient
                      colors={['#2563eb', '#9333ea', '#db2777']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={{ fontFamily: 'Pretendard-SemiBold', opacity: 0 }}>
                        {t('mandalart.create.imageUpload.extractText')}
                      </Text>
                    </LinearGradient>
                  </MaskedView>
                </View>
              </LinearGradient>
            </Pressable>
          )}
        </View>

        <ScrollView className="flex-1 px-5 pt-5">
          <Text
            className="text-sm text-gray-500 mb-4"
            style={{ fontFamily: 'Pretendard-Regular' }}
          >
            {t('mandalart.create.imageUpload.hint')}
          </Text>

          {!selectedImageUri ? (
            // Image upload area
            <Pressable
              onPress={handleImageSourceSelect}
              className="border-2 border-dashed border-gray-300 rounded-3xl p-8 items-center justify-center bg-white active:bg-gray-50"
              style={{ minHeight: 220 }}
            >
              <Upload size={48} color="#9ca3af" />
              <Text
                className="text-base text-gray-500 mt-4 text-center"
                style={{ fontFamily: 'Pretendard-Medium' }}
              >
                {t('mandalart.create.imageUpload.tapToSelect')}
              </Text>
            </Pressable>
          ) : (
            // Image preview (larger size, no bottom buttons - use header button)
            <Pressable
              onPress={handleImageSourceSelect}
              className="bg-white rounded-3xl overflow-hidden border border-gray-100 active:opacity-90"
            >
              <Image
                source={{ uri: selectedImageUri }}
                style={{ width: imageWidth, height: imageWidth }}
                resizeMode="contain"
              />
            </Pressable>
          )}

        </ScrollView>
      </SafeAreaView>
    )
  }

  // Render text input
  if (step === 'input' && inputMethod === 'text') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        {progress && (
          <View className="absolute inset-0 bg-black/50 z-50 items-center justify-center">
            <View className="bg-white rounded-2xl p-6 mx-4 items-center">
              <ActivityIndicator size="large" color="#2563eb" />
              <Text className="text-gray-900 font-semibold mt-4">
                {t(`mandalart.create.ocr.${progress.message}`, progress.message)}
              </Text>
            </View>
          </View>
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 h-16 border-b border-gray-100">
            <View className="flex-row items-center">
              <Pressable onPress={handleBack} className="p-2.5 -ml-2.5 rounded-full active:bg-gray-100">
                <ArrowLeft size={24} color="#374151" />
              </Pressable>
              <Text
                className="text-xl text-gray-900 ml-2"
                style={{ fontFamily: 'Pretendard-Bold' }}
              >
                {t('mandalart.create.textPaste.title')}
              </Text>
            </View>
            <Pressable
              onPress={handleTextParse}
              className="rounded-2xl overflow-hidden"
            >
              <LinearGradient
                colors={['#2563eb', '#9333ea', '#db2777']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ padding: 1, borderRadius: 16 }}
              >
                <View className="bg-white rounded-2xl px-5 py-2.5 items-center justify-center">
                  <MaskedView
                    maskElement={
                      <Text style={{ fontFamily: 'Pretendard-SemiBold' }}>
                        {t('mandalart.create.textPaste.analyze')}
                      </Text>
                    }
                  >
                    <LinearGradient
                      colors={['#2563eb', '#9333ea', '#db2777']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={{ fontFamily: 'Pretendard-SemiBold', opacity: 0 }}>
                        {t('mandalart.create.textPaste.analyze')}
                      </Text>
                    </LinearGradient>
                  </MaskedView>
                </View>
              </LinearGradient>
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-5 pt-5">
            <Text
              className="text-sm text-gray-500 mb-4"
              style={{ fontFamily: 'Pretendard-Regular' }}
            >
              {t('mandalart.create.textPaste.hint')}
            </Text>
            <TextInput
              value={pasteText}
              onChangeText={setPasteText}
              placeholder={t('mandalart.create.textPaste.placeholder')}
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              className="bg-white rounded-3xl p-5 min-h-[300px] text-gray-900 border border-gray-100 text-base"
              style={{
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 3,
              }}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  // Render preview / edit with 3x3 grid
  if ((step === 'preview' || step === 'saving') && mandalartData) {
    // Render cell for expanded section view
    const renderExpandedCell = (sectionPos: number, cellPos: number) => {
      const subGoal = getSubGoalByPosition(sectionPos)

      if (cellPos === 4) {
        // Center: Sub-goal title (using same style as SubGoalCell 'center' variant)
        return (
          <View
            className="flex-1 items-center justify-center p-2"
            style={{
              backgroundColor: '#eff6ff', // bg-blue-50
              borderWidth: 1,
              borderColor: '#bfdbfe', // border-blue-200
            }}
          >
            {subGoal?.title ? (
              <Text
                className="text-center"
                style={{
                  fontSize: 14,
                  fontFamily: 'Pretendard-SemiBold',
                  color: '#1f2937',
                }}
                numberOfLines={3}
              >
                {subGoal.title}
              </Text>
            ) : (
              <Text
                className="text-center"
                style={{
                  fontSize: 12,
                  fontFamily: 'Pretendard-Regular',
                  color: '#9ca3af',
                }}
              >
                {t('mandalart.create.preview.subGoal')}
              </Text>
            )}
          </View>
        )
      } else {
        // Actions (0-3 = positions 0-3, 5-8 = positions 4-7)
        const actionIndex = cellPos < 4 ? cellPos : cellPos - 1
        const action = subGoal?.actions[actionIndex]

        return (
          <View className="flex-1 items-center justify-center p-1.5 bg-white">
            {action?.title ? (
              <Text className="text-[10px] text-center text-gray-700" numberOfLines={3}>
                {action.title}
              </Text>
            ) : (
              <Text className="text-[10px] text-gray-300 text-center">{t('mandalart.create.preview.action')} {actionIndex + 1}</Text>
            )}
          </View>
        )
      }
    }

    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        {isSaving && (
          <View className="absolute inset-0 bg-black/50 z-50 items-center justify-center">
            <View className="bg-white rounded-2xl p-6 mx-4 items-center">
              <ActivityIndicator size="large" color="#2563eb" />
              <Text className="text-gray-900 font-semibold mt-4">
                {t('mandalart.create.preview.saving')}
              </Text>
            </View>
          </View>
        )}

        {/* Header */}
        <View className="flex-row items-center justify-between px-5 h-16 border-b border-gray-100">
          <View className="flex-row items-center">
            <Pressable onPress={handleBack} className="p-2.5 -ml-2.5 rounded-full active:bg-gray-100">
              <ArrowLeft size={24} color="#374151" />
            </Pressable>
            <Text
              className="text-xl text-gray-900 ml-2"
              style={{ fontFamily: 'Pretendard-Bold' }}
            >
              {t('mandalart.create.preview.title')}
            </Text>
          </View>
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            className="rounded-2xl overflow-hidden"
          >
            <LinearGradient
              colors={['#2563eb', '#9333ea', '#db2777']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ padding: 1, borderRadius: 16 }}
            >
              <View className="bg-white rounded-2xl px-5 py-2.5 flex-row items-center justify-center">
                <MaskedView
                  maskElement={
                    <View className="flex-row items-center">
                      <Check size={18} color="#000" />
                      <Text className="ml-1" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                        {t('common.save')}
                      </Text>
                    </View>
                  }
                >
                  <LinearGradient
                    colors={['#2563eb', '#9333ea', '#db2777']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <View className="flex-row items-center opacity-0">
                      <Check size={18} color="#000" />
                      <Text className="ml-1" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                        {t('common.save')}
                      </Text>
                    </View>
                  </LinearGradient>
                </MaskedView>
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            alignItems: isTablet ? 'center' : undefined,
          }}
        >
          {/* iPad: Full 9x9 Grid */}
          {isTablet ? (
            (() => {
              // Calculate optimal grid size for iPad fullscreen modal
              const headerHeight = 64 // Header height
              const verticalPadding = 100 // Top and bottom padding + safe areas
              const availableHeight = screenHeight - headerHeight - verticalPadding
              const availableWidth = screenWidth - 40 // Horizontal padding
              const gridSize = Math.min(availableWidth, availableHeight, 700)

              // Transform mandalartData to match MandalartFullGrid interface
              const fullGridData = {
                id: 'preview',
                center_goal: mandalartData.center_goal,
                sub_goals: mandalartData.sub_goals.map(sg => ({
                  id: `preview-${sg.position}`,
                  mandalart_id: 'preview',
                  position: sg.position,
                  title: sg.title,
                  created_at: '',
                  actions: sg.actions.map(a => ({
                    id: `preview-action-${sg.position}-${a.position}`,
                    sub_goal_id: `preview-${sg.position}`,
                    position: a.position,
                    title: a.title,
                    type: 'routine' as const,
                    created_at: '',
                  })),
                })),
              }

              return (
                <View style={{ marginBottom: 20 }}>
                  <View className="mb-4">
                    <Text
                      className="text-base text-gray-900 text-center"
                      style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                      {t('mandalart.create.preview.tapToModify')}
                    </Text>
                  </View>
                  <MandalartFullGrid
                    mandalart={fullGridData}
                    gridSize={gridSize}
                    onCenterGoalPress={handleCoreGoalClick}
                    onSubGoalPress={(subGoal) => {
                      setSelectedSubGoalPosition(subGoal.position)
                      setSubGoalModalOpen(true)
                    }}
                    onActionPress={(subGoal) => {
                      setSelectedSubGoalPosition(subGoal.position)
                      setSubGoalModalOpen(true)
                    }}
                  />
                </View>
              )
            })()
          ) : (
            /* Phone: 3x3 Grid Card */
            <View
              className="bg-white rounded-3xl border border-gray-100 p-5 mb-5"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              <View className="mb-4">
                <Text
                  className="text-base text-gray-900"
                  style={{ fontFamily: 'Pretendard-SemiBold' }}
                >
                  {t('mandalart.create.manualInput.title')}
                </Text>
                <Text
                  className="text-sm text-gray-500 mt-1"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                >
                  {t('mandalart.create.manualInput.tapToEdit')}
                </Text>
              </View>

              {expandedSection === null ? (
                // Collapsed: 3x3 Sub-goals overview - Row-based layout
                <View>
                  {/* Row 1: positions 1, 2, 3 */}
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: CELL_GAP }}>
                    {[1, 2, 3].map((sectionPos) => {
                      const subGoal = getSubGoalByPosition(sectionPos)
                      const filledActions = subGoal?.actions.filter(a => a.title.trim()).length || 0

                      return (
                        <SubGoalCell
                          key={sectionPos}
                          title={subGoal?.title || ''}
                          size={cellSize}
                          position={sectionPos}
                          filledActions={filledActions}
                          onPress={() => handleSectionTap(sectionPos)}
                          variant="overview"
                        />
                      )
                    })}
                  </View>
                  {/* Row 2: positions 4, 0 (center), 5 */}
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: CELL_GAP, marginTop: CELL_GAP }}>
                    {[4, 0, 5].map((sectionPos) => {
                      if (sectionPos === 0) {
                        // Center: Core goal with gradient (using shared component)
                        return (
                          <CenterGoalCell
                            key="center"
                            centerGoal={mandalartData.center_goal}
                            size={cellSize}
                            onPress={handleCoreGoalClick}
                            showPlaceholder={true}
                            numberOfLines={3}
                          />
                        )
                      }

                      const subGoal = getSubGoalByPosition(sectionPos)
                      const filledActions = subGoal?.actions.filter(a => a.title.trim()).length || 0

                      return (
                        <SubGoalCell
                          key={sectionPos}
                          title={subGoal?.title || ''}
                          size={cellSize}
                          position={sectionPos}
                          filledActions={filledActions}
                          onPress={() => handleSectionTap(sectionPos)}
                          variant="overview"
                        />
                      )
                    })}
                  </View>
                  {/* Row 3: positions 6, 7, 8 */}
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: CELL_GAP, marginTop: CELL_GAP }}>
                    {[6, 7, 8].map((sectionPos) => {
                      const subGoal = getSubGoalByPosition(sectionPos)
                      const filledActions = subGoal?.actions.filter(a => a.title.trim()).length || 0

                      return (
                        <SubGoalCell
                          key={sectionPos}
                          title={subGoal?.title || ''}
                          size={cellSize}
                          position={sectionPos}
                          filledActions={filledActions}
                          onPress={() => handleSectionTap(sectionPos)}
                          variant="overview"
                        />
                      )
                    })}
                  </View>
                </View>
              ) : (
                // Expanded: 3x3 grid of selected section's actions
                <View>
                  <View className="flex-row items-center justify-between mb-4">
                    <Pressable
                      onPress={handleGridBack}
                      className="flex-row items-center px-4 py-2.5 border border-gray-300 rounded-2xl active:bg-gray-50"
                    >
                      <ChevronLeft size={16} color="#6b7280" />
                      <Text
                        className="text-sm text-gray-600 ml-0.5"
                        style={{ fontFamily: 'Pretendard-Medium' }}
                      >
                        {t('mandalart.create.preview.back')}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setSelectedSubGoalPosition(expandedSection)
                        setSubGoalModalOpen(true)
                      }}
                      className="px-4 py-2.5 bg-gray-900 rounded-2xl active:bg-gray-800"
                    >
                      <Text
                        className="text-sm text-white"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                      >
                        {t('common.edit')}
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable
                    onPress={() => {
                      setSelectedSubGoalPosition(expandedSection)
                      setSubGoalModalOpen(true)
                    }}
                    className="rounded-xl overflow-hidden border border-gray-200"
                  >
                    {/* Row-based 3x3 grid for expanded section */}
                    <View>
                      {/* Row 1 */}
                      <View style={{ flexDirection: 'row' }}>
                        {[0, 1, 2].map((cellPos) => (
                          <View
                            key={cellPos}
                            style={{
                              width: cellSize,
                              height: cellSize,
                              borderRightWidth: cellPos < 2 ? 1 : 0,
                              borderBottomWidth: 1,
                              borderColor: '#e5e7eb',
                            }}
                          >
                            {renderExpandedCell(expandedSection, cellPos)}
                          </View>
                        ))}
                      </View>
                      {/* Row 2 */}
                      <View style={{ flexDirection: 'row' }}>
                        {[3, 4, 5].map((cellPos) => (
                          <View
                            key={cellPos}
                            style={{
                              width: cellSize,
                              height: cellSize,
                              borderRightWidth: cellPos < 5 ? 1 : 0,
                              borderBottomWidth: 1,
                              borderColor: '#e5e7eb',
                            }}
                          >
                            {renderExpandedCell(expandedSection, cellPos)}
                          </View>
                        ))}
                      </View>
                      {/* Row 3 */}
                      <View style={{ flexDirection: 'row' }}>
                        {[6, 7, 8].map((cellPos) => (
                          <View
                            key={cellPos}
                            style={{
                              width: cellSize,
                              height: cellSize,
                              borderRightWidth: cellPos < 8 ? 1 : 0,
                              borderColor: '#e5e7eb',
                            }}
                          >
                            {renderExpandedCell(expandedSection, cellPos)}
                          </View>
                        ))}
                      </View>
                    </View>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          <View className="h-8" />
        </ScrollView>

        {/* Core Goal Modal */}
        <CoreGoalModal
          visible={coreGoalModalOpen}
          onClose={() => setCoreGoalModalOpen(false)}
          initialTitle={title}
          initialCenterGoal={mandalartData.center_goal}
          onSave={handleCoreGoalSave}
        />

        {/* Sub Goal Modal */}
        {selectedSubGoalPosition !== null && (
          <SubGoalModal
            visible={subGoalModalOpen}
            onClose={() => {
              setSubGoalModalOpen(false)
              setSelectedSubGoalPosition(null)
            }}
            position={selectedSubGoalPosition}
            initialTitle={getSubGoalByPosition(selectedSubGoalPosition)?.title || ''}
            initialActions={getSubGoalByPosition(selectedSubGoalPosition)?.actions || []}
            onSave={handleSubGoalSave}
          />
        )}
      </SafeAreaView>
    )
  }

  return null
}
