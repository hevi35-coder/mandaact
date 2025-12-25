import React, { useMemo, useState, useEffect } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Header } from '../components'
import ActionTypeSelector, { type ActionTypeData } from '../components/ActionTypeSelector'
import { Button, Input } from '../components/ui'
import { useCoachingStore, type PersonaType } from '../store/coachingStore'

type Step1Values = Record<string, string>
type ActionVariant = 'base' | 'minimum' | 'challenge'

type ActionDraft = {
  subGoal: string
  actions: Record<ActionVariant, string>
  activeVariant: ActionVariant
  extras: string[]
}

type RoutinePlan = {
  id: string
  label: string
  frequency: 'daily' | 'weekly'
  countPerWeek?: number
  weekdays?: number[]
}

type ActionConfig = ActionTypeData & {
  subGoalIndex: number
  title: string
}

type ActionItem = {
  id: string
  subGoalIndex: number
  title: string
}

const PERSONA_KEYS: PersonaType[] = [
  'working_professional',
  'student',
  'freelancer',
  'custom',
]

function OptionButton({
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
      className={`px-4 py-3 rounded-xl border ${selected ? 'border-primary bg-primary/10' : 'border-gray-200 bg-white'}`}
    >
      <Text
        className={`text-sm ${selected ? 'text-gray-900' : 'text-gray-600'}`}
        style={{ fontFamily: selected ? 'Pretendard-SemiBold' : 'Pretendard-Regular' }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

export default function CoachingFlowScreen() {
  const { t } = useTranslation()
  const {
    status,
    currentStep,
    summary,
    personaType,
    resumeSession,
    pauseSession,
    startSession,
    setCurrentStep,
    updateStepState,
    saveAnswer,
    setSummary,
    answersByStep,
    setPersonaType,
    setContext,
    completeSession,
  } = useCoachingStore()
  const [step1Values, setStep1Values] = useState<Step1Values>({})
  const [step1Error, setStep1Error] = useState<string | null>(null)
  const [coreGoal, setCoreGoal] = useState('')
  const [coreGoalError, setCoreGoalError] = useState<string | null>(null)
  const [subGoals, setSubGoals] = useState<string[]>(Array.from({ length: 8 }, () => ''))
  const [subGoalError, setSubGoalError] = useState<string | null>(null)
  const [actionDrafts, setActionDrafts] = useState<ActionDraft[]>([])
  const [step4Error, setStep4Error] = useState<string | null>(null)
  const [step5Applied, setStep5Applied] = useState(false)
  const [step5Rejected, setStep5Rejected] = useState(false)
  const [routinePlan, setRoutinePlan] = useState<RoutinePlan | null>(null)
  const [step6Error, setStep6Error] = useState<string | null>(null)
  const [step7Error, setStep7Error] = useState<string | null>(null)
  const [actionTypeEdits, setActionTypeEdits] = useState<Record<string, ActionTypeData>>({})
  const [actionTypeModalVisible, setActionTypeModalVisible] = useState(false)
  const [selectedActionForTypeEdit, setSelectedActionForTypeEdit] = useState<ActionItem | null>(null)

  const actionItems = useMemo<ActionItem[]>(
    () =>
      actionDrafts.flatMap((draft, subGoalIndex) => {
        const titles = [
          draft.actions.base,
          ...draft.extras,
        ].map((item) => item.trim()).filter(Boolean)
        return titles.map((title, actionIndex) => ({
          id: `${subGoalIndex}-${actionIndex}`,
          subGoalIndex,
          title,
        }))
      }),
    [actionDrafts]
  )

  const personaLabels = useMemo(
    () =>
      PERSONA_KEYS.reduce<Record<PersonaType, string>>((acc, key) => {
        acc[key] = t(`coaching.step1.persona.${key}`)
        return acc
      }, {} as Record<PersonaType, string>),
    [t]
  )

  useEffect(() => {
    const savedStep1 = answersByStep['step1'] as Step1Values | undefined
    if (savedStep1) {
      setStep1Values(savedStep1)
    }
  }, [answersByStep])

  useEffect(() => {
    const savedStep2 = answersByStep['step2'] as { coreGoal?: string } | undefined
    if (savedStep2?.coreGoal) {
      setCoreGoal(savedStep2.coreGoal)
    }
  }, [answersByStep])

  useEffect(() => {
    const savedStep3 = answersByStep['step3'] as { subGoals?: string[] } | undefined
    if (savedStep3?.subGoals?.length) {
      setSubGoals(savedStep3.subGoals)
    }
  }, [answersByStep])

  useEffect(() => {
    const savedStep4 = answersByStep['step4'] as { actionDrafts?: ActionDraft[] } | undefined
    if (savedStep4?.actionDrafts?.length) {
      setActionDrafts(savedStep4.actionDrafts)
      return
    }
    if (actionDrafts.length === 0 && subGoals.some((goal) => goal.trim())) {
      const nextDrafts = subGoals.map((goal) => ({
        subGoal: goal,
        actions: {
          base: goal ? t('coaching.step4.defaults.base', { goal }) : '',
          minimum: goal ? t('coaching.step4.defaults.minimum', { goal }) : '',
          challenge: goal ? t('coaching.step4.defaults.challenge', { goal }) : '',
        },
        activeVariant: 'base',
        extras: [],
      }))
      setActionDrafts(nextDrafts)
    }
  }, [actionDrafts.length, answersByStep, subGoals, t])

  useEffect(() => {
    const savedStep6 = answersByStep['step6'] as { routinePlan?: RoutinePlan } | undefined
    if (savedStep6?.routinePlan) {
      setRoutinePlan(savedStep6.routinePlan)
    }
  }, [answersByStep])

  const updateStep1Field = (key: string, value: string) => {
    setStep1Values((prev) => ({ ...prev, [key]: value }))
  }

  const requiredStep1Keys = useMemo(() => {
    switch (step1Values.persona) {
      case 'student':
        return ['persona', 'scheduleType', 'dailyTime', 'priorityArea', 'busyDifficulty', 'timeframe']
      case 'freelancer':
        return ['persona', 'scheduleVariability', 'weeklyWorkingTime', 'priorityArea', 'planStability', 'goalType']
      case 'custom':
        return ['persona', 'customSituation', 'dailyTime', 'customPriority', 'customObstacle', 'goalStyle']
      case 'working_professional':
      default:
        return ['persona', 'dailyTime', 'energyPeak', 'priorityArea', 'afterWorkDifficulty', 'goalStyle']
    }
  }, [step1Values.persona])

  const handleStep1Continue = () => {
    const missing = requiredStep1Keys.filter((key) => !step1Values[key])
    if (missing.length > 0) {
      setStep1Error(t('coaching.step1.validation'))
      return
    }
    setStep1Error(null)
    const selectedPersona = (step1Values.persona || 'working_professional') as PersonaType
    const priorityArea = step1Values.priorityArea || step1Values.customPriority || ''
    const availableTime = step1Values.dailyTime || step1Values.weeklyWorkingTime || ''

    if (!status) {
      startSession({
        sessionId: `coaching-${Date.now()}`,
        personaType: selectedPersona,
      })
    } else {
      setPersonaType(selectedPersona)
    }

    setContext({
      persona: selectedPersona,
      availableTime,
      energyPeak: step1Values.energyPeak,
      priorityArea,
    })
    saveAnswer('step1', step1Values)
    saveAnswer('rule_inputs', {
      persona: selectedPersona,
      time: availableTime,
      energy: step1Values.energyPeak || '',
      priority: priorityArea,
      scheduleVariability: step1Values.scheduleVariability || '',
      goalStyle: step1Values.goalStyle || '',
      timeframe: step1Values.timeframe || '',
      obstacle: step1Values.customObstacle || '',
    })
    updateStepState(1, 'completed')
    updateStepState(2, 'in_progress')
    setCurrentStep(2)
    setSummary(
      t('coaching.step1.summary', { persona: personaLabels[selectedPersona] }),
      t('coaching.step2.prompt')
    )
  }

  const handleStep2Continue = () => {
    if (!coreGoal.trim()) {
      setCoreGoalError(t('coaching.step2.validation'))
      return
    }
    setCoreGoalError(null)
    setContext({ coreGoal: coreGoal.trim() })
    saveAnswer('step2', { coreGoal: coreGoal.trim() })
    updateStepState(2, 'completed')
    updateStepState(3, 'in_progress')
    setCurrentStep(3)
    setSummary(t('coaching.step2.summary'), t('coaching.step3.prompt'))
  }

  const handleStep3Continue = () => {
    const missingCount = subGoals.filter((item) => !item.trim()).length
    if (missingCount > 0) {
      setSubGoalError(t('coaching.step3.validation', { count: missingCount }))
      return
    }
    setSubGoalError(null)
    const trimmedSubGoals = subGoals.map((item) => item.trim())
    setContext({ subGoals: trimmedSubGoals })
    saveAnswer('step3', { subGoals: trimmedSubGoals })
    updateStepState(3, 'completed')
    updateStepState(4, 'in_progress')
    setCurrentStep(4)
    setSummary(t('coaching.step3.summary'), t('coaching.step4.prompt'))
  }

  const handleStep4Continue = () => {
    const missingActions = actionDrafts.some((draft) => {
      const { base, minimum, challenge } = draft.actions
      return !base.trim() || !minimum.trim() || !challenge.trim()
    })
    if (missingActions) {
      setStep4Error(t('coaching.step4.validation'))
      return
    }
    setStep4Error(null)
    saveAnswer('step4', { actionDrafts })
    updateStepState(4, 'completed')
    updateStepState(5, 'in_progress')
    setCurrentStep(5)
    setSummary(t('coaching.step4.summary'), t('coaching.step5.prompt'))
  }

  const handleApplySuggestions = () => {
    const suffix = t('coaching.step5.suggestionSuffix')
    setActionDrafts((prev) =>
      prev.map((draft) => {
        const nextActions: Record<ActionVariant, string> = { ...draft.actions }
        ;(['base', 'minimum', 'challenge'] as ActionVariant[]).forEach((variant) => {
          const text = nextActions[variant]
          if (text && !/\d/.test(text)) {
            nextActions[variant] = `${text} ${suffix}`.trim()
          }
        })
        return { ...draft, actions: nextActions }
      })
    )
    setStep5Applied(true)
    setStep5Rejected(false)
  }

  const handleRejectSuggestions = () => {
    setStep5Applied(false)
    setStep5Rejected(true)
  }

  const handleStep5Continue = () => {
    const fallbackMinimums = actionDrafts.map((draft) => draft.actions.minimum).filter(Boolean)
    saveAnswer('step5', {
      actionDrafts,
      correctionsApplied: step5Applied,
      rejected: step5Rejected,
      fallbackMinimums,
    })
    updateStepState(5, 'completed')
    updateStepState(6, 'in_progress')
    setCurrentStep(6)
    setSummary(t('coaching.step5.summary'), t('coaching.step6.prompt'))
  }

  const handleStep6Continue = () => {
    if (!routinePlan) {
      setStep6Error(t('coaching.step6.validation'))
      return
    }
    setStep6Error(null)
    saveAnswer('step6', { routinePlan })
    updateStepState(6, 'completed')
    updateStepState(7, 'in_progress')
    setCurrentStep(7)
    setSummary(t('coaching.step6.summary'), t('coaching.step7.prompt'))
  }

  const handleStep7Save = () => {
    if (!coreGoal.trim()) {
      setStep7Error(t('coaching.step7.validation'))
      return
    }
    if (!routinePlan) {
      setStep7Error(t('coaching.step7.validation'))
      return
    }
    if (actionDrafts.length === 0) {
      setStep7Error(t('coaching.step7.validation'))
      return
    }
    setStep7Error(null)

    const ruleInputs = answersByStep['rule_inputs'] as Record<string, string> | undefined
    const availableTime = ruleInputs?.time || ''
    const lowTime = ['10', '30'].includes(availableTime)
    const routineFrequency = routinePlan.frequency
    const routineCount = routinePlan.frequency === 'weekly'
      ? routinePlan.countPerWeek || (lowTime ? 1 : 3)
      : undefined
    const routineWeekdays = routinePlan.frequency === 'weekly'
      ? routinePlan.weekdays || (lowTime ? [2] : [1, 3, 5])
      : undefined

    const defaultTypeData: ActionTypeData = {
      type: 'routine',
      routine_frequency: routineFrequency,
      routine_weekdays: routineWeekdays,
      routine_count_per_period: routineCount,
    }

    const actionConfigs: ActionConfig[] = actionItems.map((item) => {
      const override = actionTypeEdits[item.id]
      return {
        subGoalIndex: item.subGoalIndex,
        title: item.title,
        ...(override ?? defaultTypeData),
      }
    })

    if (actionConfigs.length === 0) {
      setStep7Error(t('coaching.step7.validation'))
      return
    }

    saveAnswer('step7', {
      savedAt: new Date().toISOString(),
      routinePlan,
      actionConfigs,
    })
    updateStepState(7, 'completed')
    completeSession()
    setSummary(t('coaching.step7.summary'), t('coaching.step7.completed'))
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7)
    }
  }

  const renderStep1 = () => {
    const personaValue = step1Values.persona as PersonaType | undefined

    return (
      <>
        <Text className="text-xl text-gray-900 mb-2" style={{ fontFamily: 'Pretendard-Bold' }}>
          {t('coaching.step1.title')}
        </Text>
        <Text className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'Pretendard-Regular' }}>
          {t('coaching.step1.subtitle')}
        </Text>

        <View className="space-y-2">
          {PERSONA_KEYS.map((key) => (
            <OptionButton
              key={key}
              label={personaLabels[key]}
              selected={personaValue === key}
              onPress={() => updateStep1Field('persona', key)}
            />
          ))}
        </View>

        {personaValue === 'working_professional' && (
          <View className="mt-6 space-y-4">
            <Text className="text-sm text-gray-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
              {t('coaching.step1.questions.dailyTime')}
            </Text>
            <View className="space-y-2">
              {['10', '30', '60', '90'].map((value) => (
                <OptionButton
                  key={value}
                  label={t(`coaching.step1.options.time.${value}`)}
                  selected={step1Values.dailyTime === value}
                  onPress={() => updateStep1Field('dailyTime', value)}
                />
              ))}
            </View>

            <Text className="text-sm text-gray-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
              {t('coaching.step1.questions.energyPeak')}
            </Text>
            <View className="space-y-2">
              {['morning', 'lunch', 'evening'].map((value) => (
                <OptionButton
                  key={value}
                  label={t(`coaching.step1.options.energy.${value}`)}
                  selected={step1Values.energyPeak === value}
                  onPress={() => updateStep1Field('energyPeak', value)}
                />
              ))}
            </View>

            <Text className="text-sm text-gray-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
              {t('coaching.step1.questions.priorityArea')}
            </Text>
            <View className="space-y-2">
              {['work', 'health', 'learning', 'relationships', 'life', 'other'].map((value) => (
                <OptionButton
                  key={value}
                  label={t(`coaching.step1.options.priority.${value}`)}
                  selected={step1Values.priorityArea === value}
                  onPress={() => updateStep1Field('priorityArea', value)}
                />
              ))}
            </View>

            <Text className="text-sm text-gray-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
              {t('coaching.step1.questions.afterWorkDifficulty')}
            </Text>
            <View className="space-y-2">
              {['yes', 'neutral', 'no'].map((value) => (
                <OptionButton
                  key={value}
                  label={t(`coaching.step1.options.difficulty.${value}`)}
                  selected={step1Values.afterWorkDifficulty === value}
                  onPress={() => updateStep1Field('afterWorkDifficulty', value)}
                />
              ))}
            </View>

            <Text className="text-sm text-gray-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
              {t('coaching.step1.questions.goalStyle')}
            </Text>
            <View className="space-y-2">
              {['maintain', 'balanced', 'challenge'].map((value) => (
                <OptionButton
                  key={value}
                  label={t(`coaching.step1.options.goalStyle.${value}`)}
                  selected={step1Values.goalStyle === value}
                  onPress={() => updateStep1Field('goalStyle', value)}
                />
              ))}
            </View>
          </View>
        )}

        {personaValue === 'student' && (
          <View className="mt-6 space-y-4">
            <Text className="text-sm text-gray-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
              {t('coaching.step1.questions.scheduleType')}
            </Text>
            <View className="space-y-2">
              {['classes', 'exams', 'projects', 'other'].map((value) => (
                <OptionButton
                  key={value}
                  label={t(`coaching.step1.options.schedule.${value}`)}
                  selected={step1Values.scheduleType === value}
                  onPress={() => updateStep1Field('scheduleType', value)}
                />
              ))}
            </View>

            <Text className="text-sm text-gray-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
              {t('coaching.step1.questions.dailyTime')}
            </Text>
            <View className="space-y-2">
              {['30', '60', '90', '120'].map((value) => (
                <OptionButton
                  key={value}
                  label={t(`coaching.step1.options.time.${value}`)}
                  selected={step1Values.dailyTime === value}
                  onPress={() => updateStep1Field('dailyTime', value)}
                />
              ))}
            </View>

            <Text className="text-sm text-gray-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
              {t('coaching.step1.questions.priorityArea')}
            </Text>
            <View className="space-y-2">
              {['grades', 'career', 'habits', 'health', 'other'].map((value) => (
                <OptionButton
                  key={value}
                  label={t(`coaching.step1.options.priorityStudent.${value}`)}
                  selected={step1Values.priorityArea === value}
                  onPress={() => updateStep1Field('priorityArea', value)}
                />
              ))}
            </View>

            <Text className="text-sm text-gray-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
              {t('coaching.step1.questions.busyDifficulty')}
            </Text>
            <View className="space-y-2">
              {['yes', 'neutral', 'no'].map((value) => (
                <OptionButton
                  key={value}
                  label={t(`coaching.step1.options.difficulty.${value}`)}
                  selected={step1Values.busyDifficulty === value}
                  onPress={() => updateStep1Field('busyDifficulty', value)}
                />
              ))}
            </View>

            <Text className="text-sm text-gray-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
              {t('coaching.step1.questions.timeframe')}
            </Text>
            <View className="space-y-2">
              {['short', 'mid', 'long'].map((value) => (
                <OptionButton
                  key={value}
                  label={t(`coaching.step1.options.timeframe.${value}`)}
                  selected={step1Values.timeframe === value}
                  onPress={() => updateStep1Field('timeframe', value)}
                />
              ))}
            </View>
          </View>
        )}

        {personaValue === 'freelancer' && (
          <View className="mt-6 space-y-4">
            <Text className="text-sm text-gray-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
              {t('coaching.step1.questions.scheduleVariability')}
            </Text>
            <View className="space-y-2">
              {['low', 'medium', 'high'].map((value) => (
                <OptionButton
                  key={value}
                  label={t(`coaching.step1.options.variability.${value}`)}
                  selected={step1Values.scheduleVariability === value}
                  onPress={() => updateStep1Field('scheduleVariability', value)}
                />
              ))}
            </View>

            <Text className="text-sm text-gray-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
              {t('coaching.step1.questions.weeklyWorkingTime')}
            </Text>
            <View className="space-y-2">
              {['20-30', '30-40', '40-50', '50+'].map((value) => (
                <OptionButton
                  key={value}
                  label={t(`coaching.step1.options.weeklyTime.${value}`)}
                  selected={step1Values.weeklyWorkingTime === value}
                  onPress={() => updateStep1Field('weeklyWorkingTime', value)}
                />
              ))}
            </View>

            <Text className="text-sm text-gray-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
              {t('coaching.step1.questions.priorityArea')}
            </Text>
            <View className="space-y-2">
              {['income', 'delivery', 'health', 'learning', 'other'].map((value) => (
                <OptionButton
                  key={value}
                  label={t(`coaching.step1.options.priorityFreelancer.${value}`)}
                  selected={step1Values.priorityArea === value}
                  onPress={() => updateStep1Field('priorityArea', value)}
                />
              ))}
            </View>

            <Text className="text-sm text-gray-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
              {t('coaching.step1.questions.planStability')}
            </Text>
            <View className="space-y-2">
              {['yes', 'neutral', 'no'].map((value) => (
                <OptionButton
                  key={value}
                  label={t(`coaching.step1.options.difficulty.${value}`)}
                  selected={step1Values.planStability === value}
                  onPress={() => updateStep1Field('planStability', value)}
                />
              ))}
            </View>

            <Text className="text-sm text-gray-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
              {t('coaching.step1.questions.goalType')}
            </Text>
            <View className="space-y-2">
              {['outcome', 'mixed', 'routine'].map((value) => (
                <OptionButton
                  key={value}
                  label={t(`coaching.step1.options.goalType.${value}`)}
                  selected={step1Values.goalType === value}
                  onPress={() => updateStep1Field('goalType', value)}
                />
              ))}
            </View>
          </View>
        )}

        {personaValue === 'custom' && (
          <View className="mt-6 space-y-4">
            <Input
              label={t('coaching.step1.questions.customSituation')}
              value={step1Values.customSituation || ''}
              onChangeText={(value) => updateStep1Field('customSituation', value)}
              placeholder={t('coaching.step1.placeholders.customSituation')}
            />
            <Text className="text-sm text-gray-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
              {t('coaching.step1.questions.dailyTime')}
            </Text>
            <View className="space-y-2">
              {['10', '30', '60', '90', '120+'].map((value) => (
                <OptionButton
                  key={value}
                  label={t(`coaching.step1.options.time.${value}`)}
                  selected={step1Values.dailyTime === value}
                  onPress={() => updateStep1Field('dailyTime', value)}
                />
              ))}
            </View>
            <Input
              label={t('coaching.step1.questions.customPriority')}
              value={step1Values.customPriority || ''}
              onChangeText={(value) => updateStep1Field('customPriority', value)}
              placeholder={t('coaching.step1.placeholders.customPriority')}
            />
            <Input
              label={t('coaching.step1.questions.customObstacle')}
              value={step1Values.customObstacle || ''}
              onChangeText={(value) => updateStep1Field('customObstacle', value)}
              placeholder={t('coaching.step1.placeholders.customObstacle')}
            />
            <Text className="text-sm text-gray-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
              {t('coaching.step1.questions.goalStyle')}
            </Text>
            <View className="space-y-2">
              {['maintain', 'balanced', 'challenge'].map((value) => (
                <OptionButton
                  key={value}
                  label={t(`coaching.step1.options.goalStyle.${value}`)}
                  selected={step1Values.goalStyle === value}
                  onPress={() => updateStep1Field('goalStyle', value)}
                />
              ))}
            </View>
          </View>
        )}

        {step1Error && (
          <Text className="text-xs text-red-500 mt-4" style={{ fontFamily: 'Pretendard-Regular' }}>
            {step1Error}
          </Text>
        )}
        <View className="mt-6">
          <Button onPress={handleStep1Continue}>{t('coaching.step1.cta')}</Button>
        </View>
      </>
    )
  }

  const renderStep2 = () => (
    <>
      <Text className="text-xl text-gray-900 mb-2" style={{ fontFamily: 'Pretendard-Bold' }}>
        {t('coaching.step2.title')}
      </Text>
      <Text className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'Pretendard-Regular' }}>
        {t('coaching.step2.subtitle')}
      </Text>
      <Input
        label={t('coaching.step2.label')}
        value={coreGoal}
        onChangeText={setCoreGoal}
        placeholder={t('coaching.step2.placeholder')}
        error={coreGoalError ?? undefined}
      />
      <View className="mt-6 flex-row items-center justify-between">
        <Button variant="ghost" onPress={handleBack}>
          {t('common.previous')}
        </Button>
        <Button onPress={handleStep2Continue}>{t('common.next')}</Button>
      </View>
    </>
  )

  const renderStep3 = () => (
    <>
      <Text className="text-xl text-gray-900 mb-2" style={{ fontFamily: 'Pretendard-Bold' }}>
        {t('coaching.step3.title')}
      </Text>
      <Text className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'Pretendard-Regular' }}>
        {t('coaching.step3.subtitle')}
      </Text>
      <View className="space-y-3">
        {subGoals.map((value, index) => (
          <Input
            key={`sub-goal-${index}`}
            label={t('coaching.step3.itemLabel', { index: index + 1 })}
            value={value}
            onChangeText={(text) => {
              setSubGoals((prev) => {
                const next = [...prev]
                next[index] = text
                return next
              })
            }}
            placeholder={t('coaching.step3.placeholder')}
          />
        ))}
      </View>
      {subGoalError && (
        <Text className="text-xs text-red-500 mt-2" style={{ fontFamily: 'Pretendard-Regular' }}>
          {subGoalError}
        </Text>
      )}
      <View className="mt-6 flex-row items-center justify-between">
        <Button variant="ghost" onPress={handleBack}>
          {t('common.previous')}
        </Button>
        <Button onPress={handleStep3Continue}>{t('common.next')}</Button>
      </View>
    </>
  )

  const renderStep4 = () => (
    <>
      <Text className="text-xl text-gray-900 mb-2" style={{ fontFamily: 'Pretendard-Bold' }}>
        {t('coaching.step4.title')}
      </Text>
      <Text className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'Pretendard-Regular' }}>
        {t('coaching.step4.subtitle')}
      </Text>
      {actionDrafts.length === 0 ? (
        <Text className="text-sm text-gray-500" style={{ fontFamily: 'Pretendard-Regular' }}>
          {t('coaching.step4.empty')}
        </Text>
      ) : (
        <View className="space-y-4">
          {actionDrafts.map((draft, index) => (
            <View key={`action-draft-${index}`} className="border border-gray-200 rounded-xl p-4">
              <Text className="text-sm text-gray-900 mb-3" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                {draft.subGoal || t('coaching.step4.subGoalFallback', { index: index + 1 })}
              </Text>
              <Input
                label={t('coaching.step4.labels.base')}
                value={draft.actions.base}
                onChangeText={(text) => {
                  setActionDrafts((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, actions: { ...item.actions, base: text } }
                        : item
                    )
                  )
                }}
                placeholder={t('coaching.step4.placeholders.base')}
              />
              <Input
                label={t('coaching.step4.labels.minimum')}
                value={draft.actions.minimum}
                onChangeText={(text) => {
                  setActionDrafts((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, actions: { ...item.actions, minimum: text } }
                        : item
                    )
                  )
                }}
                placeholder={t('coaching.step4.placeholders.minimum')}
                className="mt-3"
              />
              <Input
                label={t('coaching.step4.labels.challenge')}
                value={draft.actions.challenge}
                onChangeText={(text) => {
                  setActionDrafts((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, actions: { ...item.actions, challenge: text } }
                        : item
                    )
                  )
                }}
                placeholder={t('coaching.step4.placeholders.challenge')}
                className="mt-3"
              />
              {draft.extras.map((extra, extraIndex) => (
                <Input
                  key={`extra-${index}-${extraIndex}`}
                  label={t('coaching.step4.labels.extra', { index: extraIndex + 1 })}
                  value={extra}
                  onChangeText={(text) => {
                    setActionDrafts((prev) =>
                      prev.map((item, itemIndex) => {
                        if (itemIndex !== index) return item
                        const nextExtras = [...item.extras]
                        nextExtras[extraIndex] = text
                        return { ...item, extras: nextExtras }
                      })
                    )
                  }}
                  placeholder={t('coaching.step4.placeholders.extra')}
                  className="mt-3"
                />
              ))}
              <Pressable
                onPress={() => {
                  setActionDrafts((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, extras: [...item.extras, ''] }
                        : item
                    )
                  )
                }}
                className="mt-3"
              >
                <Text className="text-sm text-primary" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                  {t('coaching.step4.addAction')}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
      {step4Error && (
        <Text className="text-xs text-red-500 mt-2" style={{ fontFamily: 'Pretendard-Regular' }}>
          {step4Error}
        </Text>
      )}
      <View className="mt-6 flex-row items-center justify-between">
        <Button variant="ghost" onPress={handleBack}>
          {t('common.previous')}
        </Button>
        <Button onPress={handleStep4Continue}>{t('common.next')}</Button>
      </View>
    </>
  )

  const renderStep5 = () => {
    const hasSuggestions = actionDrafts.some((draft) =>
      Object.values(draft.actions).some((text) => text && !/\d/.test(text))
    )

    return (
      <>
        <Text className="text-xl text-gray-900 mb-2" style={{ fontFamily: 'Pretendard-Bold' }}>
          {t('coaching.step5.title')}
        </Text>
        <Text className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'Pretendard-Regular' }}>
          {t('coaching.step5.subtitle')}
        </Text>
        <View className="space-y-3">
          {actionDrafts.map((draft, index) => (
            <View key={`review-${index}`} className="border border-gray-200 rounded-xl p-4">
              <Text className="text-sm text-gray-900 mb-2" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                {draft.subGoal || t('coaching.step4.subGoalFallback', { index: index + 1 })}
              </Text>
              {(['base', 'minimum', 'challenge'] as ActionVariant[]).map((variant) => {
                const text = draft.actions[variant]
                const needsDetail = text ? !/\d/.test(text) : false
                return (
                  <View key={`${index}-${variant}`} className="mb-2">
                    <Text className="text-sm text-gray-700" style={{ fontFamily: 'Pretendard-Regular' }}>
                      {t(`coaching.step4.labels.${variant}`)}: {text || '-'}
                    </Text>
                    {needsDetail && (
                      <Text className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Pretendard-Regular' }}>
                        {t('coaching.step5.suggestion', { action: text })}
                      </Text>
                    )}
                  </View>
                )
              })}
            </View>
          ))}
        </View>
        {hasSuggestions && (
          <View className="mt-4 space-y-2">
            <Button variant="secondary" onPress={handleApplySuggestions}>
              {t('coaching.step5.apply')}
            </Button>
            <Button variant="ghost" onPress={handleRejectSuggestions}>
              {t('coaching.step5.reject')}
            </Button>
          </View>
        )}
        <View className="mt-6 flex-row items-center justify-between">
          <Button variant="ghost" onPress={handleBack}>
            {t('common.previous')}
          </Button>
          <Button onPress={handleStep5Continue}>{t('common.next')}</Button>
        </View>
      </>
    )
  }

  const renderStep6 = () => {
    const options: RoutinePlan[] = [
      { id: 'weekly-2', label: t('coaching.step6.options.weekly2'), frequency: 'weekly', countPerWeek: 2, weekdays: [2, 4] },
      { id: 'weekly-3', label: t('coaching.step6.options.weekly3'), frequency: 'weekly', countPerWeek: 3, weekdays: [1, 3, 5] },
      { id: 'daily', label: t('coaching.step6.options.daily'), frequency: 'daily' },
    ]

    return (
      <>
        <Text className="text-xl text-gray-900 mb-2" style={{ fontFamily: 'Pretendard-Bold' }}>
          {t('coaching.step6.title')}
        </Text>
        <Text className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'Pretendard-Regular' }}>
          {t('coaching.step6.subtitle')}
        </Text>
        <View className="space-y-2">
          {options.map((option) => (
            <OptionButton
              key={option.id}
              label={option.label}
              selected={routinePlan?.id === option.id}
              onPress={() => setRoutinePlan(option)}
            />
          ))}
        </View>
        {step6Error && (
          <Text className="text-xs text-red-500 mt-3" style={{ fontFamily: 'Pretendard-Regular' }}>
            {step6Error}
          </Text>
        )}
        <View className="mt-6 flex-row items-center justify-between">
          <Button variant="ghost" onPress={handleBack}>
            {t('common.previous')}
          </Button>
          <Button onPress={handleStep6Continue}>{t('common.next')}</Button>
        </View>
      </>
    )
  }

  const renderStep7 = () => (
    <>
      <Text className="text-xl text-gray-900 mb-2" style={{ fontFamily: 'Pretendard-Bold' }}>
        {t('coaching.step7.title')}
      </Text>
      <Text className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'Pretendard-Regular' }}>
        {t('coaching.step7.subtitle')}
      </Text>
      <View className="border border-gray-200 rounded-xl p-4">
        <Text className="text-sm text-gray-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
          {t('coaching.step7.coreGoal')}
        </Text>
        <Text className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'Pretendard-Regular' }}>
          {coreGoal || '-'}
        </Text>
        <Text className="text-sm text-gray-700 mt-4" style={{ fontFamily: 'Pretendard-SemiBold' }}>
          {t('coaching.step7.subGoals')}
        </Text>
        {subGoals.map((goal, index) => (
          <Text key={`summary-${index}`} className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'Pretendard-Regular' }}>
            {index + 1}. {goal || t('coaching.step4.subGoalFallback', { index: index + 1 })}
          </Text>
        ))}
        <Text className="text-sm text-gray-700 mt-4" style={{ fontFamily: 'Pretendard-SemiBold' }}>
          {t('coaching.step7.activeActions')}
        </Text>
        {actionItems.length === 0 ? (
          <Text className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'Pretendard-Regular' }}>
            {t('coaching.step7.noActions')}
          </Text>
        ) : (
          actionItems.map((item, index) => {
            const override = actionTypeEdits[item.id]
            return (
              <View key={`action-summary-${item.id}`} className="mt-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-gray-600" style={{ fontFamily: 'Pretendard-Regular' }}>
                    {index + 1}. {item.title}
                  </Text>
                  <Pressable onPress={() => {
                    setSelectedActionForTypeEdit(item)
                    setActionTypeModalVisible(true)
                  }}>
                    <Text className="text-xs text-primary" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                      {t('coaching.step7.editAction')}
                    </Text>
                  </Pressable>
                </View>
                {override && (
                  <Text className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Pretendard-Regular' }}>
                    {t('coaching.step7.customized')}
                  </Text>
                )}
              </View>
            )
          })
        )}
        <Text className="text-sm text-gray-700 mt-4" style={{ fontFamily: 'Pretendard-SemiBold' }}>
          {t('coaching.step7.routine')}
        </Text>
        <Text className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'Pretendard-Regular' }}>
          {routinePlan?.label || '-'}
        </Text>
      </View>
      {step7Error && (
        <Text className="text-xs text-red-500 mt-3" style={{ fontFamily: 'Pretendard-Regular' }}>
          {step7Error}
        </Text>
      )}
      <View className="mt-6 flex-row items-center justify-between">
        <Button variant="ghost" onPress={handleBack}>
          {t('common.previous')}
        </Button>
        <Button onPress={handleStep7Save}>{t('coaching.step7.cta')}</Button>
      </View>
      <ActionTypeSelector
        visible={actionTypeModalVisible}
        actionId={selectedActionForTypeEdit?.id ?? 'coaching-action'}
        actionTitle={selectedActionForTypeEdit?.title ?? ''}
        initialData={
          selectedActionForTypeEdit
            ? actionTypeEdits[selectedActionForTypeEdit.id] || {
                type: 'routine',
                routine_frequency: routinePlan?.frequency || 'weekly',
                routine_weekdays: routinePlan?.weekdays || [],
                routine_count_per_period: routinePlan?.countPerWeek,
              }
            : undefined
        }
        onClose={() => setActionTypeModalVisible(false)}
        onSave={async (data) => {
          if (!selectedActionForTypeEdit) return
          setActionTypeEdits((prev) => ({
            ...prev,
            [selectedActionForTypeEdit.id]: data,
          }))
        }}
      />
    </>
  )

  return (
    <View className="flex-1 bg-gray-50">
      <Header showBackButton title={t('coaching.title')} />
      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="bg-white rounded-2xl p-5 border border-gray-100 mb-6">
          <Text className="text-sm text-gray-500" style={{ fontFamily: 'Pretendard-Medium' }}>
            {t('coaching.step', { step: currentStep })}
          </Text>
          <Text className="text-base text-gray-900 mt-2" style={{ fontFamily: 'Pretendard-SemiBold' }}>
            {t('coaching.inProgress')}
          </Text>
          {summary?.shortSummary ? (
            <Text className="text-sm text-gray-600 mt-2" style={{ fontFamily: 'Pretendard-Regular' }}>
              {summary.shortSummary}
            </Text>
          ) : null}
          {summary?.nextPromptPreview ? (
            <Text className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'Pretendard-Regular' }}>
              {summary.nextPromptPreview}
            </Text>
          ) : null}
          {status && (
            <View className="flex-row items-center justify-between mt-4">
              <Button variant="ghost" onPress={pauseSession}>
                {t('coaching.pause')}
              </Button>
              {status === 'paused' && (
                <Button onPress={resumeSession}>{t('coaching.resume')}</Button>
              )}
            </View>
          )}
        </View>

        <View className="bg-white rounded-2xl p-5 border border-gray-100">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStep6()}
          {currentStep === 7 && renderStep7()}
        </View>
      </ScrollView>
    </View>
  )
}
