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
  ActivityIndicator,
} from 'react-native'
import { X, Check, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { useTranslation } from 'react-i18next'

interface CoreGoalModalProps {
  visible: boolean
  onClose: () => void
  initialCenterGoal: string
  onSave: (data: { title: string; centerGoal: string }) => void
  isSaving?: boolean
}

export default function CoreGoalModal({
  visible,
  onClose,
  initialCenterGoal,
  onSave,
  isSaving = false,
}: CoreGoalModalProps) {
  const { t } = useTranslation()
  const [centerGoal, setCenterGoal] = useState('')
  const [isGuideExpanded, setIsGuideExpanded] = useState(false)

  useEffect(() => {
    if (visible) {
      setCenterGoal(initialCenterGoal)
    }
  }, [visible, initialCenterGoal])

  const handleSave = () => {
    if (isSaving) return
    // Use the same value for both title and centerGoal
    onSave({ title: centerGoal, centerGoal })
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
                <Text
                  className="text-lg text-gray-900"
                  style={{ fontFamily: 'Pretendard-SemiBold' }}
                >
                  {t('mandalart.modal.coreGoal.title')}
                </Text>
              </View>
              <Pressable
                onPress={handleSave}
                disabled={isSaving}
                className="bg-gray-900 px-4 py-2 rounded-lg flex-row items-center active:bg-gray-800"
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Check size={18} color="white" />
                    <Text
                      className="text-white ml-1 font-semibold"
                      style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                      {t('common.done')}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
              {/* Core Goal - Single unified field */}
              <View className="mb-4">
                <TextInput
                  value={centerGoal}
                  onChangeText={setCenterGoal}
                  placeholder={t('mandalart.modal.coreGoal.coreGoalPlaceholder')}
                  className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-base text-gray-900"
                  placeholderTextColor="#9ca3af"
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
              </View>

              {/* Goal Writing Guide */}
              <View className="bg-blue-50/50 rounded-3xl mb-6 border border-blue-100/50 overflow-hidden">
                <Pressable
                  onPress={() => setIsGuideExpanded(!isGuideExpanded)}
                  className="p-5 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center">
                    <View className="bg-blue-100 p-2 rounded-xl mr-3">
                      <Lightbulb size={18} color="#2563eb" />
                    </View>
                    <Text
                      className="text-lg font-bold text-blue-900"
                      style={{ fontFamily: 'Pretendard-Bold' }}
                    >
                      {t('mandalart.modal.coreGoal.guide.title')}
                    </Text>
                  </View>
                  {isGuideExpanded ? (
                    <ChevronUp size={20} color="#2563eb" />
                  ) : (
                    <ChevronDown size={20} color="#2563eb" />
                  )}
                </Pressable>

                {isGuideExpanded && (
                  <View className="px-5 pb-5 gap-y-4">
                    {[1, 2, 3].map((num) => (
                      <View key={num} className="flex-row items-start">
                        <View className="w-1.5 h-1.5 rounded-full bg-blue-300 mt-2 mr-3" />
                        <View className="flex-1">
                          <Text
                            className="text-[15px] font-bold text-blue-900 mb-0.5"
                            style={{ fontFamily: 'Pretendard-Bold' }}
                          >
                            {t(`mandalart.modal.coreGoal.guide.tip${num}_title`)}
                          </Text>
                          <Text className="text-[13px] text-blue-800/70 leading-5" style={{ fontFamily: 'Pretendard-Medium' }}>
                            {t(`mandalart.modal.coreGoal.guide.tip${num}_desc`)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
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
