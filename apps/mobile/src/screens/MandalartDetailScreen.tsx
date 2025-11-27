import React, { useRef, useCallback, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  ArrowLeft,
  Share2,
  Download,
  RotateCw,
  Target,
  Lightbulb,
  Edit3,
  ChevronRight,
} from 'lucide-react-native'

import { useMandalartWithDetails } from '../hooks/useMandalarts'
import { saveToGallery, shareImage, captureViewAsImage } from '../services/exportService'
import { ActionEditModal } from '../components'
import type { RootStackParamList } from '../navigation/RootNavigator'
import type { Action, ActionType } from '@mandaact/shared'
import { logger } from '../lib/logger'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>
type DetailRouteProp = RouteProp<RootStackParamList, 'MandalartDetail'>

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const GRID_PADDING = 16
const CELL_GAP = 2
const GRID_SIZE = SCREEN_WIDTH - GRID_PADDING * 2
const CELL_SIZE = (GRID_SIZE - CELL_GAP * 8) / 9

// Action type colors
const TYPE_COLORS: Record<ActionType, { bg: string; border: string }> = {
  routine: { bg: '#ede9fe', border: '#a78bfa' },
  mission: { bg: '#fef3c7', border: '#fbbf24' },
  reference: { bg: '#f3f4f6', border: '#d1d5db' },
}

export default function MandalartDetailScreen() {
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute<DetailRouteProp>()
  const { id } = route.params
  const gridRef = useRef<View>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [editingAction, setEditingAction] = useState<Action | null>(null)

  const {
    data: mandalart,
    isLoading,
    error,
    refetch,
  } = useMandalartWithDetails(id)

  const handleBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const handleEditAction = useCallback((action: Action) => {
    setEditingAction(action)
  }, [])

  const handleEditSuccess = useCallback(() => {
    refetch()
  }, [refetch])

  const handleExport = useCallback(async (action: 'share' | 'save') => {
    if (!gridRef.current) return

    setIsExporting(true)
    try {
      const uri = await captureViewAsImage(gridRef, { format: 'png' })

      if (action === 'share') {
        await shareImage(uri, { dialogTitle: `${mandalart?.title} 공유` })
      } else {
        await saveToGallery(uri)
        Alert.alert('성공', '이미지가 갤러리에 저장되었습니다.')
      }
    } catch (err) {
      logger.error('Export error', err)
      Alert.alert('오류', err instanceof Error ? err.message : '내보내기 중 오류가 발생했습니다.')
    } finally {
      setIsExporting(false)
    }
  }, [mandalart])

  // Build 9x9 grid data
  const buildGridData = useCallback(() => {
    if (!mandalart?.sub_goals) return null

    // Initialize 9x9 grid with empty cells
    const grid: Array<Array<{ type: 'center' | 'subgoal' | 'action' | 'empty'; title: string; actionType?: ActionType; position?: number }>> =
      Array(9).fill(null).map(() => Array(9).fill({ type: 'empty', title: '' }))

    // Center cell (4,4) - 0-indexed
    grid[4][4] = { type: 'center', title: mandalart.center_goal }

    // Position mapping for sub-goals around center (in 3x3 center grid)
    const subGoalPositions: Record<number, [number, number]> = {
      1: [3, 3], // top-left
      2: [3, 4], // top-center
      3: [3, 5], // top-right
      4: [4, 3], // middle-left
      5: [4, 5], // middle-right
      6: [5, 3], // bottom-left
      7: [5, 4], // bottom-center
      8: [5, 5], // bottom-right
    }

    // Position mapping for sub-goal 3x3 grids
    const subGoalGridOffsets: Record<number, [number, number]> = {
      1: [0, 0], // top-left
      2: [0, 3], // top-center
      3: [0, 6], // top-right
      4: [3, 0], // middle-left
      5: [3, 6], // middle-right
      6: [6, 0], // bottom-left
      7: [6, 3], // bottom-center
      8: [6, 6], // bottom-right
    }

    // Action position mapping within each 3x3 sub-grid
    const actionPositions: Record<number, [number, number]> = {
      1: [0, 0], // top-left
      2: [0, 1], // top-center
      3: [0, 2], // top-right
      4: [1, 0], // middle-left
      5: [1, 2], // middle-right
      6: [2, 0], // bottom-left
      7: [2, 1], // bottom-center
      8: [2, 2], // bottom-right
    }

    mandalart.sub_goals.forEach((subGoal) => {
      // Place sub-goal title in center area
      const [sgRow, sgCol] = subGoalPositions[subGoal.position]
      if (sgRow !== undefined && sgCol !== undefined) {
        grid[sgRow][sgCol] = {
          type: 'subgoal',
          title: subGoal.title,
          position: subGoal.position
        }
      }

      // Place sub-goal title in its own 3x3 grid center
      const [offsetRow, offsetCol] = subGoalGridOffsets[subGoal.position]
      if (offsetRow !== undefined && offsetCol !== undefined) {
        grid[offsetRow + 1][offsetCol + 1] = {
          type: 'subgoal',
          title: subGoal.title,
          position: subGoal.position
        }

        // Place actions
        subGoal.actions?.forEach((action) => {
          const [actionRow, actionCol] = actionPositions[action.position]
          if (actionRow !== undefined && actionCol !== undefined) {
            grid[offsetRow + actionRow][offsetCol + actionCol] = {
              type: 'action',
              title: action.title,
              actionType: action.type as ActionType,
              position: action.position,
            }
          }
        })
      }
    })

    return grid
  }, [mandalart])

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#667eea" />
        <Text className="text-gray-500 mt-4">불러오는 중...</Text>
      </SafeAreaView>
    )
  }

  // Error state
  if (error || !mandalart) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-4">
        <Text className="text-red-500 text-center mb-4">
          만다라트를 불러오는 중 오류가 발생했습니다.
        </Text>
        <Pressable
          onPress={() => refetch()}
          className="bg-primary px-6 py-3 rounded-xl"
        >
          <Text className="text-white font-semibold">다시 시도</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const gridData = buildGridData()

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Export loading overlay */}
      {isExporting && (
        <View className="absolute inset-0 bg-black/50 z-50 items-center justify-center">
          <View className="bg-white rounded-2xl p-6 items-center">
            <ActivityIndicator size="large" color="#667eea" />
            <Text className="text-gray-900 font-semibold mt-4">내보내는 중...</Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center flex-1">
          <Pressable onPress={handleBack} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#374151" />
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900 ml-2" numberOfLines={1}>
            {mandalart.title}
          </Text>
        </View>
        <View className="flex-row">
          <Pressable
            onPress={() => handleExport('save')}
            className="p-2"
          >
            <Download size={22} color="#374151" />
          </Pressable>
          <Pressable
            onPress={() => handleExport('share')}
            className="p-2 ml-1"
          >
            <Share2 size={22} color="#374151" />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Info Card */}
        <View className="px-4 pt-4">
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-base font-semibold text-gray-900 mb-1">
              핵심 목표
            </Text>
            <Text className="text-gray-600">{mandalart.center_goal}</Text>
          </View>
        </View>

        {/* 9x9 Grid */}
        <View className="px-4" ref={gridRef} collapsable={false}>
          <View
            className="bg-white rounded-2xl p-2"
            style={{ width: GRID_SIZE + 16 }}
          >
            {gridData?.map((row, rowIndex) => (
              <View key={rowIndex} className="flex-row">
                {row.map((cell, colIndex) => {
                  const isCenter = rowIndex === 4 && colIndex === 4
                  const isCenterArea = rowIndex >= 3 && rowIndex <= 5 && colIndex >= 3 && colIndex <= 5

                  let bgColor = '#ffffff'
                  let borderColor = '#e5e7eb'
                  let textColor = '#374151'

                  if (cell.type === 'center') {
                    bgColor = '#667eea'
                    borderColor = '#667eea'
                    textColor = '#ffffff'
                  } else if (cell.type === 'subgoal') {
                    bgColor = isCenterArea ? '#f3e8ff' : '#faf5ff'
                    borderColor = '#a78bfa'
                  } else if (cell.type === 'action' && cell.actionType) {
                    bgColor = TYPE_COLORS[cell.actionType].bg
                    borderColor = TYPE_COLORS[cell.actionType].border
                  }

                  return (
                    <View
                      key={colIndex}
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        margin: CELL_GAP / 2,
                        backgroundColor: bgColor,
                        borderWidth: 1,
                        borderColor: borderColor,
                        borderRadius: 4,
                        padding: 2,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 7,
                          color: textColor,
                          textAlign: 'center',
                        }}
                        numberOfLines={3}
                      >
                        {cell.title}
                      </Text>
                    </View>
                  )
                })}
              </View>
            ))}
          </View>
        </View>

        {/* Legend */}
        <View className="px-4 py-4">
          <View className="bg-white rounded-2xl p-4">
            <Text className="text-sm font-semibold text-gray-900 mb-3">범례</Text>
            <View className="flex-row flex-wrap gap-3">
              <View className="flex-row items-center">
                <View className="w-4 h-4 rounded mr-2 bg-primary" />
                <Text className="text-xs text-gray-600">핵심 목표</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-4 h-4 rounded mr-2 bg-purple-100 border border-purple-400" />
                <Text className="text-xs text-gray-600">세부 목표</Text>
              </View>
              <View className="flex-row items-center">
                <RotateCw size={12} color="#667eea" />
                <Text className="text-xs text-gray-600 ml-1">루틴</Text>
              </View>
              <View className="flex-row items-center">
                <Target size={12} color="#f59e0b" />
                <Text className="text-xs text-gray-600 ml-1">미션</Text>
              </View>
              <View className="flex-row items-center">
                <Lightbulb size={12} color="#6b7280" />
                <Text className="text-xs text-gray-600 ml-1">참고</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sub-goals list with edit */}
        <View className="px-4 pb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-gray-900">
              세부 목표 ({mandalart.sub_goals?.length || 0}개)
            </Text>
            <View className="flex-row items-center">
              <Edit3 size={14} color="#667eea" />
              <Text className="text-sm text-primary ml-1">탭하여 수정</Text>
            </View>
          </View>
          {mandalart.sub_goals?.map((subGoal) => (
            <View
              key={subGoal.id}
              className="bg-white rounded-xl p-4 mb-3 border border-gray-200"
            >
              <Text className="text-base font-semibold text-gray-900 mb-2">
                {subGoal.position}. {subGoal.title}
              </Text>
              <View>
                {subGoal.actions?.map((action) => (
                  <Pressable
                    key={action.id}
                    onPress={() => handleEditAction(action)}
                    className="flex-row items-center py-2 px-2 -mx-2 rounded-lg active:bg-gray-50"
                  >
                    <View className="flex-row items-center flex-1">
                      {action.type === 'routine' && <RotateCw size={14} color="#667eea" />}
                      {action.type === 'mission' && <Target size={14} color="#f59e0b" />}
                      {action.type === 'reference' && <Lightbulb size={14} color="#6b7280" />}
                      <Text className="text-sm text-gray-700 ml-2 flex-1">
                        {action.title}
                      </Text>
                    </View>
                    <ChevronRight size={16} color="#9ca3af" />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Action Edit Modal */}
      <ActionEditModal
        visible={!!editingAction}
        action={editingAction}
        onClose={() => setEditingAction(null)}
        onSuccess={handleEditSuccess}
      />
    </SafeAreaView>
  )
}
