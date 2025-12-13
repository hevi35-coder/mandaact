/**
 * ImageInputStep Component
 * 
 * Handles image selection and OCR processing
 */

import React, { useState } from 'react'
import {
    View,
    Text,
    Pressable,
    Image,
    ScrollView,
    useWindowDimensions,
    Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Upload, Info, Check } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTranslation } from 'react-i18next'
import * as ImagePicker from 'expo-image-picker'
import { runOCRFlowFromUri, type UploadProgress } from '../../services/ocrService'
import { useResponsive } from '../../hooks/useResponsive'
import { useAuthStore } from '../../store/authStore'
import { logger } from '../../lib'
import type { InputStepProps, MandalartData } from './types'

export function ImageInputStep({ onBack, onNext, setLoading }: InputStepProps) {
    const { t } = useTranslation()
    const { width: screenWidth } = useWindowDimensions()
    const { isTablet } = useResponsive()
    const { user } = useAuthStore()

    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    // Calculate image width
    const imageWidth = isTablet ? screenWidth - 40 : screenWidth - 40

    const handleImageSourceSelect = async () => {
        Alert.alert(
            t('mandalart.create.imageUpload.selectSource'),
            '',
            [
                {
                    text: t('mandalart.create.imageUpload.camera'),
                    onPress: () => pickImage('camera'),
                },
                {
                    text: t('mandalart.create.imageUpload.gallery'),
                    onPress: () => pickImage('gallery'),
                },
                {
                    text: t('common.cancel'),
                    style: 'cancel',
                },
            ]
        )
    }

    const pickImage = async (source: 'camera' | 'gallery') => {
        try {
            let result

            if (source === 'camera') {
                const permission = await ImagePicker.requestCameraPermissionsAsync()
                if (!permission.granted) {
                    Alert.alert(t('common.error'), t('mandalart.create.errors.cameraPermission'))
                    return
                }
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.8,
                    allowsEditing: true,
                })
            } else {
                const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
                if (!permission.granted) {
                    Alert.alert(t('common.error'), t('mandalart.create.errors.galleryPermission'))
                    return
                }
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.8,
                    allowsEditing: true,
                })
            }

            if (!result.canceled && result.assets[0]) {
                setSelectedImageUri(result.assets[0].uri)
            }
        } catch (error) {
            logger.error('Image picker error', error)
            Alert.alert(t('common.error'), t('mandalart.create.errors.imageSelect'))
        }
    }

    const handleProcessOCR = async () => {
        if (!selectedImageUri || !user) return

        setIsProcessing(true)
        setLoading(true, 'uploading')

        try {
            const ocrResult = await runOCRFlowFromUri(
                user.id,
                selectedImageUri,
                (progress: UploadProgress) => setLoading(true, progress.message)
            )

            if (!ocrResult) {
                throw new Error('OCR result is null')
            }

            // Convert OCRResult to MandalartData
            const mandalartData: MandalartData = {
                title: ocrResult.center_goal || '',
                center_goal: ocrResult.center_goal || '',
                sub_goals: ocrResult.sub_goals,
            }

            onNext(mandalartData)
        } catch (error) {
            logger.error('OCR error', error)
            Alert.alert(t('common.error'), t('mandalart.create.errors.ocrFailed'))
        } finally {
            setIsProcessing(false)
            setLoading(false)
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
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
                        {t('mandalart.create.imageUpload.title')}
                    </Text>
                </View>
                {selectedImageUri && (
                    <Pressable
                        onPress={handleProcessOCR}
                        disabled={isProcessing}
                        className="rounded-2xl overflow-hidden"
                    >
                        <LinearGradient
                            colors={['#2563eb', '#9333ea', '#db2777']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ padding: 1, borderRadius: 16 }}
                        >
                            <View style={{ backgroundColor: '#ffffff', borderRadius: 15, paddingHorizontal: 18, paddingVertical: 8 }}>
                                <Text style={{ fontFamily: 'Pretendard-SemiBold', color: '#7c3aed' }}>
                                    {t('mandalart.create.imageUpload.extractText')}
                                </Text>
                            </View>
                        </LinearGradient>
                    </Pressable>
                )}
            </View>

            <ScrollView className="flex-1 px-5 pt-5">
                <Text
                    className="text-sm text-gray-500 mb-4"
                    style={{ fontFamily: 'Pretendard-Regular' }}
                >
                    {t('mandalart.create.imageUpload.hint')}
                </Text>

                {!selectedImageUri ? (
                    // Image upload area
                    <Pressable
                        onPress={handleImageSourceSelect}
                        className="border-2 border-dashed border-gray-300 rounded-2xl p-8 items-center justify-center bg-white active:bg-gray-50"
                        style={{ minHeight: 220 }}
                    >
                        <Upload size={48} color="#9ca3af" />
                        <Text
                            className="text-base text-gray-500 mt-4 text-center"
                            style={{ fontFamily: 'Pretendard-Medium' }}
                        >
                            {t('mandalart.create.imageUpload.tapToSelect')}
                        </Text>
                    </Pressable>
                ) : (
                    // Image preview with guide card
                    <>
                        <Pressable
                            onPress={handleImageSourceSelect}
                            className="bg-white rounded-2xl overflow-hidden border border-gray-100 active:opacity-90"
                        >
                            <Image
                                source={{ uri: selectedImageUri }}
                                style={{ width: imageWidth, height: imageWidth }}
                                resizeMode="contain"
                            />
                        </Pressable>
                        <Text
                            className="text-sm text-gray-400 text-center mt-2"
                            style={{ fontFamily: 'Pretendard-Regular' }}
                        >
                            {t('mandalart.create.imageUpload.tapToChange')}
                        </Text>

                        {/* Guide Card */}
                        <View
                            className="bg-blue-50 rounded-2xl p-4 mt-4 border border-blue-100"
                        >
                            <View className="flex-row items-center mb-3">
                                <Info size={18} color="#3b82f6" />
                                <Text
                                    className="text-sm text-blue-700 ml-2"
                                    style={{ fontFamily: 'Pretendard-SemiBold' }}
                                >
                                    {t('mandalart.create.imageUpload.guideTitle')}
                                </Text>
                            </View>
                            {(t('mandalart.create.imageUpload.guideItems', { returnObjects: true }) as string[]).map((item, index) => (
                                <View key={index} className="flex-row items-start mb-1.5">
                                    <Check size={14} color="#3b82f6" style={{ marginTop: 2 }} />
                                    <Text
                                        className="text-sm text-blue-600 ml-2 flex-1"
                                        style={{ fontFamily: 'Pretendard-Regular' }}
                                    >
                                        {item}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}
