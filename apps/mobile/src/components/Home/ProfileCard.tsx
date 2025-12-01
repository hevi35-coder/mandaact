/**
 * ProfileCard Component
 * 
 * Main profile card showing level, XP, stats, and collapsible sections
 */

import React from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useTranslation } from 'react-i18next'
import { Trophy, Zap, Pencil } from 'lucide-react-native'
import { XPInfoSection } from './XPInfoSection'
import { BadgeCollectionSection } from './BadgeCollectionSection'
import type { ProfileCardProps } from './types'

export function ProfileCard({
    currentLevel,
    nickname,
    totalXP,
    xpProgress,
    xpRequired,
    xpPercentage,
    totalChecks,
    activeDays,
    isLoading,
    onEditNickname,
    // Children props
    activeMultipliers,
    badges,
    userBadges,
    badgesLoading,
    translateBadge,
    onBadgePress,
}: ProfileCardProps) {
    const { t } = useTranslation()

    return (
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
                                    {t('home.level')} {currentLevel}
                                </Text>
                            </View>
                            <View className="flex-row items-center">
                                <Text className="text-base text-gray-500">{nickname}</Text>
                                <Pressable
                                    onPress={onEditNickname}
                                    className="ml-2 p-1 rounded-full active:bg-gray-100"
                                >
                                    <Pencil size={14} color="#9ca3af" />
                                </Pressable>
                            </View>
                        </View>
                        <View className="items-end">
                            <Text className="text-sm text-gray-400">{t('home.totalXP')}</Text>
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
                                    {t('home.toNextLevel', { level: currentLevel + 1 })}
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
                            <Text className="text-xs text-gray-500">{t('home.totalChecks')}</Text>
                        </View>
                        <View className="flex-1 p-3 bg-gray-50 rounded-xl border border-gray-100 items-center">
                            <Text className="text-2xl font-bold text-primary">
                                {activeDays.toLocaleString()}
                            </Text>
                            <Text className="text-xs text-gray-500">{t('home.activeDays')}</Text>
                        </View>
                    </View>

                    {/* XP Info Section */}
                    <XPInfoSection activeMultipliers={activeMultipliers} />

                    {/* Badge Collection Section */}
                    <BadgeCollectionSection
                        badges={badges}
                        userBadges={userBadges}
                        isLoading={badgesLoading}
                        translateBadge={translateBadge}
                        onBadgePress={onBadgePress}
                    />
                </>
            )}
        </Animated.View>
    )
}
