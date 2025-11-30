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
import { useNavigation } from '@react-navigation/native'
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
} from '../hooks/useActions'
import { useDailyStats, useXPUpdate, statsKeys } from '../hooks/useStats'
import { badgeKeys } from '../hooks/useBadges'
import { useUserProfile } from '../hooks/useUserProfile'
import { useToast } from '../components/Toast'
import { shouldShowToday } from '@mandaact/shared'
import type { Action, Mandalart, ActionType } from '@mandaact/shared'
import { logger, trackActionChecked, trackBadgeUnlocked } from '../lib'
import { badgeService } from '../lib/badge'
import ActionTypeSelector, { type ActionTypeData } from '../components/ActionTypeSelector'
import {
  DateNavigation,
  ProgressCard,
  MandalartSection,
  type ActionWithContext,
} from '../components/Today'

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
    [user, checkingActions, toggleCheck, awardXP, subtractXP, checkPerfectDay, checkPerfectWeek, selectedDate, toast, canCheck, queryClient, refetch, t]
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

        {/* Empty State - 액션이 없을 때 */}
        {actions.length === 0 && (
          <Animated.View
            entering={FadeInUp.delay(100).duration(400)}
            className="bg-white rounded-2xl p-8 items-center justify-center min-h-[200px]"
          >
            <Text className="text-4xl mb-4">📝</Text>
            <Text className="text-lg font-semibold text-gray-900 text-center mb-2">
              {t('today.noActions')}
            </Text>
            <Text className="text-gray-500 text-center">
              {t('today.createMandalartFirst')}
            </Text>
          </Animated.View>
        )}

        {/* Filtered Empty State - 필터 결과가 없을 때 */}
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

          if (usesTwoColumn) {
            // iPad 2-column layout: split mandalarts into left/right columns
            const leftColumn = mandalartEntries.filter((_, idx) => idx % 2 === 0)
            const rightColumn = mandalartEntries.filter((_, idx) => idx % 2 === 1)

            return (
              <View style={{ flexDirection: 'row', gap: 16 }} className="pb-4">
                {/* Left Column */}
                <View style={{ flex: 1 }}>
                  {leftColumn.map(([mandalartId, { mandalart, actions: mandalartActions }]) => (
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
                    />
                  ))}
                </View>
                {/* Right Column */}
                <View style={{ flex: 1 }}>
                  {rightColumn.map(([mandalartId, { mandalart, actions: mandalartActions }]) => (
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
                    />
                  ))}
                </View>
              </View>
            )
          }

          // Phone or single mandalart: standard single-column layout
          return (
            <View className="space-y-4 pb-4">
              {mandalartEntries.map(
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
                  />
                )
              )}
            </View>
          )
        })()}

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>

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
