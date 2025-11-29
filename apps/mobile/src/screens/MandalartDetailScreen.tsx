import React, { useRef, useCallback, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  ChevronLeft,
  Share2,
  Download,
  RotateCw,
  Target,
  Lightbulb,
  Trash2,
  ArrowLeft,
} from 'lucide-react-native'
import { useQueryClient } from '@tanstack/react-query'

import { useMandalartWithDetails } from '../hooks/useMandalarts'
import { saveToGallery, shareImage, captureViewAsImage } from '../services/exportService'
import MandalartExportGrid from '../components/MandalartExportGrid'
import MandalartInfoModal from '../components/MandalartInfoModal'
import SubGoalEditModal from '../components/SubGoalEditModal'
import DeleteMandalartModal from '../components/DeleteMandalartModal'
import { CenterGoalCell, SubGoalCell } from '../components'
import type { RootStackParamList } from '../navigation/RootNavigator'
import type { Action, SubGoal, ActionType } from '@mandaact/shared'
import { logger } from '../lib/logger'
import { mandalartKeys } from '../hooks/useMandalarts'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>
type DetailRouteProp = RouteProp<RootStackParamList, 'MandalartDetail'>

// Grid layout constants
const CONTAINER_PADDING = 16 // 화면 좌우 패딩
const CARD_PADDING = 12 // 카드 내부 패딩
const CELL_GAP = 8 // 셀 사이 간격

// Sub-goal with actions type
interface SubGoalWithActions extends SubGoal {
  actions: Action[]
}

// Action type icon component (unused but kept for future use)
function _ActionTypeIcon({ type, size = 12 }: { type: ActionType; size?: number }) {
  switch (type) {
    case 'routine':
      return <RotateCw size={size} color="#3b82f6" />
    case 'mission':
      return <Target size={size} color="#10b981" />
    case 'reference':
      return <Lightbulb size={size} color="#f59e0b" />
    default:
      return null
  }
}

export default function MandalartDetailScreen() {
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute<DetailRouteProp>()
  const { id } = route.params
  const gridRef = useRef<View>(null)
  const exportGridRef = useRef<View>(null)
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()
  const { width: screenWidth } = useWindowDimensions()

  // Calculate cell size dynamically based on screen width
  const gridWidth = screenWidth - (CONTAINER_PADDING * 2) - (CARD_PADDING * 2)
  const cellSize = Math.floor((gridWidth - (CELL_GAP * 2)) / 3) // 3 cells with 2 gaps

  // State
  const [isExporting, setIsExporting] = useState(false)
  const [expandedSubGoal, setExpandedSubGoal] = useState<SubGoalWithActions | null>(null)
  const [infoModalVisible, setInfoModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [selectedSubGoal, setSelectedSubGoal] = useState<SubGoalWithActions | null>(null)

  const {
    data: mandalart,
    isLoading,
    error,
    refetch,
  } = useMandalartWithDetails(id)

  const handleBack = useCallback(() => {
    if (expandedSubGoal) {
      setExpandedSubGoal(null)
    } else {
      navigation.goBack()
    }
  }, [expandedSubGoal, navigation])

  const handleExport = useCallback(async (action: 'share' | 'save') => {
    if (!exportGridRef.current) return

    setIsExporting(true)
    try {
      // Capture the high-resolution 9x9 export grid
      const uri = await captureViewAsImage(exportGridRef, { format: 'png', quality: 1 })

      if (action === 'share') {
        await shareImage(uri, { dialogTitle: `${mandalart?.title} 공유` })
      } else {
        await saveToGallery(uri)
        Alert.alert('성공', '고해상도 만다라트 이미지가 갤러리에 저장되었습니다.')
      }
    } catch (err) {
      logger.error('Export error', err)
      Alert.alert('오류', err instanceof Error ? err.message : '내보내기 중 오류가 발생했습니다.')
    } finally {
      setIsExporting(false)
    }
  }, [mandalart])

  // Get sub-goal by position
  const getSubGoalByPosition = useCallback((position: number): SubGoalWithActions | undefined => {
    return mandalart?.sub_goals.find(sg => sg.position === position) as SubGoalWithActions | undefined
  }, [mandalart])

  // Handle center goal tap
  const handleCenterGoalTap = useCallback(() => {
    setInfoModalVisible(true)
  }, [])

  // Handle sub-goal tap (including empty cells)
  const handleSubGoalTap = useCallback((position: number) => {
    const subGoal = getSubGoalByPosition(position)
    if (subGoal) {
      // Existing sub-goal: expand to show details
      setExpandedSubGoal(subGoal)
    } else {
      // Empty sub-goal: create a placeholder and open edit modal
      const emptySubGoal: SubGoalWithActions = {
        id: '',
        mandalart_id: id,
        position,
        title: '',
        created_at: '',
        actions: []
      }
      setSelectedSubGoal(emptySubGoal)
      setEditModalVisible(true)
    }
  }, [getSubGoalByPosition, id])

  // Handle delete mandalart - opens modal
  const handleDelete = useCallback(() => {
    setDeleteModalVisible(true)
  }, [])

  // Handle delete/deactivate success
  const handleDeleteSuccess = useCallback(async (_action: 'deactivate' | 'delete') => {
    await queryClient.invalidateQueries({ queryKey: mandalartKeys.all })
    navigation.goBack()
  }, [queryClient, navigation])

  // Handle edit button in expanded view
  const handleEditSubGoal = useCallback(() => {
    if (expandedSubGoal) {
      setSelectedSubGoal(expandedSubGoal)
      setEditModalVisible(true)
    }
  }, [expandedSubGoal])

  // Handle modal success
  const handleModalSuccess = useCallback(() => {
    refetch()
  }, [refetch])

  // Sync expandedSubGoal when mandalart data changes (after refetch)
  React.useEffect(() => {
    if (expandedSubGoal && mandalart) {
      const updatedSubGoal = mandalart.sub_goals.find(
        sg => sg.id === expandedSubGoal.id
      ) as SubGoalWithActions | undefined
      if (updatedSubGoal) {
        setExpandedSubGoal(updatedSubGoal)
      }
    }
  }, [mandalart])

  // Grid positions are now defined inline in the row-based layout

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#374151" />
          <Text
            className="text-base text-gray-500 mt-4"
            style={{ fontFamily: 'Pretendard-Medium' }}
          >
            불러오는 중...
          </Text>
        </View>
      </View>
    )
  }

  // Error state
  if (error || !mandalart) {
    return (
      <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
        <View className="flex-1 items-center justify-center px-5">
          <Text
            className="text-base text-red-500 text-center mb-4"
            style={{ fontFamily: 'Pretendard-Medium' }}
          >
            만다라트를 불러오는 중 오류가 발생했습니다.
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="bg-gray-900 px-6 py-4 rounded-2xl"
          >
            <Text
              className="text-white text-base"
              style={{ fontFamily: 'Pretendard-SemiBold' }}
            >
              다시 시도
            </Text>
          </Pressable>
        </View>
      </View>
    )
  }

  // Render 3x3 cell for main view (center + sub-goals)
  const renderMainCell = (position: number) => {
    if (position === 0) {
      // Center: Core goal with gradient
      return (
        <CenterGoalCell
          key="center"
          centerGoal={mandalart.center_goal}
          size={cellSize}
          onPress={handleCenterGoalTap}
          numberOfLines={4}
        />
      )
    }

    // Sub-goal cells (using shared component)
    const subGoal = getSubGoalByPosition(position)
    return (
      <SubGoalCell
        key={position}
        title={subGoal?.title || ''}
        size={cellSize}
        position={position}
        filledActions={subGoal?.actions?.length || 0}
        onPress={() => handleSubGoalTap(position)}
        variant="overview"
      />
    )
  }

  // Render 3x3 cell for expanded sub-goal view (tappable to open edit modal)
  const renderExpandedCell = (cellPos: number) => {
    if (!expandedSubGoal) return null

    if (cellPos === 0) {
      // Center: Sub-goal title (using shared component with 'center' variant)
      return (
        <SubGoalCell
          key="subgoal-center"
          title={expandedSubGoal.title}
          size={cellSize}
          onPress={handleEditSubGoal}
          variant="center"
          numberOfLines={3}
        />
      )
    }

    // Actions (tappable)
    const action = expandedSubGoal.actions?.find(a => a.position === cellPos)

    return (
      <Pressable
        key={cellPos}
        onPress={handleEditSubGoal}
        className="items-center justify-center p-1.5 rounded-xl bg-white border border-gray-200 active:bg-gray-50"
        style={{
          width: cellSize,
          height: cellSize,
        }}
      >
        {action ? (
          <Text className="text-xs text-gray-800 text-center" numberOfLines={4}>
            {action.title}
          </Text>
        ) : (
          <Text className="text-xs text-gray-300">-</Text>
        )}
      </Pressable>
    )
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Loading overlay */}
      {isExporting && (
        <View className="absolute inset-0 bg-black/50 z-50 items-center justify-center">
          <View className="bg-white rounded-3xl p-6 items-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text
              className="text-gray-900 mt-4"
              style={{ fontFamily: 'Pretendard-SemiBold' }}
            >
              내보내는 중...
            </Text>
          </View>
        </View>
      )}

      {/* Header - styled like Header component */}
      <View
        className="bg-white border-b border-gray-100"
        style={{
          paddingTop: insets.top,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.03,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center justify-between px-5 h-16">
          <View className="flex-row items-center flex-1">
            <Pressable
              onPress={handleBack}
              className="p-2 -ml-2 rounded-full active:bg-gray-100"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={28} color="#4b5563" />
            </Pressable>
            <Text
              className="text-xl text-gray-900 ml-1 flex-1"
              style={{ fontFamily: 'Pretendard-SemiBold' }}
              numberOfLines={1}
            >
              {mandalart.title}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Pressable
              onPress={() => handleExport('save')}
              className="p-2.5 rounded-full active:bg-gray-100"
            >
              <Download size={22} color="#4b5563" />
            </Pressable>
            <Pressable
              onPress={() => handleExport('share')}
              className="p-2.5 rounded-full active:bg-gray-100"
            >
              <Share2 size={22} color="#4b5563" />
            </Pressable>
            <Pressable
              onPress={handleDelete}
              className="p-2.5 rounded-full active:bg-gray-100"
            >
              <Trash2 size={22} color="#9ca3af" />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Header Bar - Same height for both views */}
        <View className="mx-5 mt-5 flex-row items-center justify-between">
          {!expandedSubGoal ? (
            /* Main View: Core goal display (1-line, same height as expanded view buttons) */
            <Pressable
              onPress={handleCenterGoalTap}
              className="flex-1 flex-row items-center px-5 py-3 bg-white border border-gray-200 rounded-2xl active:bg-gray-50"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <Text
                className="text-base text-gray-700 flex-1"
                style={{ fontFamily: 'Pretendard-Medium' }}
                numberOfLines={1}
              >
                {mandalart.center_goal}
              </Text>
            </Pressable>
          ) : (
            /* Expanded View: Back and Edit buttons */
            <>
            <Pressable
              onPress={() => setExpandedSubGoal(null)}
              className="flex-row items-center px-5 py-3 bg-white border border-gray-200 rounded-2xl active:bg-gray-50"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <ArrowLeft size={16} color="#374151" />
              <Text
                className="text-base text-gray-700 ml-1"
                style={{ fontFamily: 'Pretendard-Medium' }}
              >
                뒤로
              </Text>
            </Pressable>
            <Pressable
              onPress={handleEditSubGoal}
              className="px-5 py-3 bg-gray-900 rounded-2xl active:bg-gray-800"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              <Text
                className="text-base text-white"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                수정
              </Text>
            </Pressable>
            </>
          )}
        </View>

        {/* 3x3 Grid - Row-based layout for reliable 3x3 display */}
        <View style={{ paddingHorizontal: CONTAINER_PADDING, marginTop: 16 }} ref={gridRef} collapsable={false}>
          <View
            className="bg-white rounded-3xl border border-gray-100"
            style={{
              padding: CARD_PADDING,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            {/* Row 1: positions 0, 1, 2 → indices 1, 2, 3 */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: CELL_GAP }}>
              {[1, 2, 3].map((pos) =>
                expandedSubGoal ? renderExpandedCell(pos) : renderMainCell(pos)
              )}
            </View>
            {/* Row 2: positions 3, 4, 5 → indices 4, 0, 5 (center is 0) */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: CELL_GAP, marginTop: CELL_GAP }}>
              {[4, 0, 5].map((pos) =>
                expandedSubGoal ? renderExpandedCell(pos) : renderMainCell(pos)
              )}
            </View>
            {/* Row 3: positions 6, 7, 8 → indices 6, 7, 8 */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: CELL_GAP, marginTop: CELL_GAP }}>
              {[6, 7, 8].map((pos) =>
                expandedSubGoal ? renderExpandedCell(pos) : renderMainCell(pos)
              )}
            </View>
          </View>
        </View>

        {/* Usage Instructions */}
        <View className="px-5 py-5 pb-8">
          <View
            className="bg-white rounded-3xl p-6 border border-gray-100"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <View className="flex-row items-center mb-3">
              <Lightbulb size={20} color="#2563eb" />
              <Text
                className="text-base text-gray-900 ml-2"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                사용 방법
              </Text>
            </View>
            <Text
              className="text-sm text-gray-500 mb-2"
              style={{ fontFamily: 'Pretendard-Regular' }}
            >
              • 각 영역을 탭하여 상세보기 및 수정이 가능합니다.
            </Text>
            <View className="flex-row items-center">
              <Text
                className="text-sm text-gray-500"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                • 타입 구분:{' '}
              </Text>
              <RotateCw size={14} color="#3b82f6" />
              <Text
                className="text-sm text-gray-500 ml-1 mr-2"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                루틴
              </Text>
              <Target size={14} color="#10b981" />
              <Text
                className="text-sm text-gray-500 ml-1 mr-2"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                미션
              </Text>
              <Lightbulb size={14} color="#f59e0b" />
              <Text
                className="text-sm text-gray-500 ml-1"
                style={{ fontFamily: 'Pretendard-Regular' }}
              >
                참고
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Hidden 9x9 Export Grid (rendered off-screen for high-resolution capture) */}
      <View
        style={{
          position: 'absolute',
          left: -9999,
          top: -9999,
          opacity: 0,
        }}
        pointerEvents="none"
      >
        <MandalartExportGrid
          ref={exportGridRef}
          mandalart={mandalart}
          size={1080}
        />
      </View>

      {/* Mandalart Info Modal */}
      <MandalartInfoModal
        visible={infoModalVisible}
        mandalart={mandalart}
        onClose={() => setInfoModalVisible(false)}
        onSuccess={handleModalSuccess}
      />

      {/* Sub-goal Edit Modal */}
      <SubGoalEditModal
        visible={editModalVisible}
        subGoal={selectedSubGoal}
        onClose={() => {
          setEditModalVisible(false)
          setSelectedSubGoal(null)
        }}
        onSuccess={handleModalSuccess}
      />

      {/* Delete Mandalart Modal */}
      <DeleteMandalartModal
        visible={deleteModalVisible}
        mandalart={mandalart}
        onClose={() => setDeleteModalVisible(false)}
        onSuccess={handleDeleteSuccess}
      />
    </View>
  )
}
