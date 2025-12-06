/**
 * ProgressOverlay Component
 *
 * Full-screen loading overlay with message
 */

import React from 'react'
import { View, Text, ActivityIndicator, Modal } from 'react-native'
import { useTranslation } from 'react-i18next'
import type { ProgressOverlayProps } from './types'

// Map message keys to i18n paths
const MESSAGE_KEYS: Record<string, string> = {
    uploading: 'mandalart.create.progress.uploading',
    uploadComplete: 'mandalart.create.progress.uploadComplete',
    processing: 'mandalart.create.progress.processing',
    done: 'mandalart.create.progress.done',
}

export function ProgressOverlay({ visible, message }: ProgressOverlayProps) {
    const { t } = useTranslation()

    // Translate message if it's a known key, otherwise use as-is
    const displayMessage = MESSAGE_KEYS[message] ? t(MESSAGE_KEYS[message]) : message

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View className="flex-1 bg-black/50 items-center justify-center">
                <View className="bg-white rounded-2xl p-8 items-center min-w-[200px]">
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text
                        className="text-gray-900 mt-4 text-center"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                        {displayMessage}
                    </Text>
                </View>
            </View>
        </Modal>
    )
}
