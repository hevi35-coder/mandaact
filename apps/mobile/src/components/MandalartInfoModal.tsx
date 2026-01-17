import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { X, Check, Lightbulb } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import type { Mandalart } from '@mandaact/shared'
import { useQueryClient } from '@tanstack/react-query'
import { mandalartKeys } from '../hooks/useMandalarts'

interface MandalartInfoModalProps {
  visible: boolean
  mandalart: Mandalart | null
  onClose: () => void
  onSuccess?: () => void
}

export default function MandalartInfoModal({
  visible,
  mandalart,
  onClose,
  onSuccess,
}: MandalartInfoModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [centerGoal, setCenterGoal] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (visible && mandalart) {
      setCenterGoal(mandalart.center_goal)
    }
  }, [visible, mandalart])

  const handleSave = useCallback(async () => {
    if (!mandalart) return

    if (centerGoal.trim() === '') {
      toast.error(t('mandalart.create.validation.enterCoreGoal'))
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('mandalarts')
        .update({
          title: centerGoal.trim(),
          center_goal: centerGoal.trim()
        })
        .eq('id', mandalart.id)

      if (error) throw error

      // Invalidate queries to ensure UI is fresh
      queryClient.invalidateQueries({ queryKey: mandalartKeys.all })

      toast.success(t('common.success'))
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Save error:', err)
      toast.error(t('mandalart.create.errors.save'))
    } finally {
      setIsSaving(false)
    }
  }, [mandalart, centerGoal, toast, onSuccess, onClose, queryClient, t])

  if (!mandalart) return null

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
                      className="text-white ml-1"
                      style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                      {t('common.done')}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Content */}
            <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
              {/* Center Goal Field */}
              <View className="mb-4">
                <Text
                  className="text-sm text-gray-700 mb-2"
                  style={{ fontFamily: 'Pretendard-Medium' }}
                >
                  {t('mandalart.modal.coreGoal.coreGoalLabel')}
                </Text>
                <TextInput
                  value={centerGoal}
                  onChangeText={setCenterGoal}
                  placeholder={t('mandalart.modal.coreGoal.coreGoalPlaceholder')}
                  className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-base text-gray-900"
                  style={{ fontFamily: 'Pretendard-Regular' }}
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
