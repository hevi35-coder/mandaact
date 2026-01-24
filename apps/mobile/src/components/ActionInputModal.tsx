import React, { useState, useEffect, useRef, useMemo } from 'react'
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
import { X, Lightbulb, Sparkles, RefreshCcw, ChevronDown, ChevronUp, PlusCircle, Check, ArrowLeft, Target, Calendar, Info, RotateCw } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTranslation } from 'react-i18next'
import { coachingService } from '../services/coachingService'

const WEEKLY_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7]
const MONTHLY_COUNT_OPTIONS = [1, 2, 3, 5, 10, 20, 30]

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

  // Translated constants
  const weekdays = useMemo(() => [
    { value: 1, label: t('actionType.weekdayShort.mon', '월'), short: t('actionType.weekdayShort.mon', '월') },
    { value: 2, label: t('actionType.weekdayShort.tue', '화'), short: t('actionType.weekdayShort.tue', '화') },
    { value: 3, label: t('actionType.weekdayShort.wed', '수'), short: t('actionType.weekdayShort.wed', '수') },
    { value: 4, label: t('actionType.weekdayShort.thu', '목'), short: t('actionType.weekdayShort.thu', '목') },
    { value: 5, label: t('actionType.weekdayShort.fri', '금'), short: t('actionType.weekdayShort.fri', '금') },
    { value: 6, label: t('actionType.weekdayShort.sat', '토'), short: t('actionType.weekdayShort.sat', '토') },
    { value: 0, label: t('actionType.weekdayShort.sun', '일'), short: t('actionType.weekdayShort.sun', '일') },
  ], [t])

  const frequencyOptions = [
    { value: 'daily', label: t('actionType.daily', '매일') },
    { value: 'weekly', label: t('actionType.weekly', '주간') },
    { value: 'monthly', label: t('actionType.monthly', '월간') },
  ] as const

  const missionCompletionOptions = [
    { value: 'once', label: t('actionType.selector.onceDesc', '1회성') },
    { value: 'periodic', label: t('actionType.selector.periodicDesc', '주기별') },
  ] as const

  const periodCycleOptions = [
    { value: 'daily', label: t('actionType.daily', '매일') },
    { value: 'weekly', label: t('actionType.weekly', '주간') },
    { value: 'monthly', label: t('actionType.monthly', '월간') },
    { value: 'quarterly', label: t('actionType.quarterly', '분기별') },
    { value: 'yearly', label: t('actionType.yearly', '매년') },
  ] as const

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
      <TextInput
        ref={inputRef}
        value={title}
        onChangeText={setTitle}
        placeholder={t('mandalart.action.placeholder', '구체적인 실천 행동을 입력하세요')}
        placeholderTextColor="#9ca3af"
        className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-lg text-gray-900 mb-6"
        style={{ fontFamily: 'Pretendard-SemiBold' }}
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
                AI 추천 실천항목
              </Text>
              <Text className="text-[12px] text-purple-400 font-medium" style={{ fontFamily: 'Pretendard-Medium' }}>
                목표 달성을 위한 구체적인 행동을 제안해요
              </Text>
            </View>
          </View>
          <Pressable
            onPress={fetchSuggestions}
            disabled={isSuggesting}
            className="ml-2 px-4 py-2 bg-purple-600 rounded-xl active:bg-purple-700 disabled:bg-purple-300"
          >
            <Text className="text-white font-bold text-xs" style={{ fontFamily: 'Pretendard-Bold' }}>
              {isSuggesting ? '분석 중...' : '추천 받기'}
            </Text>
          </Pressable>
        </View>

        {(isSuggesting || suggestions.length > 0) && (
          <View className="mt-4">
            {isSuggesting ? (
              <View className="py-8 items-center justify-center">
                <Animated.View style={{ transform: [{ rotate: spin }], marginBottom: 12, opacity: 0.5 }}>
                  <RefreshCcw size={24} color="#9333ea" />
                </Animated.View>
                <Text className="text-sm text-purple-400 font-medium" style={{ fontFamily: 'Pretendard-Medium' }}>
                  {t('mandalart.modal.subGoal.aiSuggest.loading') || '맞춤형 제안을 분석 중이에요...'}
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

  // Render Step 2: Details (Exact Match to ActionTypeSelector)
  const renderDetailStep = () => (
    <ScrollView className="px-5 py-4" showsVerticalScrollIndicator={false}>
      <Text className="text-gray-500 mb-6 text-sm" style={{ fontFamily: 'Pretendard-Medium' }}>
        "{title}"의 타입과 세부 설정을 선택하세요
      </Text>

      {/* Type Selection Cards */}
      <View className="mb-6">
        <Text className="text-base font-bold text-gray-900 mb-3" style={{ fontFamily: 'Pretendard-Bold' }}>
          {t('actionType.selector.typeLabel', '실천 항목 타입')}
        </Text>
        <View className="gap-3">
          {(['routine', 'mission', 'reference'] as const).map(type => (
            <Pressable
              key={type}
              onPress={() => setSelectedType(type)}
              className={`p-4 rounded-2xl border flex-row items-center ${selectedType === type ? 'bg-white border-gray-900' : 'bg-white border-gray-100'
                }`}
              style={selectedType === type ? { borderWidth: 1.5 } : {}}
            >
              <View className={`w-5 h-5 rounded-full border items-center justify-center mr-3 ${selectedType === type ? 'border-gray-900 bg-gray-900' : 'border-gray-300'}`}>
                {selectedType === type && <View className="w-2 h-2 rounded-full bg-white" />}
              </View>

              {type === 'routine' && <RefreshCcw size={20} color={selectedType === type ? '#3b82f6' : '#9ca3af'} />}
              {type === 'mission' && <Target size={20} color={selectedType === type ? '#10b981' : '#9ca3af'} />}
              {type === 'reference' && <Lightbulb size={20} color={selectedType === type ? '#f59e0b' : '#9ca3af'} />}

              <View className="ml-3 flex-1">
                <View className="flex-row items-center">
                  <Text className="text-gray-900 font-bold text-[15px] mb-0.5 mr-2" style={{ fontFamily: 'Pretendard-Bold' }}>
                    {t(`actionType.${type}`, type === 'routine' ? '루틴' : type === 'mission' ? '미션' : '참고')}
                  </Text>
                  {aiRecommendedType === type && (
                    <View className="bg-blue-100 px-1.5 py-0.5 rounded-md self-start mb-0.5">
                      <Text className="text-[10px] font-bold text-blue-600" style={{ fontFamily: 'Pretendard-Bold' }}>추천</Text>
                    </View>
                  )}
                </View>
                <Text className="text-gray-400 text-xs">
                  {t(`actionType.selector.${type}Desc`, type === 'routine' ? '매일, 매주, 매월 등 반복적으로 실천하는 항목' :
                    type === 'mission' ? '끝이 있는 목표 (책 1권 읽기, 자격증 취득 등)' :
                      '마음가짐, 가치관 등 체크가 필요없는 참고 항목')}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Detailed Settings conditionally rendered */}
      {selectedType === 'routine' && (
        <View className="bg-gray-50 rounded-2xl p-5 mb-10 border border-gray-100">
          <Text className="text-base font-bold text-gray-900 mb-3" style={{ fontFamily: 'Pretendard-Bold' }}>
            {t('actionType.selector.routineSettings', '루틴 설정')}
          </Text>

          < View className="mb-3">
            <Text className="text-sm text-gray-700 mb-2">{t('actionType.selector.repeatCycle', '반복 주기')}</Text>
            <View className="flex-row" style={{ gap: 8 }}>
              {frequencyOptions.map(option => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setRoutineFrequency(option.value)
                    setRoutineCountPerPeriod(1)
                    setRoutineWeekdays([])
                  }}
                  className={`flex-1 py-2.5 rounded-lg border items-center ${routineFrequency === option.value ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'
                    }`}
                >
                  <Text className={`text-sm font-medium ${routineFrequency === option.value ? 'text-white' : 'text-gray-700'}`}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {routineFrequency === 'weekly' && (
            <View className="mb-3">
              <Text className="text-sm text-gray-700 mb-2">{t('actionType.selector.weekdaySelect', '실천 요일 (선택사항)')}</Text>
              <View className="flex-row flex-wrap gap-2">
                {weekdays.map(day => (
                  <Pressable
                    key={day.value}
                    onPress={() => handleWeekdayToggle(day.value)}
                    className={`w-9 h-9 rounded-lg items-center justify-center border ${routineWeekdays.includes(day.value) ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'
                      }`}
                  >
                    <Text className={`text-sm font-medium ${routineWeekdays.includes(day.value) ? 'text-white' : 'text-gray-700'}`}>
                      {day.short}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View className="flex-row items-center mt-2">
                <Info size={12} color="#9ca3af" />
                <Text className="text-xs text-gray-400 ml-1">{t('actionType.selector.weekdayHint', '요일을 선택하지 않으면 주간 횟수 기반으로 설정됩니다')}</Text>
              </View>

              {routineWeekdays.length === 0 && (
                <View className="mt-3">
                  <Text className="text-sm text-gray-700 mb-2">{t('actionType.selector.weeklyGoal', '주간 목표 횟수')}</Text>
                  <View className="flex-row" style={{ gap: 8 }}>
                    {WEEKLY_COUNT_OPTIONS.map(count => (
                      <Pressable
                        key={count}
                        onPress={() => setRoutineCountPerPeriod(count)}
                        className={`w-9 h-9 rounded-lg items-center justify-center border ${routineCountPerPeriod === count ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'
                          }`}
                      >
                        <Text className={`text-sm font-medium ${routineCountPerPeriod === count ? 'text-white' : 'text-gray-700'}`}>
                          {count}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {routineFrequency === 'monthly' && (
            <View className="mb-3">
              <Text className="text-sm text-gray-700 mb-2">{t('actionType.selector.monthlyGoal', '월간 목표 횟수')}</Text>
              <View className="flex-row flex-wrap items-center" style={{ gap: 8 }}>
                {MONTHLY_COUNT_OPTIONS.map(count => (
                  <Pressable
                    key={count}
                    onPress={() => {
                      setRoutineCountPerPeriod(count)
                      setShowMonthlyCustomInput(false)
                    }}
                    className={`w-9 h-9 rounded-lg items-center justify-center border ${routineCountPerPeriod === count && !showMonthlyCustomInput ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'
                      }`}
                  >
                    <Text className={`text-sm font-medium ${routineCountPerPeriod === count && !showMonthlyCustomInput ? 'text-white' : 'text-gray-700'}`}>
                      {count}
                    </Text>
                  </Pressable>
                ))}

                {showMonthlyCustomInput ? (
                  <View className="flex-row items-center" style={{ gap: 4 }}>
                    <TextInput
                      value={monthlyCustomValue}
                      onChangeText={(text) => {
                        const num = text.replace(/[^0-9]/g, '')
                        const limitedNum = num ? Math.min(parseInt(num), 31) : 0
                        setMonthlyCustomValue(limitedNum > 0 ? String(limitedNum) : '')
                        if (limitedNum > 0) {
                          setRoutineCountPerPeriod(limitedNum)
                        }
                      }}
                      placeholder="?"
                      keyboardType="number-pad"
                      maxLength={2}
                      className="w-9 h-9 border border-gray-900 bg-gray-900 rounded-lg text-sm text-center text-white"
                      placeholderTextColor="#9ca3af"
                      autoFocus
                    />
                  </View>
                ) : (
                  <Pressable
                    onPress={() => {
                      setShowMonthlyCustomInput(true)
                      setMonthlyCustomValue(!MONTHLY_COUNT_OPTIONS.includes(routineCountPerPeriod) ? String(routineCountPerPeriod) : '')
                    }}
                    className="w-9 h-9 rounded-lg items-center justify-center border border-dashed border-gray-400"
                  >
                    <Text className="text-sm font-medium text-gray-500">+</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

        </View>
      )}

      {selectedType === 'mission' && (
        <View className="bg-gray-50 rounded-2xl p-5 mb-10 border border-gray-100">
          <Text className="text-base font-bold text-gray-900 mb-3" style={{ fontFamily: 'Pretendard-Bold' }}>
            {t('actionType.selector.missionSettings', '미션 설정')}
          </Text>

          <View className="mb-3">
            <Text className="text-sm text-gray-700 mb-2">{t('actionType.selector.completionType', '완료 방식')}</Text>
            <View className="gap-2">
              {missionCompletionOptions.map(option => (
                <Pressable
                  key={option.value}
                  onPress={() => setMissionType(option.value)}
                  className={`flex-row items-center p-3 rounded-lg border ${missionType === option.value ? 'bg-white border-gray-900' : 'bg-white border-gray-200'
                    }`}
                >
                  <View className={`w-4 h-4 rounded-full border items-center justify-center mr-3 ${missionType === option.value ? 'border-gray-900' : 'border-gray-300'}`}>
                    {missionType === option.value && <View className="w-2 h-2 rounded-full bg-gray-900" />}
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-900">{option.label}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {missionType === 'periodic' && (
            <View className="mt-3">
              <Text className="text-sm text-gray-700 mb-2">{t('actionType.selector.periodCycle', '반복 주기')}</Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {periodCycleOptions.map(option => (
                  <Pressable
                    key={option.value}
                    onPress={() => setMissionCycle(option.value)}
                    className={`px-4 py-2 rounded-lg border ${missionCycle === option.value ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-300'
                      }`}
                  >
                    <Text className={`text-sm font-medium ${missionCycle === option.value ? 'text-white' : 'text-gray-700'}`}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {selectedType === 'reference' && (
        <View className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
          <View className="flex-row items-center">
            <Info size={16} color="#6b7280" />
            <Text className="text-sm text-gray-500 ml-2">
              {t('actionType.selector.referenceInfo', '마음가짐, 가치관 등 체크가 필요없는 참고 항목')}
            </Text>
          </View>
        </View>
      )}

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
                  {step === 0 ? t('mandalart.action.inputTitle', '실천항목 입력') : t('actionType.selector.title', '타입 설정')}
                </Text>
              </View>

              <Pressable
                onPress={step === 0 ? handleNext : handleSave}
                disabled={!title.trim() || isSaving}
                className="rounded-2xl overflow-hidden"
              >
                <LinearGradient
                  colors={!title.trim() ? ['#e5e7eb', '#e5e7eb'] : ['#2563eb', '#9333ea', '#db2777']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16 }}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className={`font-bold ${!title.trim() ? 'text-gray-400' : 'text-white'}`} style={{ fontFamily: 'Pretendard-Bold' }}>
                      {step === 0 ? t('common.next', '다음') : t('common.done', '완료')}
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>

            {step === 0 ? renderInputStep() : renderDetailStep()}

          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}
