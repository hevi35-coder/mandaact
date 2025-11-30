/**
 * CreateButton Component
 * 
 * Gradient-bordered button for creating new mandalart
 */

import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import type { CreateButtonProps } from './types'

export function CreateButton({ onPress }: CreateButtonProps) {
    const { t } = useTranslation()

    return (
        <Pressable
            onPress={onPress}
            className="rounded-2xl overflow-hidden"
            style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 2,
            }}
        >
            <LinearGradient
                colors={['#2563eb', '#9333ea', '#db2777']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ padding: 1, borderRadius: 16 }}
            >
                <View className="bg-white rounded-2xl py-4 items-center justify-center">
                    <MaskedView
                        maskElement={
                            <View className="flex-row items-center">
                                <Plus size={18} color="#000" />
                                <Text
                                    className="text-base ml-2"
                                    style={{ fontFamily: 'Pretendard-SemiBold' }}
                                >
                                    {t('mandalart.list.createNew')}
                                </Text>
                            </View>
                        }
                    >
                        <LinearGradient
                            colors={['#2563eb', '#9333ea', '#db2777']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <View className="flex-row items-center opacity-0">
                                <Plus size={18} color="#000" />
                                <Text
                                    className="text-base ml-2"
                                    style={{ fontFamily: 'Pretendard-SemiBold' }}
                                >
                                    {t('mandalart.list.createNew')}
                                </Text>
                            </View>
                        </LinearGradient>
                    </MaskedView>
                </View>
            </LinearGradient>
        </Pressable>
    )
}
