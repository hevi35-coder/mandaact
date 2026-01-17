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
    StyleSheet, // Import StyleSheet for absoluteFillObject
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
import { ChevronLeft, Info, Check } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useResponsive } from '../../hooks/useResponsive'
import CoreGoalModal from '../CoreGoalModal'
import SubGoalModal from '../SubGoalModal'
import { CenterGoalCell, SubGoalCell, MandalartFullGrid } from '..'
import type { PreviewStepProps } from './types'

// Grid layout constants
const CONTAINER_PADDING = 16
const CARD_PADDING = 16
const CELL_GAP = 8

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

    // Local state for modals and navigation
    const [expandedSection, setExpandedSection] = useState<number | null>(null)
    const [coreGoalModalOpen, setCoreGoalModalOpen] = useState(false)
    const [subGoalModalOpen, setSubGoalModalOpen] = useState(false)
    const [selectedSubGoalPosition, setSelectedSubGoalPosition] = useState<number | null>(null)
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

    const handleSubGoalEdit = (_dataPosition: number) => {
        // v20.4: Animation test - Disabled modal inside expanded view
        /*
        setSelectedSubGoalPosition(dataPosition)
        setSubGoalModalOpen(true)
        */
    }

    const handleCoreGoalSave = (saveData: { title: string; centerGoal: string }) => {
        onUpdateData({
            ...data,
            title: saveData.title,
            center_goal: saveData.centerGoal,
        })
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

    // Render cell for expanded section view (Stage 3 Reveal)
    const renderExpandedCell = (sectionDataPos: number, cellVisualPos: number) => {
        // Center cell (The focused sub-goal itself)
        if (cellVisualPos === 4) {
            const subGoal = getSubGoalByDataPosition(sectionDataPos)
            return (
                <View
                    key="center-cell"
                    className="flex-1 items-center justify-center p-2"
                    style={{
                        backgroundColor: '#eff6ff', // bg-blue-50
                        borderWidth: 1,
                        borderColor: '#bfdbfe', // border-blue-200
                    }}
                >
                    {subGoal?.title ? (
                        <Text
                            className="text-center"
                            style={{
                                fontSize: 14,
                                fontFamily: 'Pretendard-SemiBold',
                                color: '#1f2937',
                            }}
                            numberOfLines={3}
                        >
                            {subGoal.title}
                        </Text>
                    ) : (
                        <Text
                            className="text-center"
                            style={{
                                fontSize: 12,
                                fontFamily: 'Pretendard-Regular',
                                color: '#9ca3af',
                            }}
                        >
                            {t('mandalart.create.preview.subGoal')}
                        </Text>
                    )}
                </View>
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
                    onPress={() => handleSubGoalEdit(sectionDataPos)}
                    className="flex-1 items-center justify-center p-2 active:bg-gray-50"
                    style={{
                        backgroundColor: '#ffffff',
                        borderWidth: 0.5,
                        borderColor: '#e5e7eb', // border-gray-200
                    }}
                >
                    {action?.title ? (
                        <Text
                            className="text-center text-gray-800"
                            style={{ fontSize: 12, fontFamily: 'Pretendard-Regular' }}
                            numberOfLines={3}
                        >
                            {action.title}
                        </Text>
                    ) : (
                        <Text
                            className="text-center text-gray-300"
                            style={{ fontSize: 12, fontFamily: 'Pretendard-Regular' }}
                        >
                            -
                        </Text>
                    )}
                </Pressable>
            </Animated.View>
        )
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
                            onPress={onBack}
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
                            onActionPress={(subGoal) => handleSubGoalEdit(subGoal.position)}
                        />
                    </View>
                ) : (
                    // Phone View: 3x3 Grid with drill-down
                    <View className="px-4 py-6">
                        {/* Breadcrumb / Navigation */}
                        {expandedSection !== null && (
                            <Pressable
                                onPress={() => setExpandedSection(null)}
                                className="flex-row items-center mb-4"
                            >
                                <ChevronLeft size={20} color="#6b7280" />
                                <Text className="text-gray-500 ml-1 font-medium">
                                    {t('mandalart.create.preview.backToOverview')}
                                </Text>
                            </Pressable>
                        )}

                        <View
                            className="bg-white rounded-2xl overflow-hidden border border-gray-200"
                            style={{
                                height: gridWidth, // Square aspect ratio
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.05,
                                shadowRadius: 8,
                                elevation: 2,
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
                                    <View className="flex-1 flex-row flex-wrap">
                                        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((pos) => {
                                            // Center Goal
                                            if (pos === 4) {
                                                return (
                                                    <View key={pos} style={{ width: '33.33%', height: '33.33%', padding: 2 }}>
                                                        <CenterGoalCell
                                                            centerGoal={data.center_goal}
                                                            size={cellSize}
                                                            onPress={handleCenterGoalPress}
                                                            numberOfLines={3}
                                                        />
                                                    </View>
                                                )
                                            }

                                            // Sub Goals - convert visual position to data position
                                            const dataPos = visualToDataPosition(pos)
                                            const subGoal = getSubGoalByDataPosition(dataPos)

                                            return (
                                                <View key={pos} style={{ width: '33.33%', height: '33.33%', padding: 2 }}>
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
                                        })}
                                    </View>
                                ) : (
                                    // Expanded Sub-Goal View (3x3 actions)
                                    <View className="flex-1 flex-row flex-wrap">
                                        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((pos) => (
                                            <View
                                                key={pos}
                                                style={{
                                                    width: '33.33%',
                                                    height: '33.33%',
                                                    borderRightWidth: pos % 3 === 2 ? 0 : 1,
                                                    borderBottomWidth: pos >= 6 ? 0 : 1,
                                                    borderColor: '#f3f4f6', // gray-100
                                                }}
                                            >
                                                {renderExpandedCell(expandedSection, pos)}
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </Animated.View>
                        </View>

                        {/* Hint Text */}
                        <Text className="text-center text-gray-400 text-sm mt-6">
                            {expandedSection === null
                                ? t('mandalart.create.preview.tapToEdit')
                                : t('mandalart.create.preview.tapActionToEdit')}
                        </Text>

                        {/* Guide Card - Only show on overview (not expanded) */}
                        {expandedSection === null && (
                            <View
                                className="bg-blue-50 rounded-2xl p-4 mt-4 border border-blue-100"
                            >
                                <View className="flex-row items-center mb-3">
                                    <Info size={18} color="#3b82f6" />
                                    <Text
                                        className="text-sm text-blue-700 ml-2"
                                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                                    >
                                        {t('mandalart.create.manualInput.guideTitle')}
                                    </Text>
                                </View>
                                {(t('mandalart.create.manualInput.guideItems', { returnObjects: true }) as string[]).map((item, index) => (
                                    <View key={index} className="flex-row items-start mb-1.5">
                                        <Check size={14} color="#3b82f6" style={{ marginTop: 2 }} />
                                        <Text
                                            className="text-sm text-blue-600 ml-2 flex-1"
                                            style={{ fontFamily: 'Pretendard-Regular' }}
                                        >
                                            {item}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
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

            {selectedSubGoalPosition !== null && (
                <SubGoalModal
                    visible={subGoalModalOpen}
                    position={selectedSubGoalPosition}
                    initialTitle={getSubGoalByDataPosition(selectedSubGoalPosition)?.title || ''}
                    initialActions={getSubGoalByDataPosition(selectedSubGoalPosition)?.actions || []}
                    onClose={() => {
                        setSubGoalModalOpen(false)
                        setSelectedSubGoalPosition(null)
                    }}
                    onSave={handleSubGoalSave}
                    centerGoal={data.center_goal}
                />
            )}
        </View>
    )
}
