import React, { useCallback, useState } from 'react'
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Header } from '../components'
import { Button } from '../components/ui'
import { useAuthStore } from '../store/authStore'
import { useMandalarts, useDeleteMandalart } from '../hooks/useMandalarts'
import { useToast } from '../components/Toast'
import type { RootStackParamList } from '../navigation/RootNavigator'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export default function CoachingSlotGateScreen() {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const toast = useToast()
  const { user } = useAuthStore()
  const { data: mandalarts = [], isLoading } = useMandalarts(user?.id)
  const deleteMandalart = useDeleteMandalart()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleUpgrade = useCallback(() => {
    navigation.navigate('Subscription')
  }, [navigation])

  const handleDelete = useCallback(
    (mandalartId: string) => {
      Alert.alert(
        t('coaching.slotGate.confirmTitle'),
        t('coaching.slotGate.confirmBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('coaching.slotGate.confirmDelete'),
            style: 'destructive',
            onPress: async () => {
              setDeletingId(mandalartId)
              try {
                await deleteMandalart.mutateAsync(mandalartId)
                toast.success(t('coaching.slotGate.deleteSuccess'))
                navigation.replace('CoachingGate')
              } catch {
                toast.error(t('coaching.slotGate.deleteError'))
              } finally {
                setDeletingId(null)
              }
            },
          },
        ]
      )
    },
    [deleteMandalart, navigation, t, toast]
  )

  return (
    <View className="flex-1 bg-gray-50">
      <Header showBackButton title={t('coaching.slotGate.title')} />
      <ScrollView className="flex-1 px-6 pt-8">
        <Text className="text-2xl text-gray-900" style={{ fontFamily: 'Pretendard-Bold' }}>
          {t('coaching.slotGate.heading')}
        </Text>
        <Text className="text-base text-gray-600 mt-3 mb-6" style={{ fontFamily: 'Pretendard-Regular' }}>
          {t('coaching.slotGate.body')}
        </Text>

        {isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color="#111827" />
          </View>
        ) : (
          <View className="space-y-3">
            {mandalarts.map((mandalart) => (
              <View
                key={mandalart.id}
                className="bg-white rounded-2xl border border-gray-100 p-4"
              >
                <Text className="text-base text-gray-900" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                  {mandalart.title}
                </Text>
                <Text className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Pretendard-Regular' }}>
                  {t('coaching.slotGate.createdAt', {
                    date: new Date(mandalart.created_at).toLocaleDateString(),
                  })}
                </Text>
                <Pressable
                  onPress={() => handleDelete(mandalart.id)}
                  disabled={deletingId === mandalart.id}
                  className="mt-3 bg-red-50 rounded-lg py-2.5 items-center border border-red-100"
                >
                  {deletingId === mandalart.id ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <Text className="text-sm text-red-600" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                      {t('coaching.slotGate.deleteCta')}
                    </Text>
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View className="mt-8 pb-8">
          <Button size="lg" variant="secondary" onPress={handleUpgrade} className="w-full">
            {t('coaching.slotGate.upgradeCta')}
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}
