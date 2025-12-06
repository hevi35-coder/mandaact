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
import { ArrowLeft, ChevronLeft } from 'lucide-react-native'
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
        setCoreGoalModalOpen(true)
    }

    // Note: These handlers work with DATA positions (1-8), not visual positions
    const handleSubGoalPress = (dataPosition: number) => {
        setExpandedSection(dataPosition)
        // Scroll to top when expanding
        setTimeout(() => {
            scrollRef.current?.scrollTo({ y: 0, animated: true })
        }, 100)
    }

    const handleSubGoalEdit = (dataPosition: number) => {
        setSelectedSubGoalPosition(dataPosition)
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
    // sectionDataPos: data position of the sub-goal (1-8)
    // cellVisualPos: visual grid position (0-8, where 4 is center)
    const renderExpandedCell = (sectionDataPos: number, cellVisualPos: number) => {
        const subGoal = getSubGoalByDataPosition(sectionDataPos)

        if (cellVisualPos === 4) {
            // Center: Sub-goal title (clickable to edit)
            return (
                <Pressable
                    onPress={() => handleSubGoalEdit(sectionDataPos)}
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
                </Pressable>
            )
        }

        // Actions - convert visual position to data position
        // Visual: 0 1 2 / 3 C 5 / 6 7 8 (C=center at 4)
        // Data:   1 2 3 / 4 - 5 / 6 7 8
        const actionDataPos = visualToDataPosition(cellVisualPos)
        const action = subGoal?.actions.find((a) => a.position === actionDataPos)

        return (
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
                        placeholderTextColor="#9ca3af"
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
                    initialTitle={getSubGoalByDataPosition(selectedSubGoalPosition)?.title || ''}
                    initialActions={getSubGoalByDataPosition(selectedSubGoalPosition)?.actions || []}
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
