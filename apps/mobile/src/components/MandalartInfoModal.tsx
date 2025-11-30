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
} from 'react-native'
import { X, Check } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import type { Mandalart } from '@mandaact/shared'

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
  const [title, setTitle] = useState('')
  const [centerGoal, setCenterGoal] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (visible && mandalart) {
      setTitle(mandalart.title)
      setCenterGoal(mandalart.center_goal)
    }
  }, [visible, mandalart])

  const handleSave = useCallback(async () => {
    if (!mandalart) return

    if (title.trim() === '') {
      toast.error(t('mandalart.create.validation.enterTitle'))
      return
    }
    if (centerGoal.trim() === '') {
      toast.error(t('mandalart.create.validation.enterCoreGoal'))
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('mandalarts')
        .update({
          title: title.trim(),
          center_goal: centerGoal.trim()
        })
        .eq('id', mandalart.id)

      if (error) throw error

      toast.success(t('common.success'))
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Save error:', err)
      toast.error(t('mandalart.create.errors.save'))
    } finally {
      setIsSaving(false)
    }
  }, [mandalart, title, centerGoal, toast, onSuccess, onClose])

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
            className="bg-white rounded-t-3xl"
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
                className="bg-gray-900 px-4 py-2 rounded-xl flex-row items-center active:bg-gray-800"
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
            <View className="p-4">
              {/* Title Field */}
              <View className="mb-4">
                <Text
                  className="text-sm text-gray-700 mb-2"
                  style={{ fontFamily: 'Pretendard-Medium' }}
                >
                  {t('mandalart.modal.coreGoal.mandalartTitle')}
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t('mandalart.modal.coreGoal.titlePlaceholder')}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                  placeholderTextColor="#9ca3af"
                />
              </View>

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
                  className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-base text-gray-900"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>

              {/* Bottom padding for safe area */}
              <View className="h-4" />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}
