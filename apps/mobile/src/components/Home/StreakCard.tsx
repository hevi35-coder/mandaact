/**
 * StreakCard Component
 *
 * Card showing streak stats and 4-week heatmap
 */

import React from 'react'
import { View, Text } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useTranslation } from 'react-i18next'
import { Flame, Trophy } from 'lucide-react-native'
import { formatNumericDate, formatTime } from '../../lib'
import { useAuthStore } from '../../store/authStore'
import { useUserProfile } from '../../hooks/useUserProfile'
import { FourWeekHeatmap } from './FourWeekHeatmap'
import type { StreakCardProps } from './types'

export function StreakCard({
    currentStreak,
    longestStreak,
    lastCheckDate,
    longestStreakDate,
    isNewRecord,
    fourWeekData,
    fourWeekLoading,
}: StreakCardProps) {
    const { t, i18n } = useTranslation()
    const { user } = useAuthStore()
    const { timezone } = useUserProfile(user?.id)

    // SCREENSHOT MODE OVERRIDE
    const { IS_SCREENSHOT_MODE } = require('../../lib/config')
    const displayFourWeekData = IS_SCREENSHOT_MODE
        ? Array.from({ length: 28 }, (_, i) => ({
            date: new Date(Date.now() - (27 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            count: i % 7 === 0 ? 0 : 1 // Mostly active for visual impact
        }))
        : fourWeekData

    return (
        <Animated.View
            entering={FadeInUp.delay(200).duration(400)}
            className="bg-white rounded-2xl p-6 mb-5 border border-gray-100"
            style={{
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
                <Text className="text-lg font-bold text-orange-500">{t('home.streak.title')}</Text>
            </View>
            <Text className="text-sm text-gray-500 mb-4">{t('home.streak.subtitle')}</Text>

            {/* Current Streak & Longest Streak - Side by Side */}
            <View className="flex-row gap-3 mb-4">
                {/* Current Streak */}
                <View className="flex-1 p-4 rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 items-center">
                    <Text className="text-xs text-orange-400 mb-1" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                        {t('home.streak.current')}
                    </Text>
                    <Flame size={32} color="#f97316" />
                    <View className="flex-row items-baseline my-1">
                        <Text className="text-4xl text-orange-500" style={{ fontFamily: 'Pretendard-Bold' }}>
                            {currentStreak}
                        </Text>
                        <Text className="text-sm text-orange-500 ml-1" style={{ fontFamily: 'Pretendard-Medium' }}>
                            {t('home.streak.consecutive')}
                        </Text>
                    </View>
                    {currentStreak > 0 && lastCheckDate && (() => {
                        const dateObj = lastCheckDate instanceof Date
                            ? lastCheckDate
                            : new Date(lastCheckDate)
                        const dateStr = formatNumericDate(dateObj, { language: i18n.language, timeZone: timezone })
                        const timeStr = formatTime(dateObj, { language: i18n.language, timeZone: timezone })
                        return (
                            <View className="mt-2 items-center">
                                <Text className="text-xs text-gray-400" style={{ fontFamily: 'Pretendard-Regular' }}>{dateStr}</Text>
                                <Text className="text-xs text-gray-400" style={{ fontFamily: 'Pretendard-Regular' }}>{timeStr}</Text>
                            </View>
                        )
                    })()}
                </View>

                {/* Longest Streak */}
                <View className="flex-1 p-4 rounded-xl border border-gray-200 bg-gray-50 items-center relative">
                    {isNewRecord && (
                        <View className="absolute -top-2 -right-2 px-2 py-1 bg-yellow-100 rounded-full border border-yellow-300">
                            <Text className="text-xs text-yellow-700" style={{ fontFamily: 'Pretendard-Bold' }}>{t('home.streak.newRecord')}</Text>
                        </View>
                    )}
                    <Text className="text-xs text-gray-400 mb-1" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                        {t('home.streak.record')}
                    </Text>
                    <Trophy size={32} color="#eab308" />
                    <View className="flex-row items-baseline my-1">
                        <Text className="text-4xl text-gray-900" style={{ fontFamily: 'Pretendard-Bold' }}>
                            {longestStreak}
                        </Text>
                        <Text className="text-sm text-gray-500 ml-1" style={{ fontFamily: 'Pretendard-Medium' }}>
                            {t('home.streak.consecutive')}
                        </Text>
                    </View>
                    {longestStreak > 0 && longestStreakDate && (() => {
                        const dateObj = longestStreakDate instanceof Date
                            ? longestStreakDate
                            : new Date(longestStreakDate)
                        const dateStr = formatNumericDate(dateObj, { language: i18n.language, timeZone: timezone })
                        const timeStr = formatTime(dateObj, { language: i18n.language, timeZone: timezone })
                        return (
                            <View className="mt-2 items-center">
                                <Text className="text-xs text-gray-400" style={{ fontFamily: 'Pretendard-Regular' }}>{dateStr}</Text>
                                <Text className="text-xs text-gray-400" style={{ fontFamily: 'Pretendard-Regular' }}>{timeStr}</Text>
                            </View>
                        )
                    })()}
                </View>
            </View>

            {/* 4-Week Heatmap */}
            <FourWeekHeatmap fourWeekData={displayFourWeekData} isLoading={IS_SCREENSHOT_MODE ? false : fourWeekLoading} />

            {/* Motivational Message */}
            {currentStreak === 0 ? (
                <View className="mt-4">
                    <Text
                        className="text-sm text-gray-400 text-center"
                        style={{ fontFamily: 'Pretendard-Medium' }}
                    >
                        {t('home.streak.startNew')} 🌱
                    </Text>
                </View>
            ) : currentStreak >= 7 ? (
                <View className="mt-4">
                    <Text
                        className="text-sm text-orange-500 text-center"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                        {t('home.streak.amazing')} 🎉
                    </Text>
                </View>
            ) : (
                <View className="mt-4">
                    <Text
                        className="text-sm text-gray-400 text-center"
                        style={{ fontFamily: 'Pretendard-Medium' }}
                    >
                        {t('home.streak.keepGoing', { days: 7 - currentStreak })} 💪
                    </Text>
                </View>
            )}
        </Animated.View>
    )
}
