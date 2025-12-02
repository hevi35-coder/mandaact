/**
 * BadgeDetailModal Component
 *
 * Bottom sheet modal showing badge details
 */

import React from 'react'
import { View, Text, Pressable, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { X, Lock, Zap, Trophy, Repeat } from 'lucide-react-native'
import { format } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { getBadgeHint } from '@mandaact/shared'
import type { BadgeDefinition } from '../../hooks/useBadges'

interface UnlockCondition {
  type: string
  days?: number
  count?: number
  threshold?: number
  period?: string
  [key: string]: unknown
}

interface BadgeDetailModalProps {
  badge: BadgeDefinition | null
  isUnlocked: boolean
  unlockDate: string | null
  progress?: { current: number; target: number; percentage: number }
  repeatCount?: number
  visible: boolean
  onClose: () => void
}

function useFormatUnlockCondition() {
  const { t } = useTranslation()

  return (condition: UnlockCondition, hintLevel?: 'full' | 'cryptic' | 'hidden', badgeKey?: string): string => {
    if (hintLevel === 'hidden') {
      return t('badges.unlockConditions.secretBadge')
    }

    if (hintLevel === 'cryptic') {
      return t('badges.unlockConditions.conditionSecret')
    }

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

export function BadgeDetailModal({
  badge,
  isUnlocked,
  unlockDate,
  progress,
  repeatCount = 0,
  visible,
  onClose,
}: BadgeDetailModalProps) {
  const { t, i18n } = useTranslation()
  const formatUnlockCondition = useFormatUnlockCondition()
  const getProgressMessage = useGetProgressMessage()

  const dateLocale = i18n.language === 'ko' ? ko : enUS
  const dateFormatFull = i18n.language === 'ko' ? 'yyyy년 M월 d일' : 'MMMM d, yyyy'
  const timesLabel = i18n.language === 'ko' ? '회' : 'x'

  if (!badge) return null

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
        <View className="bg-white rounded-t-2xl">
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
            <View className="px-6 pb-6 pt-2">
              {/* Badge Icon */}
              <View className="items-center mb-4">
                <Text
                  className={`text-6xl ${isUnlocked ? '' : 'opacity-40'}`}
                  style={{ lineHeight: 80 }}
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

              {/* Unlock Status Box */}
              {isUnlocked ? (
                <View className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-4">
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
                <View className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-4">
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

              {/* XP Reward */}
              <View className="bg-primary/10 border-2 border-primary/20 rounded-xl p-4">
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
