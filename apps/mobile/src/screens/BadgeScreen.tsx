import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { X, Lock, Award, Sparkles, Zap, Trophy, Repeat } from 'lucide-react-native'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

import { useAuthStore } from '../store/authStore'
import {
  useBadgeDefinitions,
  useUserBadges,
  useBadgeProgress,
  BADGE_CATEGORIES,
  getBadgesByCategory,
  isBadgeUnlocked,
  getBadgeUnlockDate,
  getBadgeRepeatCount,
  type BadgeDefinition,
} from '../hooks/useBadges'
import { useUserGamification } from '../hooks/useStats'
import { formatUnlockCondition, getProgressMessage, getBadgeHint } from '../lib/badgeHints'

// Badge Card Component
function BadgeCard({
  badge,
  isUnlocked,
  unlockDate,
  progress,
  onPress,
}: {
  badge: BadgeDefinition
  isUnlocked: boolean
  unlockDate: string | null
  progress?: { current: number; target: number; percentage: number }
  onPress: () => void
}) {
  return (
    <Pressable
      className={`w-[30%] items-center p-3 rounded-2xl border-2 ${
        isUnlocked
          ? 'bg-white border-primary/30'
          : 'bg-gray-50 border-gray-200'
      }`}
      onPress={onPress}
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
        className={`text-xs font-semibold text-center ${
          isUnlocked ? 'text-gray-900' : 'text-gray-400'
        }`}
        numberOfLines={1}
      >
        {badge.name}
      </Text>
      {/* XP Reward */}
      <Text className="text-[10px] text-primary font-mono mt-1">
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
          <Text className="text-[10px] text-gray-400 text-center mt-1">
            {progress.current}/{progress.target}
          </Text>
        </View>
      )}
      {/* Unlocked date */}
      {isUnlocked && unlockDate && (
        <Text className="text-[10px] text-gray-400 text-center mt-1 pt-1 border-t border-gray-100">
          {format(new Date(unlockDate), 'M월 d일', { locale: ko })}
        </Text>
      )}
      {/* Repeatable badge indicator */}
      {badge.repeatable && (
        <View className="mt-1 px-2 py-0.5 bg-amber-50 rounded-full">
          <Text className="text-[10px] text-amber-600">반복</Text>
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
}: {
  badge: BadgeDefinition | null
  isUnlocked: boolean
  unlockDate: string | null
  progress?: { current: number; target: number; percentage: number }
  repeatCount?: number
  visible: boolean
  onClose: () => void
}) {
  if (!badge) return null

  const category = BADGE_CATEGORIES[badge.category]
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
            <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <Text className="text-lg font-semibold text-gray-900">뱃지 상세</Text>
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
              <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
                {badge.name}
              </Text>

              {/* Description */}
              <Text className="text-base text-gray-500 text-center mb-4">
                {badge.description}
              </Text>

              {/* Unlock Status Box - like web */}
              {isUnlocked ? (
                <View className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-4">
                  <View className="flex-row items-center mb-2">
                    <Trophy size={20} color="#d97706" />
                    <Text className="text-amber-700 font-semibold ml-2">배지 획득 완료!</Text>
                  </View>
                  {unlockDate && (
                    <Text className="text-amber-600 text-sm">
                      {format(new Date(unlockDate), 'yyyy년 M월 d일', { locale: ko })}
                      {badge.repeatable && repeatCount > 1 && (
                        <Text className="text-xs"> (최초 획득일)</Text>
                      )}
                    </Text>
                  )}
                  {/* Repeat count for recurring badges */}
                  {badge.repeatable && repeatCount > 1 && (
                    <View className="mt-3 pt-3 border-t border-amber-200">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <Repeat size={16} color="#d97706" />
                          <Text className="text-amber-700 font-medium ml-2">누적 획득 횟수</Text>
                        </View>
                        <Text className="text-2xl font-bold text-amber-600">{repeatCount}회</Text>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <View className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-4">
                  <View className="flex-row items-start mb-2">
                    <Lock size={20} color="#d97706" style={{ marginTop: 2 }} />
                    <View className="flex-1 ml-2">
                      <Text className="text-amber-700 font-semibold mb-1">
                        {hintLevel === 'hidden' ? '비밀 배지' : '잠금 해제 조건'}
                      </Text>
                      {hintLevel === 'hidden' ? (
                        <Text className="text-gray-500 italic">{crypticHint || '???'}</Text>
                      ) : hintLevel === 'cryptic' ? (
                        <Text className="text-gray-500 italic">"{crypticHint}"</Text>
                      ) : (
                        <Text className="text-gray-700">{formattedCondition}</Text>
                      )}
                    </View>
                  </View>

                  {/* Progress - integrated into unlock condition box (like web) */}
                  {canShowProgress && progress && (
                    <View className="mt-3 pt-3 border-t border-amber-200">
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center">
                          <Zap size={14} color="#667eea" />
                          <Text className="text-gray-500 text-sm ml-1">
                            {getProgressMessage(progress.current, progress.target)}
                          </Text>
                        </View>
                        <Text className="font-mono font-semibold text-gray-900">
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
              <View className="bg-primary/10 border-2 border-primary/20 rounded-xl p-4">
                <View className="flex-row items-center justify-center mb-1">
                  <Zap size={20} color="#667eea" />
                  <Text className="text-gray-500 text-sm font-medium ml-2">획득 보상</Text>
                </View>
                <Text className="text-4xl font-bold text-primary text-center">
                  +{badge.xp_reward.toLocaleString()} XP
                </Text>
                {badge.repeatable && (
                  <Text className="text-xs text-primary/70 text-center mt-2">
                    반복 획득 가능 (매회 동일 보상)
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
  const { user } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Data fetching
  const { data: badges = [] } = useBadgeDefinitions()
  const { data: userBadges = [], refetch: refetchUserBadges } = useUserBadges(user?.id)
  const { data: badgeProgress = [] } = useBadgeProgress(user?.id)
  const { data: gamification } = useUserGamification(user?.id)

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetchUserBadges()
    setRefreshing(false)
  }, [refetchUserBadges])

  // Organize badges by category
  const badgesByCategory = getBadgesByCategory(badges)

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
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-gray-900">뱃지</Text>
          <Text className="text-sm text-gray-500 mt-1">
            다양한 도전을 완료하고 뱃지를 수집하세요
          </Text>
        </View>

        {/* Summary Card */}
        <View className="mx-4 mb-4 bg-gradient-to-r from-primary to-purple-500 rounded-2xl p-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white/80 text-sm">수집한 뱃지</Text>
              <Text className="text-white text-3xl font-bold">
                {unlockedCount}
                <Text className="text-lg font-normal text-white/70">/{totalBadges}</Text>
              </Text>
            </View>
            <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center">
              <Text className="text-white text-2xl font-bold">{unlockedPercentage}%</Text>
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
          className="px-4 mb-4"
        >
          <View className="flex-row gap-2">
            <Pressable
              className={`px-4 py-2 rounded-full ${
                !selectedCategory ? 'bg-primary' : 'bg-white'
              }`}
              onPress={() => setSelectedCategory(null)}
            >
              <Text
                className={`text-sm font-medium ${
                  !selectedCategory ? 'text-white' : 'text-gray-700'
                }`}
              >
                전체
              </Text>
            </Pressable>
            {Object.values(BADGE_CATEGORIES).map(cat => (
              <Pressable
                key={cat.id}
                className={`px-4 py-2 rounded-full ${
                  selectedCategory === cat.id ? 'bg-primary' : 'bg-white'
                }`}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text
                  className={`text-sm font-medium ${
                    selectedCategory === cat.id ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {cat.icon} {cat.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Badge Grid by Category */}
        {Object.entries(filteredCategories).map(([categoryId, categoryBadges]) => {
          const category = BADGE_CATEGORIES[categoryId as keyof typeof BADGE_CATEGORIES]
          if (!categoryBadges.length) return null

          return (
            <View key={categoryId} className="mb-6">
              <View className="flex-row items-center px-4 mb-3">
                <Text className="text-lg">{category.icon}</Text>
                <Text className="text-lg font-semibold text-gray-900 ml-2">
                  {category.name}
                </Text>
                <Text className="text-sm text-gray-400 ml-2">
                  {categoryBadges.filter(b => isBadgeUnlocked(b.id, userBadges)).length}/
                  {categoryBadges.length}
                </Text>
              </View>

              <View className="flex-row flex-wrap gap-2 px-4">
                {categoryBadges.map(badge => (
                  <BadgeCard
                    key={badge.id}
                    badge={badge}
                    isUnlocked={isBadgeUnlocked(badge.id, userBadges)}
                    unlockDate={getBadgeUnlockDate(badge.id, userBadges)}
                    progress={getProgress(badge.id)}
                    onPress={() => setSelectedBadge(badge)}
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
      />
    </SafeAreaView>
  )
}
