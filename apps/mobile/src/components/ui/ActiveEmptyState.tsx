import React from 'react'
import { View, Text, Pressable } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { LucideIcon } from 'lucide-react-native'

interface BenefitProps {
    text: string
}

const BenefitItem = ({ text }: BenefitProps) => (
    <View className="flex-row items-center mb-2">
        <View className="w-1.5 h-1.5 rounded-full bg-primary/60 mr-2.5" />
        <Text className="text-sm text-gray-600 flex-1 leading-5" style={{ fontFamily: 'Pretendard-Regular' }}>
            {text}
        </Text>
    </View>
)

interface ActiveEmptyStateProps {
    title: string
    description: string
    icon: LucideIcon
    iconColor?: string
    iconBgColor?: string
    benefits?: string[]
    primaryActionLabel?: string
    secondaryActionLabel?: string
    onPrimaryAction?: () => void
    onSecondaryAction?: () => void
    isGenerating?: boolean
}

export function ActiveEmptyState({
    title,
    description,
    icon: Icon,
    iconColor = '#4f46e5', // indigo-600
    iconBgColor = '#eef2ff', // indigo-50
    benefits = [],
    primaryActionLabel,
    secondaryActionLabel,
    onPrimaryAction,
    onSecondaryAction,
    isGenerating = false,
}: ActiveEmptyStateProps) {
    return (
        <Animated.View
            entering={FadeInUp.delay(200).duration(500)}
            className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 min-h-[460px] justify-between"
        >
            <View>
                {/* Icon Spot Illustration */}
                <View className="items-center mb-5">
                    <View
                        className="w-20 h-20 rounded-full items-center justify-center mb-2"
                        style={{ backgroundColor: iconBgColor }}
                    >
                        <Icon size={36} color={iconColor} strokeWidth={1.5} />
                    </View>
                </View>

                {/* Copy */}
                <Text
                    className="text-xl text-gray-900 text-center mb-3"
                    style={{ fontFamily: 'Pretendard-Bold' }}
                >
                    {title}
                </Text>
                <Text
                    className="text-base text-gray-500 text-center mb-6 leading-relaxed px-2"
                    numberOfLines={2}
                    style={{ fontFamily: 'Pretendard-Regular' }}
                >
                    {description}
                </Text>

                {/* Benefits List (Optional) */}
                {benefits.length > 0 && (
                    <View className="bg-gray-50 rounded-2xl p-5 mb-6 h-[120px] justify-center">
                        {benefits.slice(0, 3).map((benefit, index) => (
                            <BenefitItem key={index} text={benefit} />
                        ))}
                    </View>
                )}
            </View>

            {/* Actions */}
            <View className="gap-3 mt-auto">
                {onPrimaryAction && primaryActionLabel && (
                    <Pressable
                        onPress={onPrimaryAction}
                        disabled={isGenerating}
                        className="rounded-xl overflow-hidden shadow-sm"
                    >
                        <LinearGradient
                            colors={['#2563eb', '#9333ea', '#db2777']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ padding: 1.5 }}
                        >
                            <View className="bg-white rounded-[10px] py-3.5 items-center justify-center">
                                <MaskedView
                                    maskElement={
                                        <Text
                                            className="text-base font-semibold text-center"
                                            style={{ fontFamily: 'Pretendard-SemiBold' }}
                                        >
                                            {isGenerating ? 'Generating...' : primaryActionLabel}
                                        </Text>
                                    }
                                >
                                    <LinearGradient
                                        colors={['#2563eb', '#9333ea', '#db2777']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        {/* The text here must be opaque for the mask to work, but the gradient is applied via the parent LinearGradient? 
                       Wait, MaskedView works by masking the CHILD (Gradient) with the maskElement (Text).
                       The Text inside maskElement defines the shape. The Child defines the color.
                   */}
                                        <Text
                                            className="text-base font-semibold text-center opacity-0"
                                            style={{ fontFamily: 'Pretendard-SemiBold' }}
                                        >
                                            {isGenerating ? 'Generating...' : primaryActionLabel}
                                        </Text>
                                    </LinearGradient>
                                </MaskedView>
                            </View>
                        </LinearGradient>
                    </Pressable>
                )}

                {onSecondaryAction && secondaryActionLabel && (
                    <Pressable
                        onPress={onSecondaryAction}
                        className="py-3.5 items-center justify-center rounded-xl bg-white border border-gray-200"
                    >
                        <Text
                            className="text-gray-600 text-sm"
                            style={{ fontFamily: 'Pretendard-Medium' }}
                        >
                            {secondaryActionLabel}
                        </Text>
                    </Pressable>
                )}
            </View>
        </Animated.View>
    )
}
