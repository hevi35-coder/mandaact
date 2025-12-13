import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import {
  X,
  Check,
  RotateCw,
  Target,
  Lightbulb,
} from 'lucide-react-native'
import type { Action, ActionType } from '@mandaact/shared'
import { useTranslation } from 'react-i18next'
import { useUpdateAction } from '../hooks/useActions'
import { logger } from '../lib/logger'

interface ActionEditModalProps {
  visible: boolean
  action: Action | null
  onClose: () => void
  onSuccess?: () => void
}

export default function ActionEditModal({
  visible,
  action,
  onClose,
  onSuccess,
}: ActionEditModalProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [actionType, setActionType] = useState<ActionType>('routine')
  const [frequency, setFrequency] = useState<string>('daily')

  const updateAction = useUpdateAction()

  // Initialize form when action changes
  useEffect(() => {
    if (action) {
      setTitle(action.title)
      setActionType((action.type as ActionType) || 'routine')
      setFrequency(action.routine_frequency || 'daily')
    }
  }, [action])

  const handleSave = useCallback(async () => {
    if (!action || !title.trim()) return

    try {
      await updateAction.mutateAsync({
        id: action.id,
        updates: {
          title: title.trim(),
          type: actionType,
          routine_frequency: actionType === 'routine' ? (frequency as 'daily' | 'weekly' | 'monthly') : undefined,
        },
      })
      onSuccess?.()
      onClose()
    } catch (error) {
      logger.error('Error updating action', error)
    }
  }, [action, title, actionType, frequency, updateAction, onSuccess, onClose])

  const handleClose = useCallback(() => {
    // Reset form
    if (action) {
      setTitle(action.title)
      setActionType((action.type as ActionType) || 'routine')
      setFrequency(action.routine_frequency || 'daily')
    }
    onClose()
  }, [action, onClose])

  if (!action) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-2xl max-h-[80%]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
              <Pressable onPress={handleClose} className="p-2">
                <X size={24} color="#6b7280" />
              </Pressable>
              <Text className="text-lg font-semibold text-gray-900">
                {t('actionEdit.title')}
              </Text>
              <Pressable
                onPress={handleSave}
                disabled={updateAction.isPending || !title.trim()}
                className="p-2"
              >
                {updateAction.isPending ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <Check
                    size={24}
                    color={title.trim() ? '#2563eb' : '#d1d5db'}
                  />
                )}
              </Pressable>
            </View>

            <ScrollView className="px-4 py-4">
              {/* Title Input */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  {t('actionEdit.fields.title')}
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t('actionEdit.placeholders.title')}
                  placeholderTextColor="#9ca3af"
                  className="bg-gray-50 rounded-lg px-4 py-3 text-base text-gray-900 border border-gray-200"
                  multiline
                  maxLength={100}
                />
                <Text className="text-xs text-gray-400 mt-1 text-right">
                  {title.length}/100
                </Text>
              </View>

              {/* Action Type Selection */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  {t('actionEdit.fields.type')}
                </Text>
                <View className="gap-2">
                  {([
                    {
                      type: 'routine' as const,
                      label: t('actionType.routine'),
                      description: t('actionType.selector.routineDesc'),
                      icon: <RotateCw size={20} color="#2563eb" />,
                    },
                    {
                      type: 'mission' as const,
                      label: t('actionType.mission'),
                      description: t('actionType.selector.missionDesc'),
                      icon: <Target size={20} color="#f59e0b" />,
                    },
                    {
                      type: 'reference' as const,
                      label: t('actionType.reference'),
                      description: t('actionType.selector.referenceDesc'),
                      icon: <Lightbulb size={20} color="#6b7280" />,
                    },
                  ] as const).map((type) => (
                    <Pressable
                      key={type.type}
                      onPress={() => setActionType(type.type)}
                      className={`flex-row items-center p-4 rounded-lg border ${
                        actionType === type.type
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <View className="mr-3">{type.icon}</View>
                      <View className="flex-1">
                        <Text
                          className={`text-base font-semibold ${
                            actionType === type.type
                              ? 'text-primary'
                              : 'text-gray-900'
                          }`}
                        >
                          {type.label}
                        </Text>
                        <Text className="text-xs text-gray-500 mt-0.5">
                          {type.description}
                        </Text>
                      </View>
                      {actionType === type.type && (
                        <Check size={20} color="#2563eb" />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Frequency Selection (only for routine) */}
              {actionType === 'routine' && (
                <View className="mb-6">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    {t('actionEdit.fields.frequency')}
                  </Text>
                  <View className="flex-row gap-2">
                    {([
                      { value: 'daily', label: t('actionType.daily') },
                      { value: 'weekly', label: t('actionType.weekly') },
                      { value: 'monthly', label: t('actionType.monthly') },
                    ] as const).map((freq) => (
                      <Pressable
                        key={freq.value}
                        onPress={() => setFrequency(freq.value)}
                        className={`flex-1 py-3 rounded-lg border ${
                          frequency === freq.value
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <Text
                          className={`text-center font-semibold ${
                            frequency === freq.value
                              ? 'text-primary'
                              : 'text-gray-600'
                          }`}
                        >
                          {freq.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* Info notice */}
              <View className="bg-blue-50 rounded-lg p-4 mb-8">
                <Text className="text-sm text-blue-700">
                  {t('actionEdit.notice.title')}{'\n'}
                  • {t('actionEdit.notice.routine')}{'\n'}
                  • {t('actionEdit.notice.mission')}{'\n'}
                  • {t('actionEdit.notice.reference')}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
