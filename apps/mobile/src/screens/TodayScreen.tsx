/**
 * TodayScreen - Refactored
 * 
 * Shows actions for the selected date with progress tracking and XP rewards
 */

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
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { useScrollToTop } from '../navigation/RootNavigator'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import { Header } from '../components'
import { format, addDays, isSameDay, startOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import {
  useTodayActions,
  useToggleActionCheck,
  useUpdateAction,
  actionKeys,
  // useYesterdayMissed, // DISABLED - rewarded ad feature removed per AdMob policy review
} from '../hooks/useActions'
import { useDailyStats, useXPUpdate, statsKeys } from '../hooks/useStats'
import { badgeKeys } from '../hooks/useBadges'
import { useUserProfile } from '../hooks/useUserProfile'
import { useToast } from '../components/Toast'
import { shouldShowToday, isActionConfigured } from '@mandaact/shared'
import type { Action, Mandalart, ActionType } from '@mandaact/shared'
import { logger, trackActionChecked, trackBadgeUnlocked } from '../lib'
import { badgeService } from '../lib/badge'
import ActionTypeSelector, { type ActionTypeData } from '../components/ActionTypeSelector'
import {
  DateNavigation,
  ProgressCard,
  MandalartSection,
  ActionTypeIcon,
  FilteredEmptyState,
  type ActionWithContext,
} from '../components/Today'
import { XPBoostButton } from '../components/ads'
// import { useInterstitialAd } from '../hooks/useInterstitialAd' // DISABLED - level up ad harms UX
// import { BannerAd } from '../components/ads' // REMOVED - TodayScreen is Clean Zone (focus protection)
import { Grid3X3, ChevronDown, ChevronRight, Settings, CheckCircle } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'

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
  const unconfiguredSectionYRef = useRef<number | null>(null)
  useScrollToTop('Today', scrollRef)

  // Calculate "today" in user's timezone
  const getUserToday = useCallback(() => {
    const now = new Date()
    const zonedNow = toZonedTime(now, timezone)
    return startOfDay(zonedNow)
  }, [timezone])

  const [selectedDate, setSelectedDate] = useState(() => getUserToday())
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [refreshing, setRefreshing] = useState(false)
  const [checkingActions, setCheckingActions] = useState<Set<string>>(new Set())
  const toast = useToast()

  // Type filter state - multiple selection using Set (Web과 동일)
  const [activeFilters, setActiveFilters] = useState<Set<ActionType>>(new Set())
  // Type filter collapse state - default collapsed (Web과 동일)
  const [typeFilterCollapsed, setTypeFilterCollapsed] = useState(true)

  // Action type selector state
  const [typeSelectorVisible, setTypeSelectorVisible] = useState(false)
  const [selectedActionForTypeEdit, setSelectedActionForTypeEdit] = useState<ActionWithContext | null>(null)

  // Interstitial ad for level up - DISABLED (harms user experience)
  // const { show: showLevelUpAd } = useInterstitialAd({
  //   adType: 'INTERSTITIAL_LEVEL_UP',
  //   onAdClosed: () => {
  //     // Ad closed after level up
  //   },
  //   onError: (error) => {
  //     logger.error('Level up interstitial ad error', error)
  //   },
  // })

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

  // DISABLED - rewarded ad feature removed per AdMob policy review
  // Fetch yesterday's missed actions (only shown on "today" view)
  // const { data: yesterdayMissedIds, refetch: refetchYesterdayMissed } = useYesterdayMissed(
  //   isToday ? user?.id : undefined,  // Only fetch when viewing today
  //   timezone
  // )

  // Mutations
  const toggleCheck = useToggleActionCheck()
  const updateAction = useUpdateAction()
  const { awardXP, subtractXP, checkPerfectDay, checkPerfectWeek } = useXPUpdate()

  // Invalidate and refetch data when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        // Invalidate actions query to ensure fresh data
        queryClient.invalidateQueries({ queryKey: actionKeys.lists() })
        refetch()
        refetchStats()
      }
    }, [user?.id, queryClient, refetch, refetchStats])
  )

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
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Error saving action type', { error: errorMessage, actionId: selectedActionForTypeEdit.id })
      toast.error(t('common.error'), `${t('today.typeChangeError')}\n${errorMessage}`)
    }
  }, [selectedActionForTypeEdit, updateAction, refetch, toast, t])

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

  // Separate configured, unconfigured, and completed actions
  const { configuredActions, unconfiguredActions, completedActions } = useMemo(() => {
    const configured: typeof actions = []
    const unconfigured: typeof actions = []
    const completed: typeof actions = []

    actions.forEach((action) => {
      if (!isActionConfigured(action)) {
        unconfigured.push(action)
      } else if (action.period_progress?.isCompleted && !action.is_checked) {
        // Period target completed and not checked today - move to completed section
        completed.push(action)
      } else {
        configured.push(action)
      }
    })

    return { configuredActions: configured, unconfiguredActions: unconfigured, completedActions: completed }
  }, [actions])

  // Filter configured actions based on type and shouldShowToday logic
  const filteredActions = useMemo(() => {
    return configuredActions.filter((action) => {
      // Apply shouldShowToday logic
      const shouldShow = shouldShowToday(action, selectedDate)
      if (!shouldShow) return false

      // Apply type filters (multiple selection)
      // If no filters selected, show all types
      if (activeFilters.size === 0) return true

      // Show only if action type is in active filters
      return activeFilters.has(action.type)
    })
  }, [configuredActions, activeFilters, selectedDate])

  // State for unconfigured and completed section collapse
  const [unconfiguredCollapsed, setUnconfiguredCollapsed] = useState(true)
  const [completedCollapsed, setCompletedCollapsed] = useState(true)

  // Determine empty state scenario for when filteredActions is empty
  const emptyStateScenario = useMemo(() => {
    // Only determine scenario if we have actions but filtered result is empty
    if (actions.length === 0 || filteredActions.length > 0) return null

    // Scenario 1: All actions are unconfigured
    if (configuredActions.length === 0 && unconfiguredActions.length > 0) {
      return 'unconfigured' as const
    }

    // Scenario 2: Active filters but no matches
    if (activeFilters.size > 0) {
      return 'noFilterMatch' as const
    }

    // Scenario 3: Only completed actions exist (period targets met)
    if (completedActions.length > 0 && configuredActions.length === 0) {
      return 'allCompleted' as const
    }

    // Scenario 4: Configured actions exist but none should show today
    if (configuredActions.length > 0) {
      return 'noneToday' as const
    }

    return null
  }, [actions.length, filteredActions.length, configuredActions.length, unconfiguredActions.length, completedActions.length, activeFilters.size])

  // Handler for empty state actions
  const handleEmptyStateAction = useCallback(() => {
    if (!emptyStateScenario) return

    switch (emptyStateScenario) {
      case 'unconfigured':
        // Expand unconfigured section and scroll to it
        setUnconfiguredCollapsed(false)
        requestAnimationFrame(() => {
          const y = unconfiguredSectionYRef.current
          if (y == null) return
          scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true })
        })
        break
      case 'noFilterMatch':
        // Clear all filters
        clearAllFilters()
        break
      case 'allCompleted':
        // Expand completed section
        setCompletedCollapsed(false)
        break
      case 'noneToday':
        // No action needed - informational only
        break
    }
  }, [emptyStateScenario, clearAllFilters])

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

  // DISABLED - rewarded ad feature removed per AdMob policy review
  // Handle yesterday check completed - refresh data
  // const handleYesterdayCheckCompleted = useCallback(async () => {
  //   await Promise.all([refetch(), refetchStats(), refetchYesterdayMissed()])
  // }, [refetch, refetchStats, refetchYesterdayMissed])

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

            // Show level up toast and interstitial ad
            if (xpResult.leveledUp) {
              setTimeout(async () => {
                toast.success(`🎉 ${t('today.xp.levelUp')}`, t('today.xp.levelUpDesc'))
                // Level up interstitial ad DISABLED - harms user experience
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
    [user, checkingActions, toggleCheck, awardXP, subtractXP, checkPerfectDay, checkPerfectWeek, selectedDate, toast, canCheck, queryClient, refetch, t]
  )

  // Render: Use conditional rendering instead of early returns to comply with Rules of Hooks
  return (
    <View className="flex-1 bg-gray-50">
      <Header />

      {/* Loading State */}
      {isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#374151" />
          <Text className="text-gray-500 mt-4">{t('common.loading')}</Text>
        </View>
      )}

      {/* Error State */}
      {!isLoading && error && (
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
      )}

      {/* Main Content */}
      {!isLoading && !error && (
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

          {/* Date Navigation */}
          <DateNavigation
            selectedDate={selectedDate}
            isToday={isToday}
            timezone={timezone}
            onPreviousDay={handlePreviousDay}
            onNextDay={handleNextDay}
            onToday={handleToday}
            onDateSelect={handleDateSelect}
          />
        </View>

        {/* Progress Card with Type Filter */}
        {actions.length > 0 && (
          <ProgressCard
            checkedCount={checkedCount}
            totalCount={totalCount}
            progressPercentage={progressPercentage}
            activeFilters={activeFilters}
            typeFilterCollapsed={typeFilterCollapsed}
            onToggleTypeFilter={() => setTypeFilterCollapsed(!typeFilterCollapsed)}
            onToggleFilter={toggleFilter}
            onClearAllFilters={clearAllFilters}
          />
        )}

        {/* XP Boost Button - Below Progress Card (Phone only, iPad has it in right column) */}
        {!isTablet && actions.length > 0 && (
          <XPBoostButton />
        )}

        {/* Empty State - 액션이 없을 때 */}
        {actions.length === 0 && (
          <Animated.View
            entering={FadeInUp.delay(100).duration(400)}
            className="bg-white rounded-2xl p-6"
          >
            {/* Icon */}
            <View className="items-center mb-4">
              <View className="w-14 h-14 bg-gray-100 rounded-full items-center justify-center">
                <Grid3X3 size={28} color="#9ca3af" />
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
                <View className="w-1 h-1 rounded-full bg-gray-400 mr-2" />
                <Text className="text-sm text-gray-600" style={{ fontFamily: 'Pretendard-Regular' }}>
                  {t('today.empty.howTo.step1')}
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-1 h-1 rounded-full bg-gray-400 mr-2" />
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

        {/* Filtered Empty State - 필터 결과가 없을 때 */}
        {emptyStateScenario && (
          <FilteredEmptyState
            scenario={emptyStateScenario}
            onAction={handleEmptyStateAction}
            hasCompletedActions={completedActions.length > 0}
          />
        )}

        {/* iPad: 2-column layout (Left: Configured, Right: XP Boost + Unconfigured + Completed) */}
        {isTablet && (filteredActions.length > 0 || unconfiguredActions.length > 0 || completedActions.length > 0) && (
          <View style={{ flexDirection: 'row', gap: 16 }} className="pb-4">
            {/* Left Column - Configured Actions */}
            <View style={{ flex: 1 }}>
              {filteredActions.length > 0 ? (
                Object.entries(actionsByMandalart).map(
                  ([mandalartId, { mandalart, actions: mandalartActions }]) => (
                    <MandalartSection
                      key={mandalartId}
                      mandalartId={mandalartId}
                      mandalartTitle={mandalart.title}
                      actions={mandalartActions}
                      isCollapsed={collapsedSections.has(mandalartId)}
                      onToggleSection={() => toggleSection(mandalartId)}
                      onToggleCheck={handleToggleCheck}
                      onTypeBadgePress={handleTypeBadgePress}
                      canCheck={canCheck}
                      checkingActions={checkingActions}
                      isTablet={isTablet}
                    // DISABLED - rewarded ad feature removed per AdMob policy review
                    // yesterdayMissedIds={isToday ? yesterdayMissedIds : undefined}
                    // onYesterdayCheckCompleted={handleYesterdayCheckCompleted}
                    />
                  )
                )
              ) : (
                <View className="bg-gray-50 rounded-lg border border-gray-200 p-6 items-center">
                  <Text className="text-gray-400 text-sm">{t('today.noFilterResult')}</Text>
                </View>
              )}
            </View>

            {/* Right Column - XP Boost + Unconfigured + Completed */}
            <View style={{ flex: 1 }}>
              {/* XP Boost Button - Top of right column on iPad */}
              <XPBoostButton />

              {/* Unconfigured Actions - iPad */}
              {unconfiguredActions.length > 0 && (
                <Animated.View
                  entering={FadeInUp.delay(300).duration(400)}
                  className="mb-4"
                >
                  {/* Section Header */}
                  <Pressable
                    onPress={() => setUnconfiguredCollapsed(!unconfiguredCollapsed)}
                    className="flex-row items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Settings size={16} color="#6b7280" />
                        <Text
                          className="text-base font-semibold text-gray-900 ml-2"
                          style={{ fontFamily: 'Pretendard-SemiBold' }}
                        >
                          {t('today.unconfigured.title')}
                        </Text>
                        <Text className="text-sm text-gray-500 ml-2">
                          {unconfiguredActions.length}
                        </Text>
                      </View>
                      <Text
                        className="text-sm text-gray-500 mt-1"
                        numberOfLines={1}
                        style={{ fontFamily: 'Pretendard-Regular' }}
                      >
                        {t('today.unconfigured.hint')}
                      </Text>
                    </View>
                    {unconfiguredCollapsed ? (
                      <ChevronRight size={20} color="#6b7280" />
                    ) : (
                      <ChevronDown size={20} color="#6b7280" />
                    )}
                  </Pressable>

                  {/* Unconfigured Items - Same style as ActionItem */}
                  {!unconfiguredCollapsed && (
                    <View className="mt-2 space-y-2">
                      {unconfiguredActions.map((action) => (
                        <Pressable
                          key={action.id}
                          className="flex-row items-center p-4 bg-white rounded-xl border border-gray-200"
                          onPress={() => handleTypeBadgePress(action)}
                        >
                          <View className="flex-1">
                            <Text
                              className="text-base text-gray-900"
                              numberOfLines={1}
                            >
                              {action.title}
                            </Text>
                            <Text
                              className="text-xs text-gray-400 mt-1"
                              numberOfLines={1}
                            >
                              {action.sub_goal.title}
                            </Text>
                          </View>
                          <View className="flex-row items-center bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                            <ActionTypeIcon type={action.type} size={14} />
                            <Text className="text-xs text-amber-600 ml-1">
                              {t('actionType.unconfigured')}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </Animated.View>
              )}

              {/* Completed Actions Section - iPad */}
              {completedActions.length > 0 && (
                <Animated.View
                  entering={FadeInUp.delay(400).duration(400)}
                >
                  {/* Section Header */}
                  <Pressable
                    onPress={() => setCompletedCollapsed(!completedCollapsed)}
                    className="flex-row items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200"
                  >
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <CheckCircle size={16} color="#16a34a" />
                        <Text
                          className="text-base font-semibold text-gray-900 ml-2"
                          style={{ fontFamily: 'Pretendard-SemiBold' }}
                        >
                          {t('today.completed.title')}
                        </Text>
                        <Text className="text-sm text-gray-500 ml-2">
                          {completedActions.length}
                        </Text>
                      </View>
                      <Text
                        className="text-sm text-gray-500 mt-1"
                        numberOfLines={1}
                        style={{ fontFamily: 'Pretendard-Regular' }}
                      >
                        {t('today.completed.hint')}
                      </Text>
                    </View>
                    {completedCollapsed ? (
                      <ChevronRight size={20} color="#16a34a" />
                    ) : (
                      <ChevronDown size={20} color="#16a34a" />
                    )}
                  </Pressable>

                  {/* Completed Items */}
                  {!completedCollapsed && (
                    <View className="mt-2 space-y-2">
                      {completedActions.map((action) => (
                        <View
                          key={action.id}
                          className="flex-row items-center p-4 bg-white rounded-xl border border-gray-200 opacity-60"
                        >
                          <View className="flex-1">
                            <Text
                              className="text-base text-gray-900"
                              numberOfLines={1}
                            >
                              {action.title}
                            </Text>
                            <Text
                              className="text-xs text-gray-400 mt-1"
                              numberOfLines={1}
                            >
                              {action.sub_goal.title}
                            </Text>
                          </View>
                          <View className="flex-row items-center bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                            <CheckCircle size={14} color="#16a34a" />
                            <Text className="text-xs text-green-600 ml-1">
                              {t('today.completed.badge')}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </Animated.View>
              )}
            </View>
          </View>
        )}

        {/* Phone: Single column layout */}
        {!isTablet && (
          <>
            {/* Configured Actions */}
            {filteredActions.length > 0 && (
              <View className="space-y-4 pb-4">
                {Object.entries(actionsByMandalart).map(
                  ([mandalartId, { mandalart, actions: mandalartActions }]) => (
                    <MandalartSection
                      key={mandalartId}
                      mandalartId={mandalartId}
                      mandalartTitle={mandalart.title}
                      actions={mandalartActions}
                      isCollapsed={collapsedSections.has(mandalartId)}
                      onToggleSection={() => toggleSection(mandalartId)}
                      onToggleCheck={handleToggleCheck}
                      onTypeBadgePress={handleTypeBadgePress}
                      canCheck={canCheck}
                      checkingActions={checkingActions}
                      isTablet={isTablet}
                    // DISABLED - rewarded ad feature removed per AdMob policy review
                    // yesterdayMissedIds={isToday ? yesterdayMissedIds : undefined}
                    // onYesterdayCheckCompleted={handleYesterdayCheckCompleted}
                    />
                  )
                )}
              </View>
            )}

            {/* Unconfigured Actions Section */}
            {unconfiguredActions.length > 0 && (
              <Animated.View
                entering={FadeInUp.delay(300).duration(400)}
                className="mb-4"
              >
                {/* Section Header */}
                <Pressable
                  onPress={() => setUnconfiguredCollapsed(!unconfiguredCollapsed)}
                  className="flex-row items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  onLayout={(e) => {
                    unconfiguredSectionYRef.current = e.nativeEvent.layout.y
                  }}
                >
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Settings size={16} color="#6b7280" />
                      <Text
                        className="text-base font-semibold text-gray-900 ml-2"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                      >
                        {t('today.unconfigured.title')}
                      </Text>
                      <Text className="text-sm text-gray-500 ml-2">
                        {unconfiguredActions.length}
                      </Text>
                    </View>
                    <Text
                      className="text-sm text-gray-500 mt-1"
                      numberOfLines={1}
                      style={{ fontFamily: 'Pretendard-Regular' }}
                    >
                      {t('today.unconfigured.hint')}
                    </Text>
                  </View>
                  {unconfiguredCollapsed ? (
                    <ChevronRight size={20} color="#6b7280" />
                  ) : (
                    <ChevronDown size={20} color="#6b7280" />
                  )}
                </Pressable>

                {/* Unconfigured Items - Same style as ActionItem */}
                {!unconfiguredCollapsed && (() => {
                  // Phone: single column (iPad has its own layout at top level)
                  return (
                    <View className="mt-2 space-y-2">
                      {unconfiguredActions.map((action) => (
                        <Pressable
                          key={action.id}
                          className="flex-row items-center p-4 bg-white rounded-xl border border-gray-200"
                          onPress={() => handleTypeBadgePress(action)}
                        >
                          <View className="flex-1">
                            <Text
                              className="text-base text-gray-900"
                              numberOfLines={1}
                            >
                              {action.title}
                            </Text>
                            <Text
                              className="text-xs text-gray-400 mt-1"
                              numberOfLines={1}
                            >
                              {action.sub_goal.title}
                            </Text>
                          </View>
                          <View className="flex-row items-center bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                            <ActionTypeIcon type={action.type} size={14} />
                            <Text className="text-xs text-amber-600 ml-1">
                              {t('actionType.unconfigured')}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  )
                })()}
              </Animated.View>
            )}

            {/* Completed Actions Section - Period target achieved */}
            {completedActions.length > 0 && (
              <Animated.View
                entering={FadeInUp.delay(400).duration(400)}
                className="mb-4"
              >
                {/* Section Header */}
                <Pressable
                  onPress={() => setCompletedCollapsed(!completedCollapsed)}
                  className="flex-row items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200"
                >
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <CheckCircle size={16} color="#16a34a" />
                      <Text
                        className="text-base font-semibold text-gray-900 ml-2"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                      >
                        {t('today.completed.title')}
                      </Text>
                      <Text className="text-sm text-gray-500 ml-2">
                        {completedActions.length}
                      </Text>
                    </View>
                    <Text
                      className="text-sm text-gray-500 mt-1"
                      numberOfLines={1}
                      style={{ fontFamily: 'Pretendard-Regular' }}
                    >
                      {t('today.completed.hint')}
                    </Text>
                  </View>
                  {completedCollapsed ? (
                    <ChevronRight size={20} color="#16a34a" />
                  ) : (
                    <ChevronDown size={20} color="#16a34a" />
                  )}
                </Pressable>

                {/* Completed Items */}
                {!completedCollapsed && (
                  <View className="mt-2 space-y-2">
                    {completedActions.map((action) => (
                      <View
                        key={action.id}
                        className="flex-row items-center p-4 bg-white rounded-xl border border-gray-200 opacity-60"
                      >
                        <View className="flex-1">
                          <Text
                            className="text-base text-gray-900"
                            numberOfLines={1}
                          >
                            {action.title}
                          </Text>
                          <Text
                            className="text-xs text-gray-400 mt-1"
                            numberOfLines={1}
                          >
                            {action.sub_goal.title}
                          </Text>
                        </View>
                        <View className="flex-row items-center bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                          <CheckCircle size={14} color="#16a34a" />
                          <Text className="text-xs text-green-600 ml-1">
                            {t('today.completed.badge')}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </Animated.View>
            )}
          </>
        )}

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
      )}

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

      {/* Banner Ad REMOVED - TodayScreen is Clean Zone (focus protection) */}
      {/* See ADMOB_MONETIZATION_STRATEGY.md for details */}
    </View>
  )
}
