import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { X, Lock, Award, Sparkles } from 'lucide-react-native'
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
  type BadgeDefinition,
} from '../hooks/useBadges'
import { useUserGamification } from '../hooks/useStats'

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
      className={`w-[30%] items-center p-3 rounded-2xl ${
        isUnlocked ? 'bg-white' : 'bg-gray-100'
      }`}
      onPress={onPress}
    >
      <View
        className={`w-14 h-14 rounded-full items-center justify-center mb-2 ${
          isUnlocked ? 'bg-amber-50' : 'bg-gray-200'
        }`}
      >
        {isUnlocked ? (
          <Text className="text-2xl">{badge.icon}</Text>
        ) : (
          <Lock size={24} color="#9ca3af" />
        )}
      </View>
      <Text
        className={`text-xs font-medium text-center ${
          isUnlocked ? 'text-gray-900' : 'text-gray-400'
        }`}
        numberOfLines={1}
      >
        {badge.name}
      </Text>
      {!isUnlocked && progress && (
        <View className="w-full mt-2">
          <View className="h-1 bg-gray-300 rounded-full overflow-hidden">
            <View
              className="h-full bg-primary rounded-full"
              style={{ width: `${progress.percentage}%` }}
            />
          </View>
          <Text className="text-[10px] text-gray-400 text-center mt-1">
            {progress.current}/{progress.target}
          </Text>
        </View>
      )}
      {isUnlocked && badge.repeatable && (
        <View className="mt-1 px-2 py-0.5 bg-amber-100 rounded-full">
          <Text className="text-[10px] text-amber-700">반복</Text>
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
  visible,
  onClose,
}: {
  badge: BadgeDefinition | null
  isUnlocked: boolean
  unlockDate: string | null
  progress?: { current: number; target: number; percentage: number }
  visible: boolean
  onClose: () => void
}) {
  if (!badge) return null

  const category = BADGE_CATEGORIES[badge.category]

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
            <View className="p-6 items-center">
              {/* Badge Icon */}
              <View
                className={`w-24 h-24 rounded-full items-center justify-center mb-4 ${
                  isUnlocked ? 'bg-amber-50' : 'bg-gray-100'
                }`}
              >
                {isUnlocked ? (
                  <Text className="text-5xl">{badge.icon}</Text>
                ) : (
                  <Lock size={40} color="#9ca3af" />
                )}
              </View>

              {/* Badge Name */}
              <Text className="text-xl font-bold text-gray-900 mb-1">{badge.name}</Text>

              {/* Category */}
              <View
                className="px-3 py-1 rounded-full mb-4"
                style={{ backgroundColor: category.color + '20' }}
              >
                <Text style={{ color: category.color }} className="text-sm font-medium">
                  {category.icon} {category.name}
                </Text>
              </View>

              {/* Description */}
              <Text className="text-base text-gray-600 text-center mb-4">
                {badge.description}
              </Text>

              {/* XP Reward */}
              <View className="flex-row items-center bg-primary/10 px-4 py-2 rounded-full mb-4">
                <Sparkles size={16} color="#667eea" />
                <Text className="text-primary font-semibold ml-2">
                  +{badge.xp_reward} XP
                </Text>
              </View>

              {/* Status */}
              {isUnlocked ? (
                <View className="bg-green-50 px-4 py-3 rounded-xl w-full">
                  <View className="flex-row items-center justify-center">
                    <Award size={18} color="#22c55e" />
                    <Text className="text-green-700 font-medium ml-2">획득 완료!</Text>
                  </View>
                  {unlockDate && (
                    <Text className="text-green-600 text-sm text-center mt-1">
                      {format(new Date(unlockDate), 'yyyy년 M월 d일', { locale: ko })} 획득
                    </Text>
                  )}
                </View>
              ) : (
                <View className="bg-gray-100 px-4 py-3 rounded-xl w-full">
                  <Text className="text-gray-600 text-center mb-2">진행 상황</Text>
                  <View className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <View
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${progress?.percentage || 0}%` }}
                    />
                  </View>
                  <Text className="text-gray-500 text-center">
                    {progress?.current || 0} / {badge.target}
                  </Text>
                </View>
              )}

              {/* Repeatable note */}
              {badge.repeatable && (
                <Text className="text-xs text-gray-400 text-center mt-4">
                  * 이 뱃지는 매월 초기화되어 반복 획득이 가능합니다
                </Text>
              )}
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
        visible={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
      />
    </SafeAreaView>
  )
}
