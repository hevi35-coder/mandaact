import React, { useMemo, useState, useEffect } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Header } from '../components'
import ActionTypeSelector, { type ActionTypeData } from '../components/ActionTypeSelector'
import { Button, Input } from '../components/ui'
import { formatTypeDetailsLocalized } from '../components/Today/utils'
import { useCoachingStore, type PersonaType } from '../store/coachingStore'
import { coachingService, ActionVariant as ActionVariantService, RealityCorrection } from '../services/coachingService'
import { useAuthStore } from '../store/authStore'
import { logger } from '../lib/logger'

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

type ActionItem = {
  id: string
  subGoalIndex: number
  title: string
  variant?: ActionVariant | 'extra'
}

type ActionConfig = ActionTypeData & {
  subGoalIndex: number
  title: string
  variant?: ActionVariant | 'extra'
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
  const [step1Values, setStep1Values] = useState<Step1Values>({})
  const [step1Error, setStep1Error] = useState<string | null>(null)
  const [showMoreQuestions, setShowMoreQuestions] = useState(false)
  const [coreGoal, setCoreGoal] = useState('')
  const [coreGoalError, setCoreGoalError] = useState<string | null>(null)
  const [subGoals, setSubGoals] = useState<string[]>(Array.from({ length: 8 }, () => ''))
  const [step3VisibleCount, setStep3VisibleCount] = useState(4)
  const [subGoalError, setSubGoalError] = useState<string | null>(null)
  const [actionDrafts, setActionDrafts] = useState<ActionDraft[]>([])
  const [expandedStep4Sections, setExpandedStep4Sections] = useState<boolean[]>([])
  const [step4Error, setStep4Error] = useState<string | null>(null)
  const [step5Applied, setStep5Applied] = useState(false)
  const [step5Rejected, setStep5Rejected] = useState(false)
  const [routinePlan, setRoutinePlan] = useState<RoutinePlan | null>(null)
  const [customWeekdays, setCustomWeekdays] = useState<number[]>([])
  const [customCountPerWeek, setCustomCountPerWeek] = useState(3)
  const [step6Error, setStep6Error] = useState<string | null>(null)
  const [step7Error, setStep7Error] = useState<string | null>(null)
  const [showRecap, setShowRecap] = useState(false)
  const [actionTypeEdits, setActionTypeEdits] = useState<Record<string, ActionTypeData>>({})
  const [actionTypeModalVisible, setActionTypeModalVisible] = useState(false)
  const [selectedActionForTypeEdit, setSelectedActionForTypeEdit] = useState<ActionItem | null>(null)
  const [isSuggestingSubGoals, setIsSuggestingSubGoals] = useState(false)

  const [isGeneratingActions, setIsGeneratingActions] = useState(false)
  const [isCheckingReality, setIsCheckingReality] = useState(false)
  const [realityFeedback, setRealityFeedback] = useState<string | null>(null)
  const [realityCorrections, setRealityCorrections] = useState<RealityCorrection[]>([])

  const {
    status,
    currentStep,
    answersByStep,
    summary,
    personaType,
    sessionId,
    setCurrentStep,
    updateStepState,
    setPersonaType,
    setContext,
    saveAnswer,
    setSummary,
    startSession,
    resumeSession,
    pauseSession,
    completeSession,
  } = useCoachingStore()

  const { user } = useAuthStore()

  const handleStart = async (persona: PersonaType) => {
    if (user?.id) {
      await startSession(user.id, persona)
    } else {
      setPersonaType(persona)
      setCurrentStep(1)
      updateStepState(1, 'in_progress')
    }
  }

  const actionItems = useMemo<ActionItem[]>(
    () =>
      actionDrafts.flatMap((draft, subGoalIndex) => {
        const variants: { variant: ActionVariant | 'extra'; title: string }[] = [
          { variant: 'base', title: draft.actions.base },
          { variant: 'minimum', title: draft.actions.minimum },
          { variant: 'challenge', title: draft.actions.challenge },
          ...draft.extras.map((title) => ({ variant: 'extra' as const, title })),
        ]

        return variants
          .filter((v) => v.title.trim().length > 0)
          .map((v, actionIndex) => ({
            id: `${subGoalIndex}-${v.variant}-${actionIndex}`,
            subGoalIndex,
            title: v.title.trim(),
            variant: v.variant,
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

  const personaKey = (personaType || (step1Values.persona as PersonaType) || 'working_professional') as PersonaType

  const recapItems = useMemo(() => {
    const items: string[] = []
    if (personaKey) {
      items.push(t('coaching.recap.persona', { persona: personaLabels[personaKey] }))
    }
    if (coreGoal.trim()) {
      items.push(t('coaching.recap.coreGoal', { goal: coreGoal.trim() }))
    }
    const filledSubGoals = subGoals.filter((goal) => goal.trim()).length
    if (filledSubGoals > 0) {
      items.push(t('coaching.recap.subGoals', { count: filledSubGoals }))
    }
    if (actionItems.length > 0) {
      items.push(t('coaching.recap.actions', { count: actionItems.length }))
    }
    if (routinePlan?.label) {
      items.push(t('coaching.recap.routine', { routine: routinePlan.label }))
    }
    const savedStep5 = answersByStep['step5'] as { correctionsApplied?: boolean; rejected?: boolean } | undefined
    const applied = savedStep5?.correctionsApplied ?? step5Applied
    const rejected = savedStep5?.rejected ?? step5Rejected
    if (applied || rejected) {
      items.push(
        t('coaching.recap.realityCheck', {
          status: applied ? t('coaching.recap.realityApplied') : t('coaching.recap.realityKept'),
        })
      )
    }
    return items
  }, [
    actionItems.length,
    answersByStep,
    coreGoal,
    personaKey,
    personaLabels,
    routinePlan?.label,
    step5Applied,
    step5Rejected,
    subGoals,
    t,
  ])

  useEffect(() => {
    const savedStep1 = answersByStep['step1'] as Step1Values | undefined
    if (savedStep1) {
      setStep1Values(savedStep1)
      const hasOptional =
        Boolean(savedStep1.afterWorkDifficulty) ||
        Boolean(savedStep1.goalStyle) ||
        Boolean(savedStep1.scheduleType) ||
        Boolean(savedStep1.busyDifficulty) ||
        Boolean(savedStep1.scheduleVariability) ||
        Boolean(savedStep1.goalType) ||
        Boolean(savedStep1.customObstacle)
      setShowMoreQuestions(hasOptional)
    }
  }, [answersByStep])

  useEffect(() => {
    setShowMoreQuestions(false)
  }, [step1Values.persona])

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
    const lastFilledIndex = subGoals.reduce((lastIndex, value, index) => {
      if (value.trim()) return index
      return lastIndex
    }, -1)
    const nextVisible = Math.min(8, Math.max(4, lastFilledIndex + 1))
    setStep3VisibleCount((prev) => (nextVisible > prev ? nextVisible : prev))
  }, [subGoals])

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
        activeVariant: 'base' as ActionVariant,
        extras: [] as string[],
      }))
      setActionDrafts(nextDrafts)
    }
  }, [actionDrafts.length, answersByStep, subGoals, t])

  useEffect(() => {
    const savedStep6 = answersByStep['step6'] as { routinePlan?: RoutinePlan } | undefined
    if (savedStep6?.routinePlan) {
      const savedPlan = savedStep6.routinePlan
      const isStandard = ['weekly-2', 'weekly-3', 'daily'].includes(savedPlan.id)
      if (isStandard) {
        setRoutinePlan(savedPlan)
      } else {
        setRoutinePlan({
          ...savedPlan,
          id: 'custom',
          label: t('coaching.step6.options.custom'),
        })
      }
    }
  }, [answersByStep, t])

  useEffect(() => {
    if (actionDrafts.length === 0) return
    setExpandedStep4Sections((prev) => {
      if (prev.length === actionDrafts.length) return prev
      return actionDrafts.map((_, index) => prev[index] ?? index === 0)
    })
  }, [actionDrafts.length])

  useEffect(() => {
    if (routinePlan?.id !== 'custom') return
    setCustomWeekdays(routinePlan.weekdays || [])
    setCustomCountPerWeek(routinePlan.countPerWeek || 3)
  }, [routinePlan])

  useEffect(() => {
    if (routinePlan?.id !== 'custom') return
    setRoutinePlan((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        weekdays: customWeekdays,
        countPerWeek: customCountPerWeek,
      }
    })
  }, [customWeekdays, customCountPerWeek, routinePlan?.id])

  const weekdayOptions = useMemo(() => ([
    { value: 1, label: t('actionType.weekdayShort.mon') },
    { value: 2, label: t('actionType.weekdayShort.tue') },
    { value: 3, label: t('actionType.weekdayShort.wed') },
    { value: 4, label: t('actionType.weekdayShort.thu') },
    { value: 5, label: t('actionType.weekdayShort.fri') },
    { value: 6, label: t('actionType.weekdayShort.sat') },
    { value: 0, label: t('actionType.weekdayShort.sun') },
  ]), [t])

  const updateStep1Field = (key: string, value: string) => {
    setStep1Values((prev) => ({ ...prev, [key]: value }))
  }

  const requiredStep1Keys = useMemo(() => {
    switch (step1Values.persona) {
      case 'student':
        return ['persona', 'dailyTime', 'priorityArea', 'timeframe']
      case 'freelancer':
        return ['persona', 'weeklyWorkingTime', 'priorityArea', 'planStability']
      case 'custom':
        return ['persona', 'customSituation', 'dailyTime', 'customPriority']
      case 'working_professional':
      default:
        return ['persona', 'dailyTime', 'energyPeak', 'priorityArea']
    }
  }, [step1Values.persona])

  const handleStep1Continue = async () => {
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
      await handleStart(selectedPersona)
    } else {
      setPersonaType(selectedPersona)
    }

    await saveAnswer('step1', step1Values)
    await saveAnswer('rule_inputs', {
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

  const handleStep2Continue = async () => {
    if (!coreGoal.trim()) {
      setCoreGoalError(t('coaching.step2.validation'))
      return
    }
    setCoreGoalError(null)
    setContext({ coreGoal: coreGoal.trim() })
    await saveAnswer('step2', { coreGoal: coreGoal.trim() })
    updateStepState(2, 'completed')
    updateStepState(3, 'in_progress')
    setCurrentStep(3)
    setSummary(t('coaching.step2.summary'), t('coaching.step3.prompt'))
  }

  const handleAISuggestSubGoals = async () => {
    setIsSuggestingSubGoals(true)
    try {
      const ruleInputs = answersByStep['rule_inputs'] as Record<string, string> | undefined
      const availableTime = ruleInputs?.time || '30'
      const suggestions = await coachingService.suggestSubGoals({
        persona: personaKey,
        coreGoal: coreGoal.trim(),
        availableTime,
        energyPeak: step1Values.energyPeak || '',
        priorityArea: step1Values.priorityArea || '',
      }, sessionId)

      const subGoalArray = suggestions.map((sg: string, idx: number) => ({
        position: idx + 1,
        title: sg,
      }))

      if (suggestions.length > 0) {
        setSubGoals((prev) => {
          const next = [...prev]
          suggestions.forEach((sg, idx) => {
            if (idx < 8) next[idx] = sg
          })
          return next
        })
      }
      await saveAnswer('step3', { subGoals: suggestions })
    } catch (error) {
      logger.error('Failed to suggest sub goals', error)
    } finally {
      setIsSuggestingSubGoals(false)
    }
  }

  const handleStep3Continue = async () => {
    const filledCount = subGoals.filter((item) => item.trim()).length
    if (filledCount < 4) {
      setSubGoalError(t('coaching.step3.validationMin', { count: 4 }))
      return
    }
    setSubGoalError(null)
    const trimmedSubGoals = subGoals.map((item) => item.trim())
    setContext({ subGoals: trimmedSubGoals })
    await saveAnswer('step3', { subGoals: trimmedSubGoals })
    updateStepState(3, 'completed')
    updateStepState(4, 'in_progress')
    setCurrentStep(4)
    setSummary(t('coaching.step3.summary'), t('coaching.step4.prompt'))
  }

  const handleAIGenerateActions = async () => {
    setIsGeneratingActions(true)
    try {
      const ruleInputs = answersByStep['rule_inputs'] as Record<string, string> | undefined
      const availableTime = ruleInputs?.time || '30'
      const generated = await coachingService.generateActions({
        subGoals: subGoals.filter(s => s.trim()),
        persona: personaKey,
        availableTime,
      }, sessionId)

      const drafts = (generated as ActionVariantService[]).map((gen) => ({
        subGoal: gen.sub_goal,
        actions: {
          base: gen.base,
          minimum: gen.minimum,
          challenge: gen.challenge,
        },
        activeVariant: 'base' as const,
        extras: [],
      }))

      setActionDrafts(drafts)
      await saveAnswer('rule_inputs', {
        persona: personaKey,
        availableTime,
        energyPeak: step1Values.energyPeak || '',
        priorityArea: step1Values.priorityArea || '',
      })
      await saveAnswer('step4', { actionDrafts: drafts })
    } catch (error) {
      logger.error('Failed to generate actions', error)
    } finally {
      setIsGeneratingActions(false)
    }
  }

  const handleStep4Continue = async () => {
    const missingActions = actionDrafts.some((draft) => {
      const { base, minimum, challenge } = draft.actions
      return !base.trim() || !minimum.trim() || !challenge.trim()
    })
    if (missingActions) {
      setStep4Error(t('coaching.step4.validation'))
      return
    }
    setStep4Error(null)
    await saveAnswer('step4', { actionDrafts })
    updateStepState(4, 'completed')
    updateStepState(5, 'in_progress')
    setCurrentStep(5)
    setSummary(t('coaching.step4.summary'), t('coaching.step5.prompt'))
    handleRunRealityCheck()
  }

  const handleRunRealityCheck = async () => {
    setIsCheckingReality(true)
    try {
      const ruleInputs = answersByStep['rule_inputs'] as Record<string, string> | undefined
      const availableTime = ruleInputs?.time || '30'
      const result = await coachingService.runRealityCheck({
        coreGoal: coreGoal.trim(),
        subGoals: subGoals.filter(g => g.trim()),
        actions: actionDrafts,
        availableTime,
        energyPeak: step1Values.energyPeak || '',
      }, sessionId)
      setRealityFeedback(result.overall_feedback)
      setRealityCorrections(result.corrections)
    } catch (error) {
      logger.error('Failed to run reality check', error)
    } finally {
      setIsCheckingReality(false)
    }
  }

  const handleApplySuggestions = () => {
    setActionDrafts((prev) =>
      prev.map((draft) => {
        const nextActions: Record<ActionVariant, string> = { ...draft.actions }
        realityCorrections.forEach(c => {
          if (nextActions.base === c.original) nextActions.base = c.suggested
          if (nextActions.minimum === c.original) nextActions.minimum = c.suggested
          if (nextActions.challenge === c.original) nextActions.challenge = c.suggested
        })
        return { ...draft, actions: nextActions }
      })
    )
    setRealityCorrections([])
    setStep5Applied(true)
    setStep5Rejected(false)
  }

  const handleRejectSuggestions = () => {
    setStep5Applied(false)
    setStep5Rejected(true)
  }

  const handleStep5Continue = async () => {
    setStep5Applied(true)
    updateStepState(5, 'completed')
    updateStepState(6, 'in_progress')
    setCurrentStep(6)
    await saveAnswer('step5', {
      correctionsApplied: true,
      rejected: false,
      corrections: realityCorrections
    })
    setSummary(t('coaching.step5.summary'), t('coaching.step6.prompt'))
  }

  const handleStep5Reject = async () => {
    setStep5Rejected(true)
    updateStepState(5, 'completed')
    updateStepState(6, 'in_progress')
    setCurrentStep(6)
    await saveAnswer('step5', {
      correctionsApplied: false,
      rejected: true
    })
    setSummary(t('coaching.step5.summary'), t('coaching.step6.prompt'))
  }

  const handleStep6Continue = async () => {
    if (!routinePlan) {
      setStep6Error(t('coaching.step6.validation'))
      return
    }
    setStep6Error(null)
    await saveAnswer('step6', { routinePlan })
    updateStepState(6, 'completed')
    updateStepState(7, 'in_progress')
    setCurrentStep(7)
    setSummary(t('coaching.step6.summary'), t('coaching.step7.prompt'))
  }

  const handleAutoSetDefaults = () => {
    if (!routinePlan) return

    const availableTime = (answersByStep['rule_inputs'] as Record<string, string> | undefined)?.time || ''
    const lowTime = ['10', '30'].includes(availableTime)
    const routineFrequency = routinePlan.frequency
    const routineCount = routinePlan.frequency === 'weekly'
      ? routinePlan.countPerWeek || (lowTime ? 1 : 3)
      : undefined
    const routineWeekdays = routinePlan.frequency === 'weekly'
      ? routinePlan.weekdays || (lowTime ? [2] : [1, 3, 5])
      : undefined

    const newEdits: Record<string, ActionTypeData> = { ...actionTypeEdits }
    actionItems.forEach((item) => {
      if (!newEdits[item.id]) {
        newEdits[item.id] = {
          type: 'routine',
          routine_frequency: routineFrequency,
          routine_weekdays: routineWeekdays,
          routine_count_per_period: routineCount,
        }
      }
    })
    setActionTypeEdits(newEdits)
    setStep7Error(null)
  }

  const handleStep7Save = async () => {
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
    const unconfigured = actionItems.filter((item) => !actionTypeEdits[item.id])
    if (unconfigured.length > 0) {
      setStep7Error(t('coaching.step7.unconfiguredWarning', { count: unconfigured.length }))
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

    // Collect all configurations
    const actionConfigs = actionItems.map((item) => {
      const override = actionTypeEdits[item.id]
      const defaultTypeData: ActionTypeData = {
        type: 'routine',
        routine_frequency: routineFrequency,
        routine_weekdays: routineWeekdays,
        routine_count_per_period: routineCount,
      }
      return {
        subGoalIndex: item.subGoalIndex,
        title: item.title,
        variant: item.variant,
        ...(override ?? defaultTypeData),
      }
    })

    if (actionConfigs.length === 0) {
      setStep7Error(t('coaching.step7.validation'))
      return
    }

    await saveAnswer('step7', {
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
    const toggleLabel = showMoreQuestions
      ? t('coaching.step1.hideQuestions')
      : t('coaching.step1.moreQuestions')

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

            <Pressable
              onPress={() => setShowMoreQuestions((prev) => !prev)}
              className="items-center mt-2"
            >
              <Text className="text-sm text-blue-600" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                {toggleLabel}
              </Text>
            </Pressable>

            {showMoreQuestions && (
              <>
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
              </>
            )}
          </View>
        )}

        {personaValue === 'student' && (
          <View className="mt-6 space-y-4">
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

            <Pressable
              onPress={() => setShowMoreQuestions((prev) => !prev)}
              className="items-center mt-2"
            >
              <Text className="text-sm text-blue-600" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                {toggleLabel}
              </Text>
            </Pressable>

            {showMoreQuestions && (
              <>
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
              </>
            )}
          </View>
        )}

        {personaValue === 'freelancer' && (
          <View className="mt-6 space-y-4">
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

            <Pressable
              onPress={() => setShowMoreQuestions((prev) => !prev)}
              className="items-center mt-2"
            >
              <Text className="text-sm text-blue-600" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                {toggleLabel}
              </Text>
            </Pressable>

            {showMoreQuestions && (
              <>
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
              </>
            )}
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
            <Pressable
              onPress={() => setShowMoreQuestions((prev) => !prev)}
              className="items-center mt-2"
            >
              <Text className="text-sm text-blue-600" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                {toggleLabel}
              </Text>
            </Pressable>

            {showMoreQuestions && (
              <>
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
              </>
            )}
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
      <Text className="text-sm text-gray-500 mb-3" style={{ fontFamily: 'Pretendard-Regular' }}>
        {t('coaching.step2.subtitle')}
      </Text>
      <View className="mb-5 bg-blue-50 border border-blue-100 rounded-xl p-3">
        <Text className="text-xs text-blue-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
          {t('coaching.step2.smartTitle')}
        </Text>
        <Text className="text-xs text-blue-700 mt-1" style={{ fontFamily: 'Pretendard-Regular' }}>
          {t('coaching.step2.smartGood')}
        </Text>
        <Text className="text-xs text-blue-500 mt-1" style={{ fontFamily: 'Pretendard-Regular' }}>
          {t('coaching.step2.smartBad')}
        </Text>
      </View>
      <Text className="text-xs text-gray-500 mb-3" style={{ fontFamily: 'Pretendard-Regular' }}>
        {t(`coaching.step2.personaTip.${personaKey}`)}
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
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl text-gray-900" style={{ fontFamily: 'Pretendard-Bold' }}>
          {t('coaching.step3.title')}
        </Text>
        {subGoals.some(g => g.trim()) && (
          <View className="bg-gray-100 px-2 py-1 rounded-md">
            <Text className="text-[10px] text-gray-500" style={{ fontFamily: 'Pretendard-Medium' }}>
              Powered by AI (Perplexity)
            </Text>
          </View>
        )}
      </View>
      <Text className="text-sm text-gray-500 mb-2" style={{ fontFamily: 'Pretendard-Regular' }}>
        {t('coaching.step3.subtitle')}
      </Text>
      <Text className="text-xs text-gray-400 mb-4" style={{ fontFamily: 'Pretendard-Regular' }}>
        {t('coaching.step3.minNote', { count: 4 })}
      </Text>
      <Text className="text-xs text-gray-500 mb-4" style={{ fontFamily: 'Pretendard-Regular' }}>
        {t(`coaching.step3.personaTip.${personaKey}`)}
      </Text>
      <View className="space-y-3">
        {subGoals.slice(0, step3VisibleCount).map((value, index) => (
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
      {step3VisibleCount < subGoals.length && (
        <Pressable
          onPress={() => setStep3VisibleCount((prev) => Math.min(8, prev + 2))}
          className="mt-3"
        >
          <Text className="text-sm text-primary" style={{ fontFamily: 'Pretendard-SemiBold' }}>
            {t('coaching.step3.addMore')}
          </Text>
        </Pressable>
      )}
      <View className="mt-4">
        <Button
          variant="secondary"
          onPress={handleAISuggestSubGoals}
          loading={isSuggestingSubGoals}
          loadingText={t('coaching.step3.loadingText')}
        >
          {t('coaching.step3.aiSuggest')}
        </Button>
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
      <View className="mb-4 border border-blue-100 bg-blue-50 rounded-xl p-3">
        <Text className="text-xs text-blue-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
          {t('coaching.step4.criteriaTitle')}
        </Text>
        <Text className="text-xs text-blue-700 mt-1" style={{ fontFamily: 'Pretendard-Regular' }}>
          {t('coaching.step4.criteriaBase')}
        </Text>
        <Text className="text-xs text-blue-700 mt-1" style={{ fontFamily: 'Pretendard-Regular' }}>
          {t('coaching.step4.criteriaMinimum')}
        </Text>
        <Text className="text-xs text-blue-700 mt-1" style={{ fontFamily: 'Pretendard-Regular' }}>
          {t('coaching.step4.criteriaChallenge')}
        </Text>
      </View>
      <Text className="text-xs text-gray-500 mb-4" style={{ fontFamily: 'Pretendard-Regular' }}>
        {t(`coaching.step4.personaTip.${personaKey}`)}
      </Text>
      <View className="mb-6">
        <Button
          variant="secondary"
          onPress={handleAIGenerateActions}
          loading={isGeneratingActions}
          loadingText={t('coaching.step4.loadingText')}
        >
          {t('coaching.step4.aiGenerate')}
        </Button>
      </View>
      {actionDrafts.length === 0 ? (
        <Text className="text-sm text-gray-500" style={{ fontFamily: 'Pretendard-Regular' }}>
          {t('coaching.step4.empty')}
        </Text>
      ) : (
        <View className="space-y-4">
          {actionDrafts.map((draft, index) => (
            <View key={`action-draft-${index}`} className="border border-gray-200 rounded-xl p-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-sm text-gray-900" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                  {draft.subGoal || t('coaching.step4.subGoalFallback', { index: index + 1 })}
                </Text>
                <Pressable
                  onPress={() => {
                    setExpandedStep4Sections((prev) =>
                      prev.map((value, valueIndex) => (valueIndex === index ? !value : value))
                    )
                  }}
                >
                  <Text className="text-xs text-primary" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                    {expandedStep4Sections[index]
                      ? t('coaching.step4.collapse')
                      : t('coaching.step4.expand')}
                  </Text>
                </Pressable>
              </View>
              {expandedStep4Sections[index] && (
                <>
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
                </>
              )}
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
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xl text-gray-900" style={{ fontFamily: 'Pretendard-Bold' }}>
            {t('coaching.step5.title')}
          </Text>
          {(realityFeedback || realityCorrections.length > 0) && (
            <View className="bg-gray-100 px-2 py-1 rounded-md">
              <Text className="text-[10px] text-gray-500" style={{ fontFamily: 'Pretendard-Medium' }}>
                Powered by AI (Perplexity)
              </Text>
            </View>
          )}
        </View>
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
                      <View className="mt-1 space-y-1">
                        <Text className="text-xs text-gray-500" style={{ fontFamily: 'Pretendard-Regular' }}>
                          {t('coaching.step5.rationale')}
                        </Text>
                        <Text className="text-xs text-gray-500" style={{ fontFamily: 'Pretendard-Regular' }}>
                          {t('coaching.step5.suggestion', { action: text })}
                        </Text>
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          ))}
        </View>

        {isCheckingReality ? (
          <View className="mt-4 py-8 items-center bg-blue-50/50 rounded-2xl border border-blue-100 border-dashed">
            <Text className="text-sm text-blue-600" style={{ fontFamily: 'Pretendard-Medium' }}>
              {t('coaching.step5.checking')}
            </Text>
          </View>
        ) : (
          <>
            {realityFeedback && (
              <View className="mt-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <Text className="text-sm text-gray-900 leading-5" style={{ fontFamily: 'Pretendard-Regular' }}>
                  {realityFeedback}
                </Text>
              </View>
            )}

            {realityCorrections.length > 0 && (
              <View className="mt-4 space-y-3">
                <Text className="text-xs text-gray-500 uppercase px-1" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                  {t('coaching.step5.suggestionsTitle')}
                </Text>
                {realityCorrections.map((correction, idx) => (
                  <View key={`correction-${idx}`} className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <View className="flex-row items-center space-x-2 mb-1">
                      <Text className="text-xs text-gray-400 line-through" style={{ fontFamily: 'Pretendard-Regular' }}>
                        {correction.original}
                      </Text>
                      <Text className="text-xs text-blue-400"> → </Text>
                      <Text className="text-xs text-blue-700" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                        {correction.suggested}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-600" style={{ fontFamily: 'Pretendard-Regular' }}>
                      {correction.reason}
                    </Text>
                  </View>
                ))}
                <View className="mt-2 space-y-2">
                  <Button variant="secondary" onPress={handleApplySuggestions}>
                    {t('coaching.step5.apply')}
                  </Button>
                  <Button variant="ghost" onPress={handleRejectSuggestions}>
                    {t('coaching.step5.reject')}
                  </Button>
                </View>
              </View>
            )}

            {!realityFeedback && !isCheckingReality && !step5Applied && !step5Rejected && (
              <View className="mt-4">
                <Button variant="secondary" onPress={handleRunRealityCheck} loading={isCheckingReality} loadingText={t('coaching.step5.loadingText')}>
                  {t('coaching.step5.runCheck')}
                </Button>
              </View>
            )}

            {step5Rejected && (
              <Text className="text-xs text-gray-500 mt-4 px-1" style={{ fontFamily: 'Pretendard-Regular' }}>
                {t('coaching.step5.rejectNote')}
              </Text>
            )}
          </>
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
      { id: 'custom', label: t('coaching.step6.options.custom'), frequency: 'weekly', countPerWeek: customCountPerWeek, weekdays: customWeekdays },
    ]

    return (
      <>
        <Text className="text-xl text-gray-900 mb-2" style={{ fontFamily: 'Pretendard-Bold' }}>
          {t('coaching.step6.title')}
        </Text>
        <Text className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'Pretendard-Regular' }}>
          {t('coaching.step6.subtitle')}
        </Text>
        <Text className="text-xs text-gray-500 mb-4" style={{ fontFamily: 'Pretendard-Regular' }}>
          {t(`coaching.step6.personaTip.${personaKey}`)}
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
        {routinePlan?.id === 'custom' && (
          <View className="mt-4 border border-gray-200 rounded-xl p-4">
            <Text className="text-sm text-gray-700 mb-2" style={{ fontFamily: 'Pretendard-SemiBold' }}>
              {t('coaching.step6.customTitle')}
            </Text>
            <Text className="text-xs text-gray-500 mb-2" style={{ fontFamily: 'Pretendard-Regular' }}>
              {t('coaching.step6.customWeekdaysLabel')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {weekdayOptions.map((day) => {
                const selected = customWeekdays.includes(day.value)
                return (
                  <Pressable
                    key={`weekday-${day.value}`}
                    onPress={() => {
                      setCustomWeekdays((prev) =>
                        prev.includes(day.value) ? prev.filter((value) => value !== day.value) : [...prev, day.value]
                      )
                    }}
                    className={`px-3 py-2 rounded-full border ${selected ? 'border-primary bg-primary/10' : 'border-gray-200 bg-white'}`}
                  >
                    <Text
                      className={`text-xs ${selected ? 'text-gray-900' : 'text-gray-600'}`}
                      style={{ fontFamily: selected ? 'Pretendard-SemiBold' : 'Pretendard-Regular' }}
                    >
                      {day.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            <Text className="text-xs text-gray-500 mt-3" style={{ fontFamily: 'Pretendard-Regular' }}>
              {t('coaching.step6.customCountLabel')}
            </Text>
            <View className="flex-row flex-wrap gap-2 mt-2">
              {[1, 2, 3, 4, 5, 6, 7].map((count) => {
                const selected = customCountPerWeek === count
                return (
                  <Pressable
                    key={`custom-count-${count}`}
                    onPress={() => setCustomCountPerWeek(count)}
                    className={`px-3 py-2 rounded-full border ${selected ? 'border-primary bg-primary/10' : 'border-gray-200 bg-white'}`}
                  >
                    <Text
                      className={`text-xs ${selected ? 'text-gray-900' : 'text-gray-600'}`}
                      style={{ fontFamily: selected ? 'Pretendard-SemiBold' : 'Pretendard-Regular' }}
                    >
                      {count}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            <Text className="text-xs text-gray-400 mt-2" style={{ fontFamily: 'Pretendard-Regular' }}>
              {t('coaching.step6.customHint')}
            </Text>
          </View>
        )}
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
            const typeData = override ?? {
              type: 'routine',
              routine_frequency: routinePlan?.frequency || 'weekly',
              routine_weekdays: routinePlan?.weekdays || [],
              routine_count_per_period: routinePlan?.countPerWeek,
            }
            const typeLabel = t(`actionType.${typeData.type}`)
            const detail = formatTypeDetailsLocalized({
              type: typeData.type,
              routine_frequency: typeData.routine_frequency,
              routine_weekdays: typeData.routine_weekdays,
              routine_count_per_period: typeData.routine_count_per_period,
              mission_completion_type: typeData.mission_completion_type,
              mission_period_cycle: typeData.mission_period_cycle,
            }, t)
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
                <Text className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Pretendard-Regular' }}>
                  {detail
                    ? t('coaching.step7.typeSummary', { type: typeLabel, detail })
                    : t('coaching.step7.typeSummaryOnly', { type: typeLabel })}
                </Text>
                {override && (
                  <Text className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Pretendard-Regular' }}>
                    {t('coaching.step7.customized')}
                  </Text>
                )}
              </View>
            )
          })
        )}
        <Text className="text-xs text-gray-400 mt-3" style={{ fontFamily: 'Pretendard-Regular' }}>
          {t('coaching.step7.modeNote')}
        </Text>
        <Text className="text-sm text-gray-700 mt-4" style={{ fontFamily: 'Pretendard-SemiBold' }}>
          {t('coaching.step7.routine')}
        </Text>
        <Text className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'Pretendard-Regular' }}>
          {routinePlan?.label || '-'}
        </Text>
      </View>
      <Text className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'Pretendard-Regular' }}>
        {t('coaching.step7.subtitle')}
      </Text>

      {actionItems.filter(it => !actionTypeEdits[it.id]).length > 0 && (
        <View className="bg-orange-50 p-4 rounded-xl mb-6 border border-orange-100">
          <Text className="text-orange-800 text-sm mb-2" style={{ fontFamily: 'Pretendard-SemiBold' }}>
            {t('coaching.step7.unconfiguredTitle', { count: actionItems.filter(it => !actionTypeEdits[it.id]).length })}
          </Text>
          <Text className="text-orange-700 text-xs mb-3" style={{ fontFamily: 'Pretendard-Regular' }}>
            {t('coaching.step7.unconfiguredDesc')}
          </Text>
          <Button
            onPress={handleAutoSetDefaults}
            variant="outline"
            size="sm"
            className="bg-white border-orange-200"
            loadingText={t('coaching.step7.loadingText')}
          >
            <Text className="text-orange-800 text-xs">{t('coaching.step7.autoSet')}</Text>
          </Button>
        </View>
      )}

      <Text className="text-sm text-gray-700 mb-2" style={{ fontFamily: 'Pretendard-SemiBold' }}>
        {t('coaching.step7.actions')}
      </Text>
      <Text className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'Pretendard-Regular' }}>
        {routinePlan?.label || '-'}
      </Text>
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
          {recapItems.length > 0 && (
            <View className="mt-3">
              <Pressable onPress={() => setShowRecap((prev) => !prev)}>
                <Text className="text-xs text-primary" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                  {showRecap ? t('coaching.recap.hide') : t('coaching.recap.show')}
                </Text>
              </Pressable>
              {showRecap && (
                <View className="mt-2 space-y-1">
                  {recapItems.map((item, index) => (
                    <Text key={`recap-${index}`} className="text-xs text-gray-600" style={{ fontFamily: 'Pretendard-Regular' }}>
                      • {item}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
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
