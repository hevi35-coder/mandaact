/**
 * ProgressOverlay Component
 * 
 * Full-screen loading overlay with message
 */

import React from 'react'
import { View, Text, ActivityIndicator, Modal } from 'react-native'
import type { ProgressOverlayProps } from './types'

export function ProgressOverlay({ visible, message }: ProgressOverlayProps) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View className="flex-1 bg-black/50 items-center justify-center">
                <View className="bg-white rounded-2xl p-8 items-center min-w-[200px]">
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text
                        className="text-gray-900 mt-4 text-center"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                        {message}
                    </Text>
                </View>
            </View>
        </Modal>
    )
}
