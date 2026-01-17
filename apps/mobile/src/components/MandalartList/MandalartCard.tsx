/**
 * MandalartCard Component
 * 
 * Individual mandalart card with toggle switch
 */

import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { Toggle } from '../ui/Toggle'
import type { MandalartCardProps } from './types'

export const MandalartCard = React.memo(({
    mandalart,
    isToggling,
    onPress,
    onToggleActive,
}: MandalartCardProps) => {
    const { t } = useTranslation()

    return (
        <Animated.View
            entering={FadeInUp.duration(400)}
            className="mb-4"
        >
            <Pressable
                onPress={() => onPress(mandalart)}
                className={`bg-white rounded-2xl p-5 border border-gray-100 ${!mandalart.is_active ? 'opacity-60' : ''
                    }`}
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    elevation: 3,
                }}
            >
                {/* Header Row - 웹과 동일: 타이틀 + 토글 */}
                <View className="flex-row items-start justify-between gap-4">
                    <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                            <Text
                                className="text-lg text-gray-900 flex-shrink"
                                style={{ fontFamily: 'Pretendard-SemiBold' }}
                                numberOfLines={1}
                            >
                                {mandalart.title}
                            </Text>
                            {/* v18.1: Draft badge */}
                            {mandalart.status === 'draft' && (
                                <View className="bg-amber-100 px-2 py-0.5 rounded-md">
                                    <Text
                                        className="text-amber-700 text-xs"
                                        style={{ fontFamily: 'Pretendard-Medium' }}
                                    >
                                        {t('mandalart.draft', '초안')}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text
                            className="text-base text-gray-500 mt-1"
                            style={{ fontFamily: 'Pretendard-Regular' }}
                            numberOfLines={2}
                        >
                            {t('mandalart.list.coreGoal')}: {mandalart.center_goal}
                        </Text>
                    </View>

                    {/* Toggle Switch with Status Label */}
                    <View className="items-center pt-1">
                        <Toggle
                            value={mandalart.is_active}
                            onValueChange={() => onToggleActive(mandalart)}
                            loading={isToggling}
                            size="sm"
                        />
                        <Text
                            className={`text-xs mt-1.5 ${mandalart.is_active ? 'text-gray-700' : 'text-gray-400'}`}
                            style={{ fontFamily: 'Pretendard-Medium' }}
                        >
                            {mandalart.is_active ? t('mandalart.list.active') : t('mandalart.list.inactive')}
                        </Text>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    )
})

MandalartCard.displayName = 'MandalartCard'
