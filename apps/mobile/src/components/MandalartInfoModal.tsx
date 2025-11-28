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
import { X, Check, Pencil, Info } from 'lucide-react-native'
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
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingCenterGoal, setIsEditingCenterGoal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (visible && mandalart) {
      setTitle(mandalart.title)
      setCenterGoal(mandalart.center_goal)
      setIsEditingTitle(false)
      setIsEditingCenterGoal(false)
    }
  }, [visible, mandalart])

  const handleTitleSave = useCallback(async () => {
    if (!mandalart || title.trim() === '') {
      toast.error('제목을 입력하세요')
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('mandalarts')
        .update({ title: title.trim() })
        .eq('id', mandalart.id)

      if (error) throw error

      setIsEditingTitle(false)
      toast.success('저장되었습니다')
      onSuccess?.()
    } catch (err) {
      console.error('Title save error:', err)
      toast.error('저장 중 오류가 발생했습니다')
      setTitle(mandalart.title)
    } finally {
      setIsSaving(false)
    }
  }, [mandalart, title, toast, onSuccess])

  const handleCenterGoalSave = useCallback(async () => {
    if (!mandalart || centerGoal.trim() === '') {
      toast.error('핵심 목표를 입력하세요')
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('mandalarts')
        .update({ center_goal: centerGoal.trim() })
        .eq('id', mandalart.id)

      if (error) throw error

      setIsEditingCenterGoal(false)
      toast.success('저장되었습니다')
      onSuccess?.()
    } catch (err) {
      console.error('Center goal save error:', err)
      toast.error('저장 중 오류가 발생했습니다')
      setCenterGoal(mandalart.center_goal)
    } finally {
      setIsSaving(false)
    }
  }, [mandalart, centerGoal, toast, onSuccess])

  if (!mandalart) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center px-4"
          onPress={onClose}
        >
          <Pressable
            className="w-full max-w-md bg-white rounded-2xl"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <Text className="text-lg font-semibold text-gray-900">
                만다라트 정보 수정
              </Text>
              <Pressable onPress={onClose} className="p-1">
                <X size={24} color="#6b7280" />
              </Pressable>
            </View>

            {/* Content */}
            <View className="p-4 space-y-5">
              <Text className="text-sm text-gray-500">
                만다라트 제목과 핵심목표를 수정할 수 있습니다
              </Text>

              {/* Title Field */}
              <View className="space-y-2">
                <Text className="text-sm font-medium text-gray-700">
                  만다라트 제목
                </Text>
                {isEditingTitle ? (
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      value={title}
                      onChangeText={setTitle}
                      placeholder="예: 2025년 목표"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-base"
                      autoFocus
                      onSubmitEditing={handleTitleSave}
                    />
                    <Pressable
                      onPress={handleTitleSave}
                      disabled={isSaving}
                      className="p-2"
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#10b981" />
                      ) : (
                        <Check size={20} color="#10b981" />
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setTitle(mandalart.title)
                        setIsEditingTitle(false)
                      }}
                      disabled={isSaving}
                      className="p-2"
                    >
                      <X size={20} color="#6b7280" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setIsEditingTitle(true)}
                    className="flex-row items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <Text className="flex-1 text-base text-gray-900">
                      {title || '(제목을 입력하세요)'}
                    </Text>
                    <Pencil size={16} color="#9ca3af" />
                  </Pressable>
                )}
                <View className="flex-row items-center gap-1">
                  <Info size={12} color="#9ca3af" />
                  <Text className="text-xs text-gray-400">
                    만다라트를 구분할 짧은 이름을 입력하세요
                  </Text>
                </View>
              </View>

              {/* Center Goal Field */}
              <View className="space-y-2">
                <Text className="text-sm font-medium text-gray-700">
                  핵심 목표
                </Text>
                {isEditingCenterGoal ? (
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      value={centerGoal}
                      onChangeText={setCenterGoal}
                      placeholder="예: 건강하고 활력 넘치는 삶"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-base"
                      autoFocus
                      onSubmitEditing={handleCenterGoalSave}
                    />
                    <Pressable
                      onPress={handleCenterGoalSave}
                      disabled={isSaving}
                      className="p-2"
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#10b981" />
                      ) : (
                        <Check size={20} color="#10b981" />
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setCenterGoal(mandalart.center_goal)
                        setIsEditingCenterGoal(false)
                      }}
                      disabled={isSaving}
                      className="p-2"
                    >
                      <X size={20} color="#6b7280" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setIsEditingCenterGoal(true)}
                    className="flex-row items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <Text className="flex-1 text-base text-gray-900">
                      {centerGoal || '(핵심 목표를 입력하세요)'}
                    </Text>
                    <Pencil size={16} color="#9ca3af" />
                  </Pressable>
                )}
                <View className="flex-row items-center gap-1">
                  <Info size={12} color="#9ca3af" />
                  <Text className="text-xs text-gray-400">
                    9x9 그리드 중앙에 표시될 목표를 입력하세요
                  </Text>
                </View>
              </View>
            </View>

            {/* Footer - padding only */}
            <View className="h-4" />
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}
