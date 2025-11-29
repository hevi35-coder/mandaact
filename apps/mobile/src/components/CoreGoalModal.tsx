import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { X, Check } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'

interface CoreGoalModalProps {
  visible: boolean
  onClose: () => void
  initialTitle: string
  initialCenterGoal: string
  onSave: (data: { title: string; centerGoal: string }) => void
}

export default function CoreGoalModal({
  visible,
  onClose,
  initialTitle,
  initialCenterGoal,
  onSave,
}: CoreGoalModalProps) {
  const [title, setTitle] = useState('')
  const [centerGoal, setCenterGoal] = useState('')

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle)
      setCenterGoal(initialCenterGoal)
    }
  }, [visible, initialTitle, initialCenterGoal])

  const handleSave = () => {
    onSave({ title, centerGoal })
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
            className="bg-white rounded-t-3xl"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <View className="flex-row items-center">
                <Pressable onPress={onClose} className="p-1 mr-2">
                  <X size={24} color="#6b7280" />
                </Pressable>
                <Text className="text-lg font-semibold text-gray-900">
                  핵심 목표 설정
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
                          <Text className="font-semibold ml-1">완료</Text>
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
                          <Text className="font-semibold ml-1">완료</Text>
                        </View>
                      </LinearGradient>
                    </MaskedView>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>

            <View className="p-4">
              {/* Title */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  만다라트 제목
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="예: 2024 목표, 건강한 삶"
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Center Goal */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  핵심 목표
                </Text>
                <TextInput
                  value={centerGoal}
                  onChangeText={setCenterGoal}
                  placeholder="이루고 싶은 핵심 목표를 입력하세요"
                  className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-base text-gray-900"
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
