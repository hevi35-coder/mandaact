/**
 * TextInputStep Component
 * 
 * Handles text input and parsing
 */

import React, { useState } from 'react'
import {
    View,
    Text,
    Pressable,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Check } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { useTranslation } from 'react-i18next'
import { parseMandalartText } from '../../services/ocrService'
import { logger } from '../../lib'
import type { InputStepProps, MandalartData } from './types'

export function TextInputStep({ onBack, onNext, setLoading }: InputStepProps) {
    const { t } = useTranslation()
    const [pasteText, setPasteText] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)

    const handleTextParse = async () => {
        if (!pasteText.trim()) {
            Alert.alert(t('common.error'), t('mandalart.create.errors.emptyText'))
            return
        }

        setIsProcessing(true)
        setLoading(true, 'analyzing')

        try {
            const ocrResult = await parseMandalartText(pasteText)

            // Convert OCRResult to MandalartData
            const mandalartData: MandalartData = {
                title: ocrResult.center_goal || '',
                center_goal: ocrResult.center_goal || '',
                sub_goals: ocrResult.sub_goals,
            }

            onNext(mandalartData)
        } catch (error) {
            logger.error('Text parse error', error)
            Alert.alert(t('common.error'), t('mandalart.create.errors.parseFailed'))
        } finally {
            setIsProcessing(false)
            setLoading(false)
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                {/* Header */}
                <View className="flex-row items-center justify-between px-5 h-16 border-b border-gray-100">
                    <View className="flex-row items-center">
                        <Pressable onPress={onBack} className="p-2.5 -ml-2.5 rounded-full active:bg-gray-100">
                            <ArrowLeft size={24} color="#374151" />
                        </Pressable>
                        <Text
                            className="text-xl text-gray-900 ml-2"
                            style={{ fontFamily: 'Pretendard-Bold' }}
                        >
                            {t('mandalart.create.textPaste.title')}
                        </Text>
                    </View>
                    <Pressable
                        onPress={handleTextParse}
                        disabled={isProcessing}
                        className="rounded-2xl overflow-hidden"
                    >
                        <LinearGradient
                            colors={['#2563eb', '#9333ea', '#db2777']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ padding: 1, borderRadius: 16 }}
                        >
                            <View className="bg-white rounded-2xl px-5 py-2.5 items-center justify-center">
                                <MaskedView
                                    maskElement={
                                        <Text style={{ fontFamily: 'Pretendard-SemiBold' }}>
                                            {t('mandalart.create.textPaste.analyze')}
                                        </Text>
                                    }
                                >
                                    <LinearGradient
                                        colors={['#2563eb', '#9333ea', '#db2777']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Text style={{ fontFamily: 'Pretendard-SemiBold', opacity: 0 }}>
                                            {t('mandalart.create.textPaste.analyze')}
                                        </Text>
                                    </LinearGradient>
                                </MaskedView>
                            </View>
                        </LinearGradient>
                    </Pressable>
                </View>

                <ScrollView className="flex-1 px-5 pt-5">
                    <Text
                        className="text-sm text-gray-500 mb-4"
                        style={{ fontFamily: 'Pretendard-Regular' }}
                    >
                        {t('mandalart.create.textPaste.hint')}
                    </Text>

                    <TextInput
                        className="bg-white rounded-2xl p-5 text-base text-gray-900 border border-gray-200"
                        style={{
                            minHeight: 300,
                            fontFamily: 'Pretendard-Regular',
                            textAlignVertical: 'top',
                        }}
                        multiline
                        placeholder={t('mandalart.create.textPaste.placeholder')}
                        placeholderTextColor="#9ca3af"
                        value={pasteText}
                        onChangeText={setPasteText}
                    />

                    {/* Example Format */}
                    <View className="mt-6 mb-10">
                        <Text
                            className="text-sm font-semibold text-gray-900 mb-2"
                            style={{ fontFamily: 'Pretendard-SemiBold' }}
                        >
                            {t('mandalart.create.textPaste.exampleTitle')}
                        </Text>
                        <View className="bg-gray-100 rounded-xl p-4">
                            <Text className="text-xs text-gray-600 font-mono leading-5">
                                {t('mandalart.create.textPaste.exampleContent')}
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}
