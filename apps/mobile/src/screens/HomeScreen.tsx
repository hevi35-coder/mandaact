/**
 * HomeScreen - Refactored
 * 
 * Main dashboard showing user stats, XP, streaks, and badges.
 * Refactored to use sub-components for better maintainability.
 */

import React, { useState, useCallback, useRef } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { CompositeNavigationProp } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useScrollToTop } from '../navigation/RootNavigator'
import { Header } from '../components'
import { useResponsive } from '../hooks/useResponsive'
import { useAuthStore } from '../store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import { useUserGamification, use4WeekHeatmap, useProfileStats, statsKeys } from '../hooks/useStats'
import { useBadgeDefinitions, useUserBadges, useBadgeProgress, useTranslateBadge, isBadgeUnlocked, getBadgeUnlockDate, getBadgeRepeatCount, type BadgeDefinition } from '../hooks/useBadges'
import {
  getXPForCurrentLevel,
  getLevelFromXP,
} from '@mandaact/shared'
import { xpService } from '../lib/xp'
import type { XPMultiplier } from '@mandaact/shared'
import type { RootStackParamList, MainTabParamList } from '../navigation/RootNavigator'

// Sub-components
import { ProfileCard, StreakCard, NicknameModal, BadgeDetailModal } from '../components/Home'
import { BannerAd, XPBoostButton } from '../components/ads'

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>

export default function HomeScreen() {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const { isTablet, contentMaxWidth, horizontalPadding } = useResponsive()

  // Scroll to top on tab re-press
  const scrollRef = useRef<ScrollView>(null)
  useScrollToTop('Home', scrollRef)

  // Active multipliers state
  const [activeMultipliers, setActiveMultipliers] = useState<XPMultiplier[]>([])

  // Nickname editing states
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false)

  // Badge detail modal state
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null)

  // Translation for badges
  const translateBadge = useTranslateBadge()

  // Data fetching
  const { data: gamification, isLoading: gamificationLoading } = useUserGamification(user?.id)
  const { data: profileStats, isLoading: profileStatsLoading } = useProfileStats(user?.id)
  const { data: fourWeekData = [], isLoading: fourWeekLoading } = use4WeekHeatmap(user?.id)
  const { data: badges = [], isLoading: badgesLoading } = useBadgeDefinitions()
  const { data: userBadges = [] } = useUserBadges(user?.id)
  const { data: badgeProgress = [] } = useBadgeProgress(user?.id)

  const isLoading = gamificationLoading || profileStatsLoading

  // Invalidate and refetch data when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: statsKeys.user(user.id) })
        xpService.getActiveMultipliers(user.id).then(setActiveMultipliers)
      }
    }, [user?.id, queryClient])
  )

  // Calculate XP progress
  const totalXP = gamification?.total_xp || 0
  const currentLevel = getLevelFromXP(totalXP)
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

  // Open nickname edit modal
  const openNicknameModal = useCallback(() => {
    setNicknameModalVisible(true)
  }, [])

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
                {t('home.title')}
              </Text>
              <Text
                className="text-base text-gray-500 ml-3"
                style={{ fontFamily: 'Pretendard-Medium' }}
              >
                {t('home.subtitle')}
              </Text>
            </View>
          </View>

          {/* iPad: 2-column layout for cards */}
          <View style={isTablet ? { flexDirection: 'row', gap: 20 } : undefined}>
            {/* Profile Card */}
            <View style={isTablet ? { flex: 1 } : undefined}>
              <ProfileCard
                currentLevel={currentLevel}
                nickname={nickname}
                totalXP={totalXP}
                xpProgress={xpProgress}
                xpRequired={xpRequired}
                xpPercentage={xpPercentage}
                totalChecks={totalChecks}
                activeDays={activeDays}
                isLoading={isLoading}
                onEditNickname={openNicknameModal}
                activeMultipliers={activeMultipliers}
                badges={badges}
                userBadges={userBadges}
                badgeProgress={badgeProgress}
                badgesLoading={badgesLoading}
                translateBadge={translateBadge}
                onBadgePress={(badge) => setSelectedBadge(badge)}
              />
            </View>

            {/* XP Boost Section - Between Profile and Streak on Phone */}
            {!isTablet && (
              <XPBoostButton
                onBoostActivated={() => {
                  // Refresh active multipliers after boost activation
                  if (user?.id) {
                    xpService.getActiveMultipliers(user.id).then(setActiveMultipliers)
                  }
                }}
              />
            )}

            {/* Streak Card */}
            <View style={isTablet ? { flex: 1 } : undefined}>
              <StreakCard
                currentStreak={currentStreak}
                longestStreak={longestStreak}
                lastCheckDate={lastCheckDate}
                longestStreakDate={longestStreakDate}
                isNewRecord={isNewRecord}
                fourWeekData={fourWeekData}
                fourWeekLoading={fourWeekLoading}
                onFreezeActivated={() => {
                  // Refresh gamification data after streak freeze activation
                  if (user?.id) {
                    queryClient.invalidateQueries({ queryKey: statsKeys.user(user.id) })
                  }
                }}
              />
            </View>

            {/* XP Boost Section - After cards on Tablet */}
            {isTablet && (
              <XPBoostButton
                onBoostActivated={() => {
                  if (user?.id) {
                    xpService.getActiveMultipliers(user.id).then(setActiveMultipliers)
                  }
                }}
              />
            )}
          </View>
          {/* End of iPad 2-column layout */}

          {/* Bottom spacing */}
          <View className="h-8" />
        </View>
      </ScrollView>

      {/* Nickname Edit Modal */}
      <NicknameModal
        visible={nicknameModalVisible}
        currentNickname={nickname}
        onClose={() => setNicknameModalVisible(false)}
      />

      {/* Badge Detail Modal */}
      <BadgeDetailModal
        badge={selectedBadge}
        isUnlocked={selectedBadge ? isBadgeUnlocked(selectedBadge.id, userBadges) : false}
        unlockDate={selectedBadge ? getBadgeUnlockDate(selectedBadge.id, userBadges) : null}
        progress={selectedBadge ? badgeProgress.find(p => p.badge_id === selectedBadge.id) : undefined}
        repeatCount={selectedBadge ? getBadgeRepeatCount(selectedBadge.id, userBadges) : 0}
        visible={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
      />

      {/* Banner Ad */}
      <BannerAd location="home" />
    </View>
  )
}
