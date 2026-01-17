/**
 * MandalartDetailScreen - Refactored (Minimal Changes)
 * 
 * This screen is already well-structured with modals separated.
 * We keep the main grid rendering logic here as it's complex and tightly coupled.
 * Only extract reusable UI components.
 */

import React, { useRef, useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  withTiming,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withDelay,
  runOnJS,
  Easing
} from 'react-native-reanimated'
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
  MessageCircle,
} from 'lucide-react-native'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { useMandalartWithDetails } from '../hooks/useMandalarts'
import { saveToGallery, shareImage, captureViewAsImage } from '../services/exportService'
import { supabase } from '../lib/supabase'
import MandalartExportGrid from '../components/MandalartExportGrid'
import MandalartInfoModal from '../components/MandalartInfoModal'
import SubGoalEditModal from '../components/SubGoalEditModal'
import DeleteMandalartModal from '../components/DeleteMandalartModal'
import { CenterGoalCell, SubGoalCell, MandalartFullGrid } from '../components'
import type { RootStackParamList } from '../navigation/RootNavigator'
import type { Action, SubGoal, ActionType } from '@mandaact/shared'
import { logger } from '../lib/logger'
import { mandalartKeys } from '../hooks/useMandalarts'
import { useAuthStore } from '../store/authStore'

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
  const { user } = useAuthStore()

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
  const [selectedSubGoal, setSelectedSubGoal] = useState<SubGoalWithActions | null>(null)
  const [lastTappedPos, setLastTappedPos] = useState<number | null>(null)
  const [infoModalVisible, setInfoModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)

  // v20.4: Refined 3-Stage Animation State
  const [animationStage, setAnimationStage] = useState<'idle' | 'expanding' | 'centering' | 'revealing'>('idle')
  const [heroSubGoal, setHeroSubGoal] = useState<SubGoalWithActions | null>(null)

  // Shared Values for Stage 1 & 2
  const heroX = useSharedValue(0)
  const heroY = useSharedValue(0)
  const heroScale = useSharedValue(1)
  const heroOpacity = useSharedValue(0)

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
    setLastTappedPos(0)
    setInfoModalVisible(true)
  }, [])

  const handleSubGoalTap = useCallback((position: number) => {
    const subGoal = getSubGoalByPosition(position) || {
      id: '',
      mandalart_id: id,
      position,
      title: '',
      created_at: '',
      actions: []
    } as SubGoalWithActions

    setLastTappedPos(position)
    setHeroSubGoal(subGoal)

    // Calculate start position
    const offset = cellSize + CELL_GAP
    const mappings: Record<number, { x: number, y: number }> = {
      1: { x: -offset, y: -offset },
      2: { x: 0, y: -offset },
      3: { x: offset, y: -offset },
      4: { x: -offset, y: 0 },
      0: { x: 0, y: 0 },
      5: { x: offset, y: 0 },
      6: { x: -offset, y: offset },
      7: { x: 0, y: offset },
      8: { x: offset, y: offset },
    }
    const source = mappings[position] || { x: 0, y: 0 }

    // Initialize Shared Values (Jump to start position)
    heroX.value = source.x
    heroY.value = source.y
    heroScale.value = 1
    heroOpacity.value = 0

    // v20.4: Concurrent Shrink & Reveal Strategy
    // Phase A: Expanding (0ms - 300ms)
    setAnimationStage('expanding')
    heroOpacity.value = withTiming(1, { duration: 100 })
    heroX.value = withTiming(0, { duration: 300 })
    heroY.value = withTiming(0, { duration: 300 })
    heroScale.value = withTiming(3.2, { duration: 300 })

    // Phase B & C: Background Swap + Concurrent Reveal (Starts at 300ms)
    setTimeout(() => {
      // 1. Swap background context while Hero is fully covering the screen
      setExpandedSubGoal(subGoal)
      setAnimationStage('revealing') // Skip 'centering' literal stage, go to reveal logic

      // 2. Shrink Hero while Actions unfold
      heroScale.value = withTiming(1, { duration: 700 })
    }, 300)

    // Final: Cleanup
    setTimeout(() => {
      heroOpacity.value = withTiming(0, { duration: 250 }, () => {
        runOnJS(setAnimationStage)('idle')
        runOnJS(setHeroSubGoal)(null)
      })
    }, 1000)
  }, [getSubGoalByPosition, id, cellSize, CELL_GAP, heroX, heroY, heroScale, heroOpacity])

  const handleDelete = useCallback(() => {
    setDeleteModalVisible(true)
  }, [])

  const handleDeleteSuccess = useCallback((_action: 'deactivate' | 'delete') => {
    // v20.4: Immediate navigation - don't await invalidation
    queryClient.invalidateQueries({ queryKey: mandalartKeys.all })
    navigation.goBack()
  }, [queryClient, navigation])

  const handleEditSubGoal = useCallback(() => {
    // v20.4: Animation test - Disabled modal inside expanded view
    /*
    if (expandedSubGoal) {
      setSelectedSubGoal(expandedSubGoal)
      setEditModalVisible(true)
    }
    */
  }, [])

  const handleModalSuccess = useCallback(() => {
    refetch()
  }, [refetch])

  // v18.1: Continue coaching from draft
  const handleContinueCoaching = useCallback(() => {
    if (mandalart?.coaching_session_id) {
      navigation.navigate('ConversationalCoaching', {
        resumeSessionId: mandalart.coaching_session_id,
        mandalartId: mandalart.id,
      } as any)
    }
  }, [mandalart, navigation])

  // v18.1: Finish draft as-is
  const handleFinishDraft = useCallback(async () => {
    if (!mandalart) return

    Alert.alert(
      t('coaching.finishConfirmTitle', '현재 상태로 완료하기'),
      t('coaching.finishConfirmMessage', '아직 비어있는 세부목표가 있어요. 나중에 직접 채울 수 있어요.'),
      [
        { text: t('common.cancel', '취소'), style: 'cancel' },
        {
          text: t('common.confirm', '확인'),
          onPress: async () => {
            try {
              await supabase
                .from('mandalarts')
                .update({ status: 'completed' })
                .eq('id', mandalart.id)

              if (mandalart.coaching_session_id) {
                await supabase
                  .from('coaching_sessions')
                  .update({ status: 'completed' })
                  .eq('id', mandalart.coaching_session_id)
              }

              refetch()
            } catch (err) {
              console.error('Failed to finish draft:', err)
            }
          }
        }
      ]
    )
  }, [mandalart, t, refetch])

  // v20.4: Position-aware animation mapping
  const heroAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: heroX.value },
        { translateY: heroY.value },
        { scale: heroScale.value },
      ],
      opacity: heroOpacity.value,
    }
  })

  // Sync expandedSubGoal when mandalart data changes
  useEffect(() => {
    if (expandedSubGoal && mandalart) {
      const updatedSubGoal = mandalart.sub_goals.find(
        sg => sg.id === expandedSubGoal.id
      ) as SubGoalWithActions | undefined
      if (updatedSubGoal) {
        setExpandedSubGoal(updatedSubGoal)
      }
    }
  }, [mandalart])

  // Sync selectedSubGoal when mandalart data changes (for modal updates)
  useEffect(() => {
    if (selectedSubGoal && mandalart) {
      const updatedSubGoal = mandalart.sub_goals.find(
        sg => sg.id === selectedSubGoal.id
      ) as SubGoalWithActions | undefined
      if (updatedSubGoal) {
        setSelectedSubGoal(updatedSubGoal)
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

    const mode = mandalart?.current_plan_mode || 'base'
    const action = expandedSubGoal.actions?.find(a => {
      if (a.position !== cellPos) return false
      // If action has a variant, it must match the current mode
      if (a.variant && a.variant !== 'extra') {
        return a.variant === mode
      }
      // If no variant or 'extra', always show
      return true
    })

    // Calculate radial offset for Stage 3 reveal
    const getRadialOffset = () => {
      // Map back to grid positions (1-8)
      // We want them to start at the center (where cell 0 is) and fly OUT to their positions.
      // The current cellPos (1-8) defines where they ARE. 
      // So the initial translateX should be the NEGATIVE of their offset from center.
      const col = (cellPos - 1) % 3
      const row = Math.floor((cellPos - 1) / 3)

      const offset = cellSize + CELL_GAP
      const mappings: Record<number, { x: number, y: number }> = {
        1: { x: -offset, y: -offset },
        2: { x: 0, y: -offset },
        3: { x: offset, y: -offset },
        4: { x: -offset, y: 0 },
        5: { x: offset, y: 0 },
        6: { x: -offset, y: offset },
        7: { x: 0, y: offset },
        8: { x: offset, y: offset },
      }
      const targetPos = mappings[cellPos] || { x: 0, y: 0 }

      // Start at center (0,0 relative to the container center point)
      // Wait, each Animated.View is positioned by the grid layout.
      // So to make it start at center, we need to translate it by -targetPos.x/y.
      return { x: -targetPos.x, y: -targetPos.y }
    }

    const radialOffset = getRadialOffset()

    return (
      <Animated.View
        key={cellPos}
        entering={FadeIn.duration(700).easing(Easing.out(Easing.back(1.5))).withInitialValues({
          transform: [{ translateX: radialOffset.x }, { translateY: radialOffset.y }, { scale: 0.01 }],
          opacity: 0
        })}
      >
        <Pressable
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
      </Animated.View>
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
        <View
          className="z-50"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View className="bg-white rounded-2xl p-6 items-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text
              className="text-gray-900 mt-4 text-center"
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
            {/* Coaching History Button - Only show for coaching-created mandalarts */}
            {mandalart.coaching_session_id && (
              <Pressable
                onPress={() => navigation.navigate('CoachingHistory', { sessionId: mandalart.coaching_session_id! })}
                className="p-2.5 rounded-full active:bg-gray-100"
              >
                <MessageCircle size={22} color="#6366f1" />
              </Pressable>
            )}
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

      {/* v18.1: Draft Action Buttons - AI Coaching PAUSED (2026-01-17) */}
      {mandalart.status === 'draft' && (
        <View className="bg-amber-50 border-b border-amber-100 px-4 py-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text
                className="text-amber-800 text-sm"
                style={{ fontFamily: 'Pretendard-Medium' }}
              >
                {t('mandalart.draftDescription', '코칭이 진행 중이에요')}
              </Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable
                onPress={handleFinishDraft}
                className="bg-amber-500 px-3 py-1.5 rounded-lg active:opacity-70"
              >
                <Text
                  className="text-white text-sm"
                  style={{ fontFamily: 'Pretendard-SemiBold' }}
                >
                  {t('coaching.finishNow', '이대로 완료하기')}
                </Text>
              </Pressable>
              {/* AI Coaching PAUSED - 코칭 이어하기 button removed */}
            </View>
          </View>
        </View>
      )}

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
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                  style={{
                    padding: CARD_PADDING,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    elevation: 3,
                    minHeight: gridWidth + (CARD_PADDING * 2),
                    position: 'relative', // Ensure relative positioning for absolute shield
                  }}
                >
                  {/* Transition Overlay (Stage 1 & 2) */}
                  {animationStage !== 'idle' && heroSubGoal && (
                    <Animated.View
                      style={{
                        position: 'absolute',
                        top: CARD_PADDING,
                        left: CARD_PADDING,
                        width: gridWidth,
                        height: gridWidth,
                        zIndex: 100,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      pointerEvents="none"
                    >
                      <Animated.View
                        entering={FadeIn.duration(100)}
                        style={heroAnimatedStyle}
                      >
                        <SubGoalCell
                          title={heroSubGoal.title}
                          size={cellSize}
                          position={heroSubGoal.position}
                          filledActions={heroSubGoal.actions?.length || 0}
                          variant="overview"
                          onPress={() => { }}
                        />
                      </Animated.View>
                    </Animated.View>
                  )}

                  <Animated.View
                    key={expandedSubGoal ? `expanded-${expandedSubGoal.id}` : 'overview'}
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(200)}
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
                  </Animated.View>
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
      </ScrollView >

      {/* Hidden 9x9 Export Grid */}
      < View
        style={{
          position: 'absolute',
          left: -9999,
          top: -9999,
          opacity: 0,
        }
        }
        pointerEvents="none"
      >
        <MandalartExportGrid
          ref={exportGridRef}
          mandalart={mandalart}
          size={1080}
        />
      </View >

      {/* Modals */}
      < MandalartInfoModal
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
    </View >
  )
}
