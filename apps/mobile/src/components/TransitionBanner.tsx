/**
 * TransitionBanner Component
 * 
 * Inline banner shown at end of AI message when step transition is ready.
 * User can choose to continue chatting or proceed to next step.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
    SlideInUp,
    FadeInUp,
    FadeInRight,
} from 'react-native-reanimated';
import { Sparkles, ArrowRight, MessageCircle } from 'lucide-react-native';

interface TransitionBannerProps {
    onContinue: () => void;
    onProceed: () => void;
    isLoading?: boolean;
    currentStep?: number;
}

// v18.4: Step label mapping for next step display (with i18n)
// Maps step number to user-friendly label. Step 3-10 = Sub-goal 1-8
const getNextStepLabel = (currentStep: number, isEn: boolean): string => {
    const nextStep = currentStep + 1;

    // Special cases
    if (nextStep === 1) return isEn ? 'Lifestyle Exploration' : '라이프스타일 탐구';
    if (nextStep === 2) return isEn ? 'Core Goal Setting' : '핵심목표 설정';
    if (nextStep >= 3 && nextStep <= 10) {
        const subGoalNum = nextStep - 2; // Step 3 = Sub-goal 1, Step 10 = Sub-goal 8
        return isEn ? `Sub-goal ${subGoalNum} Planning` : `세부목표 ${subGoalNum} 수립`;
    }
    if (nextStep === 11) return isEn ? 'Safety Net & Review' : '비상 대책 수립';
    if (nextStep === 12) return isEn ? 'Final Review' : '최종 점검';
    if (nextStep >= 13) return isEn ? 'Complete' : '완료';

    return isEn ? 'Next Step' : '다음 단계';
};

export const TransitionBanner: React.FC<TransitionBannerProps> = ({
    onContinue,
    onProceed,
    isLoading = false,
    currentStep = 1,
}) => {
    const { t, i18n } = useTranslation();
    const isEn = i18n.language?.startsWith('en');
    const nextStepLabel = getNextStepLabel(currentStep, isEn);
    const headerText = isEn ? `Next : ${nextStepLabel}` : `다음 단계 : ${nextStepLabel}`;

    return (
        <Animated.View
            entering={SlideInUp.springify().damping(15).stiffness(100)}
            className="mt-3 mb-2"
        >
            {/* Banner Container */}
            <View
                className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100"
                style={{
                    backgroundColor: '#f0f4ff',
                    shadowColor: '#6366f1',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 3,
                }}
            >
                {/* Header */}
                <Animated.View
                    entering={FadeInUp.delay(100).duration(400)}
                    className="flex-row items-center mb-3"
                >
                    <View className="bg-indigo-100 p-1.5 rounded-lg mr-2">
                        <Sparkles size={16} color="#6366f1" />
                    </View>
                    <Text
                        className="text-indigo-700 text-sm"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                        {headerText}
                    </Text>
                </Animated.View>

                {/* Buttons */}
                <View className="flex-row gap-3">
                    {/* Continue Button */}
                    <Animated.View
                        entering={FadeInRight.delay(200).duration(400)}
                        className="flex-1"
                    >
                        <Pressable
                            onPress={onContinue}
                            disabled={isLoading}
                            className="flex-row items-center justify-center bg-white py-2.5 px-4 rounded-xl border border-gray-200 active:bg-gray-50"
                            style={{
                                opacity: isLoading ? 0.5 : 1,
                            }}
                        >
                            <MessageCircle size={16} color="#6b7280" />
                            <Text
                                className="text-gray-600 text-sm ml-1.5"
                                style={{ fontFamily: 'Pretendard-Medium' }}
                            >
                                {t('coaching.continueChat', '더 이야기하기')}
                            </Text>
                        </Pressable>
                    </Animated.View>

                    {/* Proceed Button */}
                    <Animated.View
                        entering={FadeInRight.delay(300).duration(400)}
                        className="flex-1"
                    >
                        <Pressable
                            onPress={onProceed}
                            disabled={isLoading}
                            className="flex-row items-center justify-center bg-indigo-500 py-2.5 px-4 rounded-xl active:bg-indigo-600"
                            style={{
                                opacity: isLoading ? 0.5 : 1,
                                shadowColor: '#6366f1',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.3,
                                shadowRadius: 4,
                                elevation: 3,
                            }}
                        >
                            <Text
                                className="text-white text-sm"
                                style={{ fontFamily: 'Pretendard-SemiBold' }}
                            >
                                {t('coaching.proceedNext', '다음으로')}
                            </Text>
                            <ArrowRight size={16} color="white" style={{ marginLeft: 4 }} />
                        </Pressable>
                    </Animated.View>
                </View>
            </View>
        </Animated.View>
    );
};

export default TransitionBanner;
