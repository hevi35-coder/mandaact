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
  Check,
  Info,
  Plus,
} from 'lucide-react-native'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '../components/Toast'

import { useMandalartWithDetails } from '../hooks/useMandalarts'
import type { MandalartWithDetails } from '@mandaact/shared'
import { saveToGallery, shareImage, captureViewAsImage } from '../services/exportService'
import { supabase } from '../lib/supabase'
import MandalartExportGrid from '../components/MandalartExportGrid'
import SubGoalEditModal from '../components/SubGoalEditModal'
import DeleteMandalartModal from '../components/DeleteMandalartModal'
import SubGoalModalV2 from '../components/SubGoalModalV2'
import ActionInputModal from '../components/ActionInputModal'
import CoreGoalModal from '../components/CoreGoalModal'
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
  const toast = useToast()
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
  const [coreGoalModalVisible, setCoreGoalModalVisible] = useState(false)
  const [isSavingCoreGoal, setIsSavingCoreGoal] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [subGoalModalV2Visible, setSubGoalModalV2Visible] = useState(false)
  const [selectedSubGoalForTitle, setSelectedSubGoalForTitle] = useState<SubGoal | null>(null)

  // v21.4: Action Input Modal State
  const [actionInputModalVisible, setActionInputModalVisible] = useState(false)
  const [selectedActionPosition, setSelectedActionPosition] = useState<number | null>(null)
  const [isSavingAction, setIsSavingAction] = useState(false)

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
    setCoreGoalModalVisible(true)
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

  const handleCoreGoalSave = useCallback(async (saveData: { title: string; centerGoal: string }) => {
    if (!mandalart) return

    setIsSavingCoreGoal(true)
    try {
      const { error } = await supabase
        .from('mandalarts')
        .update({
          title: saveData.title.trim(),
          center_goal: saveData.centerGoal.trim()
        })
        .eq('id', mandalart.id)

      if (error) throw error

      // Invalidate queries to ensure UI is fresh
      queryClient.invalidateQueries({ queryKey: mandalartKeys.all })

      toast.success(t('common.success'))
      setCoreGoalModalVisible(false)
    } catch (err) {
      console.error('Save error:', err)
      toast.error(t('mandalart.create.errors.save'))
    } finally {
      setIsSavingCoreGoal(false)
    }
  }, [mandalart, queryClient, t, toast])

  const handleEditSubGoal = useCallback(() => {
    if (expandedSubGoal) {
      setSelectedSubGoalForTitle(expandedSubGoal)
      setSubGoalModalV2Visible(true)
    }
  }, [expandedSubGoal])

  const handleActionTap = useCallback((position: number) => {
    if (!expandedSubGoal) return

    // If sub-goal is empty, open SubGoal Modal (Title Edit) first
    if (!expandedSubGoal.title || expandedSubGoal.title.trim() === '') {
      setSelectedSubGoalForTitle(expandedSubGoal)
      setSubGoalModalV2Visible(true)
      return
    }

    // Otherwise, open Action Edit Modal with position context
    setSelectedActionPosition(position)
    setActionInputModalVisible(true)
  }, [expandedSubGoal])

  const handleActionSave = useCallback(async (title: string, type: string = 'routine', details: any = {}) => {
    if (!expandedSubGoal || selectedActionPosition === null) return

    setIsSavingAction(true)
    try {
      const existingAction = expandedSubGoal.actions?.find(a => a.position === selectedActionPosition)
      const subGoalId = expandedSubGoal.id

      const updates = {
        sub_goal_id: subGoalId,
        position: selectedActionPosition,
        title: title,
        type: type,
        ...details,
      }

      let error

      if (existingAction) {
        // Update
        const result = await supabase
          .from('actions')
          .update({ title, type, ...details })
          .eq('id', existingAction.id)
        error = result.error
      } else {
        // Insert
        const result = await supabase
          .from('actions')
          .insert(updates)
        error = result.error
      }

      if (error) throw error

      // Update UI via refetch or optimistic (refetch is safer for now due to complex expandedSubGoal sync)
      await queryClient.invalidateQueries({ queryKey: mandalartKeys.all })

      setActionInputModalVisible(false)
      toast.success(t('common.saved'))
    } catch (err) {
      console.error('Action save error:', err)
      toast.error(t('common.error'))
    } finally {
      setIsSavingAction(false)
    }
  }, [expandedSubGoal, selectedActionPosition, queryClient, t, toast])

  const handleSubGoalTitleSave = useCallback(async (newTitle: string, newDescription?: string) => {
    console.log('[MandalartDetailScreen] handleSubGoalTitleSave called');
    console.log('[MandalartDetailScreen] newTitle:', newTitle, 'newDescription:', newDescription);
    console.log('[MandalartDetailScreen] selectedSubGoalForTitle:', selectedSubGoalForTitle);

    if (!selectedSubGoalForTitle) {
      console.warn('[MandalartDetailScreen] No selectedSubGoalForTitle, aborting');
      return
    }

    const trimmedTitle = (newTitle || '').trim();
    const trimmedDesc = newDescription?.trim();

    // Capture values before closing modal to avoid null reference in background task
    const subGoalId = selectedSubGoalForTitle.id;
    const subGoalPosition = selectedSubGoalForTitle.position;

    // STEP 1: Optimistic Update - Update the cache immediately for instant UI feedback
    const queryKey = ['mandalarts', 'detail', id];
    const previousData = queryClient.getQueryData<MandalartWithDetails>(queryKey);

    if (previousData) {
      console.log('[MandalartDetailScreen] Applying optimistic update...');
      const updatedSubGoals = previousData.sub_goals.map(sg =>
        sg.position === subGoalPosition
          ? { ...sg, title: trimmedTitle, description: trimmedDesc || sg.description }
          : sg
      );

      queryClient.setQueryData(queryKey, {
        ...previousData,
        sub_goals: updatedSubGoals
      });

      // v21.4: Update local expandedSubGoal IMMEDIATELY for instant UI transition
      if (expandedSubGoal && expandedSubGoal.position === subGoalPosition) {
        setExpandedSubGoal({
          ...expandedSubGoal,
          title: trimmedTitle,
          description: trimmedDesc || expandedSubGoal.description
        });
      }
    }

    // Close modal immediately for snappy UX
    handleModalSuccess();

    // STEP 2: Persist to database in background
    try {
      const updates: any = {
        mandalart_id: id,
        position: subGoalPosition,
        title: trimmedTitle,
      }

      if (trimmedDesc) {
        updates.description = trimmedDesc;
      }

      console.log('[MandalartDetailScreen] Persisting to DB:', updates);

      let error;

      if (subGoalId) {
        const result = await supabase
          .from('sub_goals')
          .update(updates)
          .eq('id', subGoalId)
        error = result.error
      } else {
        const result = await supabase
          .from('sub_goals')
          .insert(updates)
        error = result.error
      }

      if (error) {
        console.error('[MandalartDetailScreen] Database error:', error);
        // Rollback optimistic update on error
        if (previousData) {
          queryClient.setQueryData(queryKey, previousData);
        }
        Alert.alert(t('common.error'), t('mandalart.subGoalEdit.toast.saveError'))
        return;
      }

      console.log('[MandalartDetailScreen] DB save successful');
      // Refetch in background to sync with server (for new IDs etc.)
      queryClient.invalidateQueries({ queryKey });

    } catch (err) {
      console.error('Failed to update sub-goal title:', err)
      // Rollback optimistic update on error
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData);
      }
      Alert.alert(t('common.error'), t('mandalart.subGoalEdit.toast.saveError'))
    }
  }, [selectedSubGoalForTitle, id, t, handleModalSuccess, queryClient])

  const handleModalSuccess = useCallback(() => {
    console.log('[MandalartDetailScreen] handleModalSuccess - closing modals');
    setSubGoalModalV2Visible(false)
    setSelectedSubGoalForTitle(null)
  }, [])

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
      // v21.4: Match by position instead of ID for more robust sync (especially for new entries)
      const updatedSubGoal = mandalart.sub_goals.find(
        sg => sg.position === expandedSubGoal.position
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
          onPress={() => handleActionTap(cellPos)}
          className={`items-center justify-center p-1.5 rounded-xl border ${action ? 'bg-white border-gray-200 active:bg-gray-50' : 'bg-gray-50 border-gray-100/50 active:bg-gray-100'
            }`}
          style={{
            width: cellSize,
            height: cellSize,
          }}
        >
          {action ? (
            <Text className="text-[15px] text-gray-800 text-center leading-5" numberOfLines={3}>
              {action.title}
            </Text>
          ) : (
            <Plus size={20} color="#9ca3af" />
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
              {/* Progress Stats Bar - Permanently Visible */}
              <View style={{ marginHorizontal: CONTAINER_PADDING, marginTop: 12, justifyContent: 'center' }}>
                <View
                  className="bg-white px-5 py-3 rounded-2xl border border-gray-100 flex-row items-center justify-center"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <View className="flex-row items-center gap-x-5">
                    <View className="flex-row items-center">
                      <Text className="text-[13px] text-gray-400 font-medium" style={{ fontFamily: 'Pretendard-Medium' }}>{t('mandalart.detail.stats.coreGoal', '핵심목표')} </Text>
                      <Text className="text-[14px] text-gray-700 font-bold" style={{ fontFamily: 'Pretendard-Bold' }}>
                        {mandalart.center_goal ? 1 : 0}/1
                      </Text>
                    </View>
                    <View className="w-[1px] h-3 bg-gray-100" />
                    <View className="flex-row items-center">
                      <Text className="text-[13px] text-gray-400 font-medium" style={{ fontFamily: 'Pretendard-Medium' }}>{t('mandalart.detail.stats.subGoal', '세부목표')} </Text>
                      <Text className="text-[14px] text-gray-700 font-bold" style={{ fontFamily: 'Pretendard-Bold' }}>
                        {mandalart.sub_goals.filter(sg => sg.title?.trim()).length}/8
                      </Text>
                    </View>
                    <View className="w-[1px] h-3 bg-gray-100" />
                    <View className="flex-row items-center">
                      <Text className="text-[13px] text-gray-400 font-medium" style={{ fontFamily: 'Pretendard-Medium' }}>{t('mandalart.detail.stats.action', '실천항목')} </Text>
                      <Text className="text-[14px] text-gray-700 font-bold" style={{ fontFamily: 'Pretendard-Bold' }}>
                        {mandalart.sub_goals.reduce((acc, sg) => acc + (sg.actions?.filter(a => a.title?.trim()).length || 0), 0)}/64
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 3x3 Grid */}
              <View style={{ marginHorizontal: CONTAINER_PADDING, marginTop: 12, flex: 1 }} ref={gridRef} collapsable={false}>
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

              {/* Footer Guide/Usage (Phone only) */}
              <View style={{ paddingHorizontal: CONTAINER_PADDING, marginTop: 12, paddingBottom: 32 }}>
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
                  {!expandedSubGoal ? (
                    /* Creation Guide - Visible only in Overview */
                    <>
                      <View className="flex-row items-center mb-4">
                        <Info size={20} color="#3b82f6" />
                        <Text
                          className="text-lg text-gray-900 ml-2"
                          style={{ fontFamily: 'Pretendard-SemiBold' }}
                        >
                          {t('mandalart.create.manualInput.guideTitle', '만다라트 작성 안내')}
                        </Text>
                      </View>
                      {(t('mandalart.create.manualInput.guideItems', { returnObjects: true }) as string[] || []).map((item, index, arr) => (
                        <View key={index} className={`flex-row items-start ${index === arr.length - 1 ? '' : 'mb-2.5'}`}>
                          <Check size={16} color="#3b82f6" style={{ marginTop: 2 }} />
                          <Text
                            className="text-base text-gray-600 ml-2 flex-1"
                            style={{ fontFamily: 'Pretendard-Regular' }}
                          >
                            {item}
                          </Text>
                        </View>
                      ))}
                    </>
                  ) : (
                    /* Usage Instructions - Visible only when Expanded */
                    <>
                      <View className="flex-row items-center mb-4">
                        <Lightbulb size={20} color="#3b82f6" />
                        <Text
                          className="text-lg text-gray-900 ml-2"
                          style={{ fontFamily: 'Pretendard-SemiBold' }}
                        >
                          {t('mandalart.detail.usage.title', '사용 방법')}
                        </Text>
                      </View>

                      {/* Item 1: Tap to View */}
                      <View className="flex-row items-start mb-2.5">
                        <Check size={16} color="#3b82f6" style={{ marginTop: 2 }} />
                        <Text
                          className="text-base text-gray-600 ml-2 flex-1"
                          style={{ fontFamily: 'Pretendard-Regular' }}
                        >
                          {t('mandalart.detail.usage.tapToView')}
                        </Text>
                      </View>

                      {/* Item 2: Navigation Hint */}
                      <View className="flex-row items-start mb-2.5">
                        <Check size={16} color="#3b82f6" style={{ marginTop: 2 }} />
                        <Text
                          className="text-base text-gray-600 ml-2 flex-1"
                          style={{ fontFamily: 'Pretendard-Regular' }}
                        >
                          {t('mandalart.detail.usage.backToOverview', '상단 뒤로가기(<) 버튼을 눌러 전체 보기로 돌아갑니다.')}
                        </Text>
                      </View>

                      {/* Item 3: Types Explanation */}
                      <View className="flex-row items-start">
                        <Check size={16} color="#3b82f6" style={{ marginTop: 2 }} />
                        <View className="ml-2 flex-1">
                          <View className="flex-row items-center">
                            <Text
                              className="text-base text-gray-600"
                              style={{ fontFamily: 'Pretendard-Regular' }}
                            >
                              {t('mandalart.detail.usage.typeLabel', '타입 구분:')}{' '}
                            </Text>
                            <View className="flex-row items-center bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
                              <RotateCw size={12} color="#3b82f6" />
                              <Text
                                className="text-[13px] text-gray-500 ml-1 mr-2"
                                style={{ fontFamily: 'Pretendard-Medium' }}
                              >
                                {t('mandalart.detail.usage.routine')}
                              </Text>
                              <Target size={12} color="#10b981" />
                              <Text
                                className="text-[13px] text-gray-500 ml-1 mr-2"
                                style={{ fontFamily: 'Pretendard-Medium' }}
                              >
                                {t('mandalart.detail.usage.mission')}
                              </Text>
                              <Lightbulb size={12} color="#f59e0b" />
                              <Text
                                className="text-[13px] text-gray-500 ml-1"
                                style={{ fontFamily: 'Pretendard-Medium' }}
                              >
                                {t('mandalart.detail.usage.reference')}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </>
                  )}
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
      <CoreGoalModal
        visible={coreGoalModalVisible}
        initialCenterGoal={mandalart?.center_goal || ''}
        onClose={() => setCoreGoalModalVisible(false)}
        onSave={handleCoreGoalSave}
        isSaving={isSavingCoreGoal}
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

      <SubGoalModalV2
        visible={subGoalModalV2Visible}
        initialTitle={selectedSubGoalForTitle?.title || ''}
        onClose={() => {
          setSubGoalModalV2Visible(false)
          setSelectedSubGoalForTitle(null)
        }}
        onSave={handleSubGoalTitleSave}
        coreGoal={mandalart?.center_goal || ''}
        existingSubGoals={mandalart?.sub_goals?.filter(sg => sg.title?.trim()).map(sg => sg.title) || []}
      />

      <ActionInputModal
        visible={actionInputModalVisible}
        initialTitle={
          expandedSubGoal?.actions?.find(a => a.position === selectedActionPosition)?.title || ''
        }
        subGoalTitle={expandedSubGoal?.title || ''}
        coreGoal={mandalart?.center_goal || ''}
        existingActions={
          expandedSubGoal?.actions?.map(a => a.title).filter(title => !!title) || []
        }
        onClose={() => setActionInputModalVisible(false)}
        onSave={handleActionSave}
        isSaving={isSavingAction}
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
