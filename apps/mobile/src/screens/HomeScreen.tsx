/**
 * HomeScreen - Refactored
 * 
 * Main dashboard showing user stats, XP, streaks, and badges.
 * Refactored to use sub-components for better maintainability.
 */

import React, { useState, useCallback, useRef } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useUserProfile } from '../hooks/useUserProfile'
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
import { useActiveMandalarts } from '../hooks/useMandalarts'
import { useBadgeDefinitions, useUserBadges, useBadgeProgress, useTranslateBadge, isBadgeUnlocked, getBadgeUnlockDate, getBadgeRepeatCount, type BadgeDefinition } from '../hooks/useBadges'
import {
  getXPForCurrentLevel,
  getLevelFromXP,
  calculateXPForLevel,
} from '@mandaact/shared'
import { xpService } from '../lib/xp'
import type { XPMultiplier } from '@mandaact/shared'
import type { RootStackParamList, MainTabParamList } from '../navigation/RootNavigator'
// Sub-components
import { ProfileCard, StreakCard, NicknameModal, BadgeDetailModal, OnboardingChecklist } from '../components/Home'
import { BannerAd, XPBoostButton } from '../components/ads'
import { areNotificationsEnabled } from '../services/notificationService'
import { isTutorialCompleted } from '../screens/TutorialScreen'

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

  // SCREENSHOT MODE OVERRIDE
  const { IS_SCREENSHOT_MODE, SCREENSHOT_DATA } = require('../lib/config')

  // Data fetching
  const { data: gamification, isLoading: gamificationLoading } = useUserGamification(user?.id)
  const { data: profileStats, isLoading: profileStatsLoading } = useProfileStats(user?.id)
  const { data: fourWeekData = [], isLoading: fourWeekLoading } = use4WeekHeatmap(user?.id)
  const { data: badges = [], isLoading: badgesLoading } = useBadgeDefinitions()
  const { data: realUserBadges = [] } = useUserBadges(user?.id)

  // MOCK BADGES FOR SCREENSHOT MODE
  const userBadges = React.useMemo(() => {
    if (!IS_SCREENSHOT_MODE || !SCREENSHOT_DATA.badges) return realUserBadges;

    return SCREENSHOT_DATA.badges.map((key: string) => {
      // Try to find the actual UUID from badge definitions for reliable UI coloring
      const badgeDef = badges.find(b => b.key === key);
      return {
        id: key,
        achievement_id: badgeDef?.id || key,
        user_id: user?.id || 'mock',
        unlocked_at: new Date().toISOString()
      };
    });
  }, [IS_SCREENSHOT_MODE, SCREENSHOT_DATA.badges, realUserBadges, badges, user?.id]);

  const { data: badgeProgress = [] } = useBadgeProgress(user?.id)
  const { data: activeMandalarts = [] } = useActiveMandalarts(user?.id)
  const hasActiveMandalarts = activeMandalarts.length > 0
  const { profile: userProfile } = useUserProfile(user?.id)
  const [hasNotificationsEnabled, setHasNotificationsEnabled] = useState(false)
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false)

  // Handlers
  const openNicknameModal = useCallback(() => {
    setNicknameModalVisible(true)
  }, [])


  const isLoading = gamificationLoading || profileStatsLoading

  // Derived state
  const currentLevel = IS_SCREENSHOT_MODE ? SCREENSHOT_DATA.level : (gamification?.current_level || 1)

  // XP Progress Calculation
  const nextLevelXPReq = getXPForCurrentLevel(0, currentLevel).required
  const mockProgressXP = Math.floor(nextLevelXPReq * (SCREENSHOT_DATA.xpProgress || 0.85))
  const mockTotalXP = calculateXPForLevel(currentLevel) + mockProgressXP

  const totalXP = IS_SCREENSHOT_MODE
    ? (SCREENSHOT_DATA.totalXP > 0 ? SCREENSHOT_DATA.totalXP : mockTotalXP)
    : (gamification?.total_xp || 0)

  const nickname = IS_SCREENSHOT_MODE ? 'ASO_Expert' : (gamification?.nickname || user?.email?.split('@')[0] || t('home.nickname.default', 'User'))

  // XP Progress Calculation
  const { current: levelXP, required: levelRequirement, percentage: xpPercentageRaw } = getXPForCurrentLevel(totalXP, currentLevel)
  const xpRequired = levelRequirement // This variable name in HomeScreen seems to mean "XP needed for next level" based on usage in ProfileCard
  const xpProgress = IS_SCREENSHOT_MODE ? Math.floor(levelRequirement * SCREENSHOT_DATA.xpProgress) : levelXP
  const xpPercentage = IS_SCREENSHOT_MODE ? (SCREENSHOT_DATA.xpProgress * 100) : xpPercentageRaw

  // Profile Stats
  const totalChecks = IS_SCREENSHOT_MODE ? SCREENSHOT_DATA.totalChecks : (profileStats?.total_checks || 0)
  const activeDays = IS_SCREENSHOT_MODE ? SCREENSHOT_DATA.activeDays : (profileStats?.active_days || 0)
  const currentStreak = IS_SCREENSHOT_MODE ? SCREENSHOT_DATA.currentStreak : (profileStats?.current_streak || 0)
  const longestStreak = IS_SCREENSHOT_MODE ? SCREENSHOT_DATA.longestStreak : (profileStats?.longest_streak || 0)
  const lastCheckDate = IS_SCREENSHOT_MODE ? new Date(SCREENSHOT_DATA.lastCheckDate) : profileStats?.last_check_date
  const longestStreakDate = IS_SCREENSHOT_MODE ? new Date(SCREENSHOT_DATA.lastCheckDate) : profileStats?.longest_streak_date
  const isNewRecord = currentStreak > 0 && currentStreak >= longestStreak

  // Invalidate and refetch data when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: statsKeys.user(user.id) })
        xpService.getActiveMultipliers(user.id).then(setActiveMultipliers)

        // Check notification status (static)
        areNotificationsEnabled().then(setHasNotificationsEnabled)

        // Check tutorial completion status (static)
        isTutorialCompleted(user.id).then(setHasCompletedTutorial)
      }
    }, [user?.id, queryClient])
  )
  // ...
  // Check tutorial status on mount
  React.useEffect(() => {
    const checkTutorial = async () => {
      if (!user?.id) return

      const completed = await isTutorialCompleted(user.id)
      setHasCompletedTutorial(completed)

      if (!completed) {
        // Small delay to ensure navigation is ready and screen transitions are smooth
        setTimeout(() => {
          navigation.navigate('Tutorial')
        }, 500)
      }
    }

    checkTutorial()
  }, [navigation, user?.id])

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

          <OnboardingChecklist
            hasCreatedGoal={hasActiveMandalarts}
            hasSetNotifications={hasNotificationsEnabled}
            hasFirstAction={totalChecks > 0}
            hasCompletedTutorial={hasCompletedTutorial}
            signupDate={user?.created_at}
          />



          {/* iPad: 2-column layout for cards */}
          <View style={isTablet ? { flexDirection: 'row', gap: 20 } : undefined}>
            {/* Profile Card */}
            <View style={isTablet ? { flex: 1 } : undefined}>
              <ProfileCard
                currentLevel={currentLevel}
                nickname={nickname}
                totalXP={totalXP}
                xpProgress={xpProgress}
                xpRequired={levelRequirement}
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

              {/* XP Boost Button - Below ProfileCard on iPad */}
              {isTablet && (
                <XPBoostButton
                  hasActiveMandalarts={hasActiveMandalarts}
                  onBoostActivated={() => {
                    if (user?.id) {
                      xpService.getActiveMultipliers(user.id).then(setActiveMultipliers)
                    }
                  }}
                />
              )}
            </View>

            {/* XP Boost Section - Between Profile and Streak on Phone */}
            {!isTablet && (
              <>
                <XPBoostButton
                  hasActiveMandalarts={hasActiveMandalarts}
                  onBoostActivated={() => {
                    // Refresh active multipliers after boost activation
                    if (user?.id) {
                      xpService.getActiveMultipliers(user.id).then(setActiveMultipliers)
                    }
                  }}
                />

              </>
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
              />
            </View>
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
