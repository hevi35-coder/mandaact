import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { X, Lock, Zap, Trophy, Repeat } from 'lucide-react-native'
import { format } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '../store/authStore'
import {
  useBadgeDefinitions,
  useUserBadges,
  useBadgeProgress,
  BADGE_CATEGORIES,
  useTranslatedBadgeCategories,
  getBadgesByCategory,
  isBadgeUnlocked,
  getBadgeUnlockDate,
  getBadgeRepeatCount,
  useTranslateBadge,
  type BadgeDefinition,
} from '../hooks/useBadges'
import { useUserGamification } from '../hooks/useStats'
import { getBadgeHint } from '@mandaact/shared'

// Types for unlock condition
interface UnlockCondition {
  type: string
  days?: number
  count?: number
  threshold?: number
  period?: string
  [key: string]: unknown
}

// Local translated version of formatUnlockCondition
function useFormatUnlockCondition() {
  const { t } = useTranslation()

  return (condition: UnlockCondition, hintLevel?: 'full' | 'cryptic' | 'hidden', badgeKey?: string): string => {
    if (hintLevel === 'hidden') {
      return t('badges.unlockConditions.secretBadge')
    }

    if (hintLevel === 'cryptic') {
      return t('badges.unlockConditions.conditionSecret')
    }

    // Special cases for badges with trigger-based unlock conditions
    if (!condition.type || Object.keys(condition).length === 0) {
      switch (badgeKey) {
        case 'first_mandalart':
          return t('badges.unlockConditions.firstMandalart')
        case 'level_10':
          return t('badges.unlockConditions.level10')
        case 'monthly_champion':
          return t('badges.unlockConditions.monthlyChampion')
        default:
          return t('badges.unlockConditions.defaultTrigger')
      }
    }

    // Full transparency - format the condition
    switch (condition.type) {
      case 'streak':
        return t('badges.unlockConditions.streak', { days: condition.days })
      case 'total_checks':
        return t('badges.unlockConditions.totalChecks', { count: condition.count })
      case 'perfect_day':
        return t('badges.unlockConditions.perfectDay', { count: condition.count || 1 })
      case 'perfect_week':
        return t('badges.unlockConditions.perfectWeek', { threshold: condition.threshold || 80, count: condition.count })
      case 'perfect_month':
        return t('badges.unlockConditions.perfectMonth', { threshold: condition.threshold })
      case 'balanced':
        return t('badges.unlockConditions.balanced', { threshold: condition.threshold })
      case 'time_pattern':
        if (condition.period === 'morning') {
          return t('badges.unlockConditions.morningPattern', { threshold: condition.threshold })
        }
        return t('badges.unlockConditions.timePattern')
      case 'weekend_completion':
        return t('badges.unlockConditions.weekendCompletion')
      case 'monthly_completion':
        return t('badges.unlockConditions.monthlyCompletion', { threshold: condition.threshold })
      case 'perfect_week_in_month':
        return t('badges.unlockConditions.perfectWeekInMonth')
      case 'monthly_streak':
        return t('badges.unlockConditions.monthlyStreak', { days: condition.days })
      default:
        return t('badges.unlockConditions.defaultTrigger')
    }
  }
}

// Local translated version of getProgressMessage
function useGetProgressMessage() {
  const { t } = useTranslation()

  return (progress: number, target: number): string => {
    const percentage = (progress / target) * 100

    if (percentage >= 100) {
      return t('badges.progressMessages.achieved')
    }

    if (percentage >= 80) {
      const remaining = target - progress
      return t('badges.progressMessages.almostThere', { remaining })
    }

    if (percentage >= 50) {
      return t('badges.progressMessages.halfWay')
    }

    if (percentage >= 25) {
      return t('badges.progressMessages.goodProgress', { progress, target })
    }

    return t('badges.progressMessages.justStarted', { progress, target })
  }
}

// Badge Card Component
function BadgeCard({
  badge,
  isUnlocked,
  unlockDate,
  progress,
  onPress,
  dateLocale,
  dateFormat,
  repeatableLabel,
}: {
  badge: BadgeDefinition
  isUnlocked: boolean
  unlockDate: string | null
  progress?: { current: number; target: number; percentage: number }
  onPress: () => void
  dateLocale: typeof ko | typeof enUS
  dateFormat: string
  repeatableLabel: string
}) {
  return (
    <Pressable
      className={`w-[30%] items-center p-3 rounded-2xl border-2 ${
        isUnlocked
          ? 'bg-white border-primary/30'
          : 'bg-gray-50 border-gray-200'
      }`}
      onPress={onPress}
      style={{
        shadowColor: isUnlocked ? '#2563eb' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isUnlocked ? 0.1 : 0.04,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {/* Icon - Always show, grayscale when locked (like web) */}
      <View className="items-center mb-2">
        <Text
          className={`text-3xl ${isUnlocked ? '' : 'opacity-40'}`}
          style={isUnlocked ? {} : { filter: 'grayscale(1)' }}
        >
          {badge.icon}
        </Text>
        {!isUnlocked && (
          <Lock size={14} color="#9ca3af" style={{ marginTop: 2 }} />
        )}
      </View>
      <Text
        className={`text-xs text-center ${
          isUnlocked ? 'text-gray-900' : 'text-gray-400'
        }`}
        style={{ fontFamily: 'Pretendard-SemiBold' }}
        numberOfLines={1}
      >
        {badge.name}
      </Text>
      {/* XP Reward */}
      <Text
        className="text-xs text-primary mt-1"
        style={{ fontFamily: 'Pretendard-Medium' }}
      >
        +{badge.xp_reward} XP
      </Text>
      {/* Progress for locked badges */}
      {!isUnlocked && progress && (
        <View className="w-full mt-2">
          <View className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <View
              className="h-full bg-primary rounded-full"
              style={{ width: `${Math.min(progress.percentage, 100)}%` }}
            />
          </View>
          <Text
            className="text-xs text-gray-400 text-center mt-1"
            style={{ fontFamily: 'Pretendard-Regular' }}
          >
            {progress.current}/{progress.target}
          </Text>
        </View>
      )}
      {/* Unlocked date */}
      {isUnlocked && unlockDate && (
        <Text
          className="text-xs text-gray-400 text-center mt-1 pt-1 border-t border-gray-100"
          style={{ fontFamily: 'Pretendard-Regular' }}
        >
          {format(new Date(unlockDate), dateFormat, { locale: dateLocale })}
        </Text>
      )}
      {/* Repeatable badge indicator */}
      {badge.repeatable && (
        <View className="mt-1 px-2 py-0.5 bg-amber-50 rounded-full">
          <Text
            className="text-xs text-amber-600"
            style={{ fontFamily: 'Pretendard-Medium' }}
          >
            {repeatableLabel}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

// Badge Detail Modal
function BadgeDetailModal({
  badge,
  isUnlocked,
  unlockDate,
  progress,
  repeatCount = 0,
  visible,
  onClose,
  t,
  dateLocale,
  dateFormatFull,
  timesLabel,
  formatUnlockCondition,
  getProgressMessage,
}: {
  badge: BadgeDefinition | null
  isUnlocked: boolean
  unlockDate: string | null
  progress?: { current: number; target: number; percentage: number }
  repeatCount?: number
  visible: boolean
  onClose: () => void
  t: (key: string, options?: Record<string, unknown>) => string
  dateLocale: typeof ko | typeof enUS
  dateFormatFull: string
  timesLabel: string
  formatUnlockCondition: (condition: UnlockCondition, hintLevel?: 'full' | 'cryptic' | 'hidden', badgeKey?: string) => string
  getProgressMessage: (progress: number, target: number) => string
}) {
  if (!badge) return null

  const _category = BADGE_CATEGORIES[badge.category]
  const hintLevel = badge.hint_level || 'full'
  const crypticHint = getBadgeHint(badge.key || '', hintLevel)
  const formattedCondition = formatUnlockCondition(
    badge.unlock_condition || { type: '' },
    hintLevel,
    badge.key
  )
  const canShowProgress = !isUnlocked && progress && hintLevel !== 'hidden'

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl">
          <SafeAreaView edges={['bottom']}>
            {/* Header */}
            <View className="flex-row items-center justify-between p-5 border-b border-gray-100">
              <Text
                className="text-lg text-gray-900"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                {t('badges.detail.title')}
              </Text>
              <Pressable onPress={onClose} className="p-2">
                <X size={24} color="#9ca3af" />
              </Pressable>
            </View>

            {/* Content */}
            <View className="p-6">
              {/* Badge Icon - Always show, grayscale when locked (like web) */}
              <View className="items-center mb-4">
                <Text
                  className={`text-6xl ${isUnlocked ? '' : 'opacity-40'}`}
                >
                  {badge.icon}
                </Text>
              </View>

              {/* Badge Name */}
              <Text
                className="text-2xl text-gray-900 text-center mb-2"
                style={{ fontFamily: 'Pretendard-Bold' }}
              >
                {badge.name}
              </Text>

              {/* Description */}
              <Text
                className="text-base text-gray-500 text-center mb-4"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                {badge.description}
              </Text>

              {/* Unlock Status Box - like web */}
              {isUnlocked ? (
                <View className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-4">
                  <View className="flex-row items-center mb-2">
                    <Trophy size={20} color="#d97706" />
                    <Text
                      className="text-amber-700 ml-2"
                      style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                      {t('badges.detail.unlocked')}
                    </Text>
                  </View>
                  {unlockDate && (
                    <Text
                      className="text-amber-600 text-sm"
                      style={{ fontFamily: 'Pretendard-Regular' }}
                    >
                      {format(new Date(unlockDate), dateFormatFull, { locale: dateLocale })}
                      {badge.repeatable && repeatCount > 1 && (
                        <Text className="text-xs"> {t('badges.detail.firstUnlockDate')}</Text>
                      )}
                    </Text>
                  )}
                  {/* Repeat count for recurring badges */}
                  {badge.repeatable && repeatCount > 1 && (
                    <View className="mt-3 pt-3 border-t border-amber-200">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Repeat size={16} color="#d97706" />
                          <Text
                            className="text-amber-700 ml-2"
                            style={{ fontFamily: 'Pretendard-Medium' }}
                          >
                            {t('badges.detail.totalCount')}
                          </Text>
                        </View>
                        <Text
                          className="text-2xl text-amber-600"
                          style={{ fontFamily: 'Pretendard-Bold' }}
                        >
                          {repeatCount}{timesLabel}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <View className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-4">
                  <View className="flex-row items-start mb-2">
                    <Lock size={20} color="#d97706" style={{ marginTop: 2 }} />
                    <View className="flex-1 ml-2">
                      <Text
                        className="text-amber-700 mb-1"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                      >
                        {hintLevel === 'hidden' ? t('badges.detail.secretBadge') : t('badges.detail.unlockCondition')}
                      </Text>
                      {hintLevel === 'hidden' ? (
                        <Text
                          className="text-gray-500 italic"
                          style={{ fontFamily: 'Pretendard-Regular' }}
                        >
                          {crypticHint || '???'}
                        </Text>
                      ) : hintLevel === 'cryptic' ? (
                        <Text
                          className="text-gray-500 italic"
                          style={{ fontFamily: 'Pretendard-Regular' }}
                        >
                          "{crypticHint}"
                        </Text>
                      ) : (
                        <Text
                          className="text-gray-700"
                          style={{ fontFamily: 'Pretendard-Regular' }}
                        >
                          {formattedCondition}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Progress - integrated into unlock condition box (like web) */}
                  {canShowProgress && progress && (
                    <View className="mt-3 pt-3 border-t border-amber-200">
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                          <Zap size={14} color="#2563eb" />
                          <Text
                            className="text-gray-500 text-sm ml-1"
                            style={{ fontFamily: 'Pretendard-Regular' }}
                          >
                            {getProgressMessage(progress.current, progress.target)}
                          </Text>
                        </View>
                        <Text
                          className="text-gray-900"
                          style={{ fontFamily: 'Pretendard-SemiBold' }}
                        >
                          {progress.current} / {progress.target}
                        </Text>
                      </View>
                      <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <View
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(progress.percentage, 100)}%` }}
                        />
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* XP Reward - Larger style like web */}
              <View className="bg-primary/10 border-2 border-primary/20 rounded-2xl p-4">
                <View className="flex-row items-center justify-center mb-1">
                  <Zap size={20} color="#2563eb" />
                  <Text
                    className="text-gray-500 text-sm ml-2"
                    style={{ fontFamily: 'Pretendard-Medium' }}
                  >
                    {t('badges.detail.reward')}
                  </Text>
                </View>
                <Text
                  className="text-4xl text-primary text-center"
                  style={{ fontFamily: 'Pretendard-Bold' }}
                >
                  +{badge.xp_reward.toLocaleString()} XP
                </Text>
                {badge.repeatable && (
                  <Text
                    className="text-xs text-primary/70 text-center mt-2"
                    style={{ fontFamily: 'Pretendard-Regular' }}
                  >
                    {t('badges.detail.repeatableNote')}
                  </Text>
                )}
              </View>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  )
}

export default function BadgeScreen() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Get locale for date formatting
  const dateLocale = i18n.language === 'ko' ? ko : enUS
  const dateFormat = i18n.language === 'ko' ? 'M월 d일' : 'MMM d'
  const dateFormatFull = i18n.language === 'ko' ? 'yyyy년 M월 d일' : 'MMMM d, yyyy'
  const repeatableLabel = t('badges.repeatable')
  const timesLabel = i18n.language === 'ko' ? '회' : 'x'

  // Get translated badge categories
  const translatedCategories = useTranslatedBadgeCategories()
  const translateBadge = useTranslateBadge()

  // Get translated formatting functions
  const formatUnlockCondition = useFormatUnlockCondition()
  const getProgressMessage = useGetProgressMessage()

  // Data fetching
  const { data: badges = [] } = useBadgeDefinitions()
  const { data: userBadges = [], refetch: refetchUserBadges } = useUserBadges(user?.id)
  const { data: badgeProgress = [] } = useBadgeProgress(user?.id)
  const { data: _gamification } = useUserGamification(user?.id)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetchUserBadges()
    setRefreshing(false)
  }, [refetchUserBadges])

  // Organize badges by category and translate them
  const translatedBadges = useMemo(() => badges.map(translateBadge), [badges, translateBadge])
  const badgesByCategory = getBadgesByCategory(translatedBadges)

  // Get progress for a badge
  const getProgress = (badgeId: string) => {
    return badgeProgress.find(p => p.badge_id === badgeId)
  }

  // Stats
  const totalBadges = badges.length
  const unlockedCount = userBadges.length
  const unlockedPercentage = totalBadges > 0 ? Math.round((unlockedCount / totalBadges) * 100) : 0

  // Filter badges
  const filteredCategories = selectedCategory
    ? { [selectedCategory]: badgesByCategory[selectedCategory] }
    : badgesByCategory

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1 px-5 pt-5"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header - Center Aligned */}
        <View className="items-center mb-5">
          <Text
            className="text-3xl text-gray-900"
            style={{ fontFamily: 'Pretendard-Bold' }}
          >
            {t('badges.title')}
          </Text>
          <Text
            className="text-base text-gray-500 mt-1"
            style={{ fontFamily: 'Pretendard-Regular' }}
          >
            {t('badges.subtitle')}
          </Text>
        </View>

        {/* Summary Card */}
        <View
          className="mb-5 bg-gradient-to-r from-primary to-purple-500 rounded-3xl p-5"
          style={{
            backgroundColor: '#2563eb',
            shadowColor: '#2563eb',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 5,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text
                className="text-white/80 text-sm"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                {t('badges.collected')}
              </Text>
              <Text
                className="text-white text-3xl"
                style={{ fontFamily: 'Pretendard-Bold' }}
              >
                {unlockedCount}
                <Text
                  className="text-lg text-white/70"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                >
                  /{totalBadges}
                </Text>
              </Text>
            </View>
            <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center">
              <Text
                className="text-white text-2xl"
                style={{ fontFamily: 'Pretendard-Bold' }}
              >
                {unlockedPercentage}%
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View className="mt-4 h-2 bg-white/30 rounded-full overflow-hidden">
            <View
              className="h-full bg-white rounded-full"
              style={{ width: `${unlockedPercentage}%` }}
            />
          </View>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-5"
          style={{ marginHorizontal: -20, paddingHorizontal: 20 }}
        >
          <View className="flex-row gap-2">
            <Pressable
              className={`px-4 py-2.5 rounded-xl ${
                !selectedCategory ? 'bg-gray-900' : 'bg-white'
              }`}
              onPress={() => setSelectedCategory(null)}
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <Text
                className={`text-sm ${
                  !selectedCategory ? 'text-white' : 'text-gray-700'
                }`}
                style={{ fontFamily: 'Pretendard-Medium' }}
              >
                {t('common.all')}
              </Text>
            </Pressable>
            {Object.values(translatedCategories).map(cat => (
              <Pressable
                key={cat.id}
                className={`px-4 py-2.5 rounded-xl ${
                  selectedCategory === cat.id ? 'bg-gray-900' : 'bg-white'
                }`}
                onPress={() => setSelectedCategory(cat.id)}
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <Text
                  className={`text-sm ${
                    selectedCategory === cat.id ? 'text-white' : 'text-gray-700'
                  }`}
                  style={{ fontFamily: 'Pretendard-Medium' }}
                >
                  {cat.icon} {cat.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Badge Grid by Category */}
        {Object.entries(filteredCategories).map(([categoryId, categoryBadges]) => {
          const category = translatedCategories[categoryId]
          if (!categoryBadges.length) return null

          return (
            <View key={categoryId} className="mb-6">
              <View className="flex-row items-center mb-3">
                <Text className="text-lg">{category.icon}</Text>
                <Text
                  className="text-lg text-gray-900 ml-2"
                  style={{ fontFamily: 'Pretendard-SemiBold' }}
                >
                  {category.name}
                </Text>
                <Text
                  className="text-sm text-gray-400 ml-2"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                >
                  {categoryBadges.filter(b => isBadgeUnlocked(b.id, userBadges)).length}/
                  {categoryBadges.length}
                </Text>
              </View>

              <View className="flex-row flex-wrap gap-2">
                {categoryBadges.map(badge => (
                  <BadgeCard
                    key={badge.id}
                    badge={badge}
                    isUnlocked={isBadgeUnlocked(badge.id, userBadges)}
                    unlockDate={getBadgeUnlockDate(badge.id, userBadges)}
                    progress={getProgress(badge.id)}
                    onPress={() => setSelectedBadge(badge)}
                    dateLocale={dateLocale}
                    dateFormat={dateFormat}
                    repeatableLabel={repeatableLabel}
                  />
                ))}
              </View>
            </View>
          )
        })}

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>

      {/* Badge Detail Modal */}
      <BadgeDetailModal
        badge={selectedBadge}
        isUnlocked={selectedBadge ? isBadgeUnlocked(selectedBadge.id, userBadges) : false}
        unlockDate={selectedBadge ? getBadgeUnlockDate(selectedBadge.id, userBadges) : null}
        progress={selectedBadge ? getProgress(selectedBadge.id) : undefined}
        repeatCount={selectedBadge ? getBadgeRepeatCount(selectedBadge.id, userBadges) : 0}
        visible={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
        t={t}
        dateLocale={dateLocale}
        dateFormatFull={dateFormatFull}
        timesLabel={timesLabel}
        formatUnlockCondition={formatUnlockCondition}
        getProgressMessage={getProgressMessage}
      />
    </SafeAreaView>
  )
}
