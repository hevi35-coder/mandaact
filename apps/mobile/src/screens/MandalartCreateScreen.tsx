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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  ArrowLeft,
  Camera,
  ImageIcon,
  FileText,
  Edit3,
  Check,
} from 'lucide-react-native'

import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { runOCRFlow, parseMandalartText, type OCRResult, type UploadProgress } from '../services/ocrService'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { suggestActionType } from '@mandaact/shared'
import { logger } from '../lib/logger'

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

  const handleBack = useCallback(() => {
    if (step === 'select') {
      navigation.goBack()
    } else if (step === 'input' || step === 'preview') {
      setStep('select')
      setInputMethod(null)
      setMandalartData(null)
      setProgress(null)
    }
  }, [step, navigation])

  const handleSelectMethod = useCallback((method: InputMethod) => {
    setInputMethod(method)
    if (method === 'image') {
      // Show image source selection
      Alert.alert('이미지 선택', '어디서 이미지를 가져올까요?', [
        {
          text: '카메라',
          onPress: () => handleImageCapture('camera'),
        },
        {
          text: '갤러리',
          onPress: () => handleImageCapture('library'),
        },
        { text: '취소', style: 'cancel' },
      ])
    } else {
      setStep('input')
    }
  }, [])

  const handleImageCapture = useCallback(
    async (source: 'camera' | 'library') => {
      if (!user) return

      try {
        const result = await runOCRFlow(user.id, source, setProgress)
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
        setStep('select')
      } finally {
        setProgress(null)
      }
    },
    [user]
  )

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
  }, [])

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
              actionsToInsert.push({
                sub_goal_id: dbSubGoal.id,
                position: action.position,
                title: action.title.trim(),
                type: suggestion.type,
                routine_frequency: suggestion.routineFrequency,
                mission_completion_type: suggestion.missionCompletionType,
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

        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
          <Pressable onPress={handleBack} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#374151" />
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900 ml-2">
            새 만다라트
          </Text>
        </View>

        <ScrollView className="flex-1 px-4 pt-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            어떻게 만들까요?
          </Text>
          <Text className="text-gray-500 mb-6">
            입력 방식을 선택해주세요
          </Text>

          {/* Image OCR */}
          <Pressable
            onPress={() => handleSelectMethod('image')}
            className="bg-white rounded-2xl p-5 mb-3 border border-gray-200 flex-row items-center"
          >
            <View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center mr-4">
              <Camera size={24} color="#667eea" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                이미지로 만들기
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                만다라트 이미지를 촬영하거나 선택하세요
              </Text>
            </View>
          </Pressable>

          {/* Text Paste */}
          <Pressable
            onPress={() => handleSelectMethod('text')}
            className="bg-white rounded-2xl p-5 mb-3 border border-gray-200 flex-row items-center"
          >
            <View className="w-12 h-12 rounded-xl bg-amber-50 items-center justify-center mr-4">
              <FileText size={24} color="#f59e0b" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                텍스트로 만들기
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                엑셀이나 문서에서 텍스트를 붙여넣으세요
              </Text>
            </View>
          </Pressable>

          {/* Manual Input */}
          <Pressable
            onPress={() => {
              setInputMethod('manual')
              handleManualCreate()
            }}
            className="bg-white rounded-2xl p-5 mb-3 border border-gray-200 flex-row items-center"
          >
            <View className="w-12 h-12 rounded-xl bg-green-50 items-center justify-center mr-4">
              <Edit3 size={24} color="#22c55e" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                직접 입력하기
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                빈 템플릿에서 하나씩 입력하세요
              </Text>
            </View>
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
            <Text className="text-sm text-gray-500 mb-2">
              탭으로 구분된 텍스트나 구조화된 텍스트를 붙여넣으세요
            </Text>
            <TextInput
              value={pasteText}
              onChangeText={setPasteText}
              placeholder="텍스트를 여기에 붙여넣으세요..."
              multiline
              textAlignVertical="top"
              className="bg-white rounded-xl p-4 min-h-[300px] text-gray-900 border border-gray-200"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  // Render preview / edit
  if ((step === 'preview' || step === 'saving') && mandalartData) {
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
            {/* Title */}
            <Text className="text-sm font-medium text-gray-700 mb-1">제목</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="만다라트 제목"
              className="bg-white rounded-xl px-4 py-3 mb-4 text-gray-900 border border-gray-200"
            />

            {/* Center Goal */}
            <Text className="text-sm font-medium text-gray-700 mb-1">
              핵심 목표
            </Text>
            <TextInput
              value={mandalartData.center_goal}
              onChangeText={(text) =>
                setMandalartData({ ...mandalartData, center_goal: text })
              }
              placeholder="핵심 목표"
              className="bg-primary/5 rounded-xl px-4 py-3 mb-4 text-gray-900 border border-primary/20"
            />

            {/* Sub Goals */}
            {mandalartData.sub_goals.map((subGoal, sgIndex) => (
              <View key={sgIndex} className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  세부 목표 {subGoal.position}
                </Text>
                <TextInput
                  value={subGoal.title}
                  onChangeText={(text) => {
                    const newSubGoals = [...mandalartData.sub_goals]
                    newSubGoals[sgIndex] = { ...subGoal, title: text }
                    setMandalartData({ ...mandalartData, sub_goals: newSubGoals })
                  }}
                  placeholder={`세부 목표 ${subGoal.position}`}
                  className="bg-white rounded-xl px-4 py-3 mb-2 text-gray-900 border border-gray-200"
                />

                {/* Actions for this sub goal */}
                {subGoal.actions.map((action, actionIndex) => (
                  <TextInput
                    key={actionIndex}
                    value={action.title}
                    onChangeText={(text) => {
                      const newSubGoals = [...mandalartData.sub_goals]
                      const newActions = [...subGoal.actions]
                      newActions[actionIndex] = { ...action, title: text }
                      newSubGoals[sgIndex] = { ...subGoal, actions: newActions }
                      setMandalartData({ ...mandalartData, sub_goals: newSubGoals })
                    }}
                    placeholder={`실천 ${actionIndex + 1}`}
                    className="bg-gray-50 rounded-lg px-3 py-2 mb-1 text-sm text-gray-900 border border-gray-100 ml-4"
                  />
                ))}
              </View>
            ))}

            <View className="h-8" />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  return null
}
