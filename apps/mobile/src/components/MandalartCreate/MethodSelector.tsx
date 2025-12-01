/**
 * MethodSelector Component
 * 
 * Select input method: Image OCR, Text Paste, or Manual Input
 */

import React from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Image as ImageIcon, FileText, PenLine } from 'lucide-react-native'
import type { MethodSelectorProps } from './types'

export function MethodSelector({ onSelectMethod }: MethodSelectorProps) {
    const { t } = useTranslation()

    const methods = [
        {
            id: 'image' as const,
            icon: ImageIcon,
            titleKey: 'mandalart.create.imageUpload.title',
            descKey: 'mandalart.create.imageUpload.description',
        },
        {
            id: 'text' as const,
            icon: FileText,
            titleKey: 'mandalart.create.textPaste.title',
            descKey: 'mandalart.create.textPaste.description',
        },
        {
            id: 'manual' as const,
            icon: PenLine,
            titleKey: 'mandalart.create.manualInput.title',
            descKey: 'mandalart.create.manualInput.description',
        },
    ]

    return (
        <ScrollView className="flex-1 px-5 pt-5">
            <Text
                className="text-lg text-gray-900 mb-5"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
            >
                {t('mandalart.create.selectMethod')}
            </Text>

            {methods.map((method) => (
                <Pressable
                    key={method.id}
                    onPress={() => onSelectMethod(method.id)}
                    className="bg-white rounded-3xl p-5 mb-4 border border-gray-100 flex-row items-center active:bg-gray-50"
                    style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.06,
                        shadowRadius: 12,
                        elevation: 3,
                    }}
                >
                    <View className="w-14 h-14 rounded-2xl bg-gray-100 items-center justify-center mr-4">
                        <method.icon size={26} color="#6b7280" />
                    </View>
                    <View className="flex-1">
                        <Text
                            className="text-base text-gray-900"
                            style={{ fontFamily: 'Pretendard-SemiBold' }}
                        >
                            {t(method.titleKey)}
                        </Text>
                        <Text
                            className="text-sm text-gray-500 mt-1"
                            style={{ fontFamily: 'Pretendard-Regular' }}
                        >
                            {t(method.descKey)}
                        </Text>
                    </View>
                </Pressable>
            ))}
        </ScrollView>
    )
}
