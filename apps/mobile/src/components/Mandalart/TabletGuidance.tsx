import React from 'react'
import { View, Text } from 'react-native'
import {
    Info,
    Check,
    Lightbulb,
    RotateCw,
    Target,
} from 'lucide-react-native'
import { useTranslation } from 'react-i18next'

interface TabletGuidanceProps {
    width: number
}

export function TabletGuidance({ width }: TabletGuidanceProps) {
    const { t } = useTranslation()

    return (
        <View
            className="flex-row mt-8 gap-4"
            style={{ width }}
        >
            {/* Left: Creation Guide */}
            <View
                className="flex-1 bg-white rounded-2xl p-6 border border-gray-100"
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    elevation: 3,
                }}
            >
                <View className="flex-row items-center mb-4">
                    <Info size={20} color="#3b82f6" />
                    <Text
                        className="text-base text-gray-900 ml-2"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                        {t('mandalart.create.manualInput.guideTitle', '만다라트 작성 안내')}
                    </Text>
                </View>
                {(t('mandalart.create.manualInput.guideItems', { returnObjects: true }) as string[] || []).map((item: string, index: number, arr: string[]) => (
                    <View key={index} className={`flex-row items-start ${index === arr.length - 1 ? '' : 'mb-2.5'}`}>
                        <Check size={16} color="#3b82f6" style={{ marginTop: 2 }} />
                        <Text
                            className="text-sm text-gray-600 ml-2 flex-1"
                            style={{ fontFamily: 'Pretendard-Regular' }}
                        >
                            {item}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Right: Usage Guide */}
            <View
                className="flex-1 bg-white rounded-2xl p-6 border border-gray-100"
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    elevation: 3,
                }}
            >
                <View className="flex-row items-center mb-4">
                    <Lightbulb size={20} color="#3b82f6" />
                    <Text
                        className="text-base text-gray-900 ml-2"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                        {t('mandalart.detail.usage.title', '사용 방법')}
                    </Text>
                </View>

                {/* Item 1: Tap to View */}
                <View className="flex-row items-start mb-2.5">
                    <Check size={16} color="#3b82f6" style={{ marginTop: 2 }} />
                    <Text
                        className="text-sm text-gray-600 ml-2 flex-1"
                        style={{ fontFamily: 'Pretendard-Regular' }}
                    >
                        {t('mandalart.detail.usage.tapToView', '각 영역을 탭하여 상세보기 및 수정이 가능합니다.')}
                    </Text>
                </View>

                {/* Item 2: Types Explanation */}
                <View className="flex-row items-start">
                    <Check size={16} color="#3b82f6" style={{ marginTop: 2 }} />
                    <View className="ml-2 flex-1">
                        <View className="flex-row items-center flex-wrap">
                            <Text
                                className="text-sm text-gray-600 mr-2"
                                style={{ fontFamily: 'Pretendard-Regular' }}
                            >
                                {t('mandalart.detail.usage.typeLabel', '타입 구분:')}
                            </Text>
                            <View className="flex-row items-center bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100 mt-1">
                                <RotateCw size={12} color="#3b82f6" />
                                <Text
                                    className="text-[12px] text-gray-500 ml-1 mr-2"
                                    style={{ fontFamily: 'Pretendard-Medium' }}
                                >
                                    {t('mandalart.detail.usage.routine')}
                                </Text>
                                <Target size={12} color="#10b981" />
                                <Text
                                    className="text-[12px] text-gray-500 ml-1 mr-2"
                                    style={{ fontFamily: 'Pretendard-Medium' }}
                                >
                                    {t('mandalart.detail.usage.mission')}
                                </Text>
                                <Lightbulb size={12} color="#f59e0b" />
                                <Text
                                    className="text-[12px] text-gray-500 ml-1"
                                    style={{ fontFamily: 'Pretendard-Medium' }}
                                >
                                    {t('mandalart.detail.usage.reference')}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    )
} 
