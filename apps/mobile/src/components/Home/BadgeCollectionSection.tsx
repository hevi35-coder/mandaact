/**
 * BadgeCollectionSection Component
 * 
 * Collapsible section showing badge collection
 */

import React, { useState } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Target, ChevronUp, ChevronDown, Info } from 'lucide-react-native'
import { categorizeBadges, isBadgeUnlocked } from '@mandaact/shared'
import { BadgeMiniCard } from './BadgeMiniCard'
import type { BadgeCollectionSectionProps } from './types'

export function BadgeCollectionSection({
    badges,
    userBadges,
    isLoading,
    translateBadge,
    onBadgePress,
}: BadgeCollectionSectionProps) {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)

    const unlockedBadgeIds = new Set(userBadges.map(ub => ub.achievement_id))
    const unlockedCount = unlockedBadgeIds.size
    const totalBadges = badges.length
    const categorizedBadges = categorizeBadges(badges)

    return (
        <View className="p-3 bg-primary/5 rounded-xl border border-primary/10">
            <Pressable
                onPress={() => setIsOpen(!isOpen)}
                className="flex-row items-center justify-between"
            >
                <View className="flex-row items-center">
                    <Target size={14} color="#0a0a0a" />
                    <Text className="text-xs font-semibold text-gray-900 ml-1">
                        {t('home.badges.title')}
                    </Text>
                </View>
                <View className="flex-row items-center">
                    <Text className="text-[10px] text-gray-400 mr-2">
                        {unlockedCount}/{totalBadges}
                    </Text>
                    {isOpen ? (
                        <ChevronUp size={14} color="#2563eb" />
                    ) : (
                        <ChevronDown size={14} color="#2563eb" />
                    )}
                </View>
            </Pressable>

            {isOpen && (
                <View className="mt-3">
                    {isLoading ? (
                        <View className="py-4 items-center">
                            <ActivityIndicator size="small" color="#2563eb" />
                            <Text className="text-xs text-gray-400 mt-2">{t('home.badges.loading')}</Text>
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
                                                {t(`badges.categories.${category.key}`, { defaultValue: category.title })}
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
                                                        onPress={onBadgePress}
                                                        translateBadge={translateBadge}
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
                                        {t('home.badges.fairPolicy.title')}
                                    </Text>
                                </View>
                                <Text className="text-xs text-gray-500 mb-1">
                                    • {t('home.badges.fairPolicy.minActions')}
                                </Text>
                                <Text className="text-xs text-gray-500 mb-1">
                                    • {t('home.badges.fairPolicy.normalPattern')}
                                </Text>
                                <Text className="text-xs text-gray-500">
                                    • {t('home.badges.fairPolicy.noEmpty')}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            )}
        </View>
    )
}
