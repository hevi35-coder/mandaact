/**
 * MandalartDetailScreen - Refactored (Minimal Changes)
 * 
 * This screen is already well-structured with modals separated.
 * We keep the main grid rendering logic here as it's complex and tightly coupled.
 * Only extract reusable UI components.
 */

import React, { useRef, useCallback, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useResponsive } from '../hooks/useResponsive'
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
import { useTranslation } from 'react-i18next'

import { useMandalartWithDetails } from '../hooks/useMandalarts'
import { saveToGallery, shareImage, captureViewAsImage } from '../services/exportService'
import MandalartExportGrid from '../components/MandalartExportGrid'
import MandalartInfoModal from '../components/MandalartInfoModal'
import SubGoalEditModal from '../components/SubGoalEditModal'
import DeleteMandalartModal from '../components/DeleteMandalartModal'
import { CenterGoalCell, SubGoalCell, MandalartFullGrid } from '../components'
import type { RootStackParamList } from '../navigation/RootNavigator'
import type { Action, SubGoal, ActionType } from '@mandaact/shared'
import { logger } from '../lib/logger'
import { mandalartKeys } from '../hooks/useMandalarts'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>
type DetailRouteProp = RouteProp<RootStackParamList, 'MandalartDetail'>

// Grid layout constants - will be overridden by responsive values
const DEFAULT_CONTAINER_PADDING = 16
const DEFAULT_CARD_PADDING = 12
const DEFAULT_CELL_GAP = 8

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
  const { t } = useTranslation()
  const { id } = route.params
  const gridRef = useRef<View>(null)
  const exportGridRef = useRef<View>(null)
  const queryClient = useQueryClient()
  const insets = useSafeAreaInsets()
  const { width: screenWidth, height: screenHeight, isTablet, contentMaxWidth } = useResponsive()

  // Responsive layout values
  const CONTAINER_PADDING = isTablet ? 32 : DEFAULT_CONTAINER_PADDING
  const CARD_PADDING = isTablet ? 16 : DEFAULT_CARD_PADDING
  const CELL_GAP = isTablet ? 12 : DEFAULT_CELL_GAP

  // Calculate cell size dynamically based on screen width (with max width for tablets)
  const effectiveWidth = isTablet ? Math.min(screenWidth, contentMaxWidth) : screenWidth
  const gridWidth = effectiveWidth - (CONTAINER_PADDING * 2) - (CARD_PADDING * 2)
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
      const uri = await captureViewAsImage(exportGridRef, { format: 'png', quality: 1 })

      if (action === 'share') {
        await shareImage(uri, { dialogTitle: `${mandalart?.title}` })
      } else {
        await saveToGallery(uri)
        Alert.alert(t('common.success'), t('mandalart.detail.exportSuccess'))
      }
    } catch (err) {
      logger.error('Export error', err)
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('mandalart.detail.exportError'))
    } finally {
      setIsExporting(false)
    }
  }, [mandalart, t])

  const getSubGoalByPosition = useCallback((position: number): SubGoalWithActions | undefined => {
    return mandalart?.sub_goals.find(sg => sg.position === position) as SubGoalWithActions | undefined
  }, [mandalart])

  const handleCenterGoalTap = useCallback(() => {
    setInfoModalVisible(true)
  }, [])

  const handleSubGoalTap = useCallback((position: number) => {
    const subGoal = getSubGoalByPosition(position)
    if (subGoal) {
      setExpandedSubGoal(subGoal)
    } else {
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

  const handleDelete = useCallback(() => {
    setDeleteModalVisible(true)
  }, [])

  const handleDeleteSuccess = useCallback(async (_action: 'deactivate' | 'delete') => {
    await queryClient.invalidateQueries({ queryKey: mandalartKeys.all })
    navigation.goBack()
  }, [queryClient, navigation])

  const handleEditSubGoal = useCallback(() => {
    if (expandedSubGoal) {
      setSelectedSubGoal(expandedSubGoal)
      setEditModalVisible(true)
    }
  }, [expandedSubGoal])

  const handleModalSuccess = useCallback(() => {
    refetch()
  }, [refetch])

  // Sync expandedSubGoal when mandalart data changes
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

  // Render 3x3 cell for main view
  const renderMainCell = (position: number) => {
    if (position === 0) {
      return (
        <CenterGoalCell
          key="center"
          centerGoal={mandalart!.center_goal}
          size={cellSize}
          onPress={handleCenterGoalTap}
          numberOfLines={4}
        />
      )
    }

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

  // Render 3x3 cell for expanded sub-goal view
  const renderExpandedCell = (cellPos: number) => {
    if (!expandedSubGoal) return null

    if (cellPos === 0) {
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
            {t('common.loading')}
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
            {t('mandalart.detail.loadingError')}
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="bg-gray-900 px-6 py-4 rounded-2xl"
          >
            <Text
              className="text-white text-base"
              style={{ fontFamily: 'Pretendard-SemiBold' }}
            >
              {t('common.retry')}
            </Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Loading overlay */}
      {isExporting && (
        <View className="absolute inset-0 bg-black/50 z-50 items-center justify-center">
          <View className="bg-white rounded-2xl p-6 items-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text
              className="text-gray-900 mt-4"
              style={{ fontFamily: 'Pretendard-SemiBold' }}
            >
              {t('common.exporting')}
            </Text>
          </View>
        </View>
      )}

      {/* Header */}
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

      <ScrollView
        className="flex-1"
        contentContainerStyle={isTablet ? { alignItems: 'center', paddingVertical: 24 } : undefined}
      >
        <View style={isTablet ? { width: '100%', maxWidth: contentMaxWidth } : undefined}>

          {/* iPad: Full 9x9 Grid */}
          {isTablet ? (
            (() => {
              const headerHeight = 64 + insets.top
              const verticalPadding = 48
              const availableHeight = screenHeight - headerHeight - verticalPadding
              const availableWidth = screenWidth - (CONTAINER_PADDING * 2)
              const gridSize = Math.min(availableWidth, availableHeight, 800)

              return (
                <View style={{ alignItems: 'center', paddingHorizontal: CONTAINER_PADDING }} ref={gridRef} collapsable={false}>
                  <MandalartFullGrid
                    mandalart={{
                      id: mandalart.id,
                      center_goal: mandalart.center_goal,
                      sub_goals: mandalart.sub_goals as SubGoalWithActions[],
                    }}
                    gridSize={gridSize}
                    onCenterGoalPress={handleCenterGoalTap}
                    onSubGoalPress={(subGoal) => {
                      setSelectedSubGoal(subGoal)
                      setEditModalVisible(true)
                    }}
                    onActionPress={(subGoal, _action) => {
                      setSelectedSubGoal(subGoal)
                      setEditModalVisible(true)
                    }}
                  />
                </View>
              )
            })()
          ) : (
            /* Phone: 3x3 Grid with drill-down */
            <>
              {/* Header Bar */}
              <View style={{ marginHorizontal: CONTAINER_PADDING, marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                {!expandedSubGoal ? (
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
                        {t('mandalart.detail.back')}
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
                        {t('mandalart.detail.edit')}
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>

              {/* 3x3 Grid */}
              <View style={{ paddingHorizontal: CONTAINER_PADDING, marginTop: 16 }} ref={gridRef} collapsable={false}>
                <View
                  className="bg-white rounded-2xl border border-gray-100"
                  style={{
                    padding: CARD_PADDING,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    elevation: 3,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: CELL_GAP }}>
                    {[1, 2, 3].map((pos) =>
                      expandedSubGoal ? renderExpandedCell(pos) : renderMainCell(pos)
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: CELL_GAP, marginTop: CELL_GAP }}>
                    {[4, 0, 5].map((pos) =>
                      expandedSubGoal ? renderExpandedCell(pos) : renderMainCell(pos)
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: CELL_GAP, marginTop: CELL_GAP }}>
                    {[6, 7, 8].map((pos) =>
                      expandedSubGoal ? renderExpandedCell(pos) : renderMainCell(pos)
                    )}
                  </View>
                </View>
              </View>

              {/* Usage Instructions (Phone only) */}
              <View className="px-5 py-5 pb-8">
                <View
                  className="bg-white rounded-2xl p-6 border border-gray-100"
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
                      {t('mandalart.detail.usage.title')}
                    </Text>
                  </View>
                  <Text
                    className="text-sm text-gray-500 mb-2"
                    style={{ fontFamily: 'Pretendard-Regular' }}
                  >
                    • {t('mandalart.detail.usage.tapToView')}
                  </Text>
                  <View className="flex-row items-center">
                    <Text
                      className="text-sm text-gray-500"
                      style={{ fontFamily: 'Pretendard-Regular' }}
                    >
                      • {t('mandalart.detail.usage.typeLabel')}{' '}
                    </Text>
                    <RotateCw size={14} color="#3b82f6" />
                    <Text
                      className="text-sm text-gray-500 ml-1 mr-2"
                      style={{ fontFamily: 'Pretendard-Regular' }}
                    >
                      {t('mandalart.detail.usage.routine')}
                    </Text>
                    <Target size={14} color="#10b981" />
                    <Text
                      className="text-sm text-gray-500 ml-1 mr-2"
                      style={{ fontFamily: 'Pretendard-Regular' }}
                    >
                      {t('mandalart.detail.usage.mission')}
                    </Text>
                    <Lightbulb size={14} color="#f59e0b" />
                    <Text
                      className="text-sm text-gray-500 ml-1"
                      style={{ fontFamily: 'Pretendard-Regular' }}
                    >
                      {t('mandalart.detail.usage.reference')}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Hidden 9x9 Export Grid */}
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

      {/* Modals */}
      <MandalartInfoModal
        visible={infoModalVisible}
        mandalart={mandalart}
        onClose={() => setInfoModalVisible(false)}
        onSuccess={handleModalSuccess}
      />

      <SubGoalEditModal
        visible={editModalVisible}
        subGoal={selectedSubGoal}
        onClose={() => {
          setEditModalVisible(false)
          setSelectedSubGoal(null)
        }}
        onSuccess={handleModalSuccess}
      />

      <DeleteMandalartModal
        visible={deleteModalVisible}
        mandalart={mandalart}
        onClose={() => setDeleteModalVisible(false)}
        onSuccess={handleDeleteSuccess}
      />
    </View>
  )
}
