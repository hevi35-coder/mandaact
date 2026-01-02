import React, { useCallback } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Sparkles, ArrowRight } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCoachingStore } from '../../store/coachingStore'
import type { RootStackParamList } from '../../navigation/RootNavigator'
import Animated, { FadeInDown } from 'react-native-reanimated'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export function CoachingBanner() {
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationProp>()
    const { sessionId, status, summary, resumeSession } = useCoachingStore()

    const hasActiveSession = Boolean(sessionId && status && status !== 'completed')

    const handlePress = useCallback(() => {
        if (hasActiveSession) {
            if (status === 'paused') {
                resumeSession()
            }
            navigation.navigate('ConversationalCoaching')
        } else {
            navigation.navigate('CoachingGate')
        }
    }, [hasActiveSession, status, resumeSession, navigation])

    const title = hasActiveSession
        ? t('home.coachingBanner.resumeTitle')
        : t('home.coachingBanner.startTitle')

    const body = (hasActiveSession && summary?.shortSummary)
        ? summary.shortSummary
        : t('home.coachingBanner.startBody')

    const cta = hasActiveSession
        ? t('home.coachingBanner.resumeCta')
        : t('home.coachingBanner.startCta')

    return (
        <Animated.View
            entering={FadeInDown.duration(600).delay(200)}
            className="mb-6"
        >
            <Pressable
                onPress={handlePress}
                className="bg-white rounded-3xl border border-primary/10 overflow-hidden"
                style={{
                    shadowColor: '#6366f1',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.08,
                    shadowRadius: 16,
                    elevation: 4,
                }}
            >
                <View className="p-5 flex-row items-center">
                    {/* Icon Section */}
                    <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center mr-4">
                        <Sparkles size={24} color="#6366f1" />
                    </View>

                    {/* Text Section */}
                    <View className="flex-1 mr-2">
                        <View className="flex-row items-center">
                            <Text
                                className="text-base text-gray-900"
                                style={{ fontFamily: 'Pretendard-Bold' }}
                            >
                                {title}
                            </Text>
                            {!hasActiveSession && (
                                <View className="ml-2 px-1.5 py-0.5 bg-primary rounded-md">
                                    <Text className="text-[10px] text-white" style={{ fontFamily: 'Pretendard-Bold' }}>
                                        NEW
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text
                            className="text-sm text-gray-500 mt-1"
                            style={{ fontFamily: 'Pretendard-Regular' }}
                            numberOfLines={2}
                        >
                            {body}
                        </Text>
                    </View>

                    {/* CTA Arrow */}
                    <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center">
                        <ArrowRight size={20} color="#6366f1" />
                    </View>
                </View>

                {/* Bottom CTA Bar (Only for Start state or if desired for premium feel) */}
                {!hasActiveSession && (
                    <View className="bg-primary/5 py-2.5 px-5 flex-row items-center justify-center border-t border-primary/5">
                        <Text className="text-primary text-xs" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                            {cta}
                        </Text>
                    </View>
                )}
            </Pressable>
        </Animated.View>
    )
}
