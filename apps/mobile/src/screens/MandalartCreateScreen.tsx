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
  Camera,
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

import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { runOCRFlowFromUri, parseMandalartText, type OCRResult, type UploadProgress } from '../services/ocrService'
import * as ImagePicker from 'expo-image-picker'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { suggestActionType } from '@mandaact/shared'
import { logger } from '../lib/logger'
import CoreGoalModal from '../components/CoreGoalModal'
import SubGoalModal from '../components/SubGoalModal'
import { CenterGoalCell, SubGoalCell } from '../components'
import { mandalartKeys } from '../hooks/useMandalarts'

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

// Grid layout constants
const CONTAINER_PADDING = 16
const CARD_PADDING = 16
const CELL_GAP = 8

export default function MandalartCreateScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const { width: screenWidth } = useWindowDimensions()

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

      // Invalidate mandalart list cache so list screen refreshes
      await queryClient.invalidateQueries({ queryKey: mandalartKeys.lists() })

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
  }, [user, mandalartData, title, inputMethod, navigation, queryClient])

  // Render method selection
  if (step === 'select') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Progress overlay */}
        {progress && (
          <View className="absolute inset-0 bg-black/50 z-50 items-center justify-center">
            <View className="bg-white rounded-2xl p-6 mx-4 items-center">
              <ActivityIndicator size="large" color="#2563eb" />
              <Text className="text-gray-900 font-semibold mt-4">
                {progress.message}
              </Text>
            </View>
          </View>
        )}

        {/* Header - Beautified */}
        <View className="flex-row items-center px-5 h-16 border-b border-gray-100">
          <Pressable onPress={handleBack} className="p-2.5 -ml-2.5 rounded-full active:bg-gray-100">
            <ArrowLeft size={24} color="#374151" />
          </Pressable>
          <View className="flex-row items-center ml-2">
            <Text
              className="text-xl text-gray-900"
              style={{ fontFamily: 'Pretendard-Bold' }}
            >
              만다라트 만들기
            </Text>
            <Text
              className="text-base text-gray-500 ml-3"
              style={{ fontFamily: 'Pretendard-Medium' }}
            >
              새로운 목표 생성
            </Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-5 pt-5">
          <Text
            className="text-lg text-gray-900 mb-5"
            style={{ fontFamily: 'Pretendard-SemiBold' }}
          >
            생성 방식 선택
          </Text>

          {/* Image OCR */}
          <Pressable
            onPress={() => handleSelectMethod('image')}
            className="bg-white rounded-3xl p-5 mb-4 border border-gray-100 flex-row items-center active:bg-gray-50"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <View className="w-14 h-14 rounded-2xl bg-gray-100 items-center justify-center mr-4">
              <ImageIcon size={26} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text
                className="text-base text-gray-900"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                이미지 업로드
              </Text>
              <Text
                className="text-sm text-gray-500 mt-1"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                만들어둔 만다라트가 있다면 사진 찍어 업로드
              </Text>
            </View>
          </Pressable>

          {/* Text Paste */}
          <Pressable
            onPress={() => handleSelectMethod('text')}
            className="bg-white rounded-3xl p-5 mb-4 border border-gray-100 flex-row items-center active:bg-gray-50"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <View className="w-14 h-14 rounded-2xl bg-gray-100 items-center justify-center mr-4">
              <FileText size={26} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text
                className="text-base text-gray-900"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                텍스트 붙여넣기
              </Text>
              <Text
                className="text-sm text-gray-500 mt-1"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                AI로 만든 텍스트가 있다면 복사해서 붙여넣기
              </Text>
            </View>
          </Pressable>

          {/* Manual Input */}
          <Pressable
            onPress={() => {
              setInputMethod('manual')
              handleManualCreate()
            }}
            className="bg-white rounded-3xl p-5 mb-4 border border-gray-100 flex-row items-center active:bg-gray-50"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <View className="w-14 h-14 rounded-2xl bg-gray-100 items-center justify-center mr-4">
              <PenLine size={26} color="#6b7280" />
            </View>
            <View className="flex-1">
              <Text
                className="text-base text-gray-900"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                직접 입력
              </Text>
              <Text
                className="text-sm text-gray-500 mt-1"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
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
    const imageWidth = screenWidth - 32 // px-4 * 2

    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Processing overlay */}
        {(progress || isProcessingOCR) && (
          <View className="absolute inset-0 bg-black/50 z-50 items-center justify-center">
            <View className="bg-white rounded-2xl p-6 mx-4 items-center">
              <ActivityIndicator size="large" color="#2563eb" />
              <Text className="text-gray-900 font-semibold mt-4">
                {progress?.message || 'OCR 처리 중...'}
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
              이미지 업로드
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
                        텍스트 추출
                      </Text>
                    }
                  >
                    <LinearGradient
                      colors={['#2563eb', '#9333ea', '#db2777']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={{ fontFamily: 'Pretendard-SemiBold', opacity: 0 }}>
                        텍스트 추출
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
            만다라트 이미지를 업로드하면 자동으로 텍스트를 추출합니다
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
                탭하여 이미지 선택 (최대 5MB)
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
          <View className="flex-row items-center justify-between px-5 h-16 border-b border-gray-100">
            <View className="flex-row items-center">
              <Pressable onPress={handleBack} className="p-2.5 -ml-2.5 rounded-full active:bg-gray-100">
                <ArrowLeft size={24} color="#374151" />
              </Pressable>
              <Text
                className="text-xl text-gray-900 ml-2"
                style={{ fontFamily: 'Pretendard-Bold' }}
              >
                텍스트 붙여넣기
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
                        텍스트 분석
                      </Text>
                    }
                  >
                    <LinearGradient
                      colors={['#2563eb', '#9333ea', '#db2777']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={{ fontFamily: 'Pretendard-SemiBold', opacity: 0 }}>
                        텍스트 분석
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
                세부목표
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
              <ActivityIndicator size="large" color="#2563eb" />
              <Text className="text-gray-900 font-semibold mt-4">
                저장 중...
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
              확인 및 수정
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
                        저장
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
                        저장
                      </Text>
                    </View>
                  </LinearGradient>
                </MaskedView>
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-5 pt-5">
          {/* 3x3 Grid Card */}
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
                직접 입력
              </Text>
              <Text
                className="text-sm text-gray-500 mt-1"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                셀을 탭하여 목표와 실천 항목을 입력하세요
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
                      뒤로
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
                      수정
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
