/**
 * MandalartCard Component
 * 
 * Individual mandalart card with toggle switch
 */

import React from 'react'
import { View, Text, Pressable, ActivityIndicator, Switch } from 'react-native'
import { useTranslation } from 'react-i18next'
import Animated, { FadeInUp } from 'react-native-reanimated'
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
                className={`bg-white rounded-3xl p-5 border border-gray-100 ${!mandalart.is_active ? 'opacity-60' : ''
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
                        <Text
                            className="text-lg text-gray-900"
                            style={{ fontFamily: 'Pretendard-SemiBold' }}
                            numberOfLines={1}
                        >
                            {mandalart.title}
                        </Text>
                        <Text
                            className="text-base text-gray-500 mt-1"
                            style={{ fontFamily: 'Pretendard-Regular' }}
                            numberOfLines={2}
                        >
                            {t('mandalart.list.coreGoal')}: {mandalart.center_goal}
                        </Text>
                    </View>

                    {/* Toggle Switch with Status Label */}
                    <View className="items-center pt-0.5">
                        {isToggling ? (
                            <ActivityIndicator size="small" color="#374151" />
                        ) : (
                            <>
                                <Switch
                                    value={mandalart.is_active}
                                    onValueChange={() => onToggleActive(mandalart)}
                                    trackColor={{ false: '#d1d5db', true: '#2563eb' }}
                                    thumbColor="white"
                                />
                                <Text
                                    className={`text-xs mt-1 ${mandalart.is_active ? 'text-indigo-500' : 'text-gray-400'
                                        }`}
                                    style={{ fontFamily: 'Pretendard-Medium' }}
                                >
                                    {mandalart.is_active ? t('mandalart.list.active') : t('mandalart.list.inactive')}
                                </Text>
                            </>
                        )}
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    )
})

MandalartCard.displayName = 'MandalartCard'
