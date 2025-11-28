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
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  FileText,
  PenLine,
  Check,
  Upload,
  Plus,
  ChevronLeft,
} from 'lucide-react-native'

import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { runOCRFlowFromUri, parseMandalartText, type OCRResult, type UploadProgress } from '../services/ocrService'
import * as ImagePicker from 'expo-image-picker'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { suggestActionType } from '@mandaact/shared'
import { logger } from '../lib/logger'
import CoreGoalModal from '../components/CoreGoalModal'
import SubGoalModal from '../components/SubGoalModal'
import { LinearGradient } from 'expo-linear-gradient'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

type InputMethod = 'image' | 'text' | 'manual'
type Step = 'select' | 'input' | 'preview' | 'saving'

interface MandalartData {
  title: string
  center_goal: string
  sub_goals: Array<{
    position: number
    title: string
    actions: Array<{
      position: number
      title: string
    }>
  }>
}

export default function MandalartCreateScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { user } = useAuthStore()

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
    Alert.alert('이미지 선택', '어디서 이미지를 가져올까요?', [
      {
        text: '카메라',
        onPress: () => handleImagePick('camera'),
      },
      {
        text: '갤러리',
        onPress: () => handleImagePick('library'),
      },
      { text: '취소', style: 'cancel' },
    ])
  }, [])

  // Pick image and show preview (without OCR yet)
  const handleImagePick = useCallback(
    async (source: 'camera' | 'library') => {
      if (!user) return

      try {
        let result
        if (source === 'camera') {
          const { status } = await ImagePicker.requestCameraPermissionsAsync()
          if (status !== 'granted') {
            Alert.alert('권한 필요', '카메라 접근 권한이 필요합니다.')
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
            Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.')
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
        Alert.alert('오류', '이미지 선택 중 오류가 발생했습니다.')
      }
    },
    [user]
  )

  // Process OCR from selected image
  const handleProcessOCR = useCallback(async () => {
    if (!user || !selectedImageUri) return

    setIsProcessingOCR(true)
    setProgress({ stage: 'processing', message: 'OCR 처리 중...' })

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
      Alert.alert('오류', err instanceof Error ? err.message : 'OCR 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessingOCR(false)
      setProgress(null)
    }
  }, [user, selectedImageUri])

  const handleTextParse = useCallback(async () => {
    if (!pasteText.trim()) {
      Alert.alert('오류', '텍스트를 입력해주세요.')
      return
    }

    setProgress({ stage: 'processing', message: '텍스트 분석 중...' })

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
      Alert.alert('오류', '텍스트 파싱 중 오류가 발생했습니다.')
    } finally {
      setProgress(null)
    }
  }, [pasteText])

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
    const subGoal = mandalartData?.sub_goals.find(sg => sg.position === sectionPos)
    const isEmpty = !subGoal?.title?.trim()

    if (isEmpty) {
      // Empty sub-goal: directly open modal
      setSelectedSubGoalPosition(sectionPos)
      setSubGoalModalOpen(true)
    } else if (expandedSection === sectionPos) {
      // Already expanded, open modal
      setSelectedSubGoalPosition(sectionPos)
      setSubGoalModalOpen(true)
    } else {
      // Expand section to show details
      setExpandedSection(sectionPos)
    }
  }, [expandedSection, mandalartData])

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
  const sectionPositions = [1, 2, 3, 4, 0, 5, 6, 7, 8]

  const handleSave = useCallback(async () => {
    if (!user || !mandalartData) return

    if (!title.trim()) {
      Alert.alert('오류', '제목을 입력해주세요.')
      return
    }

    if (!mandalartData.center_goal.trim()) {
      Alert.alert('오류', '핵심 목표를 입력해주세요.')
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

      Alert.alert('성공', '만다라트가 생성되었습니다!', [
        {
          text: '확인',
          onPress: () => navigation.goBack(),
        },
      ])
    } catch (err) {
      logger.error('Save error', err)
      Alert.alert('오류', '저장 중 오류가 발생했습니다.')
      setStep('preview')
    } finally {
      setIsSaving(false)
    }
  }, [user, mandalartData, title, inputMethod, navigation])

  // Render method selection
  if (step === 'select') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Progress overlay */}
        {progress && (
          <View className="absolute inset-0 bg-black/50 z-50 items-center justify-center">
            <View className="bg-white rounded-2xl p-6 mx-4 items-center">
              <ActivityIndicator size="large" color="#667eea" />
              <Text className="text-gray-900 font-semibold mt-4">
                {progress.message}
              </Text>
            </View>
          </View>
        )}

        {/* Header - Web과 동일 */}
        <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
          <Pressable onPress={handleBack} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#374151" />
          </Pressable>
          <View className="flex-row items-center ml-2">
            <Text className="text-lg font-semibold text-gray-900">
              만다라트 만들기
            </Text>
            <Text className="text-sm text-gray-500 ml-2">새로운 목표 생성</Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-4 pt-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            생성 방식 선택
          </Text>

          {/* Image OCR - Lucide 아이콘 */}
          <Pressable
            onPress={() => handleSelectMethod('image')}
            className="bg-white rounded-2xl p-5 mb-3 border border-gray-200 flex-row items-center shadow-sm"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
          >
            <View className="w-12 h-12 rounded-xl bg-gray-100 items-center justify-center mr-4">
              <ImageIcon size={24} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                이미지 업로드
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                만들어둔 만다라트가 있다면 사진 찍어 업로드
              </Text>
            </View>
          </Pressable>

          {/* Text Paste - Lucide 아이콘 */}
          <Pressable
            onPress={() => handleSelectMethod('text')}
            className="bg-white rounded-2xl p-5 mb-3 border border-gray-200 flex-row items-center shadow-sm"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
          >
            <View className="w-12 h-12 rounded-xl bg-gray-100 items-center justify-center mr-4">
              <FileText size={24} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                텍스트 붙여넣기
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                AI로 만든 텍스트가 있다면 복사해서 붙여넣기
              </Text>
            </View>
          </Pressable>

          {/* Manual Input - Lucide 아이콘 */}
          <Pressable
            onPress={() => {
              setInputMethod('manual')
              handleManualCreate()
            }}
            className="bg-white rounded-2xl p-5 mb-3 border border-gray-200 flex-row items-center shadow-sm"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
          >
            <View className="w-12 h-12 rounded-xl bg-gray-100 items-center justify-center mr-4">
              <PenLine size={24} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                직접 입력
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                아직 없다면 빈 그리드에서 처음부터 작성
              </Text>
            </View>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // Render image input with preview
  if (step === 'input' && inputMethod === 'image') {
    const screenWidth = Dimensions.get('window').width
    const imageWidth = screenWidth - 32 // px-4 * 2

    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Processing overlay */}
        {(progress || isProcessingOCR) && (
          <View className="absolute inset-0 bg-black/50 z-50 items-center justify-center">
            <View className="bg-white rounded-2xl p-6 mx-4 items-center">
              <ActivityIndicator size="large" color="#667eea" />
              <Text className="text-gray-900 font-semibold mt-4">
                {progress?.message || 'OCR 처리 중...'}
              </Text>
            </View>
          </View>
        )}

        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
          <View className="flex-row items-center">
            <Pressable onPress={handleBack} className="p-2 -ml-2">
              <ArrowLeft size={24} color="#374151" />
            </Pressable>
            <Text className="text-lg font-semibold text-gray-900 ml-2">
              이미지 업로드
            </Text>
          </View>
          {selectedImageUri && (
            <Pressable
              onPress={handleProcessOCR}
              disabled={isProcessingOCR}
              className="bg-primary px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-semibold">텍스트 추출</Text>
            </Pressable>
          )}
        </View>

        <ScrollView className="flex-1 px-4 pt-4">
          <Text className="text-sm text-gray-500 mb-3">
            만다라트 이미지를 업로드하면 자동으로 텍스트를 추출합니다
          </Text>

          {!selectedImageUri ? (
            // Image upload area
            <Pressable
              onPress={handleImageSourceSelect}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 items-center justify-center bg-white"
              style={{ minHeight: 200 }}
            >
              <Upload size={48} color="#9ca3af" />
              <Text className="text-gray-500 mt-4 text-center">
                클릭하여 이미지 선택 (최대 5MB)
              </Text>
            </Pressable>
          ) : (
            // Image preview
            <View className="space-y-4">
              <View className="bg-white rounded-xl overflow-hidden border border-gray-200">
                <Image
                  source={{ uri: selectedImageUri }}
                  style={{ width: imageWidth, height: imageWidth * 0.75 }}
                  resizeMode="contain"
                />
              </View>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setSelectedImageUri(null)}
                  disabled={isProcessingOCR}
                  className="flex-1 bg-white border border-gray-300 py-3 rounded-xl items-center"
                >
                  <Text className="text-gray-700 font-medium">다시 선택</Text>
                </Pressable>
                <Pressable
                  onPress={handleProcessOCR}
                  disabled={isProcessingOCR}
                  className="flex-1 bg-primary py-3 rounded-xl items-center"
                >
                  <Text className="text-white font-medium">
                    {isProcessingOCR ? 'OCR 처리 중...' : '텍스트 추출'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Other method button */}
          <Pressable
            onPress={handleBack}
            disabled={isProcessingOCR}
            className="mt-6 py-3 items-center"
          >
            <Text className="text-gray-500">다른 방법 선택</Text>
          </Pressable>
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
              <ActivityIndicator size="large" color="#667eea" />
              <Text className="text-gray-900 font-semibold mt-4">
                {progress.message}
              </Text>
            </View>
          </View>
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
            <View className="flex-row items-center">
              <Pressable onPress={handleBack} className="p-2 -ml-2">
                <ArrowLeft size={24} color="#374151" />
              </Pressable>
              <Text className="text-lg font-semibold text-gray-900 ml-2">
                텍스트 입력
              </Text>
            </View>
            <Pressable
              onPress={handleTextParse}
              className="bg-primary px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-semibold">분석</Text>
            </Pressable>
          </View>

          <ScrollView className="flex-1 px-4 pt-4">
            <Text className="text-sm text-gray-500 mb-3">
              만다라트 텍스트를 붙여넣으면 자동으로 분석합니다
            </Text>
            <TextInput
              value={pasteText}
              onChangeText={setPasteText}
              placeholder={`(예시) 핵심 목표: 건강한 삶

1. 운동
   - 매일 30분 걷기
   - 주 3회 근력 운동
   - 스트레칭 루틴
   - 요가 수업
   - 등산 가기
   - 수영 배우기
   - 홈트레이닝
   - 자전거 타기

2. 식습관
   - 아침 거르지 않기
   - 물 2L 마시기
   - 채소 위주 식단
   - 가공식품 줄이기

... (총 8개 세부 목표, 각 8개 실천 항목)`}
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              className="bg-white rounded-xl p-4 min-h-[300px] text-gray-900 border border-gray-200 text-sm"
              style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}
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
        // Center: Sub-goal title
        return (
          <View className="flex-1 items-center justify-center p-1.5 bg-blue-50 border border-blue-200">
            {subGoal?.title ? (
              <Text className="text-xs font-semibold text-center" numberOfLines={3}>
                {subGoal.title}
              </Text>
            ) : (
              <Text className="text-xs text-gray-400 text-center">세부목표</Text>
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
              <Text className="text-[10px] text-gray-300 text-center">실천 {actionIndex + 1}</Text>
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
              <ActivityIndicator size="large" color="#667eea" />
              <Text className="text-gray-900 font-semibold mt-4">
                저장 중...
              </Text>
            </View>
          </View>
        )}

        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
          <View className="flex-row items-center">
            <Pressable onPress={handleBack} className="p-2 -ml-2">
              <ArrowLeft size={24} color="#374151" />
            </Pressable>
            <Text className="text-lg font-semibold text-gray-900 ml-2">
              확인 및 수정
            </Text>
          </View>
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            className="bg-primary px-4 py-2 rounded-lg flex-row items-center"
          >
            <Check size={18} color="white" />
            <Text className="text-white font-semibold ml-1">저장</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-4 pt-4">
          {/* 3x3 Grid Card */}
          <View className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <View className="mb-3">
              <Text className="font-semibold text-gray-900">직접 입력</Text>
              <Text className="text-sm text-gray-500 mt-0.5">
                셀을 탭하여 목표와 실천 항목을 입력하세요
              </Text>
            </View>

            {expandedSection === null ? (
              // Collapsed: 3x3 Sub-goals overview
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {sectionPositions.map((sectionPos) => {
                  const screenWidth = Dimensions.get('window').width
                  const cellSize = (screenWidth - 32 - 32 - 16) / 3 // padding + card padding + gaps

                  if (sectionPos === 0) {
                    // Center: Core goal with gradient
                    return (
                      <Pressable
                        key="center"
                        onPress={handleCoreGoalClick}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          borderRadius: 12,
                          overflow: 'hidden',
                        }}
                        className="active:opacity-80"
                      >
                        <LinearGradient
                          colors={['#667eea', '#764ba2']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 8,
                          }}
                        >
                          {mandalartData.center_goal ? (
                            <Text className="text-sm font-bold text-center text-white" numberOfLines={3}>
                              {mandalartData.center_goal}
                            </Text>
                          ) : (
                            <Plus size={24} color="rgba(255,255,255,0.5)" />
                          )}
                        </LinearGradient>
                      </Pressable>
                    )
                  }

                  const subGoal = getSubGoalByPosition(sectionPos)
                  const filledActions = subGoal?.actions.filter(a => a.title.trim()).length || 0

                  return (
                    <Pressable
                      key={sectionPos}
                      onPress={() => handleSectionTap(sectionPos)}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: 12,
                      }}
                      className="bg-blue-50 border border-blue-200 items-center justify-center p-2 active:bg-blue-100"
                    >
                      <Text className="text-[10px] text-gray-400 mb-0.5">
                        세부 {sectionPos}
                      </Text>
                      <Text className="text-xs font-medium text-center text-gray-900" numberOfLines={2}>
                        {subGoal?.title || ''}
                      </Text>
                      {subGoal?.title && (
                        <Text className="text-[10px] text-gray-400 mt-0.5">
                          {filledActions}/8개
                        </Text>
                      )}
                    </Pressable>
                  )
                })}
              </View>
            ) : (
              // Expanded: 3x3 grid of selected section's actions
              <View>
                <View className="flex-row items-center justify-between mb-3">
                  <Pressable
                    onPress={handleGridBack}
                    className="flex-row items-center px-3 py-1.5 border border-gray-300 rounded-lg"
                  >
                    <ChevronLeft size={16} color="#6b7280" />
                    <Text className="text-sm text-gray-600 ml-0.5">뒤로</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setSelectedSubGoalPosition(expandedSection)
                      setSubGoalModalOpen(true)
                    }}
                    className="px-3 py-1.5 bg-primary rounded-lg"
                  >
                    <Text className="text-sm text-white font-medium">수정</Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => {
                    setSelectedSubGoalPosition(expandedSection)
                    setSubGoalModalOpen(true)
                  }}
                  className="rounded-xl overflow-hidden border border-gray-200"
                >
                  <View className="flex-row flex-wrap">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((cellPos) => {
                      const screenWidth = Dimensions.get('window').width
                      const gridSize = screenWidth - 32 - 32 - 2 // padding + card padding + border
                      const cellSize = gridSize / 3

                      return (
                        <View
                          key={cellPos}
                          style={{
                            width: cellSize,
                            height: cellSize,
                            borderRightWidth: (cellPos + 1) % 3 === 0 ? 0 : 1,
                            borderBottomWidth: cellPos >= 6 ? 0 : 1,
                            borderColor: '#e5e7eb',
                          }}
                        >
                          {renderExpandedCell(expandedSection, cellPos)}
                        </View>
                      )
                    })}
                  </View>
                </Pressable>
              </View>
            )}
          </View>

          {/* Actions */}
          <View className="flex-row mb-6" style={{ gap: 8 }}>
            <Pressable
              onPress={() => {
                setStep('select')
                setInputMethod(null)
                setMandalartData(null)
                setTitle('')
                setExpandedSection(null)
              }}
              disabled={isSaving}
              className="flex-1 bg-white border border-gray-300 py-3 rounded-xl items-center"
            >
              <Text className="text-gray-700 font-medium">취소</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              className="flex-1 bg-primary py-3 rounded-xl items-center"
            >
              <Text className="text-white font-medium">
                {isSaving ? '저장 중...' : '저장'}
              </Text>
            </Pressable>
          </View>

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
