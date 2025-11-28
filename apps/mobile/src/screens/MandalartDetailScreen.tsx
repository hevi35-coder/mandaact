import React, { useRef, useCallback, useState, useMemo } from 'react'
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
} from 'lucide-react-native'

import { useMandalartWithDetails } from '../hooks/useMandalarts'
import { saveToGallery, shareImage, captureViewAsImage } from '../services/exportService'
import MandalartInfoModal from '../components/MandalartInfoModal'
import SubGoalEditModal from '../components/SubGoalEditModal'
import type { RootStackParamList } from '../navigation/RootNavigator'
import type { Action, SubGoal, ActionType } from '@mandaact/shared'
import { logger } from '../lib/logger'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>
type DetailRouteProp = RouteProp<RootStackParamList, 'MandalartDetail'>

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CONTAINER_PADDING = 16 // 화면 좌우 패딩
const CARD_PADDING = 12 // 카드 내부 패딩
const CELL_MARGIN = 4 // 셀 간격 (한쪽)
const AVAILABLE_WIDTH = SCREEN_WIDTH - (CONTAINER_PADDING * 2) - (CARD_PADDING * 2)
const CELL_SIZE = Math.floor((AVAILABLE_WIDTH - (CELL_MARGIN * 6)) / 3) // 3개 셀 + 6개 마진(좌우)

// Sub-goal with actions type
interface SubGoalWithActions extends SubGoal {
  actions: Action[]
}

// Action type icon component
function ActionTypeIcon({ type, size = 12 }: { type: ActionType; size?: number }) {
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

  // State
  const [isExporting, setIsExporting] = useState(false)
  const [expandedSubGoal, setExpandedSubGoal] = useState<SubGoalWithActions | null>(null)
  const [infoModalVisible, setInfoModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
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

  // Get sub-goal by position
  const getSubGoalByPosition = useCallback((position: number): SubGoalWithActions | undefined => {
    return mandalart?.sub_goals.find(sg => sg.position === position) as SubGoalWithActions | undefined
  }, [mandalart])

  // Handle center goal tap
  const handleCenterGoalTap = useCallback(() => {
    setInfoModalVisible(true)
  }, [])

  // Handle sub-goal tap
  const handleSubGoalTap = useCallback((position: number) => {
    const subGoal = getSubGoalByPosition(position)
    if (subGoal) {
      setExpandedSubGoal(subGoal)
    }
  }, [getSubGoalByPosition])

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

  // Section positions: [1,2,3,4,0,5,6,7,8] where 0 is center
  const sectionPositions = useMemo(() => [1, 2, 3, 4, 0, 5, 6, 7, 8], [])

  // Action positions in 3x3 grid: [1,2,3,4,center,5,6,7,8]
  const actionPositions = useMemo(() => [1, 2, 3, 4, 0, 5, 6, 7, 8], [])

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

  // Render 3x3 cell for main view (center + sub-goals)
  const renderMainCell = (position: number) => {
    if (position === 0) {
      // Center: Core goal
      return (
        <Pressable
          key="center"
          onPress={handleCenterGoalTap}
          className="items-center justify-center p-2 rounded-xl active:opacity-90"
          style={{
            width: CELL_SIZE,
            height: CELL_SIZE,
            margin: CELL_MARGIN,
            backgroundColor: '#667eea',
          }}
        >
          <Text className="text-white text-sm font-bold text-center" numberOfLines={4}>
            {mandalart.center_goal}
          </Text>
        </Pressable>
      )
    }

    // Sub-goal cells
    const subGoal = getSubGoalByPosition(position)
    return (
      <Pressable
        key={position}
        onPress={() => handleSubGoalTap(position)}
        className="items-center justify-center p-1.5 rounded-xl border border-blue-200 active:bg-blue-100"
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          margin: CELL_MARGIN,
          backgroundColor: '#eff6ff',
        }}
      >
        <Text className="text-[10px] text-gray-400 mb-0.5">세부 {position}</Text>
        <Text className="text-xs font-medium text-gray-800 text-center" numberOfLines={2}>
          {subGoal?.title || '-'}
        </Text>
        {subGoal && (
          <Text className="text-[10px] text-gray-400 mt-0.5">
            {subGoal.actions?.length || 0}개
          </Text>
        )}
      </Pressable>
    )
  }

  // Render 3x3 cell for expanded sub-goal view (tappable to open edit modal)
  const renderExpandedCell = (cellPos: number) => {
    if (!expandedSubGoal) return null

    if (cellPos === 0) {
      // Center: Sub-goal title (tappable)
      return (
        <Pressable
          key="subgoal-center"
          onPress={handleEditSubGoal}
          className="items-center justify-center p-2 rounded-xl active:opacity-80"
          style={{
            width: CELL_SIZE,
            height: CELL_SIZE,
            margin: CELL_MARGIN,
            backgroundColor: '#dbeafe',
            borderWidth: 2,
            borderColor: '#3b82f6',
          }}
        >
          <Text className="text-sm font-semibold text-gray-900 text-center" numberOfLines={3}>
            {expandedSubGoal.title}
          </Text>
        </Pressable>
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
          width: CELL_SIZE,
          height: CELL_SIZE,
          margin: CELL_MARGIN,
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
        {/* Info Card - Only in main view */}
        {!expandedSubGoal && (
          <Pressable
            onPress={handleCenterGoalTap}
            className="mx-4 mt-4 bg-white rounded-2xl p-4 active:bg-gray-50"
          >
            <Text className="text-base font-semibold text-gray-900 mb-1">
              핵심 목표
            </Text>
            <Text className="text-gray-600">{mandalart.center_goal}</Text>
          </Pressable>
        )}

        {/* Expanded View Header */}
        {expandedSubGoal && (
          <View className="mx-4 mt-4 flex-row items-center justify-between">
            <Pressable
              onPress={() => setExpandedSubGoal(null)}
              className="flex-row items-center px-4 py-2 bg-white border border-gray-300 rounded-xl"
            >
              <ArrowLeft size={16} color="#374151" />
              <Text className="text-sm text-gray-700 ml-1">뒤로</Text>
            </Pressable>
            <Pressable
              onPress={handleEditSubGoal}
              className="px-4 py-2 bg-gray-900 rounded-xl"
            >
              <Text className="text-sm text-white font-medium">수정</Text>
            </Pressable>
          </View>
        )}

        {/* 3x3 Grid */}
        <View style={{ paddingHorizontal: CONTAINER_PADDING, marginTop: 16 }} ref={gridRef} collapsable={false}>
          <View
            className="bg-white rounded-2xl"
            style={{
              padding: CARD_PADDING,
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {(expandedSubGoal ? actionPositions : sectionPositions).map((pos) =>
              expandedSubGoal ? renderExpandedCell(pos) : renderMainCell(pos)
            )}
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
                <View className="w-4 h-4 rounded mr-2 bg-blue-100 border border-blue-200" />
                <Text className="text-xs text-gray-600">세부 목표</Text>
              </View>
              <View className="flex-row items-center">
                <RotateCw size={12} color="#3b82f6" />
                <Text className="text-xs text-gray-600 ml-1">루틴</Text>
              </View>
              <View className="flex-row items-center">
                <Target size={12} color="#10b981" />
                <Text className="text-xs text-gray-600 ml-1">미션</Text>
              </View>
              <View className="flex-row items-center">
                <Lightbulb size={12} color="#f59e0b" />
                <Text className="text-xs text-gray-600 ml-1">참고</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Usage Instructions */}
        <View className="px-4 pb-8">
          <View className="bg-white rounded-2xl p-4">
            <View className="flex-row items-center mb-2">
              <Lightbulb size={16} color="#667eea" />
              <Text className="text-sm font-medium text-gray-900 ml-2">사용 방법</Text>
            </View>
            <Text className="text-xs text-gray-500">
              • 각 영역을 탭하여 상세보기 및 수정이 가능합니다.
            </Text>
          </View>
        </View>
      </ScrollView>

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
    </SafeAreaView>
  )
}
