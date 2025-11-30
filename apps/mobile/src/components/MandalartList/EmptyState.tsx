/**
 * EmptyState Component
 * 
 * Shows when user has no mandalarts yet
 */

import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Grid3X3 } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import Animated, { FadeInUp } from 'react-native-reanimated'
import type { EmptyStateProps } from './types'

export function EmptyState({ onCreateNew, onShowTutorial }: EmptyStateProps) {
    const { t } = useTranslation()

    return (
        <Animated.View
            entering={FadeInUp.delay(100).duration(400)}
            className="bg-white rounded-2xl p-6"
        >
            {/* Icon */}
            <View className="items-center mb-4">
                <View className="w-14 h-14 bg-gray-100 rounded-full items-center justify-center">
                    <Grid3X3 size={28} color="#9ca3af" />
                </View>
            </View>

            {/* Title & Description */}
            <Text
                className="text-lg text-gray-900 text-center mb-2"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
            >
                {t('mandalart.list.empty.title')}
            </Text>
            <Text
                className="text-sm text-gray-500 text-center mb-5"
                style={{ fontFamily: 'Pretendard-Regular' }}
            >
                {t('mandalart.list.empty.description')}
            </Text>

            {/* Guide Box */}
            <View className="bg-gray-50 rounded-xl p-4 mb-5">
                <Text
                    className="text-sm text-gray-700 mb-3"
                    style={{ fontFamily: 'Pretendard-SemiBold' }}
                >
                    {t('mandalart.list.empty.howTo')}
                </Text>
                <View className="flex-row items-center mb-2">
                    <View className="w-1 h-1 rounded-full bg-gray-400 mr-2" />
                    <Text className="text-sm text-gray-600" style={{ fontFamily: 'Pretendard-Regular' }}>
                        {t('mandalart.list.empty.methodImage')}
                    </Text>
                </View>
                <View className="flex-row items-center mb-2">
                    <View className="w-1 h-1 rounded-full bg-gray-400 mr-2" />
                    <Text className="text-sm text-gray-600" style={{ fontFamily: 'Pretendard-Regular' }}>
                        {t('mandalart.list.empty.methodText')}
                    </Text>
                </View>
                <View className="flex-row items-center">
                    <View className="w-1 h-1 rounded-full bg-gray-400 mr-2" />
                    <Text className="text-sm text-gray-600" style={{ fontFamily: 'Pretendard-Regular' }}>
                        {t('mandalart.list.empty.methodManual')}
                    </Text>
                </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
                <Pressable
                    className="flex-1 py-3 rounded-xl border border-gray-200 bg-white"
                    onPress={onShowTutorial}
                >
                    <Text
                        className="text-sm text-gray-700 text-center"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                        {t('mandalart.list.empty.guide')}
                    </Text>
                </Pressable>
                <Pressable
                    className="flex-1 rounded-xl overflow-hidden"
                    onPress={onCreateNew}
                >
                    <LinearGradient
                        colors={['#2563eb', '#9333ea', '#db2777']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ padding: 1, borderRadius: 12 }}
                    >
                        <View className="bg-white rounded-xl py-3 items-center justify-center">
                            <MaskedView
                                maskElement={
                                    <Text
                                        className="text-sm text-center"
                                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                                    >
                                        {t('mandalart.list.create')}
                                    </Text>
                                }
                            >
                                <LinearGradient
                                    colors={['#2563eb', '#9333ea', '#db2777']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Text
                                        className="text-sm opacity-0"
                                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                                    >
                                        {t('mandalart.list.create')}
                                    </Text>
                                </LinearGradient>
                            </MaskedView>
                        </View>
                    </LinearGradient>
                </Pressable>
            </View>
        </Animated.View>
    )
}
