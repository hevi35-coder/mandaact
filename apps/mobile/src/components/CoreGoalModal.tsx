import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { X, Check, Lightbulb } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { useTranslation } from 'react-i18next'

interface CoreGoalModalProps {
  visible: boolean
  onClose: () => void
  initialCenterGoal: string
  onSave: (data: { title: string; centerGoal: string }) => void
}

export default function CoreGoalModal({
  visible,
  onClose,
  initialCenterGoal,
  onSave,
}: CoreGoalModalProps) {
  const { t } = useTranslation()
  const [centerGoal, setCenterGoal] = useState('')

  useEffect(() => {
    if (visible) {
      setCenterGoal(initialCenterGoal)
    }
  }, [visible, initialCenterGoal])

  const handleSave = () => {
    // Use the same value for both title and centerGoal
    onSave({ title: centerGoal, centerGoal })
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={onClose}
        >
          <Pressable
            className="bg-white rounded-t-2xl"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <View className="flex-row items-center">
                <Pressable onPress={onClose} className="p-1 mr-2">
                  <X size={24} color="#6b7280" />
                </Pressable>
                <Text className="text-lg font-semibold text-gray-900">
                  {t('mandalart.modal.coreGoal.title')}
                </Text>
              </View>
              <Pressable
                onPress={handleSave}
                className="rounded-lg overflow-hidden"
              >
                <LinearGradient
                  colors={['#2563eb', '#9333ea', '#db2777']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ padding: 1, borderRadius: 8 }}
                >
                  <View className="bg-white rounded-lg px-4 py-2 flex-row items-center justify-center">
                    <MaskedView
                      maskElement={
                        <View className="flex-row items-center">
                          <Check size={18} color="#000" />
                          <Text className="font-semibold ml-1">{t('common.done')}</Text>
                        </View>
                      }
                    >
                      <LinearGradient
                        colors={['#2563eb', '#9333ea', '#db2777']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <View className="flex-row items-center opacity-0">
                          <Check size={18} color="#000" />
                          <Text className="font-semibold ml-1">{t('common.done')}</Text>
                        </View>
                      </LinearGradient>
                    </MaskedView>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>

            <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
              {/* Core Goal - Single unified field */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  {t('mandalart.modal.coreGoal.coreGoalLabel')}
                </Text>
                <TextInput
                  value={centerGoal}
                  onChangeText={setCenterGoal}
                  placeholder={t('mandalart.modal.coreGoal.coreGoalPlaceholder')}
                  className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-base text-gray-900"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>

              {/* Goal Writing Guide */}
              <View className="bg-blue-50 rounded-xl p-4 mb-4">
                <View className="flex-row items-center mb-3">
                  <Lightbulb size={18} color="#3b82f6" />
                  <Text
                    className="text-lg font-bold text-blue-800 ml-2"
                    style={{ fontFamily: 'Pretendard-Bold' }}
                  >
                    {t('mandalart.modal.coreGoal.guide.title')}
                  </Text>
                </View>

                <View className="gap-y-5">
                  <View>
                    <Text
                      className="text-base font-bold text-blue-900 mb-1"
                      style={{ fontFamily: 'Pretendard-Bold' }}
                    >
                      {t('mandalart.modal.coreGoal.guide.tip1_title')}
                    </Text>
                    <Text className="text-[15px] text-gray-700 leading-6">
                      {t('mandalart.modal.coreGoal.guide.tip1_desc')}
                    </Text>
                  </View>

                  <View>
                    <Text
                      className="text-base font-bold text-blue-900 mb-1"
                      style={{ fontFamily: 'Pretendard-Bold' }}
                    >
                      {t('mandalart.modal.coreGoal.guide.tip2_title')}
                    </Text>
                    <Text className="text-[15px] text-gray-700 leading-6">
                      {t('mandalart.modal.coreGoal.guide.tip2_desc')}
                    </Text>
                  </View>

                  <View>
                    <Text
                      className="text-base font-bold text-blue-900 mb-1"
                      style={{ fontFamily: 'Pretendard-Bold' }}
                    >
                      {t('mandalart.modal.coreGoal.guide.tip3_title')}
                    </Text>
                    <Text className="text-[15px] text-gray-700 leading-6">
                      {t('mandalart.modal.coreGoal.guide.tip3_desc')}
                    </Text>
                  </View>

                  <View>
                    <Text
                      className="text-base font-bold text-blue-900 mb-1"
                      style={{ fontFamily: 'Pretendard-Bold' }}
                    >
                      {t('mandalart.modal.coreGoal.guide.tip4_title')}
                    </Text>
                    <Text className="text-[15px] text-gray-700 leading-6">
                      {t('mandalart.modal.coreGoal.guide.tip4_desc')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Bottom padding for safe area */}
              <View className="h-8" />
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}
