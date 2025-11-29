import React, { useState, useCallback, useRef } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, Modal, TextInput, Alert } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { CompositeNavigationProp } from '@react-navigation/native'
import { useScrollToTop } from '../navigation/RootNavigator'
import {
  Flame,
  Target,
  Trophy,
  Zap,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  X,
  Pencil,
  Calendar,
} from 'lucide-react-native'
import { Header } from '../components'
import { useResponsive } from '../hooks/useResponsive'
import { useAuthStore } from '../store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import { useUserGamification, use4WeekHeatmap, useProfileStats, statsKeys } from '../hooks/useStats'
import { useBadgeDefinitions, useUserBadges, isBadgeUnlocked } from '../hooks/useBadges'
import {
  getXPForCurrentLevel,
  getLevelFromXP,
  categorizeBadges,
  validateNickname,
  NICKNAME_DIALOG,
  NICKNAME_ERRORS,
  formatUserDateTime,
} from '@mandaact/shared'
import { supabase } from '../lib/supabase'
import { xpService } from '../lib/xp'
import type { XPMultiplier } from '@mandaact/shared'
import type { RootStackParamList, MainTabParamList } from '../navigation/RootNavigator'
import type { BadgeDefinition } from '../hooks/useBadges'

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>

// Badge Mini Card for collection grid
function BadgeMiniCard({
  badge,
  isUnlocked,
  isSecret,
  onPress,
}: {
  badge: BadgeDefinition
  isUnlocked: boolean
  isSecret: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      className={`flex-1 p-3 rounded-xl items-center justify-center min-h-[90px] ${
        isUnlocked
          ? 'bg-amber-50 border-2 border-amber-200'
          : 'bg-gray-100 border border-gray-200 opacity-50'
      }`}
      onPress={onPress}
    >
      <Text className={`text-2xl mb-1 ${isUnlocked ? '' : 'opacity-30'}`}>
        {badge.icon}
      </Text>
      <Text
        className={`text-xs font-medium text-center ${
          isUnlocked ? 'text-gray-900' : 'text-gray-400'
        }`}
        numberOfLines={1}
      >
        {isSecret && !isUnlocked ? '???' : badge.name}
      </Text>
    </Pressable>
  )
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const { isTablet, contentMaxWidth, horizontalPadding } = useResponsive()

  // Scroll to top on tab re-press
  const scrollRef = useRef<ScrollView>(null)
  useScrollToTop('Home', scrollRef)

  // Collapsible states
  const [xpInfoOpen, setXpInfoOpen] = useState(false)
  const [badgeCollectionOpen, setBadgeCollectionOpen] = useState(false)

  // Active multipliers state
  const [activeMultipliers, setActiveMultipliers] = useState<XPMultiplier[]>([])

  // Nickname editing states
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false)
  const [newNickname, setNewNickname] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [nicknameSaving, setNicknameSaving] = useState(false)

  // Data fetching
  const { data: gamification, isLoading: gamificationLoading } = useUserGamification(user?.id)
  const { data: profileStats, isLoading: profileStatsLoading } = useProfileStats(user?.id)
  const { data: fourWeekData = [], isLoading: fourWeekLoading } = use4WeekHeatmap(user?.id)
  const { data: badges = [], isLoading: badgesLoading } = useBadgeDefinitions()
  const { data: userBadges = [] } = useUserBadges(user?.id)

  const isLoading = gamificationLoading || profileStatsLoading

  // Invalidate and refetch data when screen is focused (e.g., returning from TodayScreen after checking)
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        // Invalidate all user stats queries to force fresh data
        queryClient.invalidateQueries({ queryKey: statsKeys.user(user.id) })

        // Load active multipliers
        xpService.getActiveMultipliers(user.id).then(setActiveMultipliers)
      }
    }, [user?.id, queryClient])
  )

  // Calculate XP progress - use getLevelFromXP for accurate level calculation
  const totalXP = gamification?.total_xp || 0
  const currentLevel = getLevelFromXP(totalXP) // Calculate from XP instead of using DB value
  const { current: xpProgress, required: xpRequired, percentage: xpPercentage } = getXPForCurrentLevel(totalXP, currentLevel)
  const nickname = gamification?.nickname || user?.email?.split('@')[0] || '새 사용자'

  // Stats
  const totalChecks = profileStats?.totalChecks || 0
  const activeDays = profileStats?.activeDays || 0
  const currentStreak = gamification?.current_streak || 0
  const longestStreak = gamification?.longest_streak || 0
  const lastCheckDate = gamification?.last_check_date
  const longestStreakDate = gamification?.longest_streak_date

  // Check if current equals longest (new record badge)
  const isNewRecord = currentStreak === longestStreak && currentStreak > 0

  // Today's date for heatmap highlight
  const todayStr = new Date().toISOString().split('T')[0]

  // Badge stats
  const unlockedBadgeIds = new Set(userBadges.map(ub => ub.achievement_id))
  const unlockedCount = unlockedBadgeIds.size
  const totalBadges = badges.length

  // Categorized badges
  const categorizedBadges = categorizeBadges(badges)

  // Open nickname edit modal
  const openNicknameModal = useCallback(() => {
    setNewNickname(nickname)
    setNicknameError('')
    setNicknameModalVisible(true)
  }, [nickname])

  // Save nickname
  const handleSaveNickname = useCallback(async () => {
    if (!user) return

    // Validate
    const validation = validateNickname(newNickname)
    if (!validation.isValid) {
      setNicknameError(validation.error || '')
      return
    }

    // Check if unchanged
    if (newNickname === nickname) {
      setNicknameModalVisible(false)
      return
    }

    setNicknameSaving(true)
    setNicknameError('')

    try {
      // Check if nickname is already taken
      const { data: existing } = await supabase
        .from('user_levels')
        .select('nickname')
        .ilike('nickname', newNickname)
        .neq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        setNicknameError(NICKNAME_ERRORS.ALREADY_TAKEN)
        setNicknameSaving(false)
        return
      }

      // Update nickname
      const { error: updateError } = await supabase
        .from('user_levels')
        .update({ nickname: newNickname })
        .eq('user_id', user.id)

      if (updateError) throw updateError

      // Refetch to update UI
      await queryClient.refetchQueries({ queryKey: statsKeys.gamification(user.id) })

      // Close modal and show success
      setNicknameModalVisible(false)
      Alert.alert('완료', '닉네임이 변경되었습니다.')
    } catch (err) {
      console.error('Nickname update error:', err)
      setNicknameError(NICKNAME_ERRORS.UPDATE_ERROR)
    } finally {
      setNicknameSaving(false)
    }
  }, [user, newNickname, nickname])

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingTop: 20,
          ...(isTablet ? { alignItems: 'center' } : {}),
        }}
      >
        {/* Responsive container for iPad */}
        <View style={isTablet ? { width: '100%', maxWidth: contentMaxWidth } : undefined}>
        {/* Page Title - Center Aligned */}
        <View className="items-center mb-5">
          <View className="flex-row items-center">
            <Text
              className="text-3xl text-gray-900"
              style={{ fontFamily: 'Pretendard-Bold' }}
            >
              홈
            </Text>
            <Text
              className="text-base text-gray-500 ml-3"
              style={{ fontFamily: 'Pretendard-Medium' }}
            >
              성장 대시보드
            </Text>
          </View>
        </View>

        {/* iPad: 2-column layout for cards */}
        <View style={isTablet ? { flexDirection: 'row', gap: 20 } : undefined}>
        {/* Profile Card - matching web UserProfileCard */}
        <Animated.View
          entering={FadeInUp.delay(100).duration(400)}
          className="bg-white rounded-3xl p-6 mb-5 border border-gray-100"
          style={{
            ...(isTablet ? { flex: 1 } : {}),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#374151" />
          ) : (
            <>
              {/* Header: Level + Nickname + Total XP */}
              <View className="flex-row items-start justify-between mb-4">
                <View>
                  <View className="flex-row items-center gap-2 mb-1">
                    <Trophy size={24} color="#eab308" />
                    <Text className="text-2xl font-bold text-gray-900">
                      레벨 {currentLevel}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-base text-gray-500">{nickname}</Text>
                    <Pressable
                      onPress={openNicknameModal}
                      className="ml-2 p-1 rounded-full active:bg-gray-100"
                    >
                      <Pencil size={14} color="#9ca3af" />
                    </Pressable>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-sm text-gray-400">총 XP</Text>
                  <Text className="text-2xl font-bold text-primary">
                    {totalXP.toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* XP Progress Bar */}
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Zap size={14} color="#6b7280" />
                    <Text className="text-sm text-gray-500 ml-1">
                      레벨 {currentLevel + 1}까지
                    </Text>
                  </View>
                  <Text className="text-sm font-mono font-semibold text-gray-900">
                    {xpProgress.toLocaleString()} / {xpRequired.toLocaleString()} XP
                  </Text>
                </View>
                <View className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <Animated.View
                    entering={FadeInUp.delay(300).duration(300)}
                    className="h-full rounded-full overflow-hidden"
                    style={{ width: `${xpPercentage}%` }}
                  >
                    <LinearGradient
                      colors={['#2563eb', '#9333ea', '#db2777']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ flex: 1 }}
                    />
                  </Animated.View>
                </View>
              </View>

              {/* Stats Grid: Total Checks + Active Days */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1 p-3 bg-gray-50 rounded-xl border border-gray-100 items-center">
                  <Text className="text-2xl font-bold text-primary">
                    {totalChecks.toLocaleString()}
                  </Text>
                  <Text className="text-xs text-gray-500">총 실천 횟수</Text>
                </View>
                <View className="flex-1 p-3 bg-gray-50 rounded-xl border border-gray-100 items-center">
                  <Text className="text-2xl font-bold text-primary">
                    {activeDays.toLocaleString()}
                  </Text>
                  <Text className="text-xs text-gray-500">누적 실천일수</Text>
                </View>
              </View>

              {/* XP 획득 방법 - Collapsible */}
              <View className="p-3 bg-primary/5 rounded-xl border border-primary/10 mb-3">
                <Pressable
                  onPress={() => setXpInfoOpen(!xpInfoOpen)}
                  className="flex-row items-center justify-between"
                >
                  <View className="flex-row items-center">
                    <Zap size={14} color="#0a0a0a" />
                    <Text className="text-xs font-semibold text-gray-900 ml-1">
                      XP 획득 방법
                    </Text>
                  </View>
                  {xpInfoOpen ? (
                    <ChevronUp size={14} color="#2563eb" />
                  ) : (
                    <ChevronDown size={14} color="#2563eb" />
                  )}
                </Pressable>

                {xpInfoOpen && (
                  <View className="mt-3 space-y-3">
                    {/* Basic XP Rules */}
                    <View>
                      <Text className="text-xs text-gray-500 mb-1">
                        • 실천 1회: <Text className="font-semibold text-gray-900">+10 XP</Text>
                      </Text>
                      <Text className="text-xs text-gray-500 mb-1">
                        • 스트릭 (7일+): <Text className="font-semibold text-gray-900">+5 XP</Text> 추가
                      </Text>
                      <Text className="text-xs text-gray-500 mb-1">
                        • 완벽한 하루 (100%): <Text className="font-semibold text-gray-900">+50 XP</Text>
                      </Text>
                      <Text className="text-xs text-gray-500 mb-1">
                        • 완벽한 주 (80%+): <Text className="font-semibold text-gray-900">+200 XP</Text>
                      </Text>
                      <Text className="text-xs text-gray-500">
                        • 배지 획득: 배지별 상이
                      </Text>
                    </View>

                    {/* XP Multiplier Bonus */}
                    <View className="pt-3 border-t border-primary/10">
                      <View className="flex-row items-center mb-2">
                        <Sparkles size={12} color="#0a0a0a" />
                        <Text className="text-xs font-semibold text-gray-900 ml-1">
                          XP 배율 보너스
                        </Text>
                      </View>
                      <Text className="text-xs text-gray-500 mb-1">
                        • 주말 (토·일): <Text className="font-semibold text-blue-500">1.5배</Text>
                      </Text>
                      <Text className="text-xs text-gray-500 mb-1">
                        • 복귀 환영 (3일 부재 후): <Text className="font-semibold text-green-500">1.5배</Text>{' '}
                        <Text className="text-[10px]">(3일간)</Text>
                      </Text>
                      <Text className="text-xs text-gray-500 mb-1">
                        • 레벨 달성 축하 (5, 10, 15...): <Text className="font-semibold text-yellow-500">2배</Text>{' '}
                        <Text className="text-[10px]">(7일간)</Text>
                      </Text>
                      <Text className="text-xs text-gray-500 mb-1">
                        • 완벽한 주 달성 후: <Text className="font-semibold text-purple-500">2배</Text>{' '}
                        <Text className="text-[10px]">(7일간)</Text>
                      </Text>
                      <Text className="text-xs text-gray-500 mb-1">
                        • 배율은 중복 적용 시 합산됩니다
                      </Text>
                      <Text className="text-xs text-gray-400 ml-3">
                        (예: 1.5배 + 2배 = 3.5배)
                      </Text>
                    </View>

                    {/* Active Multipliers */}
                    {activeMultipliers.length > 0 && (
                      <View className="pt-3 border-t border-primary/10">
                        <View className="flex-row items-center mb-2">
                          <Sparkles size={12} color="#0a0a0a" />
                          <Text className="text-xs font-semibold text-gray-900 ml-1">
                            현재 활성 중인 배율
                          </Text>
                        </View>
                        <View className="space-y-1">
                          {activeMultipliers.map((multiplier, index) => {
                            const colorClass = multiplier.type === 'weekend'
                              ? 'text-blue-500'
                              : multiplier.type === 'comeback'
                                ? 'text-green-500'
                                : multiplier.type === 'level_milestone'
                                  ? 'text-yellow-500'
                                  : 'text-purple-500'
                            return (
                              <View
                                key={index}
                                className="flex-row items-center justify-between p-1.5 bg-gray-50 rounded"
                              >
                                <Text className="text-xs text-gray-500">{multiplier.name}</Text>
                                <Text className={`text-xs font-bold ${colorClass}`}>
                                  ×{multiplier.multiplier}
                                </Text>
                              </View>
                            )
                          })}
                        </View>
                      </View>
                    )}

                    {/* Fair XP Policy */}
                    <View className="pt-3 border-t border-primary/10">
                      <View className="flex-row items-center mb-2">
                        <Info size={12} color="#0a0a0a" />
                        <Text className="text-xs font-semibold text-gray-900 ml-1">
                          공정한 XP 정책
                        </Text>
                      </View>
                      <Text className="text-xs text-gray-500 mb-1">
                        • 각 실천은 하루 3회까지 체크/해제 가능
                      </Text>
                      <Text className="text-xs text-gray-500 mb-1">
                        • 동일 실천은 10초 후 재체크 가능
                      </Text>
                      <Text className="text-xs text-gray-500">
                        • 짧은 시간 내 과도한 체크 시 제한
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Badge Collection - Collapsible */}
              <View className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                <Pressable
                  onPress={() => setBadgeCollectionOpen(!badgeCollectionOpen)}
                  className="flex-row items-center justify-between"
                >
                  <View className="flex-row items-center">
                    <Target size={14} color="#0a0a0a" />
                    <Text className="text-xs font-semibold text-gray-900 ml-1">
                      배지 컬렉션
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-[10px] text-gray-400 mr-2">
                      {unlockedCount}/{totalBadges}
                    </Text>
                    {badgeCollectionOpen ? (
                      <ChevronUp size={14} color="#2563eb" />
                    ) : (
                      <ChevronDown size={14} color="#2563eb" />
                    )}
                  </View>
                </Pressable>

                {badgeCollectionOpen && (
                  <View className="mt-3">
                    {badgesLoading ? (
                      <View className="py-4 items-center">
                        <ActivityIndicator size="small" color="#2563eb" />
                        <Text className="text-xs text-gray-400 mt-2">배지 로딩 중...</Text>
                      </View>
                    ) : (
                      <View className="space-y-4">
                        {categorizedBadges.map((category) => {
                          const categoryUnlocked = category.badges.filter(b =>
                            isBadgeUnlocked(b.id, userBadges)
                          ).length
                          const categoryTotal = category.badges.length

                          return (
                            <View key={category.key}>
                              {/* Category Header */}
                              <View className="flex-row items-center mb-2">
                                <Text className="text-base mr-1">{category.icon}</Text>
                                <Text className="text-sm font-bold text-gray-900">
                                  {category.title}
                                </Text>
                                <Text className="text-xs text-gray-400 ml-auto">
                                  {categoryUnlocked}/{categoryTotal}
                                </Text>
                              </View>

                              {/* Badge Grid 2x2 */}
                              <View className="flex-row flex-wrap gap-2">
                                {category.badges.map((badge) => (
                                  <View key={badge.id} className="w-[48%]">
                                    <BadgeMiniCard
                                      badge={badge}
                                      isUnlocked={isBadgeUnlocked(badge.id, userBadges)}
                                      isSecret={category.key === 'secret'}
                                      onPress={() => navigation.navigate('Badges')}
                                    />
                                  </View>
                                ))}
                              </View>
                            </View>
                          )
                        })}

                        {/* Fair Badge Policy */}
                        <View className="pt-3 border-t border-primary/10">
                          <View className="flex-row items-center mb-2">
                            <Info size={12} color="#2563eb" />
                            <Text className="text-xs font-semibold text-primary ml-1">
                              공정한 배지 정책
                            </Text>
                          </View>
                          <Text className="text-xs text-gray-500 mb-1">
                            • 최소 16개 실천 항목 (5자 이상)
                          </Text>
                          <Text className="text-xs text-gray-500 mb-1">
                            • 정상적인 체크 패턴 (자동화 감지)
                          </Text>
                          <Text className="text-xs text-gray-500">
                            • 빈 만다라트 생성 불가
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </>
          )}
        </Animated.View>

        {/* Streak Card - Web Aligned Design */}
        <Animated.View
          entering={FadeInUp.delay(200).duration(400)}
          className="bg-white rounded-3xl p-6 mb-5 border border-gray-100"
          style={{
            ...(isTablet ? { flex: 1 } : {}),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          {/* Header */}
          <View className="flex-row items-center gap-2 mb-1">
            <Flame size={20} color="#f97316" />
            <Text className="text-lg font-bold text-orange-500">스트릭</Text>
          </View>
          <Text className="text-sm text-gray-500 mb-4">연속 실천 기록</Text>

          {/* Current Streak & Longest Streak - Side by Side */}
          <View className="flex-row gap-3 mb-4">
            {/* Current Streak */}
            <View className="flex-1 p-4 rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 items-center">
              <Flame size={32} color="#f97316" />
              <Text className="text-4xl font-bold text-orange-500 my-1">
                {currentStreak}
              </Text>
              <Text className="text-sm font-semibold text-gray-500">일 연속</Text>
              {currentStreak > 0 && lastCheckDate && (() => {
                // Handle both Date object and string (React Query may serialize dates)
                const isoString = lastCheckDate instanceof Date
                  ? lastCheckDate.toISOString()
                  : typeof lastCheckDate === 'string'
                    ? lastCheckDate
                    : String(lastCheckDate)
                const formatted = formatUserDateTime(isoString)
                return (
                  <View className="mt-2 items-center">
                    <Text className="text-xs text-gray-400">{formatted.date}</Text>
                    <Text className="text-xs text-gray-400">{formatted.time}</Text>
                  </View>
                )
              })()}
            </View>

            {/* Longest Streak */}
            <View className="flex-1 p-4 rounded-xl border border-gray-200 bg-gray-50 items-center relative">
              {isNewRecord && (
                <View className="absolute -top-2 -right-2 px-2 py-1 bg-yellow-100 rounded-full border border-yellow-300">
                  <Text className="text-xs font-bold text-yellow-700">신기록!</Text>
                </View>
              )}
              <Trophy size={32} color="#eab308" />
              <Text className="text-4xl font-bold text-gray-900 my-1">
                {longestStreak}
              </Text>
              <Text className="text-sm font-semibold text-gray-500">최장 기록</Text>
              {longestStreak > 0 && longestStreakDate && (() => {
                // Handle both Date object and string (React Query may serialize dates)
                const isoString = longestStreakDate instanceof Date
                  ? longestStreakDate.toISOString()
                  : longestStreakDate
                const formatted = formatUserDateTime(isoString)
                return (
                  <View className="mt-2 items-center">
                    <Text className="text-xs text-gray-400">{formatted.date}</Text>
                    <Text className="text-xs text-gray-400">{formatted.time}</Text>
                  </View>
                )
              })()}
            </View>
          </View>

          {/* 4-Week Heatmap */}
          <View>
            <View className="flex-row items-center gap-2 mb-4">
              <Calendar size={16} color="#6b7280" />
              <Text className="text-sm font-medium text-gray-700">최근 4주 활동</Text>
            </View>

            {fourWeekLoading ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#2563eb" />
              </View>
            ) : (
              <>
                {/* 28-day grid: 4 rows x 7 columns */}
                <View className="mb-3" style={{ gap: 8 }}>
                  {[0, 1, 2, 3].map((rowIndex) => (
                    <View key={rowIndex} className="flex-row justify-between">
                      {fourWeekData.slice(rowIndex * 7, rowIndex * 7 + 7).map((day) => {
                        const isToday = day.date === todayStr
                        const intensity = day.percentage >= 80
                          ? 'high'
                          : day.percentage >= 50
                            ? 'medium'
                            : day.percentage >= 20
                              ? 'low'
                              : day.percentage > 0
                                ? 'minimal'
                                : 'none'

                        // Color mapping matching web app (Tailwind green)
                        const bgColor = intensity === 'high'
                          ? '#22c55e' // green-500
                          : intensity === 'medium'
                            ? '#4ade80' // green-400
                            : intensity === 'low'
                              ? '#86efac' // green-300
                              : intensity === 'minimal'
                                ? '#bbf7d0' // green-200
                                : '#e5e5e5' // neutral-200 (muted background)

                        return (
                          <View
                            key={day.date}
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 6,
                              backgroundColor: bgColor,
                              borderWidth: isToday ? 2 : 0,
                              borderColor: isToday ? '#1f2937' : 'transparent', // gray-800
                              shadowColor: intensity !== 'none' ? '#22c55e' : '#000',
                              shadowOffset: { width: 0, height: intensity !== 'none' ? 2 : 1 },
                              shadowOpacity: intensity !== 'none' ? 0.15 : 0.05,
                              shadowRadius: intensity !== 'none' ? 3 : 2,
                              elevation: intensity !== 'none' ? 2 : 1,
                            }}
                          />
                        )
                      })}
                    </View>
                  ))}
                </View>

                {/* Legend */}
                <View className="flex-row items-center justify-center gap-1.5">
                  <Text className="text-xs text-gray-400 mr-1">0%</Text>
                  <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#e5e5e5' }} />
                  <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#bbf7d0' }} />
                  <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#86efac' }} />
                  <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#4ade80' }} />
                  <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#22c55e' }} />
                  <Text className="text-xs text-gray-400 ml-1">100%</Text>
                </View>
              </>
            )}
          </View>

          {/* Motivational Message */}
          {currentStreak === 0 ? (
            <View className="mt-4 px-4 py-3 bg-gray-50 rounded-2xl border border-gray-200">
              <Text
                className="text-sm text-gray-600 text-center"
                style={{ fontFamily: 'Pretendard-Medium' }}
              >
                오늘부터 새로운 스트릭을 시작해보세요! 🌱
              </Text>
            </View>
          ) : currentStreak >= 7 ? (
            <View className="mt-4 px-4 py-3 bg-orange-50 rounded-2xl border border-orange-200">
              <Text
                className="text-sm text-orange-700 text-center"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                대단해요! 꾸준함이 습관이 되고 있어요 🎉
              </Text>
            </View>
          ) : (
            <View className="mt-4 px-4 py-3 bg-gray-50 rounded-2xl border border-gray-200">
              <Text
                className="text-sm text-gray-600 text-center"
                style={{ fontFamily: 'Pretendard-Medium' }}
              >
                7일 연속까지 {7 - currentStreak}일 남았어요. 계속 이대로! 💪
              </Text>
            </View>
          )}
        </Animated.View>
        </View>
        {/* End of iPad 2-column layout */}

        {/* Bottom spacing */}
        <View className="h-8" />
        </View>
      </ScrollView>

      {/* Nickname Edit Modal */}
      <Modal
        visible={nicknameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNicknameModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl w-full max-w-sm p-6">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-gray-900">
                {NICKNAME_DIALOG.TITLE}
              </Text>
              <Pressable
                onPress={() => setNicknameModalVisible(false)}
                className="p-1 rounded-full active:bg-gray-100"
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>

            {/* Description */}
            <Text className="text-sm text-gray-500 mb-4">
              {NICKNAME_DIALOG.DESCRIPTION}
            </Text>

            {/* Input */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                {NICKNAME_DIALOG.LABEL}
              </Text>
              <TextInput
                value={newNickname}
                onChangeText={setNewNickname}
                placeholder={NICKNAME_DIALOG.PLACEHOLDER}
                maxLength={12}
                editable={!nicknameSaving}
                className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                placeholderTextColor="#9ca3af"
              />
              {nicknameError ? (
                <Text className="text-sm text-red-500 mt-2">{nicknameError}</Text>
              ) : null}
            </View>

            {/* Buttons */}
            <View className="space-y-2">
              <Pressable
                onPress={handleSaveNickname}
                disabled={nicknameSaving}
                className={`py-3 rounded-xl items-center ${
                  nicknameSaving ? 'bg-gray-400' : 'bg-gray-900'
                }`}
              >
                <Text className="text-white font-semibold">
                  {nicknameSaving ? NICKNAME_DIALOG.SAVING : NICKNAME_DIALOG.SAVE}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setNicknameModalVisible(false)}
                disabled={nicknameSaving}
                className="py-3 rounded-xl items-center border border-gray-300"
              >
                <Text className="text-gray-700 font-semibold">
                  {NICKNAME_DIALOG.CANCEL}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}
