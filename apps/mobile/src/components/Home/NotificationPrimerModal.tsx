import React, { useState } from 'react'
import { View, Text, Modal, Pressable, Linking, Alert } from 'react-native'
import { BellRing, X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { registerForPushNotificationsAsync } from '../../services/notificationService'

interface NotificationPrimerModalProps {
    visible: boolean
    onClose: () => void
    onSuccess: () => void
}

export function NotificationPrimerModal({ visible, onClose, onSuccess }: NotificationPrimerModalProps) {
    const { t } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)

    const handleEnableNotifications = async () => {
        setIsLoading(true)
        try {
            const token = await registerForPushNotificationsAsync()

            if (token) {
                // Success!
                onSuccess()
                onClose()
            } else {
                // If token is null, it likely means permission denied or not a physical device
                // Check if we should guide to settings
                Alert.alert(
                    t('common.permissionRequired'),
                    t('common.notificationPermission'),
                    [
                        { text: t('common.cancel'), style: 'cancel', onPress: onClose },
                        {
                            text: t('common.settings'),
                            onPress: () => {
                                Linking.openSettings()
                                onClose()
                            }
                        }
                    ]
                )
            }
        } catch (error) {
            console.error('Error enabling notifications:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/50 justify-center items-center px-5">
                <View className="bg-white w-full max-w-sm rounded-3xl overflow-hidden p-6 relative">
                    {/* Close Button */}
                    <Pressable
                        onPress={onClose}
                        className="absolute right-4 top-4 z-10 p-2 bg-gray-100/50 rounded-full"
                    >
                        <X size={20} color="#9ca3af" />
                    </Pressable>

                    {/* Icon */}
                    <View className="items-center mb-5 mt-2">
                        <View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-4">
                            <BellRing size={40} color="#2563eb" />
                        </View>
                        <Text
                            className="text-xl text-center text-gray-900 mb-2"
                            style={{ fontFamily: 'Pretendard-Bold' }}
                        >
                            {t('notification_primer.title', '놓치지 않고 실천하기')}
                        </Text>
                        <Text
                            className="text-base text-center text-gray-500 leading-6"
                            style={{ fontFamily: 'Pretendard-Regular' }}
                        >
                            {t('notification_primer.description', '알림을 켜두면 목표 달성 확률이 3배 높아집니다.\nAI가 딱 맞는 시점에 코칭해드릴게요.')}
                        </Text>
                    </View>

                    {/* Buttons */}
                    <View className="gap-3 w-full">
                        <Pressable
                            onPress={handleEnableNotifications}
                            disabled={isLoading}
                            style={({ pressed }) => ({
                                opacity: pressed ? 0.9 : 1,
                                transform: [{ scale: pressed ? 0.98 : 1 }]
                            })}
                        >
                            <LinearGradient
                                colors={['#2563eb', '#9333ea', '#db2777']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ padding: 2, borderRadius: 16 }}
                            >
                                <View
                                    className="bg-white rounded-[14px] items-center justify-center py-4"
                                >
                                    <MaskedView
                                        maskElement={
                                            <Text
                                                className="text-[17px] font-bold"
                                                style={{ fontFamily: 'Pretendard-Bold' }}
                                            >
                                                {isLoading ? t('common.loading') : t('notification_primer.enable', '알림 켜기')}
                                            </Text>
                                        }
                                    >
                                        <LinearGradient
                                            colors={['#2563eb', '#9333ea', '#db2777']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                        >
                                            <Text
                                                className="text-[17px] font-bold opacity-0"
                                                style={{ fontFamily: 'Pretendard-Bold' }}
                                            >
                                                {isLoading ? t('common.loading') : t('notification_primer.enable', '알림 켜기')}
                                            </Text>
                                        </LinearGradient>
                                    </MaskedView>
                                </View>
                            </LinearGradient>
                        </Pressable>

                        <Pressable
                            onPress={onClose}
                            disabled={isLoading}
                            className="py-3 items-center justify-center rounded-2xl active:bg-gray-50"
                        >
                            <Text
                                className="text-gray-500 text-[15px]"
                                style={{ fontFamily: 'Pretendard-Medium' }}
                            >
                                {t('common.later', '나중에 할게요')}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    )
}
