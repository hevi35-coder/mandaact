/**
 * PreviewStep Component
 * 
 * Handles mandalart preview and editing before saving
 */

import React, { useState, useRef } from 'react'
import {
    View,
    Text,
    Pressable,
    ScrollView,
    TextInput,
    useWindowDimensions,
    StyleSheet,
    Alert,
} from 'react-native'
import Animated, {
    FadeIn,
    FadeOut,
    withTiming,
    useAnimatedStyle,
    useSharedValue,
    runOnJS,
    Easing
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, Info, Check, RotateCw, Target, Lightbulb, Plus } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useResponsive } from '../../hooks/useResponsive'
import CoreGoalModal from '../CoreGoalModal'
import SubGoalModalV2 from '../SubGoalModalV2'
import ActionInputModal from '../ActionInputModal'
import { CenterGoalCell, SubGoalCell, MandalartFullGrid, TabletGuidance } from '..'
import type { PreviewStepProps } from './types'

// Grid layout constants
const CONTAINER_PADDING = 16
const CARD_PADDING = 12 // Match MandalartDetailScreen
const CELL_GAP = 8     // Match MandalartDetailScreen

export function PreviewStep({
    data,
    onBack,
    onSave,
    onUpdateData,
    isSaving,
}: PreviewStepProps) {
    const { t } = useTranslation()
    const { width: screenWidth, height: screenHeight } = useWindowDimensions()
    const { isTablet } = useResponsive()
    const scrollRef = useRef<ScrollView>(null)
    const insets = useSafeAreaInsets()

    // Calculate cell size dynamically
    const gridWidth = screenWidth - (CONTAINER_PADDING * 2) - (CARD_PADDING * 2)
    const cellSize = Math.floor((gridWidth - (CELL_GAP * 2)) / 3)

    // Dynamic font sizes based on cell size (matching MandalartFullGrid)
    const fontSize = {
        action: Math.max(11, cellSize * 0.16),
    }

    // Local state for modals and navigation
    const [expandedSection, setExpandedSection] = useState<number | null>(null)
    const [coreGoalModalOpen, setCoreGoalModalOpen] = useState(false)
    const [subGoalModalV2Open, setSubGoalModalV2Open] = useState(false)
    const [selectedSubGoalPosition, setSelectedSubGoalPosition] = useState<number | null>(null)
    const [actionModalOpen, setActionModalOpen] = useState(false)
    const [selectedActionPosition, setSelectedActionPosition] = useState<number | null>(null)
    const [lastVisualTappedPos, setLastVisualTappedPos] = useState<number | null>(null)

    // v20.4: Refined 3-Stage Animation State
    const [animationStage, setAnimationStage] = useState<'idle' | 'expanding' | 'centering' | 'revealing'>('idle')
    const [heroSubGoalTitle, setHeroSubGoalTitle] = useState<string>('')
    const [heroSubGoalActionsCount, setHeroSubGoalActionsCount] = useState<number>(0)

    // Shared Values for Stage 1 & 2
    const heroX = useSharedValue(0)
    const heroY = useSharedValue(0)
    const heroScale = useSharedValue(1)
    const heroOpacity = useSharedValue(0)

    /**
     * Convert visual grid position (0-8) to data position (1-8)
     * Visual grid:    Data positions:
     *   0 1 2           1 2 3
     *   3 4 5    ->     4 C 5  (C = center, no sub-goal)
     *   6 7 8           6 7 8
     *
     * Sequential mapping: Visual 0,1,2,3,5,6,7,8 -> Data 1,2,3,4,5,6,7,8
     */
    const visualToDataPosition = (visualPos: number): number => {
        if (visualPos < 4) return visualPos + 1  // 0,1,2,3 -> 1,2,3,4
        if (visualPos > 4) return visualPos      // 5,6,7,8 -> 5,6,7,8
        return 0  // center (4) has no sub-goal
    }

    // Helper to get sub-goal by data position (1-8)
    const getSubGoalByDataPosition = (dataPosition: number) => {
        return data.sub_goals.find((sg) => sg.position === dataPosition)
    }

    // Handlers
    const handleCenterGoalPress = () => {
        setLastVisualTappedPos(4)
        setCoreGoalModalOpen(true)
    }

    // Note: These handlers work with DATA positions (1-8), not visual positions
    const handleSubGoalPress = (dataPosition: number) => {
        // Find visual position for data position
        const visualPos = [0, 1, 2, 3, 5, 6, 7, 8].find(v => visualToDataPosition(v) === dataPosition)
        const subGoal = getSubGoalByDataPosition(dataPosition)

        // Ensure core goal is set before allowing expansion/sub-goal entry
        if (!data.center_goal?.trim()) {
            Alert.alert(
                t('mandalart.create.manualInput.guideTitle', '만다라트 작성 안내'),
                t('mandalart.create.validation.enterCoreGoal', '핵심 목표를 먼저 입력해주세요.'),
                [
                    {
                        text: t('common.confirm', '확인'),
                        onPress: () => setCoreGoalModalOpen(true)
                    }
                ]
            )
            return
        }

        const vPos = visualPos ?? 4
        setLastVisualTappedPos(vPos)
        setHeroSubGoalTitle(subGoal?.title || '')
        setHeroSubGoalActionsCount(subGoal?.actions?.filter(a => a.title?.trim()).length || 0)

        // Calculate start position
        const offset = cellSize + CELL_GAP // Estimated gap in PreviewStep
        const mappings: Record<number, { x: number, y: number }> = {
            0: { x: -offset, y: -offset },
            1: { x: 0, y: -offset },
            2: { x: offset, y: -offset },
            3: { x: -offset, y: 0 },
            4: { x: 0, y: 0 },
            5: { x: offset, y: 0 },
            6: { x: -offset, y: offset },
            7: { x: 0, y: offset },
            8: { x: offset, y: offset },
        }
        const source = mappings[vPos] || { x: 0, y: 0 }

        // Initialize Shared Values
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
            setExpandedSection(dataPosition)
            setAnimationStage('revealing') // Skip 'centering' literal stage, go to reveal logic

            // 2. Shrink Hero while Actions unfold
            heroScale.value = withTiming(1, { duration: 700 })
        }, 300)

        // Final: Cleanup
        setTimeout(() => {
            heroOpacity.value = withTiming(0, { duration: 250 }, () => {
                runOnJS(setAnimationStage)('idle')
                runOnJS(setHeroSubGoalTitle)('')
                runOnJS(setHeroSubGoalActionsCount)(0)
            })
        }, 1000)
    }

    const handleSubGoalEdit = (dataPosition: number) => {
        // Enforce Core Goal first (Same as handleSubGoalPress)
        if (!data.center_goal?.trim()) {
            Alert.alert(
                t('mandalart.create.manualInput.guideTitle', '만다라트 작성 안내'),
                t('mandalart.create.validation.enterCoreGoal', '핵심 목표를 먼저 입력해주세요.'),
                [
                    {
                        text: t('common.confirm', '확인'),
                        onPress: () => setCoreGoalModalOpen(true)
                    }
                ]
            )
            return
        }

        const subGoal = getSubGoalByDataPosition(dataPosition)
        setSelectedSubGoalPosition(dataPosition)
        // Always use SubGoalModalV2 for consistency with MandalartDetailScreen
        setSubGoalModalV2Open(true)
    }

    const handleCoreGoalSave = (saveData: { title: string; centerGoal: string }) => {
        onUpdateData({
            ...data,
            title: saveData.title,
            center_goal: saveData.centerGoal,
        })
        setCoreGoalModalOpen(false)
    }

    const handleSubGoalSave = (saveData: { position: number; title: string; actions: Array<{ position: number; title: string; type?: string }> }) => {
        const newSubGoals = data.sub_goals.map((sg) =>
            sg.position === saveData.position
                ? {
                    ...sg,
                    title: saveData.title,
                    actions: saveData.actions.map((a) => ({
                        position: a.position,
                        title: a.title,
                    })),
                }
                : sg
        )
        onUpdateData({ ...data, sub_goals: newSubGoals })
    }

    // Handler for SubGoalModalV2 (AI-assisted creation)
    const handleSubGoalV2Save = (title: string) => {
        if (!selectedSubGoalPosition) return
        const newSubGoals = data.sub_goals.map((sg) =>
            sg.position === selectedSubGoalPosition
                ? { ...sg, title }
                : sg
        )
        onUpdateData({ ...data, sub_goals: newSubGoals })
        setSubGoalModalV2Open(false)
        setSelectedSubGoalPosition(null)
    }

    const handleTitleChange = (text: string) => {
        onUpdateData({ ...data, title: text })
    }

    // v20.4: Position-aware animation mapping (Refactored to top-level hook using SharedValues)
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

    // Render cell for overview grid (3x3 main grid)
    const renderOverviewCell = (visualPos: number) => {
        // Center Goal
        if (visualPos === 4) {
            return (
                <View key={visualPos} style={{ width: cellSize, height: cellSize }}>
                    <CenterGoalCell
                        centerGoal={data.center_goal}
                        size={cellSize}
                        onPress={handleCenterGoalPress}
                        numberOfLines={4}
                    />
                </View>
            )
        }

        // Sub Goals - convert visual position to data position
        const dataPos = visualToDataPosition(visualPos)
        const subGoal = getSubGoalByDataPosition(dataPos)

        return (
            <View key={visualPos} style={{ width: cellSize, height: cellSize }}>
                <SubGoalCell
                    title={subGoal?.title || ''}
                    size={cellSize}
                    position={dataPos}
                    filledActions={subGoal?.actions?.filter(a => a.title?.trim()).length || 0}
                    onPress={() => handleSubGoalPress(dataPos)}
                    variant="overview"
                />
            </View>
        )
    }

    // Render cell for expanded section view (Stage 3 Reveal)
    const renderExpandedCell = (sectionDataPos: number, cellVisualPos: number) => {
        // Center cell (The focused sub-goal itself)
        if (cellVisualPos === 4) {
            const subGoal = getSubGoalByDataPosition(sectionDataPos)
            return (
                <SubGoalCell
                    key="center-cell"
                    title={subGoal?.title || ''}
                    size={cellSize}
                    onPress={() => handleSubGoalEdit(sectionDataPos)}
                    variant="center"
                    numberOfLines={3}
                />
            )
        }

        // Action cells - convert visual position to data position
        const actionDataPos = visualToDataPosition(cellVisualPos)
        const subGoal = getSubGoalByDataPosition(sectionDataPos)
        const action = subGoal?.actions.find((a) => a.position === actionDataPos)

        // Radial offset calculation for reveal
        // Start from center (under sub-goal) and fly OUT to visual grid position
        const offset = cellSize + CELL_GAP
        const mappings: Record<number, { x: number, y: number }> = {
            0: { x: -offset, y: -offset },
            1: { x: 0, y: -offset },
            2: { x: offset, y: -offset },
            3: { x: -offset, y: 0 },
            5: { x: offset, y: 0 },
            6: { x: -offset, y: offset },
            7: { x: 0, y: offset },
            8: { x: offset, y: offset },
        }
        const targetPos = mappings[cellVisualPos] || { x: 0, y: 0 }
        const radialOffset = { x: -targetPos.x, y: -targetPos.y }

        return (
            <Animated.View
                key={cellVisualPos}
                className="flex-1"
                entering={FadeIn.duration(700).easing(Easing.out(Easing.back(1.5))).withInitialValues({
                    transform: [{ translateX: radialOffset.x }, { translateY: radialOffset.y }, { scale: 0.01 }],
                    opacity: 0
                })}
            >
                <Pressable
                    onPress={() => handleActionPress(sectionDataPos, actionDataPos)}
                    className={`items-center justify-center p-1.5 rounded-xl border ${action?.title ? 'bg-white border-gray-200 active:bg-gray-50' : 'bg-gray-50 border-gray-100/50 active:bg-gray-100'}`}
                    style={{
                        width: cellSize,
                        height: cellSize,
                    }}
                >
                    {action?.title ? (
                        <Text
                            className="text-[15px] text-gray-800 text-center leading-5"
                            numberOfLines={3}
                        >
                            {action.title}
                        </Text>
                    ) : (
                        <Plus size={20} color="#9ca3af" />
                    )}
                </Pressable>
            </Animated.View>
        )
    }

    // Handler for action cell press - open action modal
    const handleActionPress = (subGoalDataPos: number, actionDataPos: number) => {
        setSelectedSubGoalPosition(subGoalDataPos)
        setSelectedActionPosition(actionDataPos)
        setActionModalOpen(true)
    }

    // Handler for action save
    const handleActionSave = async (title: string, type: string, details?: any) => {
        if (selectedSubGoalPosition === null || selectedActionPosition === null) return

        const newSubGoals = data.sub_goals.map((sg) => {
            if (sg.position === selectedSubGoalPosition) {
                const newActions = sg.actions.map((a) =>
                    a.position === selectedActionPosition
                        ? { ...a, title, type }
                        : a
                )
                return { ...sg, actions: newActions }
            }
            return sg
        })
        onUpdateData({ ...data, sub_goals: newSubGoals })
        setActionModalOpen(false)
        setSelectedActionPosition(null)
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header - Similar to MandalartDetailScreen */}
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
                            onPress={() => {
                                if (expandedSection !== null) {
                                    setExpandedSection(null)
                                } else {
                                    onBack()
                                }
                            }}
                            className="p-2 -ml-2 rounded-full active:bg-gray-100"
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <ChevronLeft size={28} color="#4b5563" />
                        </Pressable>
                        <TextInput
                            value={data.title}
                            onChangeText={handleTitleChange}
                            placeholder={t('mandalart.create.preview.titlePlaceholder')}
                            placeholderTextColor="#9ca3af"
                            className="flex-1 ml-1 text-xl text-gray-900 p-0"
                            style={{ fontFamily: 'Pretendard-SemiBold' }}
                        />
                    </View>
                    <Pressable
                        onPress={onSave}
                        disabled={isSaving || !data.title.trim()}
                        className={`px-5 py-2.5 rounded-2xl ${isSaving || !data.title.trim() ? 'bg-gray-200' : 'bg-gray-900'
                            }`}
                    >
                        <Text
                            className={`${isSaving || !data.title.trim() ? 'text-gray-400' : 'text-white'
                                }`}
                            style={{ fontFamily: 'Pretendard-SemiBold' }}
                        >
                            {isSaving ? t('common.saving') : t('common.save')}
                        </Text>
                    </Pressable>
                </View>
            </View>

            <ScrollView ref={scrollRef} className="flex-1">
                {isTablet ? (
                    // Tablet View: Full Grid
                    <View className="items-center py-8">
                        <MandalartFullGrid
                            mandalart={{
                                id: 'preview',
                                center_goal: data.center_goal,
                                sub_goals: data.sub_goals as any, // Type casting for preview
                            }}
                            gridSize={Math.min(screenWidth - 64, screenHeight - 200)}
                            onCenterGoalPress={handleCenterGoalPress}
                            onSubGoalPress={(subGoal) => handleSubGoalEdit(subGoal.position)}
                            onActionPress={(subGoal, action) => {
                                // Enforce Core Goal first
                                if (!data.center_goal?.trim()) {
                                    Alert.alert(
                                        t('mandalart.create.manualInput.guideTitle', '만다라트 작성 안내'),
                                        t('mandalart.create.validation.enterCoreGoal', '핵심 목표를 먼저 입력해주세요.'),
                                        [
                                            {
                                                text: t('common.confirm', '확인'),
                                                onPress: () => setCoreGoalModalOpen(true)
                                            }
                                        ]
                                    )
                                    return
                                }

                                // Enforce Sub Goal title
                                if (!subGoal.title?.trim()) {
                                    handleSubGoalEdit(subGoal.position)
                                    return
                                }

                                handleActionPress(subGoal.position, action?.position || 1)
                            }}
                        />

                        {/* Guide for Tablet (Split View) */}
                        <TabletGuidance
                            width={Math.min(screenWidth - 64, screenHeight - 200)}
                        />
                    </View>
                ) : (
                    /* Phone: 3x3 Grid with drill-down */
                    <View className="px-4 py-3">
                        {/* Progress Stats Bar - Permanently Visible */}
                        <View className="mb-3 justify-center">
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
                                            {data.center_goal ? 1 : 0}/1
                                        </Text>
                                    </View>
                                    <View className="w-[1px] h-3 bg-gray-100" />
                                    <View className="flex-row items-center">
                                        <Text className="text-[13px] text-gray-400 font-medium" style={{ fontFamily: 'Pretendard-Medium' }}>{t('mandalart.detail.stats.subGoal', '세부목표')} </Text>
                                        <Text className="text-[14px] text-gray-700 font-bold" style={{ fontFamily: 'Pretendard-Bold' }}>
                                            {data.sub_goals.filter(sg => sg.title?.trim()).length}/8
                                        </Text>
                                    </View>
                                    <View className="w-[1px] h-3 bg-gray-100" />
                                    <View className="flex-row items-center">
                                        <Text className="text-[13px] text-gray-400 font-medium" style={{ fontFamily: 'Pretendard-Medium' }}>{t('mandalart.detail.stats.action', '실천항목')} </Text>
                                        <Text className="text-[14px] text-gray-700 font-bold" style={{ fontFamily: 'Pretendard-Bold' }}>
                                            {data.sub_goals.reduce((acc, sg) => acc + (sg.actions?.filter(a => a.title?.trim()).length || 0), 0)}/64
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View
                            className={`bg-white overflow-hidden border border-gray-100 ${animationStage === 'idle' ? 'rounded-2xl' : ''}`}
                            style={{
                                padding: CARD_PADDING,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.06,
                                shadowRadius: 12,
                                elevation: 3,
                                minHeight: gridWidth + (CARD_PADDING * 2),
                                position: 'relative'
                            }}
                        >


                            <Animated.View
                                key={expandedSection === null ? 'overview' : `expanded-${expandedSection}`}
                                className="flex-1"
                                entering={FadeIn.duration(200)}
                                exiting={FadeOut.duration(200)}
                            >
                                {/* Transition Overlay (Stage 1 & 2) */}
                                {animationStage !== 'idle' && (
                                    <Animated.View
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
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
                                                title={heroSubGoalTitle}
                                                size={cellSize}
                                                position={visualToDataPosition(lastVisualTappedPos ?? 4)}
                                                filledActions={heroSubGoalActionsCount}
                                                variant="overview"
                                                onPress={() => { }}
                                            />
                                        </Animated.View>
                                    </Animated.View>
                                )}
                                {expandedSection === null ? (
                                    // Overview 3x3
                                    <View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: CELL_GAP }}>
                                            {[0, 1, 2].map((pos) => renderOverviewCell(pos))}
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: CELL_GAP, marginTop: CELL_GAP }}>
                                            {[3, 4, 5].map((pos) => renderOverviewCell(pos))}
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: CELL_GAP, marginTop: CELL_GAP }}>
                                            {[6, 7, 8].map((pos) => renderOverviewCell(pos))}
                                        </View>
                                    </View>
                                ) : (
                                    // Expanded Sub-Goal View (3x3 actions)
                                    <View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: CELL_GAP }}>
                                            {[0, 1, 2].map((pos) => renderExpandedCell(expandedSection, pos))}
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: CELL_GAP, marginTop: CELL_GAP }}>
                                            {[3, 4, 5].map((pos) => renderExpandedCell(expandedSection, pos))}
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: CELL_GAP, marginTop: CELL_GAP }}>
                                            {[6, 7, 8].map((pos) => renderExpandedCell(expandedSection, pos))}
                                        </View>
                                    </View>
                                )}
                            </Animated.View>
                        </View>


                        {/* Footer Guide/Usage (Phone only) */}
                        <View className="mt-3 pb-8">
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
                                {expandedSection === null ? (
                                    /* Creation Guide - Visible only in Overview */
                                    <>
                                        <View className="flex-row items-center mb-4">
                                            <Info size={20} color="#3b82f6" />
                                            <Text
                                                className="text-base text-gray-900 ml-2"
                                                style={{ fontFamily: 'Pretendard-SemiBold' }}
                                            >
                                                {t('mandalart.create.manualInput.guideTitle', '만다라트 작성 안내')}
                                            </Text>
                                        </View>
                                        {(t('mandalart.create.manualInput.guideItems', { returnObjects: true }) as string[] || []).map((item, index, arr) => (
                                            <View key={index} className={`flex-row items-start ${index === arr.length - 1 ? '' : 'mb-2.5'}`}>
                                                <Check size={16} color="#3b82f6" style={{ marginTop: 2 }} />
                                                <Text
                                                    className="text-sm text-gray-600 ml-2 flex-1"
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
                                                className="text-base text-gray-900 ml-2"
                                                style={{ fontFamily: 'Pretendard-SemiBold' }}
                                            >
                                                {t('mandalart.detail.usage.title', '사용 방법')}
                                            </Text>
                                        </View>

                                        {/* Item 1: Tap to View */}
                                        <View className="flex-row items-start mb-2.5">
                                            <Check size={16} color="#3b82f6" style={{ marginTop: 2 }} />
                                            <Text
                                                className="text-sm text-gray-600 ml-2 flex-1"
                                                style={{ fontFamily: 'Pretendard-Regular' }}
                                            >
                                                {t('mandalart.detail.usage.tapToView', '각 영역을 탭하여 상세보기 및 수정이 가능합니다.')}
                                            </Text>
                                        </View>

                                        {/* Item 2: Navigation Hint */}
                                        <View className="flex-row items-start mb-2.5">
                                            <Check size={16} color="#3b82f6" style={{ marginTop: 2 }} />
                                            <Text
                                                className="text-sm text-gray-600 ml-2 flex-1"
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
                                                        className="text-sm text-gray-600"
                                                        style={{ fontFamily: 'Pretendard-Regular' }}
                                                    >
                                                        {t('mandalart.detail.usage.typeLabel', '타입 구분:')}{' '}
                                                    </Text>
                                                    <View className="flex-row items-center bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
                                                        <RotateCw size={12} color="#3b82f6" />
                                                        <Text
                                                            className="text-[12px] text-gray-500 ml-1 mr-2"
                                                            style={{ fontFamily: 'Pretendard-Medium' }}
                                                        >
                                                            {t('mandalart.detail.usage.routine')}
                                                        </Text>
                                                        <Target size={12} color="#10b981" />
                                                        <Text
                                                            className="text-[12px] text-gray-500 ml-1 mr-2"
                                                            style={{ fontFamily: 'Pretendard-Medium' }}
                                                        >
                                                            {t('mandalart.detail.usage.mission')}
                                                        </Text>
                                                        <Lightbulb size={12} color="#f59e0b" />
                                                        <Text
                                                            className="text-[12px] text-gray-500 ml-1"
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
                    </View>
                )}
            </ScrollView>

            {/* Modals */}
            <CoreGoalModal
                visible={coreGoalModalOpen}
                initialCenterGoal={data.center_goal}
                onClose={() => setCoreGoalModalOpen(false)}
                onSave={handleCoreGoalSave}
            />

            {/* SubGoalModalV2 for all sub-goal editing */}
            {selectedSubGoalPosition !== null && (
                <SubGoalModalV2
                    visible={subGoalModalV2Open}
                    initialTitle={getSubGoalByDataPosition(selectedSubGoalPosition)?.title || ''}
                    onClose={() => {
                        setSubGoalModalV2Open(false)
                        setSelectedSubGoalPosition(null)
                    }}
                    onSave={handleSubGoalV2Save}
                    coreGoal={data.center_goal}
                    existingSubGoals={data.sub_goals.filter(sg => sg.title?.trim() && sg.position !== selectedSubGoalPosition).map(sg => sg.title)}
                />
            )}



            {/* ActionInputModal for editing action items */}
            {selectedSubGoalPosition !== null && selectedActionPosition !== null && (
                <ActionInputModal
                    visible={actionModalOpen}
                    initialTitle={getSubGoalByDataPosition(selectedSubGoalPosition)?.actions.find(a => a.position === selectedActionPosition)?.title || ''}
                    subGoalTitle={getSubGoalByDataPosition(selectedSubGoalPosition)?.title || ''}
                    coreGoal={data.center_goal}
                    existingActions={getSubGoalByDataPosition(selectedSubGoalPosition)?.actions.filter(a => a.title?.trim()).map(a => a.title) || []}
                    onClose={() => {
                        setActionModalOpen(false)
                        setSelectedActionPosition(null)
                    }}
                    onSave={handleActionSave}
                />
            )}
        </View>
    )
}
