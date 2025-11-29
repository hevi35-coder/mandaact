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

  if (!mandalart) return null

  const handleSave = useCallback(async () => {
    if (!mandalart) return

    if (title.trim() === '') {
      toast.error('제목을 입력하세요')
      return
    }
    if (centerGoal.trim() === '') {
      toast.error('핵심 목표를 입력하세요')
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

      toast.success('저장되었습니다')
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Save error:', err)
      toast.error('저장 중 오류가 발생했습니다')
    } finally {
      setIsSaving(false)
    }
  }, [mandalart, title, centerGoal, toast, onSuccess, onClose])

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
                  만다라트 정보 수정
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
                      완료
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
                  만다라트 제목
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="예: 올해 목표, 건강한 삶"
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
                  핵심 목표
                </Text>
                <TextInput
                  value={centerGoal}
                  onChangeText={setCenterGoal}
                  placeholder="이루고 싶은 핵심 목표를 입력하세요"
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
