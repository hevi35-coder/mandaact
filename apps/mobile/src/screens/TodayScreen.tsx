import React, { useMemo, useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  useWindowDimensions,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { useScrollToTop } from '../navigation/RootNavigator'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import { Header } from '../components'
import {
  ChevronDown,
  ChevronRight,
  Check,
  RotateCw,
  Target,
  Lightbulb,
  Calendar,
  Info,
  ClipboardCheck,
} from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { format, addDays, isSameDay, startOfDay, parseISO } from 'date-fns'
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'
import { ko } from 'date-fns/locale/ko'
import { enUS } from 'date-fns/locale/en-US'
import i18n from '../i18n'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import {
  useTodayActions,
  useToggleActionCheck,
  useUpdateAction,
  ActionWithContext,
} from '../hooks/useActions'
import { useDailyStats, useXPUpdate, statsKeys } from '../hooks/useStats'
import { badgeKeys } from '../hooks/useBadges'
import { useUserProfile, getDeviceTimezone } from '../hooks/useUserProfile'
import { useToast } from '../components/Toast'
import {
  shouldShowToday,
  getActionTypeLabel,
  formatTypeDetails,
  isTodayOrYesterday,
  type ActionType,
} from '@mandaact/shared'
import type { Action, Mandalart } from '@mandaact/shared'
import { logger, trackActionChecked, trackBadgeUnlocked } from '../lib'
import { badgeService } from '../lib/badge'
import DatePickerModal from '../components/DatePickerModal'
import ActionTypeSelector, { type ActionTypeData } from '../components/ActionTypeSelector'

// Helper function to format date based on current language
function formatLocalizedDate(date: Date, language: string): string {
  if (language === 'ko') {
    return format(date, 'M월 d일 (EEE)', { locale: ko })
  }
  return format(date, 'MMM d (EEE)', { locale: enUS })
}

// Action type icon component - colors match web exactly
function ActionTypeIcon({
  type,
  size = 16,
}: {
  type: ActionType
  size?: number
}) {
  switch (type) {
    case 'routine':
      return <RotateCw size={size} color="#3b82f6" />  // Blue (web)
    case 'mission':
      return <Target size={size} color="#10b981" />    // Green (web)
    case 'reference':
      return <Lightbulb size={size} color="#f59e0b" /> // Amber (web)
    default:
      return null
  }
}

// Weekday number to translation key mapping
const weekdayKeyMap: Record<number, string> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat'
}

// Helper function to format type details with i18n
function formatTypeDetailsLocalized(
  action: {
    type: ActionType
    routine_frequency?: string
    routine_weekdays?: number[]
    routine_count_per_period?: number
    mission_completion_type?: string
    mission_period_cycle?: string
  },
  t: (key: string, params?: Record<string, unknown>) => string
): string {
  if (action.type === 'reference') {
    return ''
  }

  if (action.type === 'routine') {
    const frequency = action.routine_frequency
    const weekdays = action.routine_weekdays || []
    const count = action.routine_count_per_period || 1

    if (frequency === 'daily') {
      return t('actionType.format.daily')
    }

    if (frequency === 'weekly') {
      if (weekdays.length > 0) {
        // Sort weekdays: 1,2,3,4,5,6,0 (Mon-Sun)
        const sortedDays = [...weekdays].sort((a, b) => {
          const orderA = a === 0 ? 7 : a
          const orderB = b === 0 ? 7 : b
          return orderA - orderB
        })
        const dayNames = sortedDays.map(d => t(`actionType.weekdayShort.${weekdayKeyMap[d]}`)).join(', ')
        if (count && count > 0) {
          return t('actionType.format.timesPerWeekWithDays', { count, days: dayNames })
        }
        return t('actionType.format.weekdays', { days: dayNames })
      }
      return t('actionType.format.timesPerWeek', { count })
    }

    if (frequency === 'monthly') {
      return t('actionType.format.timesPerMonth', { count })
    }
  }

  if (action.type === 'mission') {
    const completionType = action.mission_completion_type
    const periodCycle = action.mission_period_cycle

    if (completionType === 'once') {
      return t('actionType.format.onceComplete')
    }

    if (completionType === 'periodic') {
      if (periodCycle === 'quarterly') {
        return t('actionType.format.periodicQuarterly')
      }
      if (periodCycle === 'yearly') {
        return t('actionType.format.periodicYearly')
      }
      return t('actionType.format.periodicMonthly')
    }
  }

  return ''
}

export default function TodayScreen() {
  const { t } = useTranslation()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // iPad detection
  const { width: screenWidth } = useWindowDimensions()
  const isTablet = Platform.OS === 'ios' && screenWidth >= 768

  // Get user's timezone
  const { timezone } = useUserProfile(user?.id)

  // Scroll to top on tab re-press
  const scrollRef = useRef<ScrollView>(null)
  useScrollToTop('Today', scrollRef)

  // Calculate "today" in user's timezone
  const getUserToday = useCallback(() => {
    const now = new Date()
    const zonedNow = toZonedTime(now, timezone)
    return startOfDay(zonedNow)
  }, [timezone])

  const [selectedDate, setSelectedDate] = useState(() => getUserToday())
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set()
  )
  const [refreshing, setRefreshing] = useState(false)
  const [checkingActions, setCheckingActions] = useState<Set<string>>(new Set())
  const toast = useToast()

  // Type filter state - multiple selection using Set (Web과 동일)
  const [activeFilters, setActiveFilters] = useState<Set<ActionType>>(new Set())
  // Type filter collapse state - default collapsed (Web과 동일)
  const [typeFilterCollapsed, setTypeFilterCollapsed] = useState(true)

  // Date picker modal state
  const [datePickerVisible, setDatePickerVisible] = useState(false)

  // Action type selector state
  const [typeSelectorVisible, setTypeSelectorVisible] = useState(false)
  const [selectedActionForTypeEdit, setSelectedActionForTypeEdit] = useState<ActionWithContext | null>(null)

  // Date navigation - use user's timezone
  const today = useMemo(() => getUserToday(), [getUserToday])
  const isToday = isSameDay(selectedDate, today)

  // Check if selected date allows checking (today or yesterday only) - timezone aware
  const canCheck = useMemo(() => {
    const userToday = getUserToday()
    const userYesterday = addDays(userToday, -1)
    return isSameDay(selectedDate, userToday) || isSameDay(selectedDate, userYesterday)
  }, [selectedDate, getUserToday])

  const handlePreviousDay = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, -1))
  }, [])

  const handleNextDay = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, 1))
  }, [])

  const handleToday = useCallback(() => {
    setSelectedDate(getUserToday())
  }, [getUserToday])

  // Data fetching
  const {
    data: actions = [],
    isLoading,
    error,
    refetch,
  } = useTodayActions(user?.id, selectedDate)
  const { data: _dailyStats, refetch: refetchStats } = useDailyStats(user?.id)

  // Mutations
  const toggleCheck = useToggleActionCheck()
  const updateAction = useUpdateAction()
  const { awardXP, subtractXP, checkPerfectDay, checkPerfectWeek } = useXPUpdate()

  // Handle date selection from picker
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date)
  }, [])

  // Handle type badge press - open type editor
  const handleTypeBadgePress = useCallback((action: ActionWithContext) => {
    setSelectedActionForTypeEdit(action)
    setTypeSelectorVisible(true)
  }, [])

  // Handle type save
  const handleTypeSave = useCallback(async (data: ActionTypeData) => {
    if (!selectedActionForTypeEdit) return

    try {
      // Build updates object - use null for fields that need to be cleared in DB
      const updates: Record<string, unknown> = {
        type: data.type,
        routine_frequency: data.routine_frequency ?? null,
        routine_weekdays: data.routine_weekdays ?? null,
        routine_count_per_period: data.routine_count_per_period ?? null,
        mission_completion_type: data.mission_completion_type ?? null,
        mission_period_cycle: data.mission_period_cycle ?? null,
        mission_current_period_start: data.mission_current_period_start ?? null,
        mission_current_period_end: data.mission_current_period_end ?? null,
        ai_suggestion: data.ai_suggestion ?? null,
      }

      await updateAction.mutateAsync({
        id: selectedActionForTypeEdit.id,
        updates: updates as Partial<Action>,
      })

      toast.success(t('today.typeChanged'), t('today.typeChangedDesc'))
      // Await refetch to ensure data is updated before modal closes
      await refetch()
    } catch (error) {
      logger.error('Error saving action type', error)
      toast.error(t('common.error'), t('today.typeChangeError'))
    }
  }, [selectedActionForTypeEdit, updateAction, refetch, toast])

  // Filter toggle functions (Web과 동일)
  const toggleFilter = useCallback((type: ActionType) => {
    setActiveFilters((prev) => {
      const newFilters = new Set(prev)
      if (newFilters.has(type)) {
        newFilters.delete(type)
      } else {
        newFilters.add(type)
      }
      return newFilters
    })
  }, [])

  const clearAllFilters = useCallback(() => {
    setActiveFilters(new Set())
  }, [])

  // Filter actions based on type and shouldShowToday logic (Web과 동일)
  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      // Apply shouldShowToday logic
      const shouldShow = shouldShowToday(action, selectedDate)
      if (!shouldShow) return false

      // Apply type filters (multiple selection)
      // If no filters selected, show all types
      if (activeFilters.size === 0) return true

      // Show only if action type is in active filters
      return activeFilters.has(action.type)
    })
  }, [actions, activeFilters, selectedDate])

  // Group actions by mandalart and sort by sub_goal.position, then action.position
  const actionsByMandalart = useMemo(() => {
    const groups = filteredActions.reduce(
      (acc, action) => {
        const mandalartId = action.sub_goal.mandalart.id
        if (!acc[mandalartId]) {
          acc[mandalartId] = {
            mandalart: action.sub_goal.mandalart,
            actions: [],
          }
        }
        acc[mandalartId].actions.push(action)
        return acc
      },
      {} as Record<
        string,
        { mandalart: Mandalart; actions: ActionWithContext[] }
      >
    )

    // Sort actions within each mandalart group
    Object.values(groups).forEach((group) => {
      group.actions.sort((a, b) => {
        // Primary: sort by sub_goal.position (fallback to 0 if undefined)
        const aSubPos = a.sub_goal.position ?? 0
        const bSubPos = b.sub_goal.position ?? 0
        const subGoalDiff = aSubPos - bSubPos
        if (subGoalDiff !== 0) return subGoalDiff
        // Secondary: sort by action.position (fallback to 0 if undefined)
        const aPos = a.position ?? 0
        const bPos = b.position ?? 0
        return aPos - bPos
      })
    })

    return groups
  }, [filteredActions])

  // Calculate progress (exclude reference actions)
  const nonReferenceActions = filteredActions.filter(
    (a) => a.type !== 'reference'
  )
  const checkedCount = nonReferenceActions.filter((a) => a.is_checked).length
  const totalCount = nonReferenceActions.length
  const progressPercentage =
    totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  const toggleSection = useCallback((mandalartId: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(mandalartId)) {
        newSet.delete(mandalartId)
      } else {
        newSet.add(mandalartId)
      }
      return newSet
    })
  }, [])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([refetch(), refetchStats()])
    setRefreshing(false)
  }, [refetch, refetchStats])

  const handleToggleCheck = useCallback(
    async (action: ActionWithContext) => {
      if (!user) return
      if (checkingActions.has(action.id)) return
      if (action.type === 'reference') return
      if (!canCheck) return // Only allow checking on today or yesterday

      setCheckingActions((prev) => new Set(prev).add(action.id))

      try {
        const wasChecked = action.is_checked

        await toggleCheck.mutateAsync({
          actionId: action.id,
          userId: user.id,
          isChecked: action.is_checked,
          checkId: action.check_id,
          selectedDate,
          actionType: action.type,
          missionCompletionType: action.mission_completion_type,
        })

        // Refetch to update UI with new period_progress
        await refetch()

        // Award XP when checking, subtract when unchecking
        if (!wasChecked) {
          // Track action checked event
          trackActionChecked({
            action_id: action.id,
            action_type: action.type as 'routine' | 'mission' | 'reference',
            sub_goal_id: action.sub_goal_id,
            mandalart_id: action.sub_goal.mandalart.id,
            checked_at: selectedDate,
          })
          // Checking: Award XP
          try {
            // Award base XP (10) + streak bonus if applicable
            // Pass selectedDate to ensure weekend bonus is calculated for the correct date
            const xpResult = await awardXP(user.id, 10, selectedDate)

            // Show XP toast
            if (xpResult.multipliers.length > 0) {
              const totalMultiplier = xpResult.multipliers.reduce((sum, m) => sum + m.multiplier, 0)
              toast.success(t('today.xp.earned', { xp: xpResult.finalXP }), t('today.xp.multiplier', { multiplier: totalMultiplier.toFixed(1) }))
            } else {
              toast.success(t('today.xp.earned', { xp: xpResult.finalXP }), t('today.xp.completed'))
            }

            // Show level up toast (level tracking is done on server side)
            if (xpResult.leveledUp) {
              setTimeout(() => {
                toast.success(`🎉 ${t('today.xp.levelUp')}`, t('today.xp.levelUpDesc'))
              }, 1500)
            }

            // Check for perfect day bonus and badges (after a short delay)
            setTimeout(async () => {
              try {
                const checkDate = format(selectedDate, 'yyyy-MM-dd')
                const perfectResult = await checkPerfectDay(user.id, checkDate)

                if (perfectResult.is_perfect_day && perfectResult.xp_awarded > 0) {
                  toast.success(`⭐ ${t('today.xp.perfectDay')}`, t('today.xp.perfectDayBonus', { xp: perfectResult.xp_awarded }))
                  logger.info('Perfect day bonus awarded', { xp: perfectResult.xp_awarded })
                }

                // Check and unlock new badges (uses shared badgeService)
                const newlyUnlocked = await badgeService.evaluateAndUnlockBadges(user.id)
                if (newlyUnlocked && newlyUnlocked.length > 0) {
                  // Invalidate badge queries so BadgeScreen shows updated data
                  queryClient.invalidateQueries({ queryKey: badgeKeys.userBadges(user.id) })
                  queryClient.invalidateQueries({ queryKey: badgeKeys.progress(user.id) })

                  for (const badge of newlyUnlocked) {
                    // Track badge unlock event
                    trackBadgeUnlocked({
                      badge_id: badge.badgeKey,
                      badge_title: badge.badgeTitle,
                      badge_category: 'general', // Category not available in result
                      xp_reward: badge.xpAwarded,
                      current_level: 0, // Level not available here
                    })
                    setTimeout(() => {
                      toast.success(`🏆 ${t('today.xp.newBadge')}`, `${badge.badgeTitle} (+${badge.xpAwarded} XP)`)
                    }, 500 * newlyUnlocked.indexOf(badge))
                    logger.info('Badge unlocked', { badge: badge.badgeTitle, xp: badge.xpAwarded })
                  }
                }

                // Check for perfect week bonus (80%+ weekly completion)
                const weekResult = await checkPerfectWeek(user.id)
                if (weekResult.activated) {
                  toast.success(`🌟 ${t('today.xp.perfectWeek')}`, t('today.xp.perfectWeekBonus'))
                  logger.info('Perfect week bonus activated', { percentage: weekResult.percentage })
                }
              } catch (bonusError) {
                logger.error('Perfect day/badge/week check error', bonusError)
              }
            }, 500)

            logger.info('XP awarded', { xp: xpResult.finalXP, multipliers: xpResult.multipliers.length })
          } catch (xpError) {
            logger.error('XP award error', xpError)
            // Don't fail the whole operation if XP update fails
          }

          // Invalidate HomeScreen stats queries (streak, heatmap, profile stats)
          queryClient.invalidateQueries({ queryKey: statsKeys.user(user.id) })
        } else {
          // Unchecking: Subtract XP (use selectedDate for correct weekend bonus calculation)
          try {
            const result = await subtractXP(user.id, 10, selectedDate)
            if (result.finalXP > 0) {
              toast.info(t('today.xp.subtracted', { xp: result.finalXP }), t('today.xp.unchecked'))
              logger.info('XP subtracted', { xp: result.finalXP })
            }
          } catch (xpError) {
            logger.error('XP subtract error', xpError)
            // Don't fail the whole operation if XP update fails
          }

          // Invalidate HomeScreen stats queries (streak, heatmap, profile stats)
          queryClient.invalidateQueries({ queryKey: statsKeys.user(user.id) })
        }
      } catch (err: unknown) {
        // Extract error message from various error formats
        let errorMessage = 'Unknown error'
        const errObj = err as Record<string, unknown>
        if (errObj?.message && typeof errObj.message === 'string') {
          errorMessage = errObj.message
        } else if (errObj?.error && typeof errObj.error === 'object' && (errObj.error as Record<string, unknown>)?.message) {
          errorMessage = String((errObj.error as Record<string, unknown>).message)
        } else if (errObj?.code) {
          errorMessage = `Code: ${errObj.code}`
        } else if (typeof err === 'object' && err !== null) {
          errorMessage = JSON.stringify(err, null, 2)
        }
        logger.error('Check toggle error', { error: errorMessage, actionId: action.id, fullError: err })
        Alert.alert(t('common.error'), `${t('errors.generic')}\n${errorMessage}`)
      } finally {
        setCheckingActions((prev) => {
          const newSet = new Set(prev)
          newSet.delete(action.id)
          return newSet
        })
      }
    },
    [user, checkingActions, toggleCheck, awardXP, subtractXP, checkPerfectDay, checkPerfectWeek, selectedDate, toast, canCheck, queryClient, refetch]
  )

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50">
        <Header />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#374151" />
          <Text className="text-gray-500 mt-4">{t('common.loading')}</Text>
        </View>
      </View>
    )
  }

  // Error state
  if (error) {
    return (
      <View className="flex-1 bg-gray-50">
        <Header />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-red-500 text-center">
            {t('errors.generic')}
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="mt-4 bg-primary px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">{t('common.retry')}</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-5 pt-5"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Page Title - Center Aligned */}
        <View className="mb-5">
          <View className="items-center mb-4">
            <View className="flex-row items-center">
              <Text
                className="text-3xl text-gray-900"
                style={{ fontFamily: 'Pretendard-Bold' }}
              >
                {t('today.title')}
              </Text>
              <Text
                className="text-base text-gray-500 ml-3"
                style={{ fontFamily: 'Pretendard-Medium' }}
              >
                {t('today.subtitle')}
              </Text>
            </View>
          </View>

          {/* Date Navigation - Web 스타일 (이전/오늘/다음 + 날짜) */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center rounded-lg border border-gray-300 overflow-hidden bg-white">
              <Pressable
                onPress={handlePreviousDay}
                className="px-3 py-2 border-r border-gray-300 active:bg-gray-100"
              >
                <Text className="text-sm text-gray-700">{t('common.previous')}</Text>
              </Pressable>
              <Pressable
                onPress={handleToday}
                className="px-4 py-2 border-r border-gray-300 active:bg-gray-100"
              >
                {isToday ? (
                  <MaskedView
                    maskElement={
                      <Text className="text-sm font-medium">{t('common.today')}</Text>
                    }
                  >
                    <LinearGradient
                      colors={['#2563eb', '#9333ea', '#db2777']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text className="text-sm font-medium opacity-0">{t('common.today')}</Text>
                    </LinearGradient>
                  </MaskedView>
                ) : (
                  <Text className="text-sm font-medium text-gray-700">{t('common.today')}</Text>
                )}
              </Pressable>
              <Pressable
                onPress={handleNextDay}
                className="px-3 py-2 active:bg-gray-100"
              >
                <Text className="text-sm text-gray-700">{t('common.next')}</Text>
              </Pressable>
            </View>

            {/* 날짜 표시 버튼 - Pressable로 변경 (캘린더 모달 열기) */}
            <Pressable
              onPress={() => setDatePickerVisible(true)}
              className="flex-row items-center bg-white border border-gray-300 rounded-lg px-3 py-2 active:bg-gray-50"
            >
              {isToday ? (
                <MaskedView
                  maskElement={
                    <View className="flex-row items-center">
                      <Calendar size={16} color="#000" />
                      <Text className="text-sm ml-2">
                        {formatLocalizedDate(selectedDate, i18n.language)}
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
                      <Calendar size={16} color="#000" />
                      <Text className="text-sm ml-2">
                        {formatLocalizedDate(selectedDate, i18n.language)}
                      </Text>
                    </View>
                  </LinearGradient>
                </MaskedView>
              ) : (
                <>
                  <Calendar size={16} color="#6b7280" />
                  <Text className="text-sm text-gray-700 ml-2">
                    {formatLocalizedDate(selectedDate, i18n.language)}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Progress Card with Type Filter - Web과 동일 */}
        {actions.length > 0 && (
          <Animated.View
            entering={FadeInUp.delay(100).duration(400)}
            className="bg-white rounded-3xl p-6 mb-5 border border-gray-100"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Text className="text-base font-semibold text-gray-900">
                  {t('today.achievementRate')}
                </Text>
                <Text className="text-lg font-bold text-gray-900 ml-3">
                  {progressPercentage}%
                </Text>
              </View>
              <Text className="text-sm text-gray-500">
                {checkedCount} / {totalCount}
              </Text>
            </View>

            {/* Progress Bar */}
            <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <Animated.View
                entering={FadeInUp.delay(300).duration(300)}
                className="h-full rounded-full overflow-hidden"
                style={{ width: `${progressPercentage}%` }}
              >
                <LinearGradient
                  colors={['#2563eb', '#9333ea', '#db2777']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>
            </View>

            {/* Info Text */}
            <View className="flex-row items-center mt-3">
              <Info size={12} color="#9ca3af" />
              <Text className="text-xs text-gray-400 ml-1">
                {t('today.dateRestriction')}
              </Text>
            </View>

            {/* Type Filter - Collapsible Section (Web과 동일) */}
            <View className="border-t border-gray-100 mt-4 pt-4">
              <Pressable
                onPress={() => setTypeFilterCollapsed(!typeFilterCollapsed)}
                className="flex-row items-center justify-between"
              >
                <Text className="text-sm font-medium text-gray-900">{t('today.typeFilter')}</Text>
                {typeFilterCollapsed ? (
                  <ChevronRight size={16} color="#6b7280" />
                ) : (
                  <ChevronDown size={16} color="#6b7280" />
                )}
              </Pressable>

              {!typeFilterCollapsed && (
                <View className="mt-3">
                  {/* Filter Buttons - 4 columns like Web */}
                  <View className="flex-row flex-wrap gap-2">
                    {/* 전체 버튼 */}
                    <Pressable
                      onPress={clearAllFilters}
                      className={`flex-1 min-w-[70px] py-2 px-3 rounded-lg border ${
                        activeFilters.size === 0
                          ? 'bg-gray-900 border-gray-900'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <Text
                        className={`text-sm text-center font-medium ${
                          activeFilters.size === 0 ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {t('common.all')}
                      </Text>
                    </Pressable>

                    {/* 루틴 버튼 */}
                    <Pressable
                      onPress={() => toggleFilter('routine')}
                      className={`flex-1 min-w-[70px] py-2 px-3 rounded-lg border flex-row items-center justify-center ${
                        activeFilters.has('routine')
                          ? 'bg-gray-900 border-gray-900'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <RotateCw
                        size={14}
                        color={activeFilters.has('routine') ? '#ffffff' : '#3b82f6'}
                      />
                      <Text
                        className={`text-sm ml-1 font-medium ${
                          activeFilters.has('routine') ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {t('actionType.routine')}
                      </Text>
                    </Pressable>

                    {/* 미션 버튼 */}
                    <Pressable
                      onPress={() => toggleFilter('mission')}
                      className={`flex-1 min-w-[70px] py-2 px-3 rounded-lg border flex-row items-center justify-center ${
                        activeFilters.has('mission')
                          ? 'bg-gray-900 border-gray-900'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <Target
                        size={14}
                        color={activeFilters.has('mission') ? '#ffffff' : '#10b981'}
                      />
                      <Text
                        className={`text-sm ml-1 font-medium ${
                          activeFilters.has('mission') ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {t('actionType.mission')}
                      </Text>
                    </Pressable>

                    {/* 참고 버튼 */}
                    <Pressable
                      onPress={() => toggleFilter('reference')}
                      className={`flex-1 min-w-[70px] py-2 px-3 rounded-lg border flex-row items-center justify-center ${
                        activeFilters.has('reference')
                          ? 'bg-gray-900 border-gray-900'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <Lightbulb
                        size={14}
                        color={activeFilters.has('reference') ? '#ffffff' : '#f59e0b'}
                      />
                      <Text
                        className={`text-sm ml-1 font-medium ${
                          activeFilters.has('reference') ? 'text-white' : 'text-gray-700'
                        }`}
                      >
                        {t('actionType.reference')}
                      </Text>
                    </Pressable>
                  </View>

                  {/* Info Text */}
                  <View className="flex-row items-center mt-3">
                    <Info size={12} color="#9ca3af" />
                    <Text className="text-xs text-gray-400 ml-1">
                      {t('today.referenceNote')}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Empty State - 전체 데이터가 없을 때 */}
        {actions.length === 0 && (
          <Animated.View
            entering={FadeInUp.delay(100).duration(400)}
            className="bg-white rounded-2xl p-6"
          >
            {/* Icon */}
            <View className="items-center mb-4">
              <View className="w-14 h-14 bg-gray-100 rounded-full items-center justify-center">
                <ClipboardCheck size={28} color="#9ca3af" />
              </View>
            </View>

            {/* Title & Description */}
            <Text
              className="text-lg text-gray-900 text-center mb-2"
              style={{ fontFamily: 'Pretendard-SemiBold' }}
            >
              {t('today.empty.title')}
            </Text>
            <Text
              className="text-sm text-gray-500 text-center mb-5"
              style={{ fontFamily: 'Pretendard-Regular' }}
            >
              {t('today.empty.description')}
            </Text>

            {/* Guide Box */}
            <View className="bg-gray-50 rounded-xl p-4 mb-5">
              <Text
                className="text-sm text-gray-700 mb-3"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                {t('today.empty.howTo.title')}
              </Text>
              <View className="flex-row items-center mb-2">
                <View className="w-5 h-5 rounded-full border border-gray-300 items-center justify-center mr-2">
                  <Text className="text-xs text-gray-500" style={{ fontFamily: 'Pretendard-Medium' }}>1</Text>
                </View>
                <Text className="text-sm text-gray-600" style={{ fontFamily: 'Pretendard-Regular' }}>
                  {t('today.empty.howTo.step1')}
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-5 h-5 rounded-full border border-gray-300 items-center justify-center mr-2">
                  <Text className="text-xs text-gray-500" style={{ fontFamily: 'Pretendard-Medium' }}>2</Text>
                </View>
                <Text className="text-sm text-gray-600" style={{ fontFamily: 'Pretendard-Regular' }}>
                  {t('today.empty.howTo.step2')}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 py-3 rounded-xl border border-gray-200 bg-white"
                onPress={() => navigation.navigate('Tutorial')}
              >
                <Text
                  className="text-sm text-gray-700 text-center"
                  style={{ fontFamily: 'Pretendard-SemiBold' }}
                >
                  {t('today.empty.guide')}
                </Text>
              </Pressable>
              <Pressable
                className="flex-1 rounded-xl overflow-hidden"
                onPress={() => navigation.navigate('CreateMandalart')}
              >
                <LinearGradient
                  colors={['#2563eb', '#9333ea', '#db2777']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ padding: 1, borderRadius: 12 }}
                >
                  <View className="bg-white rounded-xl py-3 items-center justify-center">
                    <MaskedView
                      maskElement={
                        <Text
                          className="text-sm text-center"
                          style={{ fontFamily: 'Pretendard-SemiBold' }}
                        >
                          {t('today.empty.create')}
                        </Text>
                      }
                    >
                      <LinearGradient
                        colors={['#2563eb', '#9333ea', '#db2777']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text
                          className="text-sm opacity-0"
                          style={{ fontFamily: 'Pretendard-SemiBold' }}
                        >
                          {t('today.empty.create')}
                        </Text>
                      </LinearGradient>
                    </MaskedView>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Filtered Empty State - 필터 결과가 없을 때 (Web과 동일) */}
        {actions.length > 0 && filteredActions.length === 0 && (
          <Animated.View
            entering={FadeInUp.delay(100).duration(400)}
            className="bg-white rounded-2xl p-8 items-center justify-center min-h-[200px]"
          >
            <Text className="text-4xl mb-4">🔍</Text>
            <Text className="text-lg font-semibold text-gray-900 text-center mb-2">
              {t('today.noFilterResult')}
            </Text>
            <Text className="text-gray-500 text-center">
              {t('today.tryOtherFilter')}
            </Text>
          </Animated.View>
        )}

        {/* Actions List - Grouped by Mandalart */}
        {filteredActions.length > 0 && (() => {
          const mandalartEntries = Object.entries(actionsByMandalart)
          const mandalartCount = mandalartEntries.length
          // iPad: 2-column layout when 2+ mandalarts, full width when 1
          const usesTwoColumn = isTablet && mandalartCount >= 2

          // Render single mandalart section
          const renderMandalartSection = (
            mandalartId: string,
            mandalart: typeof mandalartEntries[0][1]['mandalart'],
            mandalartActions: typeof mandalartEntries[0][1]['actions'],
            index: number
          ) => {
            const isCollapsed = collapsedSections.has(mandalartId)
            const mandalartNonRef = mandalartActions.filter(
              (a) => a.type !== 'reference'
            )
            const mandalartChecked = mandalartNonRef.filter(
              (a) => a.is_checked
            ).length
            const mandalartTotal = mandalartNonRef.length

            return (
              <Animated.View
                key={mandalartId}
                entering={FadeInUp.delay(100 + index * 100).duration(400)}
                className="mb-4"
              >
                {/* Section Header */}
                <Pressable
                  onPress={() => toggleSection(mandalartId)}
                  className="flex-row items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-base font-semibold text-gray-900">
                        {mandalart.title}
                      </Text>
                      <Text className="text-sm text-gray-500 ml-2">
                        {mandalartChecked}/{mandalartTotal}
                      </Text>
                    </View>
                    <Text
                      className="text-sm text-gray-500 mt-1"
                      numberOfLines={1}
                    >
                      {t('today.coreGoal')}: {mandalart.center_goal}
                    </Text>
                  </View>
                  {isCollapsed ? (
                    <ChevronRight size={20} color="#6b7280" />
                  ) : (
                    <ChevronDown size={20} color="#6b7280" />
                  )}
                </Pressable>

                {/* Actions in this Mandalart */}
                {!isCollapsed && (
                  <View className="mt-2 space-y-2">
                    {mandalartActions.map((action, actionIndex) => {
                      // Check if action can be checked (not reference AND date is today/yesterday)
                      const isCheckDisabled = action.type === 'reference' || !canCheck

                      return (
                        <Animated.View
                          key={action.id}
                          entering={FadeInUp.delay(50 + actionIndex * 50).duration(300)}
                          className={`flex-row items-center p-4 bg-white rounded-xl border ${
                            action.is_checked
                              ? 'border-gray-200 bg-gray-50'
                              : action.type === 'reference' || !canCheck
                                ? 'border-gray-100 bg-gray-50/50'
                                : 'border-gray-200'
                          }`}
                        >
                          {/* Checkbox - 사각형 스타일 (Web과 동일) */}
                          <Pressable
                            onPress={() => handleToggleCheck(action)}
                            disabled={isCheckDisabled || checkingActions.has(action.id)}
                            className="mr-3"
                          >
                            {checkingActions.has(action.id) ? (
                              <ActivityIndicator size="small" color="#374151" />
                            ) : action.is_checked ? (
                              <View className="w-5 h-5 bg-gray-900 rounded border border-gray-900 items-center justify-center">
                                <Check size={14} color="#ffffff" strokeWidth={3} />
                              </View>
                            ) : (
                              <View
                                className={`w-5 h-5 rounded border-2 ${
                                  isCheckDisabled
                                    ? 'border-gray-300 bg-gray-100'
                                    : 'border-gray-400'
                                }`}
                              />
                            )}
                          </Pressable>

                          {/* Content */}
                          <View className="flex-1">
                            <Text
                              className={`text-base ${
                                action.is_checked
                                  ? 'text-gray-500 line-through'
                                  : 'text-gray-900'
                              }`}
                            >
                              {action.title}
                            </Text>
                            <View className="flex-row items-center mt-1">
                              <Text className="text-xs text-gray-400">
                                {action.sub_goal.title}
                              </Text>
                            </View>
                          </View>

                          {/* Period Progress Badge */}
                          {action.period_progress && action.period_progress.target !== null && (
                            <View
                              className={`px-2 py-1 rounded-lg mr-2 ${
                                action.period_progress.isCompleted
                                  ? 'bg-green-100 border border-green-200'
                                  : 'bg-gray-100 border border-gray-200'
                              }`}
                            >
                              <Text
                                className={`text-xs ${
                                  action.period_progress.isCompleted
                                    ? 'text-green-700'
                                    : 'text-gray-600'
                                }`}
                              >
                                {t(`actionType.periodLabel.${action.period_progress.periodLabel}`, { defaultValue: action.period_progress.periodLabel })} {action.period_progress.checkCount}/{action.period_progress.target}
                                {action.period_progress.isCompleted && ' ✓'}
                              </Text>
                            </View>
                          )}

                          {/* Type Badge - Pressable로 변경 (타입 수정 모달 열기) */}
                          <Pressable
                            onPress={() => handleTypeBadgePress(action)}
                            className="flex-row items-center bg-gray-100 px-2 py-1 rounded-lg border border-gray-200 active:bg-gray-200"
                          >
                            <ActionTypeIcon type={action.type} size={14} />
                            <Text className="text-xs text-gray-600 ml-1">
                              {formatTypeDetailsLocalized(action, t) ||
                                t(`actionType.${action.type}`)}
                            </Text>
                          </Pressable>
                        </Animated.View>
                      )
                    })}
                  </View>
                )}
              </Animated.View>
            )
          }

          if (usesTwoColumn) {
            // iPad 2-column layout: split mandalarts into left/right columns
            const leftColumn = mandalartEntries.filter((_, idx) => idx % 2 === 0)
            const rightColumn = mandalartEntries.filter((_, idx) => idx % 2 === 1)

            return (
              <View style={{ flexDirection: 'row', gap: 16 }} className="pb-4">
                {/* Left Column */}
                <View style={{ flex: 1 }}>
                  {leftColumn.map(([mandalartId, { mandalart, actions: mandalartActions }], idx) =>
                    renderMandalartSection(mandalartId, mandalart, mandalartActions, idx * 2)
                  )}
                </View>
                {/* Right Column */}
                <View style={{ flex: 1 }}>
                  {rightColumn.map(([mandalartId, { mandalart, actions: mandalartActions }], idx) =>
                    renderMandalartSection(mandalartId, mandalart, mandalartActions, idx * 2 + 1)
                  )}
                </View>
              </View>
            )
          }

          // Phone or single mandalart: standard single-column layout
          return (
            <View className="space-y-4 pb-4">
              {mandalartEntries.map(
                ([mandalartId, { mandalart, actions: mandalartActions }], index) =>
                  renderMandalartSection(mandalartId, mandalart, mandalartActions, index)
              )}
            </View>
          )
        })()}

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={datePickerVisible}
        selectedDate={selectedDate}
        onSelect={handleDateSelect}
        onClose={() => setDatePickerVisible(false)}
      />

      {/* Action Type Selector Modal */}
      {selectedActionForTypeEdit && (
        <ActionTypeSelector
          visible={typeSelectorVisible}
          actionId={selectedActionForTypeEdit.id}
          actionTitle={selectedActionForTypeEdit.title}
          initialData={{
            type: selectedActionForTypeEdit.type,
            routine_frequency: selectedActionForTypeEdit.routine_frequency,
            routine_weekdays: selectedActionForTypeEdit.routine_weekdays,
            routine_count_per_period: selectedActionForTypeEdit.routine_count_per_period,
            mission_completion_type: selectedActionForTypeEdit.mission_completion_type,
            mission_period_cycle: selectedActionForTypeEdit.mission_period_cycle,
            mission_current_period_start: selectedActionForTypeEdit.mission_current_period_start,
            mission_current_period_end: selectedActionForTypeEdit.mission_current_period_end,
            ai_suggestion: selectedActionForTypeEdit.ai_suggestion
              ? (typeof selectedActionForTypeEdit.ai_suggestion === 'string'
                ? JSON.parse(selectedActionForTypeEdit.ai_suggestion)
                : selectedActionForTypeEdit.ai_suggestion)
              : undefined,
          }}
          onClose={() => {
            setTypeSelectorVisible(false)
            setSelectedActionForTypeEdit(null)
          }}
          onSave={handleTypeSave}
        />
      )}
    </View>
  )
}
