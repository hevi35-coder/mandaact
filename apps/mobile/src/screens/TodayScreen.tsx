import React, { useMemo, useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { useScrollToTop } from '../navigation/RootNavigator'
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated'
import { Header } from '../components'
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Check,
  Square,
  RotateCw,
  Target,
  Lightbulb,
  Calendar,
  Info,
  ClipboardCheck,
} from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { format, addDays, isSameDay, startOfDay } from 'date-fns'
import { ko } from 'date-fns/locale/ko'
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
import { useToast } from '../components/Toast'
import {
  shouldShowToday,
  getActionTypeLabel,
  formatTypeDetails,
  isTodayOrYesterday,
  type ActionType,
} from '@mandaact/shared'
import type { Action, Mandalart } from '@mandaact/shared'
import { logger } from '../lib/logger'
import { badgeService } from '../lib/badge'
import DatePickerModal from '../components/DatePickerModal'
import ActionTypeSelector, { type ActionTypeData } from '../components/ActionTypeSelector'

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

export default function TodayScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // Scroll to top on tab re-press
  const scrollRef = useRef<ScrollView>(null)
  useScrollToTop('Today', scrollRef)

  const [selectedDate, setSelectedDate] = useState(new Date())
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

  // Date navigation
  const today = startOfDay(new Date())
  const isToday = isSameDay(selectedDate, today)

  // Check if selected date allows checking (today or yesterday only)
  const canCheck = isTodayOrYesterday(selectedDate)

  const handlePreviousDay = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, -1))
  }, [])

  const handleNextDay = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, 1))
  }, [])

  const handleToday = useCallback(() => {
    setSelectedDate(new Date())
  }, [])

  // Data fetching
  const {
    data: actions = [],
    isLoading,
    error,
    refetch,
  } = useTodayActions(user?.id, selectedDate)
  const { data: dailyStats, refetch: refetchStats } = useDailyStats(user?.id)

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
      // Cast as any to allow null values which Supabase needs to clear fields
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

      toast.success('타입 변경 완료', '실천 항목 타입이 변경되었습니다')
      // Await refetch to ensure data is updated before modal closes
      await refetch()
    } catch (error) {
      logger.error('Error saving action type', error)
      toast.error('오류', '타입 변경 중 오류가 발생했습니다')
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
          // Checking: Award XP
          try {
            // Award base XP (10) + streak bonus if applicable
            // Pass selectedDate to ensure weekend bonus is calculated for the correct date
            const xpResult = await awardXP(user.id, 10, selectedDate)

            // Show XP toast
            if (xpResult.multipliers.length > 0) {
              const totalMultiplier = xpResult.multipliers.reduce((sum, m) => sum + m.multiplier, 0)
              toast.success(`+${xpResult.finalXP} XP`, `×${totalMultiplier.toFixed(1)} 배율 적용!`)
            } else {
              toast.success(`+${xpResult.finalXP} XP`, '실천 완료!')
            }

            // Show level up toast
            if (xpResult.leveledUp) {
              setTimeout(() => {
                toast.success('🎉 레벨 업!', '축하합니다! 레벨이 올랐습니다!')
              }, 1500)
            }

            // Check for perfect day bonus and badges (after a short delay)
            setTimeout(async () => {
              try {
                const checkDate = format(selectedDate, 'yyyy-MM-dd')
                const perfectResult = await checkPerfectDay(user.id, checkDate)

                if (perfectResult.is_perfect_day && perfectResult.xp_awarded > 0) {
                  toast.success('⭐ 완벽한 하루!', `+${perfectResult.xp_awarded} XP 보너스!`)
                  logger.info('Perfect day bonus awarded', { xp: perfectResult.xp_awarded })
                }

                // Check and unlock new badges (uses shared badgeService)
                const newlyUnlocked = await badgeService.evaluateAndUnlockBadges(user.id)
                if (newlyUnlocked && newlyUnlocked.length > 0) {
                  // Invalidate badge queries so BadgeScreen shows updated data
                  queryClient.invalidateQueries({ queryKey: badgeKeys.userBadges(user.id) })
                  queryClient.invalidateQueries({ queryKey: badgeKeys.progress(user.id) })

                  for (const badge of newlyUnlocked) {
                    setTimeout(() => {
                      toast.success('🏆 새로운 배지 획득!', `${badge.badgeTitle} (+${badge.xpAwarded} XP)`)
                    }, 500 * newlyUnlocked.indexOf(badge))
                    logger.info('Badge unlocked', { badge: badge.badgeTitle, xp: badge.xpAwarded })
                  }
                }

                // Check for perfect week bonus (80%+ weekly completion)
                const weekResult = await checkPerfectWeek(user.id)
                if (weekResult.activated) {
                  toast.success('🌟 완벽한 주!', '7일간 XP 2배 보너스 활성화!')
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
              toast.info(`-${result.finalXP} XP`, '체크 해제')
              logger.info('XP subtracted', { xp: result.finalXP })
            }
          } catch (xpError) {
            logger.error('XP subtract error', xpError)
            // Don't fail the whole operation if XP update fails
          }

          // Invalidate HomeScreen stats queries (streak, heatmap, profile stats)
          queryClient.invalidateQueries({ queryKey: statsKeys.user(user.id) })
        }
      } catch (err: any) {
        // Extract error message from various error formats
        let errorMessage = 'Unknown error'
        if (err?.message) {
          errorMessage = err.message
        } else if (err?.error?.message) {
          errorMessage = err.error.message
        } else if (err?.code) {
          errorMessage = `Code: ${err.code}`
        } else if (typeof err === 'object') {
          errorMessage = JSON.stringify(err, null, 2)
        }
        logger.error('Check toggle error', { error: errorMessage, actionId: action.id, fullError: err })
        Alert.alert('오류', `체크 상태를 변경하는 중 오류가 발생했습니다.\n${errorMessage}`)
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
          <Text className="text-gray-500 mt-4">불러오는 중...</Text>
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
            데이터를 불러오는 중 오류가 발생했습니다.
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="mt-4 bg-primary px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold">다시 시도</Text>
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
                투데이
              </Text>
              <Text
                className="text-base text-gray-500 ml-3"
                style={{ fontFamily: 'Pretendard-Medium' }}
              >
                오늘의 실천
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
                <Text className="text-sm text-gray-700">이전</Text>
              </Pressable>
              <Pressable
                onPress={handleToday}
                className="px-4 py-2 border-r border-gray-300 active:bg-gray-100"
              >
                <Text
                  className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}
                >
                  오늘
                </Text>
              </Pressable>
              <Pressable
                onPress={handleNextDay}
                className="px-3 py-2 active:bg-gray-100"
              >
                <Text className="text-sm text-gray-700">다음</Text>
              </Pressable>
            </View>

            {/* 날짜 표시 버튼 - Pressable로 변경 (캘린더 모달 열기) */}
            <Pressable
              onPress={() => setDatePickerVisible(true)}
              className="flex-row items-center bg-white border border-gray-300 rounded-lg px-3 py-2 active:bg-gray-50"
            >
              <Calendar size={16} color="#6b7280" />
              <Text className="text-sm text-gray-700 ml-2">
                {format(selectedDate, 'M월 d일 (EEE)', { locale: ko })}
              </Text>
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
                  오늘의 달성율
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
                className="h-full bg-gray-900 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </View>

            {/* Info Text */}
            <View className="flex-row items-center mt-3">
              <Info size={12} color="#9ca3af" />
              <Text className="text-xs text-gray-400 ml-1">
                오늘과 어제 날짜만 달성(체크) 가능합니다
              </Text>
            </View>

            {/* Type Filter - Collapsible Section (Web과 동일) */}
            <View className="border-t border-gray-100 mt-4 pt-4">
              <Pressable
                onPress={() => setTypeFilterCollapsed(!typeFilterCollapsed)}
                className="flex-row items-center justify-between"
              >
                <Text className="text-sm font-medium text-gray-900">타입 필터</Text>
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
                        전체
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
                        루틴
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
                        미션
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
                        참고
                      </Text>
                    </Pressable>
                  </View>

                  {/* Info Text */}
                  <View className="flex-row items-center mt-3">
                    <Info size={12} color="#9ca3af" />
                    <Text className="text-xs text-gray-400 ml-1">
                      참고 타입은 달성율에 포함되지 않습니다
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
              아직 실천 항목이 없어요
            </Text>
            <Text
              className="text-sm text-gray-500 text-center mb-5"
              style={{ fontFamily: 'Pretendard-Regular' }}
            >
              만다라트를 만들면{'\n'}매일 실천할 목표를 관리할 수 있어요
            </Text>

            {/* Guide Box */}
            <View className="bg-gray-50 rounded-xl p-4 mb-5">
              <Text
                className="text-sm text-gray-700 mb-3"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                실천을 시작하는 방법
              </Text>
              <View className="flex-row items-center mb-2">
                <View className="w-5 h-5 rounded-full border border-gray-300 items-center justify-center mr-2">
                  <Text className="text-xs text-gray-500" style={{ fontFamily: 'Pretendard-Medium' }}>1</Text>
                </View>
                <Text className="text-sm text-gray-600" style={{ fontFamily: 'Pretendard-Regular' }}>
                  만다라트 만들기
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-5 h-5 rounded-full border border-gray-300 items-center justify-center mr-2">
                  <Text className="text-xs text-gray-500" style={{ fontFamily: 'Pretendard-Medium' }}>2</Text>
                </View>
                <Text className="text-sm text-gray-600" style={{ fontFamily: 'Pretendard-Regular' }}>
                  매일 체크하며 실천하기
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
                  사용 가이드
                </Text>
              </Pressable>
              <Pressable
                className="flex-1 rounded-xl overflow-hidden"
                onPress={() => navigation.navigate('CreateMandalart')}
              >
                <LinearGradient
                  colors={['#667eea', '#9333ea']}
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
                          만다라트 생성
                        </Text>
                      }
                    >
                      <LinearGradient
                        colors={['#667eea', '#9333ea']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text
                          className="text-sm opacity-0"
                          style={{ fontFamily: 'Pretendard-SemiBold' }}
                        >
                          만다라트 생성
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
              필터에 맞는 항목이 없습니다
            </Text>
            <Text className="text-gray-500 text-center">
              다른 타입 필터를 선택해보세요
            </Text>
          </Animated.View>
        )}

        {/* Actions List - Grouped by Mandalart */}
        {filteredActions.length > 0 && (
          <View className="space-y-4 pb-4">
            {Object.entries(actionsByMandalart).map(
              ([mandalartId, { mandalart, actions: mandalartActions }], index) => {
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
                          핵심 목표: {mandalart.center_goal}
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
                                    {action.period_progress.periodLabel} {action.period_progress.checkCount}/{action.period_progress.target}
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
                                  {formatTypeDetails(action) ||
                                    getActionTypeLabel(action.type)}
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
            )}
          </View>
        )}

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
