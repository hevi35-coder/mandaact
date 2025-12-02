import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { X, AlertTriangle, Info } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import type { Mandalart, SubGoal, Action } from '@mandaact/shared'

interface MandalartWithDetails extends Mandalart {
  sub_goals: (SubGoal & { actions: Action[] })[]
}

interface DeleteMandalartModalProps {
  visible: boolean
  mandalart: MandalartWithDetails | null
  onClose: () => void
  onSuccess: (action: 'deactivate' | 'delete') => void
}

export default function DeleteMandalartModal({
  visible,
  mandalart,
  onClose,
  onSuccess,
}: DeleteMandalartModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingAction, setProcessingAction] = useState<'deactivate' | 'delete' | null>(null)

  // Calculate stats
  const stats = useMemo(() => {
    if (!mandalart) return { checkCount: 0, subGoalCount: 0, actionCount: 0 }

    const subGoalCount = mandalart.sub_goals?.length || 0
    const actionCount = mandalart.sub_goals?.reduce(
      (sum, sg) => sum + (sg.actions?.length || 0),
      0
    ) || 0

    return {
      checkCount: 0, // Will be fetched if needed, but showing actions is more relevant
      subGoalCount,
      actionCount,
    }
  }, [mandalart])

  const handleDeactivate = useCallback(async () => {
    if (!mandalart) return

    setIsProcessing(true)
    setProcessingAction('deactivate')

    try {
      const { error } = await supabase
        .from('mandalarts')
        .update({ is_active: false })
        .eq('id', mandalart.id)

      if (error) throw error

      toast.success(t('mandalart.delete.deactivated'))
      onSuccess('deactivate')
      onClose()
    } catch (err) {
      console.error('Deactivate error:', err)
      toast.error(t('mandalart.delete.deactivateError'))
    } finally {
      setIsProcessing(false)
      setProcessingAction(null)
    }
  }, [mandalart, toast, onSuccess, onClose])

  const handleDelete = useCallback(async () => {
    if (!mandalart) return

    setIsProcessing(true)
    setProcessingAction('delete')

    try {
      const { error } = await supabase
        .from('mandalarts')
        .delete()
        .eq('id', mandalart.id)

      if (error) throw error

      toast.success(t('mandalart.delete.deleted'))
      onSuccess('delete')
      onClose()
    } catch (err) {
      console.error('Delete error:', err)
      toast.error(t('mandalart.delete.deleteError'))
    } finally {
      setIsProcessing(false)
      setProcessingAction(null)
    }
  }, [mandalart, toast, onSuccess, onClose])

  if (!mandalart) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-2xl max-h-[85%]">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <View className="flex-row items-center">
              <Pressable onPress={onClose} className="p-1 mr-2" disabled={isProcessing}>
                <X size={24} color="#6b7280" />
              </Pressable>
              <Text
                className="text-lg text-gray-900"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                {t('mandalart.delete.title')}
              </Text>
            </View>
          </View>

          <ScrollView className="px-5 py-4">
            {/* Warning */}
            <View className="flex-row items-center mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <AlertTriangle size={20} color="#ef4444" />
              <Text
                className="text-sm text-red-700 ml-2 flex-1"
                style={{ fontFamily: 'Pretendard-Medium' }}
              >
                {t('mandalart.delete.warning')}
              </Text>
            </View>

            {/* Data to be deleted */}
            <View className="mb-4">
              <Text
                className="text-sm text-gray-500 mb-2"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                {t('mandalart.delete.dataToDelete')}
              </Text>
              <View className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <Text
                  className="text-sm text-gray-700 mb-1"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                >
                  • {t('mandalart.delete.allCheckHistory')}
                </Text>
                <Text
                  className="text-sm text-gray-700 mb-1"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                >
                  • {t('mandalart.delete.subGoalCount', { count: stats.subGoalCount })}
                </Text>
                <Text
                  className="text-sm text-gray-700"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                >
                  • {t('mandalart.delete.actionCount', { count: stats.actionCount })}
                </Text>
              </View>
            </View>

            {/* Data to be kept */}
            <View className="mb-4">
              <Text
                className="text-sm text-gray-500 mb-2"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                {t('mandalart.delete.dataToKeep')}
              </Text>
              <View className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <Text
                  className="text-sm text-gray-700 mb-1"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                >
                  • {t('mandalart.delete.xpAndLevel')}
                </Text>
                <Text
                  className="text-sm text-gray-700"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                >
                  • {t('mandalart.delete.unlockedBadges')}
                </Text>
              </View>
            </View>

            {/* Recommendation */}
            <View className="flex-row items-start mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Info size={18} color="#3b82f6" className="mt-0.5" />
              <Text
                className="text-sm text-blue-700 ml-2 flex-1"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                {t('mandalart.delete.recommendation')}
              </Text>
            </View>

            {/* Buttons */}
            <View className="mb-6">
              {/* Deactivate Button (Recommended) */}
              <Pressable
                onPress={handleDeactivate}
                disabled={isProcessing}
                className="rounded-lg overflow-hidden mb-3"
              >
                <LinearGradient
                  colors={['#2563eb', '#9333ea', '#db2777']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ padding: 1, borderRadius: 12 }}
                >
                  <View className="bg-white rounded-lg py-4 items-center justify-center">
                    {processingAction === 'deactivate' ? (
                      <ActivityIndicator size="small" color="#2563eb" />
                    ) : (
                      <MaskedView
                        maskElement={
                          <Text
                            className="text-base"
                            style={{ fontFamily: 'Pretendard-SemiBold' }}
                          >
                            {t('mandalart.delete.deactivate')}
                          </Text>
                        }
                      >
                        <LinearGradient
                          colors={['#2563eb', '#9333ea', '#db2777']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          <Text
                            className="text-base opacity-0"
                            style={{ fontFamily: 'Pretendard-SemiBold' }}
                          >
                            {t('mandalart.delete.deactivate')}
                          </Text>
                        </LinearGradient>
                      </MaskedView>
                    )}
                  </View>
                </LinearGradient>
              </Pressable>

              {/* Delete Button */}
              <Pressable
                onPress={handleDelete}
                disabled={isProcessing}
                className="bg-white border border-gray-300 rounded-lg py-4 items-center active:bg-gray-50"
              >
                {processingAction === 'delete' ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <Text
                    className="text-gray-700 text-base"
                    style={{ fontFamily: 'Pretendard-Medium' }}
                  >
                    {t('mandalart.delete.permanentDelete')}
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
