import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native'
import { X, Lightbulb, Sparkles, RefreshCcw, ChevronDown, ChevronUp, PlusCircle, Check, ArrowLeft } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTranslation } from 'react-i18next'
import { coachingService } from '../services/coachingService'
import ActionTypeSettingsView from './ActionTypeSettingsView'
import type { ActionType, RoutineFrequency, MissionCompletionType, MissionPeriodCycle } from '@mandaact/shared'

const cleanKeyword = (keyword: string): string => {
  if (!keyword) return '';
  return keyword
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]+$/, '') // Remove trailing symbols/punctuation
    .replace(/\s*[(\[{]$/, '') // Remove trailing open brackets/braces
    .replace(/\s*[(\[{][^)\]}]*$/, '') // Remove hanging open brackets that aren't closed
    .trim();
}

interface ActionInputModalProps {
  visible: boolean
  initialTitle: string
  subGoalTitle: string
  coreGoal: string
  existingActions: string[]
  onClose: () => void
  onSave: (title: string, type: string, details?: any) => Promise<void>
  isSaving?: boolean
}

export default function ActionInputModal({
  visible,
  initialTitle,
  subGoalTitle,
  coreGoal,
  existingActions,
  onClose,
  onSave,
  isSaving = false
}: ActionInputModalProps) {
  const { t, i18n } = useTranslation()
  const inputRef = useRef<TextInput>(null)

  // Wizard Step: 0 = Input, 1 = Settings
  const [step, setStep] = useState(0)

  // Data State
  const [title, setTitle] = useState(initialTitle)
  const [selectedType, setSelectedType] = useState<'routine' | 'mission' | 'reference'>('routine')

  // Detail State
  const [routineFrequency, setRoutineFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [routineWeekdays, setRoutineWeekdays] = useState<number[]>([])
  const [routineCountPerPeriod, setRoutineCountPerPeriod] = useState<number>(1)
  const [showMonthlyCustomInput, setShowMonthlyCustomInput] = useState(false)
  const [monthlyCustomValue, setMonthlyCustomValue] = useState('')

  const [missionType, setMissionType] = useState<'once' | 'periodic'>('once')
  const [missionCycle, setMissionCycle] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('weekly')

  // AI State
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [spinValue] = useState(new Animated.Value(0))
  const [aiRecommendedType, setAiRecommendedType] = useState<'routine' | 'mission' | 'reference' | null>(null)

  // UI State
  const [isGuideExpanded, setIsGuideExpanded] = useState(false)

  // Reset on Open
  useEffect(() => {
    if (visible) {
      setStep(0)
      setTitle(initialTitle)
      setSelectedType('routine')
      setRoutineFrequency('daily')
      setRoutineWeekdays([])
      setRoutineCountPerPeriod(1)
      setMissionType('once')
      setMissionCycle('weekly')
      setSuggestions([])
      setAiRecommendedType(null)
      setIsGuideExpanded(false)

      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [visible, initialTitle])

  // Animation Loop
  useEffect(() => {
    if (isSuggesting) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start()
    } else {
      spinValue.setValue(0)
    }
  }, [isSuggesting])

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  })

  // Handlers
  const fetchSuggestions = async () => {
    if (isSuggesting) return
    setIsSuggesting(true)
    try {
      const results = await coachingService.suggestActionsV2({
        subGoal: subGoalTitle,
        coreGoal: coreGoal,
        language: i18n.language,
        existingActions: existingActions
      })
      setSuggestions(results)
    } catch (e) {
      console.error('Failed to suggest actions', e)
    } finally {
      setIsSuggesting(false)
    }
  }

  const handleApplySuggestion = (item: any) => {
    const finalTitle = item.keyword || item.title || (typeof item === 'string' ? item : "");
    if (!finalTitle) return;

    setTitle(finalTitle);

    // Default to routine if not specified, or use the recommended type
    const recommendedType = item.type && ['routine', 'mission', 'reference'].includes(item.type)
      ? item.type as 'routine' | 'mission' | 'reference'
      : 'routine';

    setSelectedType(recommendedType);
    setAiRecommendedType(recommendedType);

    // Apply frequency for routine
    if (recommendedType === 'routine' && item.frequency) {
      if (['daily', 'weekly', 'monthly'].includes(item.frequency)) {
        setRoutineFrequency(item.frequency);
      }
    }

    // Apply cycle for mission
    if (recommendedType === 'mission' && item.cycle) {
      if (['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].includes(item.cycle)) {
        setMissionCycle(item.cycle);
      }
    }
  }

  const handleNext = () => {
    if (!title.trim()) return
    setStep(1)
  }

  const handleBack = () => {
    if (step === 1) {
      setStep(0)
    } else {
      onClose()
    }
  }

  const handleWeekdayToggle = (day: number) => {
    setRoutineWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleSave = () => {
    const details: any = {}

    if (selectedType === 'routine') {
      details.routine_frequency = routineFrequency
      if (routineFrequency === 'weekly') {
        if (routineWeekdays.length > 0) {
          details.routine_weekdays = routineWeekdays
        } else {
          details.routine_count_per_period = routineCountPerPeriod
        }
      } else if (routineFrequency === 'monthly') {
        details.routine_count_per_period = routineCountPerPeriod
      }
      // Daily needs no extra details usually
    } else if (selectedType === 'mission') {
      details.mission_completion_type = missionType
      if (missionType === 'periodic') {
        details.mission_period_cycle = missionCycle
      }
    }

    onSave(title, selectedType, details)
  }

  // Render Step 1: Input (Refined - Removed Chips)
  const renderInputStep = () => (
    <ScrollView className="px-5 py-4" showsVerticalScrollIndicator={false}>
      {/* Context Label (SubGoal Title) - Single Line */}
      <View className="mb-4 px-1">
        <Text className="text-gray-500 text-[14px]" style={{ fontFamily: 'Pretendard-Medium' }} numberOfLines={1}>
          {t('mandalart.detail.stats.subGoal', '세부목표')}: <Text className="text-gray-800 font-bold" style={{ fontFamily: 'Pretendard-Bold' }}>{subGoalTitle}</Text>
        </Text>
      </View>

      <TextInput
        ref={inputRef}
        value={title}
        onChangeText={setTitle}
        placeholder={t('mandalart.modal.action.placeholder', 'Enter a specific action')}
        placeholderTextColor="#9ca3af"
        className="bg-gray-50 border border-gray-100 rounded-2xl px-5 text-lg text-gray-900 mb-6"
        style={{ fontFamily: 'Pretendard-SemiBold', height: 56, textAlignVertical: 'center' }}
        multiline={false}
        returnKeyType="done"
        onSubmitEditing={handleNext}
      />

      {/* Guide Section */}
      <View className="bg-blue-50/50 rounded-3xl mb-6 border border-blue-100/50 overflow-hidden">
        <Pressable
          onPress={() => setIsGuideExpanded(!isGuideExpanded)}
          className="p-5 flex-row items-center justify-between"
        >
          <View className="flex-row items-center">
            <View className="bg-blue-100 p-2 rounded-xl mr-3">
              <Lightbulb size={18} color="#2563eb" />
            </View>
            <Text className="text-lg font-bold text-blue-900" style={{ fontFamily: 'Pretendard-Bold' }}>
              {t('mandalart.modal.action.guide.title')}
            </Text>
          </View>
          {isGuideExpanded ? <ChevronUp size={20} color="#2563eb" /> : <ChevronDown size={20} color="#2563eb" />}
        </Pressable>

        {isGuideExpanded && (
          <View className="px-5 pb-5 gap-y-4">
            {[1, 2, 3].map((num) => (
              <View key={num} className="flex-row items-start">
                <View className="w-1.5 h-1.5 rounded-full bg-blue-300 mt-2 mr-3" />
                <View className="flex-1">
                  <Text className="text-[15px] font-bold text-blue-900 mb-0.5" style={{ fontFamily: 'Pretendard-Bold' }}>
                    {t(`mandalart.modal.action.guide.tip${num}_title`)}
                  </Text>
                  <Text className="text-[13px] text-blue-800/70 leading-5" style={{ fontFamily: 'Pretendard-Medium' }}>
                    {t(`mandalart.modal.action.guide.tip${num}_desc`)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* AI Suggestion Section */}
      <View className="bg-purple-50/50 rounded-3xl p-5 border border-purple-100/50 mb-10">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View className="bg-purple-100 p-2 rounded-xl mr-3">
              <Sparkles size={18} color="#9333ea" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-purple-950" numberOfLines={1} style={{ fontFamily: 'Pretendard-Bold' }}>
                {t('mandalart.modal.action.aiSuggest.title', 'AI-Suggested Actions')}
              </Text>
              <Text className="text-[12px] text-purple-400 font-medium" style={{ fontFamily: 'Pretendard-Medium' }}>
                {t('mandalart.modal.action.aiSuggest.subtitle', 'Personalized actions to help you achieve your goal')}
              </Text>
            </View>
          </View>
          {/* Hide button during loading in English mode to prevent layout shift */}
          {(!isSuggesting || i18n.language.startsWith('ko')) && (
            <Pressable
              onPress={fetchSuggestions}
              disabled={isSuggesting}
              className="ml-2 px-4 py-2 bg-purple-600 rounded-xl active:bg-purple-700 disabled:bg-purple-300"
            >
              <Text className="text-white font-bold text-xs" style={{ fontFamily: 'Pretendard-Bold' }}>
                {isSuggesting ? t('mandalart.modal.action.aiSuggest.loading', 'Analyzing...') : t('mandalart.modal.subGoal.aiSuggest.getHelp', 'Get Ideas')}
              </Text>
            </Pressable>
          )}
        </View>

        {(isSuggesting || suggestions.length > 0) && (
          <View className="mt-4">
            {isSuggesting ? (
              <View className="py-8 items-center justify-center">
                <Animated.View style={{ transform: [{ rotate: spin }], marginBottom: 12, opacity: 0.5 }}>
                  <RefreshCcw size={24} color="#9333ea" />
                </Animated.View>
                <Text className="text-sm text-purple-400 font-medium" style={{ fontFamily: 'Pretendard-Medium' }}>
                  {t('mandalart.modal.action.aiSuggest.analyzing', 'Analyzing personalized suggestions...')}
                </Text>
              </View>
            ) : (
              <View className="gap-y-3">
                {suggestions.slice(0, 3).map((item, index) => {
                  const itemKeyword = item.keyword || item.title || (typeof item === 'string' ? item : "");
                  const itemDescription = item.description || "";
                  if (!itemKeyword) return null;

                  return (
                    <Pressable
                      key={index}
                      onPress={() => handleApplySuggestion(item)}
                      className="border border-purple-100 rounded-2xl overflow-hidden active:opacity-80 bg-white"
                      style={{
                        shadowColor: '#9333ea',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                        elevation: 2
                      }}
                    >
                      <LinearGradient
                        colors={['#ffffff', '#fafaff']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="px-4 py-4"
                      >
                        <View className="flex-row items-start">
                          <View className="flex-1">
                            <View className="flex-row items-center mb-2 flex-wrap gap-y-1">
                              <View className="bg-purple-100/80 px-2.5 py-1.5 rounded-lg border border-purple-200 mr-2">
                                <Text className="text-[13px] text-purple-700 font-bold" style={{ fontFamily: 'Pretendard-Bold' }}>
                                  {cleanKeyword(itemKeyword)}
                                </Text>
                              </View>
                              {index === 0 && (
                                <View className="bg-purple-600 px-2 py-0.5 rounded-full shadow-sm">
                                  <Text className="text-[10px] text-white font-bold" style={{ fontFamily: 'Pretendard-Bold' }}>
                                    ✨ {t('mandalart.modal.subGoal.aiSuggest.suggested') || '추천'}
                                  </Text>
                                </View>
                              )}
                            </View>
                            {itemDescription ? (
                              <Text
                                className="text-[14px] text-gray-800 leading-6"
                                style={{ fontFamily: 'Pretendard-Medium' }}
                              >
                                {itemDescription}
                              </Text>
                            ) : null}
                          </View>
                          <View className="ml-3 mt-1 bg-purple-50 p-1.5 rounded-full">
                            <PlusCircle size={20} color="#9333ea" />
                          </View>
                        </View>
                      </LinearGradient>
                    </Pressable>
                  )
                })}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  )

  // Render Step 2: Details (Using shared ActionTypeSettingsView)
  const renderDetailStep = () => (
    <ScrollView className="px-5 py-4" showsVerticalScrollIndicator={false}>
      <ActionTypeSettingsView
        type={selectedType}
        actionTitle={title}
        routineFrequency={routineFrequency}
        routineWeekdays={routineWeekdays}
        routineCountPerPeriod={routineCountPerPeriod}
        missionType={missionType}
        missionCycle={missionCycle}
        showMonthlyCustomInput={showMonthlyCustomInput}
        monthlyCustomValue={monthlyCustomValue}
        aiSuggestion={aiRecommendedType ? { type: aiRecommendedType } : null}
        onTypeChange={(type) => setSelectedType(type as 'routine' | 'mission' | 'reference')}
        onRoutineFrequencyChange={(freq) => {
          setRoutineFrequency(freq as 'daily' | 'weekly' | 'monthly')
          setRoutineWeekdays([])
          setShowMonthlyCustomInput(false)
          setMonthlyCustomValue('')
        }}
        onWeekdayToggle={(day) => {
          setRoutineWeekdays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
          )
        }}
        onRoutineCountChange={setRoutineCountPerPeriod}
        onMissionTypeChange={(type) => setMissionType(type as 'once' | 'periodic')}
        onMissionCycleChange={(cycle) => setMissionCycle(cycle as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly')}
        onShowMonthlyCustomInputChange={setShowMonthlyCustomInput}
        onMonthlyCustomValueChange={setMonthlyCustomValue}
      />

      <View className="h-8" />
    </ScrollView>
  )

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
          <Pressable className="bg-white rounded-t-2xl max-h-[85%]" onPress={(e) => e.stopPropagation()}>

            {/* Header */}
            <View className="flex-row items-center justify-between p-5 border-b border-gray-100">
              <View className="flex-row items-center">
                {step === 0 ? (
                  <Pressable onPress={onClose} className="p-1 mr-3 rounded-full active:bg-gray-100">
                    <X size={24} color="#374151" />
                  </Pressable>
                ) : (
                  <Pressable onPress={handleBack} className="p-1 mr-3 rounded-full active:bg-gray-100">
                    <ArrowLeft size={24} color="#374151" />
                  </Pressable>
                )}
                <Text className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Pretendard-Bold' }}>
                  {step === 0 ? t('mandalart.modal.action.inputTitle', 'Enter Action') : t('actionType.selector.title', 'Type Settings')}
                </Text>
              </View>

              {step === 0 ? (
                /* Next button: gradient border only */
                <Pressable
                  onPress={handleNext}
                  disabled={!title.trim()}
                  className="rounded-2xl overflow-hidden"
                >
                  <LinearGradient
                    colors={!title.trim() ? ['#e5e7eb', '#e5e7eb'] : ['#2563eb', '#9333ea', '#db2777']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ padding: 2, borderRadius: 16 }}
                  >
                    <View style={{ backgroundColor: 'white', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 14 }}>
                      <Text className={`font-bold ${!title.trim() ? 'text-gray-400' : 'text-violet-600'}`} style={{ fontFamily: 'Pretendard-Bold' }}>
                        {t('common.next', 'Next')}
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              ) : (
                /* Save button: gradient border like Next */
                <Pressable
                  onPress={handleSave}
                  disabled={!title.trim() || isSaving}
                  className="rounded-2xl overflow-hidden"
                >
                  <LinearGradient
                    colors={!title.trim() ? ['#e5e7eb', '#e5e7eb'] : ['#2563eb', '#9333ea', '#db2777']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ padding: 2, borderRadius: 16 }}
                  >
                    <View style={{ backgroundColor: 'white', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 14 }}>
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#7c3aed" />
                      ) : (
                        <Text className={`font-bold ${!title.trim() ? 'text-gray-400' : 'text-violet-600'}`} style={{ fontFamily: 'Pretendard-Bold' }}>
                          {t('common.save', 'Save')}
                        </Text>
                      )}
                    </View>
                  </LinearGradient>
                </Pressable>
              )}
            </View>

            {step === 0 ? renderInputStep() : renderDetailStep()}

          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}
