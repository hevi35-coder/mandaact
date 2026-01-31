import React from 'react'
import { View, Text } from 'react-native'
import { Sparkles, Check } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

interface MandalartUsageGuideProps {
    style?: any
}

export function MandalartUsageGuide({ style }: MandalartUsageGuideProps) {
    const { t } = useTranslation()

    return (
        <View
            className="bg-white rounded-2xl p-6 border border-gray-100"
            style={[
                {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    elevation: 3,
                },
                style
            ]}
        >
            <View className="flex-row items-center mb-4">
                <Sparkles size={20} color="#3b82f6" />
                <Text
                    className="text-base text-gray-900 ml-2"
                    style={{ fontFamily: 'Pretendard-SemiBold' }}
                >
                    {t('mandalart.create.manualInput.subGoalGuideTitle', '나만의 속도로 시작하세요')}
                </Text>
            </View>

            {(t('mandalart.create.manualInput.subGoalGuideItems', { returnObjects: true }) as string[] || []).map((item: string, index: number, arr: string[]) => (
                <View key={index} className={`flex-row items-start ${index === arr.length - 1 ? '' : 'mb-2.5'}`}>
                    <Check size={16} color="#3b82f6" style={{ marginTop: 2 }} />
                    <Text
                        className="text-base text-gray-600 ml-2 flex-1"
                        style={{ fontFamily: 'Pretendard-Regular' }}
                    >
                        {item}
                    </Text>
                </View>
            ))}
        </View>
    )
}
