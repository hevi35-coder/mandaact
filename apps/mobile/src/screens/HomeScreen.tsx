import React, { useState, useCallback } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { CompositeNavigationProp } from '@react-navigation/native'
import {
  CalendarCheck,
  Grid3X3,
  FileText,
  Award,
  HelpCircle,
  Settings,
  Flame,
  Target,
  Trophy,
  Zap,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  X,
  Lock,
} from 'lucide-react-native'
import { useAuthStore } from '../store/authStore'
import { useUserGamification, useHeatmapData, useProfileStats } from '../hooks/useStats'
import { useActiveMandalarts } from '../hooks/useMandalarts'
import { useBadgeDefinitions, useUserBadges, isBadgeUnlocked } from '../hooks/useBadges'
import {
  APP_NAME,
  getXPForCurrentLevel,
  categorizeBadges,
  XP_EARNING_RULES,
  XP_MULTIPLIER_BONUSES,
  XP_MULTIPLIER_EXAMPLE,
  FAIR_XP_POLICIES,
  FAIR_BADGE_POLICIES,
  XP_MULTIPLIER_COLORS,
} from '@mandaact/shared'
import ActivityHeatmap from '../components/ActivityHeatmap'
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
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  // Collapsible states
  const [xpInfoOpen, setXpInfoOpen] = useState(false)
  const [badgeCollectionOpen, setBadgeCollectionOpen] = useState(false)

  // Data fetching
  const { data: gamification, isLoading: gamificationLoading } = useUserGamification(user?.id)
  const { data: profileStats, isLoading: profileStatsLoading } = useProfileStats(user?.id)
  const { data: heatmapData = [], isLoading: heatmapLoading } = useHeatmapData(user?.id, selectedMonth)
  const { data: badges = [], isLoading: badgesLoading } = useBadgeDefinitions()
  const { data: userBadges = [] } = useUserBadges(user?.id)

  const isLoading = gamificationLoading || profileStatsLoading

  // Calculate XP progress
  const currentLevel = gamification?.current_level || 1
  const totalXP = gamification?.total_xp || 0
  const { current: xpProgress, required: xpRequired, percentage: xpPercentage } = getXPForCurrentLevel(totalXP, currentLevel)
  const nickname = gamification?.nickname || user?.email?.split('@')[0] || '새 사용자'

  // Stats
  const totalChecks = profileStats?.totalChecks || 0
  const activeDays = profileStats?.activeDays || 0
  const currentStreak = gamification?.current_streak || 0
  const longestStreak = gamification?.longest_streak || 0

  // Badge stats
  const unlockedBadgeIds = new Set(userBadges.map(ub => ub.achievement_id))
  const unlockedCount = unlockedBadgeIds.size
  const totalBadges = badges.length

  // Categorized badges
  const categorizedBadges = categorizeBadges(badges)

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center">
            <Text className="text-3xl font-bold text-gray-900">홈</Text>
            <Text className="text-gray-500 ml-3 text-sm">성장 대시보드</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            className="p-2 rounded-full active:bg-gray-100"
          >
            <Settings size={24} color="#6b7280" />
          </Pressable>
        </View>

        {/* Profile Card - matching web UserProfileCard */}
        <Animated.View
          entering={FadeInUp.delay(100).duration(400)}
          className="bg-white rounded-2xl p-5 shadow-sm mb-4 border border-gray-200"
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
                  <Text className="text-base text-gray-500">{nickname}</Text>
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
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${xpPercentage}%` }}
                  />
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
                    <Zap size={14} color="#667eea" />
                    <Text className="text-xs font-semibold text-primary ml-1">
                      XP 획득 방법
                    </Text>
                  </View>
                  {xpInfoOpen ? (
                    <ChevronUp size={14} color="#667eea" />
                  ) : (
                    <ChevronDown size={14} color="#667eea" />
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
                        <Sparkles size={12} color="#667eea" />
                        <Text className="text-xs font-semibold text-primary ml-1">
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

                    {/* Fair XP Policy */}
                    <View className="pt-3 border-t border-primary/10">
                      <View className="flex-row items-center mb-2">
                        <Info size={12} color="#667eea" />
                        <Text className="text-xs font-semibold text-primary ml-1">
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
                    <Target size={14} color="#667eea" />
                    <Text className="text-xs font-semibold text-primary ml-1">
                      배지 컬렉션
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-[10px] text-gray-400 mr-2">
                      {unlockedCount}/{totalBadges}
                    </Text>
                    {badgeCollectionOpen ? (
                      <ChevronUp size={14} color="#667eea" />
                    ) : (
                      <ChevronDown size={14} color="#667eea" />
                    )}
                  </View>
                </Pressable>

                {badgeCollectionOpen && (
                  <View className="mt-3">
                    {badgesLoading ? (
                      <View className="py-4 items-center">
                        <ActivityIndicator size="small" color="#667eea" />
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
                            <Info size={12} color="#667eea" />
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

        {/* Streak Cards */}
        <View className="flex-row gap-3 mb-4">
          <Animated.View
            entering={FadeInUp.delay(200).duration(400)}
            className="flex-1 bg-white rounded-2xl p-4 border border-gray-200"
          >
            <View className="flex-row items-center mb-2">
              <Flame size={16} color="#f59e0b" />
              <Text className="text-sm text-gray-500 ml-1">현재 스트릭</Text>
            </View>
            <Text className="text-2xl font-bold text-amber-500">
              {currentStreak}일
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(250).duration(400)}
            className="flex-1 bg-white rounded-2xl p-4 border border-gray-200"
          >
            <View className="flex-row items-center mb-2">
              <Target size={16} color="#ef4444" />
              <Text className="text-sm text-gray-500 ml-1">최장 스트릭</Text>
            </View>
            <Text className="text-2xl font-bold text-red-500">
              {longestStreak}일
            </Text>
          </Animated.View>
        </View>

        {/* Activity Heatmap */}
        <View className="mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            활동 히트맵
          </Text>
          <ActivityHeatmap
            data={heatmapData}
            month={selectedMonth}
            onMonthChange={setSelectedMonth}
            isLoading={heatmapLoading}
          />
        </View>

        {/* Quick Actions */}
        <Animated.View
          entering={FadeInUp.delay(300).duration(400)}
          className="bg-white rounded-2xl p-6 shadow-sm mb-4 border border-gray-200"
        >
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            빠른 실행
          </Text>
          <View className="flex-row gap-3 mb-3">
            <Pressable
              className="flex-1 bg-gray-900 rounded-xl py-4 items-center flex-row justify-center"
              onPress={() => navigation.navigate('Today')}
            >
              <CalendarCheck size={18} color="#ffffff" />
              <Text className="text-white font-semibold ml-2">오늘의 실천</Text>
            </Pressable>
            <Pressable
              className="flex-1 bg-white border border-gray-300 rounded-xl py-4 items-center flex-row justify-center"
              onPress={() => navigation.navigate('Mandalart')}
            >
              <Grid3X3 size={18} color="#374151" />
              <Text className="text-gray-700 font-semibold ml-2">만다라트 관리</Text>
            </Pressable>
          </View>
          <View className="flex-row gap-3">
            <Pressable
              className="flex-1 bg-white border border-gray-300 rounded-xl py-4 items-center flex-row justify-center"
              onPress={() => navigation.navigate('Reports')}
            >
              <FileText size={18} color="#8b5cf6" />
              <Text className="text-gray-700 font-semibold ml-2">AI 리포트</Text>
            </Pressable>
            <Pressable
              className="flex-1 bg-white border border-gray-300 rounded-xl py-4 items-center flex-row justify-center"
              onPress={() => navigation.navigate('Badges')}
            >
              <Award size={18} color="#f59e0b" />
              <Text className="text-gray-700 font-semibold ml-2">뱃지</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Tutorial Banner */}
        <Pressable
          className="bg-white border border-gray-300 rounded-2xl p-4 mb-4 flex-row items-center"
          onPress={() => navigation.navigate('Tutorial')}
        >
          <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center">
            <HelpCircle size={20} color="#3b82f6" />
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-gray-900 font-semibold">튜토리얼</Text>
            <Text className="text-gray-500 text-sm">사용법 다시 보기</Text>
          </View>
        </Pressable>

        {/* App Info */}
        <View className="items-center py-4">
          <Text className="text-gray-400 text-xs">
            {APP_NAME} - React Native 버전
          </Text>
        </View>

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  )
}
