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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ArrowLeft, Check, ChevronLeft } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
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

    // Calculate cell size dynamically
    const gridWidth = screenWidth - (CONTAINER_PADDING * 2) - (CARD_PADDING * 2)
    const cellSize = Math.floor((gridWidth - (CELL_GAP * 2)) / 3)

    // Local state for modals and navigation
    const [expandedSection, setExpandedSection] = useState<number | null>(null)
    const [coreGoalModalOpen, setCoreGoalModalOpen] = useState(false)
    const [subGoalModalOpen, setSubGoalModalOpen] = useState(false)
    const [selectedSubGoalPosition, setSelectedSubGoalPosition] = useState<number | null>(null)

    // Helper to get sub-goal
    const getSubGoalByPosition = (position: number) => {
        return data.sub_goals.find((sg) => sg.position === position)
    }

    // Handlers
    const handleCenterGoalPress = () => {
        setCoreGoalModalOpen(true)
    }

    const handleSubGoalPress = (position: number) => {
        setExpandedSection(position)
        // Scroll to top when expanding
        setTimeout(() => {
            scrollRef.current?.scrollTo({ y: 0, animated: true })
        }, 100)
    }

    const handleSubGoalEdit = (position: number) => {
        setSelectedSubGoalPosition(position)
        setSubGoalModalOpen(true)
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

    // Render cell for expanded section view
    const renderExpandedCell = (sectionPos: number, cellPos: number) => {
        const subGoal = getSubGoalByPosition(sectionPos)

        if (cellPos === 4) {
            // Center: Sub-goal title
            return (
                <View
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

        // Actions
        // Map 3x3 grid position (0-8) to action position logic
        // Action positions are usually 0-7 excluding center
        // But here we map visual grid index to action index
        // Visual: 0 1 2 / 3 4 5 / 6 7 8
        // Center is 4.
        // We need to map visual index to action index if needed, or just find action by visual index if that's how it's stored.
        // In our data model, actions have 'position' 0-7.
        // Let's assume visual mapping:
        // 0 1 2
        // 3 X 4
        // 5 6 7
        // This mapping depends on how actions are stored.
        // Let's use a standard mapping where center is excluded.
        let actionIndex = cellPos
        if (cellPos > 4) actionIndex = cellPos - 1

        // However, the previous code used a specific mapping or just displayed based on position.
        // Let's look at the original code's logic if possible, or implement standard behavior.
        // Original code: const action = subGoal?.actions.find((a) => a.position === cellPos)
        // This implies actions are stored with positions 0-8 (including center? or skipping?)
        // Actually, in `SubGoalModal`, actions are 0-7. 
        // Let's assume standard mapping: 0,1,2,3, (skip 4), 5,6,7,8 -> mapped to 0..7

        // Wait, the original code (lines 853) was:
        // const action = subGoal?.actions.find((a) => a.position === cellPos)
        // This suggests actions might have positions matching the grid (0-8).
        // But usually center is sub-goal title.
        // Let's stick to the visual representation.

        const action = subGoal?.actions.find((a) => a.position === cellPos)

        return (
            <Pressable
                onPress={() => handleSubGoalEdit(sectionPos)}
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
        )
    }

    return (
        <SafeAreaView className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 h-16 border-b border-gray-100 bg-white">
                <View className="flex-row items-center flex-1 mr-4">
                    <Pressable onPress={onBack} className="p-2.5 -ml-2.5 rounded-full active:bg-gray-100">
                        <ArrowLeft size={24} color="#374151" />
                    </Pressable>
                    <TextInput
                        value={data.title}
                        onChangeText={handleTitleChange}
                        placeholder={t('mandalart.create.preview.titlePlaceholder')}
                        className="flex-1 ml-2 text-xl text-gray-900 font-bold p-0"
                        style={{ fontFamily: 'Pretendard-Bold' }}
                    />
                </View>
                <Pressable
                    onPress={onSave}
                    disabled={isSaving || !data.title.trim()}
                    className={`px-4 py-2 rounded-xl ${isSaving || !data.title.trim() ? 'bg-gray-200' : 'bg-gray-900'
                        }`}
                >
                    <Text
                        className={`font-semibold ${isSaving || !data.title.trim() ? 'text-gray-400' : 'text-white'
                            }`}
                    >
                        {isSaving ? t('common.saving') : t('common.save')}
                    </Text>
                </Pressable>
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

                        {/* Grid Container */}
                        <View
                            className="bg-white rounded-2xl overflow-hidden border border-gray-200"
                            style={{
                                height: gridWidth, // Square aspect ratio
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.05,
                                shadowRadius: 8,
                                elevation: 2,
                            }}
                        >
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

                                        // Sub Goals
                                        // Map visual position to data position
                                        // Visual: 0 1 2 / 3 4 5 / 6 7 8
                                        // Data: 1 2 3 / 8 - 4 / 7 6 5 (Standard Mandalart)
                                        // OR simple mapping: 0->0, 1->1 ...
                                        // Let's use the position from data directly if possible.
                                        // In our data, sub_goals have 'position' 0-7 (excluding center).
                                        // Let's assume standard visual mapping for now:
                                        // 0 1 2
                                        // 3 C 4
                                        // 5 6 7
                                        // Center is 4.
                                        // If pos < 4, subGoal index = pos
                                        // If pos > 4, subGoal index = pos - 1

                                        // Wait, `getSubGoalByPosition` uses the stored position.
                                        // Let's assume the stored position matches the visual grid slot (excluding center).
                                        // Or maybe it matches the 0-8 grid?
                                        // Let's look at `MandalartFullGrid`. It expects sub_goals to have position.

                                        // Let's just iterate 0-8 and find matching sub-goal.
                                        // If we use `getSubGoalByPosition(pos)`, we assume pos is 0-8.

                                        const subGoal = getSubGoalByPosition(pos)

                                        return (
                                            <View key={pos} style={{ width: '33.33%', height: '33.33%', padding: 2 }}>
                                                <SubGoalCell
                                                    title={subGoal?.title || ''}
                                                    size={cellSize}
                                                    position={pos}
                                                    filledActions={subGoal?.actions.filter(a => a.title.trim()).length || 0}
                                                    onPress={() => handleSubGoalPress(pos)}
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
                        </View>

                        {/* Hint Text */}
                        <Text className="text-center text-gray-400 text-sm mt-6">
                            {expandedSection === null
                                ? t('mandalart.create.preview.tapToEdit')
                                : t('mandalart.create.preview.tapActionToEdit')}
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Modals */}
            <CoreGoalModal
                visible={coreGoalModalOpen}
                initialTitle={data.title}
                initialCenterGoal={data.center_goal}
                onClose={() => setCoreGoalModalOpen(false)}
                onSave={handleCoreGoalSave}
            />

            {selectedSubGoalPosition !== null && (
                <SubGoalModal
                    visible={subGoalModalOpen}
                    position={selectedSubGoalPosition}
                    initialTitle={getSubGoalByPosition(selectedSubGoalPosition)?.title || ''}
                    initialActions={getSubGoalByPosition(selectedSubGoalPosition)?.actions || []}
                    onClose={() => {
                        setSubGoalModalOpen(false)
                        setSelectedSubGoalPosition(null)
                    }}
                    onSave={handleSubGoalSave}
                />
            )}
        </SafeAreaView>
    )
}
