/**
 * XPInfoSection Component
 * 
 * Collapsible section showing XP earning methods and active multipliers
 */

import React, { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Zap, ChevronUp, ChevronDown, Sparkles, Info } from 'lucide-react-native'
import type { XPInfoSectionProps } from './types'

export function XPInfoSection({ activeMultipliers }: XPInfoSectionProps) {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)

    return (
        <View className="p-3 bg-primary/5 rounded-xl border border-primary/10 mb-3">
            <Pressable
                onPress={() => setIsOpen(!isOpen)}
                className="flex-row items-center justify-between"
            >
                <View className="flex-row items-center">
                    <Zap size={14} color="#0a0a0a" />
                    <Text className="text-xs font-semibold text-gray-900 ml-1">
                        {t('home.xpMethods.title')}
                    </Text>
                </View>
                {isOpen ? (
                    <ChevronUp size={14} color="#2563eb" />
                ) : (
                    <ChevronDown size={14} color="#2563eb" />
                )}
            </Pressable>

            {isOpen && (
                <View className="mt-3 space-y-3">
                    {/* Basic XP Rules */}
                    <View>
                        <Text className="text-xs text-gray-500 mb-1">
                            • {t('home.xpMethods.checkOnce')}: <Text className="font-semibold text-gray-900">+10 XP</Text>
                        </Text>
                        <Text className="text-xs text-gray-500 mb-1">
                            • {t('home.xpMethods.streakBonus')}: <Text className="font-semibold text-gray-900">+5 XP</Text>
                        </Text>
                        <Text className="text-xs text-gray-500 mb-1">
                            • {t('home.xpMethods.perfectDay')}: <Text className="font-semibold text-gray-900">+50 XP</Text>
                        </Text>
                        <Text className="text-xs text-gray-500 mb-1">
                            • {t('home.xpMethods.perfectWeek')}: <Text className="font-semibold text-gray-900">+200 XP</Text>
                        </Text>
                        <Text className="text-xs text-gray-500">
                            • {t('home.xpMethods.badge')}: {t('home.xpMethods.badgeVaries')}
                        </Text>
                    </View>

                    {/* XP Multiplier Bonus */}
                    <View className="pt-3 border-t border-primary/10">
                        <View className="flex-row items-center mb-2">
                            <Sparkles size={12} color="#0a0a0a" />
                            <Text className="text-xs font-semibold text-gray-900 ml-1">
                                {t('home.xpMultiplier.title')}
                            </Text>
                        </View>
                        <Text className="text-xs text-gray-500 mb-1">
                            • {t('home.xpMultiplier.weekend')}: <Text className="font-semibold text-blue-500">1.5x</Text>
                        </Text>
                        <Text className="text-xs text-gray-500 mb-1">
                            • {t('home.xpMultiplier.comeback')}: <Text className="font-semibold text-green-500">1.5x</Text>{' '}
                            <Text className="text-[10px]">{t('home.xpMultiplier.for3Days')}</Text>
                        </Text>
                        <Text className="text-xs text-gray-500 mb-1">
                            • {t('home.xpMultiplier.levelMilestone')}: <Text className="font-semibold text-yellow-500">2x</Text>{' '}
                            <Text className="text-[10px]">{t('home.xpMultiplier.for7Days')}</Text>
                        </Text>
                        <Text className="text-xs text-gray-500 mb-1">
                            • {t('home.xpMultiplier.perfectWeek')}: <Text className="font-semibold text-purple-500">2x</Text>{' '}
                            <Text className="text-[10px]">{t('home.xpMultiplier.for7Days')}</Text>
                        </Text>
                        <Text className="text-xs text-gray-500 mb-1">
                            • {t('home.xpMultiplier.stackNote')}
                        </Text>
                        <Text className="text-xs text-gray-400 ml-3">
                            {t('home.xpMultiplier.stackExample')}
                        </Text>
                    </View>

                    {/* Active Multipliers */}
                    {activeMultipliers.length > 0 && (
                        <View className="pt-3 border-t border-primary/10">
                            <View className="flex-row items-center mb-2">
                                <Sparkles size={12} color="#0a0a0a" />
                                <Text className="text-xs font-semibold text-gray-900 ml-1">
                                    {t('home.xpMultiplier.activeMultipliers')}
                                </Text>
                            </View>
                            <View className="space-y-1">
                                {activeMultipliers.map((multiplier, index) => {
                                    const colorClass = multiplier.type === 'weekend'
                                        ? 'text-blue-500'
                                        : multiplier.type === 'comeback'
                                            ? 'text-green-500'
                                            : multiplier.type === 'level_milestone'
                                                ? 'text-yellow-500'
                                                : 'text-purple-500'
                                    const translatedName = t(`home.xpMultiplier.names.${multiplier.type}`, { defaultValue: multiplier.name })
                                    return (
                                        <View
                                            key={index}
                                            className="flex-row items-center justify-between p-1.5 bg-gray-50 rounded"
                                        >
                                            <Text className="text-xs text-gray-500">{translatedName}</Text>
                                            <Text className={`text-xs font-bold ${colorClass}`}>
                                                ×{multiplier.multiplier}
                                            </Text>
                                        </View>
                                    )
                                })}
                            </View>
                        </View>
                    )}

                    {/* Fair XP Policy */}
                    <View className="pt-3 border-t border-primary/10">
                        <View className="flex-row items-center mb-2">
                            <Info size={12} color="#0a0a0a" />
                            <Text className="text-xs font-semibold text-gray-900 ml-1">
                                {t('home.fairXP.title')}
                            </Text>
                        </View>
                        <Text className="text-xs text-gray-500 mb-1">
                            • {t('home.fairXP.dailyLimit')}
                        </Text>
                        <Text className="text-xs text-gray-500 mb-1">
                            • {t('home.fairXP.cooldown')}
                        </Text>
                        <Text className="text-xs text-gray-500">
                            • {t('home.fairXP.spamLimit')}
                        </Text>
                    </View>
                </View>
            )}
        </View>
    )
}
