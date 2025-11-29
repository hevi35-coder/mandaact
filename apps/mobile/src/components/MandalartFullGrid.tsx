import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { SubGoal, Action } from '@mandaact/shared'

// Sub-goal with actions type
interface SubGoalWithActions extends SubGoal {
  actions: Action[]
}

interface MandalartData {
  id: string
  center_goal: string
  sub_goals: SubGoalWithActions[]
}

interface MandalartFullGridProps {
  mandalart: MandalartData
  gridSize: number // Total grid width
  onCenterGoalPress?: () => void
  onSubGoalPress?: (subGoal: SubGoalWithActions) => void
  onActionPress?: (subGoal: SubGoalWithActions, action?: Action) => void
}

/**
 * Interactive 9x9 Full Mandalart Grid for iPad
 * Based on MandalartExportGrid but with touch interactions
 */
export default function MandalartFullGrid({
  mandalart,
  gridSize,
  onCenterGoalPress,
  onSubGoalPress,
  onActionPress,
}: MandalartFullGridProps) {
  // Calculate dimensions - account for section gaps
  const sectionGap = 4
  const totalGaps = sectionGap * 2 // 2 gaps between 3 sections
  const availableSize = gridSize - totalGaps
  const sectionSize = availableSize / 3
  const cellSize = sectionSize / 3
  const borderWidth = 1

  // Dynamic font sizes based on cell size
  const fontSize = {
    coreGoal: Math.max(14, cellSize * 0.22),
    subGoal: Math.max(13, cellSize * 0.20),
    action: Math.max(11, cellSize * 0.16),
  }

  // Get sub-goal by position (1-8)
  const getSubGoalByPosition = (position: number): SubGoalWithActions | undefined => {
    return mandalart.sub_goals.find((sg) => sg.position === position)
  }

  // Section position mapping for 3x3 layout of sections
  const sectionPositions = [
    [1, 2, 3],
    [4, 0, 5],
    [6, 7, 8],
  ]

  // Render a single cell
  const renderCell = (sectionPos: number, cellPos: number) => {
    const cellStyle = {
      width: cellSize,
      height: cellSize,
      borderWidth,
      borderColor: '#d1d5db',
    }

    // Center section (position 0)
    if (sectionPos === 0) {
      if (cellPos === 4) {
        // Center of center: Core goal with gradient
        return (
          <Pressable
            key={`${sectionPos}-${cellPos}`}
            onPress={onCenterGoalPress}
            style={{ opacity: 1 }}
          >
            <LinearGradient
              colors={['#2563eb', '#9333ea', '#db2777']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[cellStyle, { alignItems: 'center', justifyContent: 'center', padding: 6 }]}
            >
              <Text
                style={{
                  fontFamily: 'Pretendard-Bold',
                  fontSize: fontSize.coreGoal,
                  color: 'white',
                  textAlign: 'center',
                  lineHeight: fontSize.coreGoal * 1.25,
                }}
                numberOfLines={4}
              >
                {mandalart.center_goal}
              </Text>
            </LinearGradient>
          </Pressable>
        )
      } else {
        // Surrounding cells in center section: Sub-goal titles
        const subGoalPosition = cellPos < 4 ? cellPos + 1 : cellPos
        const subGoal = getSubGoalByPosition(subGoalPosition)
        return (
          <Pressable
            key={`${sectionPos}-${cellPos}`}
            onPress={() => subGoal && onSubGoalPress?.(subGoal)}
            style={[
              cellStyle,
              {
                backgroundColor: '#eff6ff',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
              },
            ]}
          >
            {subGoal?.title && (
              <Text
                style={{
                  fontFamily: 'Pretendard-SemiBold',
                  fontSize: fontSize.subGoal,
                  color: '#1f2937',
                  textAlign: 'center',
                  lineHeight: fontSize.subGoal * 1.25,
                }}
                numberOfLines={4}
              >
                {subGoal.title}
              </Text>
            )}
          </Pressable>
        )
      }
    }

    // Outer sections (positions 1-8)
    const subGoal = getSubGoalByPosition(sectionPos)

    if (cellPos === 4) {
      // Center of section: Sub-goal title (blue background)
      return (
        <Pressable
          key={`${sectionPos}-${cellPos}`}
          onPress={() => subGoal && onSubGoalPress?.(subGoal)}
          style={[
            cellStyle,
            {
              backgroundColor: '#eff6ff',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 4,
            },
          ]}
        >
          {subGoal?.title && (
            <Text
              style={{
                fontFamily: 'Pretendard-SemiBold',
                fontSize: fontSize.subGoal,
                color: '#1f2937',
                textAlign: 'center',
                lineHeight: fontSize.subGoal * 1.25,
              }}
              numberOfLines={4}
            >
              {subGoal.title}
            </Text>
          )}
        </Pressable>
      )
    } else {
      // Action cells (white background)
      const actionPosition = cellPos < 4 ? cellPos + 1 : cellPos
      const action = subGoal?.actions?.find((a) => a.position === actionPosition)

      return (
        <Pressable
          key={`${sectionPos}-${cellPos}`}
          onPress={() => subGoal && onActionPress?.(subGoal, action)}
          style={[
            cellStyle,
            {
              backgroundColor: '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 3,
            },
          ]}
        >
          {action?.title ? (
            <Text
              style={{
                fontFamily: 'Pretendard-Regular',
                fontSize: fontSize.action,
                color: '#374151',
                textAlign: 'center',
                lineHeight: fontSize.action * 1.25,
              }}
              numberOfLines={4}
            >
              {action.title}
            </Text>
          ) : (
            <Text style={{ fontSize: fontSize.action * 0.8, color: '#d1d5db' }}>-</Text>
          )}
        </Pressable>
      )
    }
  }

  // Render a 3x3 section
  const renderSection = (sectionPos: number) => {
    const cellPositions = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
    ]

    return (
      <View key={sectionPos}>
        {cellPositions.map((row, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row' }}>
            {row.map((cellPos) => renderCell(sectionPos, cellPos))}
          </View>
        ))}
      </View>
    )
  }

  return (
    <View
      style={{
        width: gridSize,
        backgroundColor: '#e5e7eb',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {sectionPositions.map((row, rowIdx) => (
        <View
          key={rowIdx}
          style={{
            flexDirection: 'row',
            marginTop: rowIdx > 0 ? sectionGap : 0,
          }}
        >
          {row.map((sectionPos, colIdx) => (
            <View
              key={sectionPos}
              style={{
                marginLeft: colIdx > 0 ? sectionGap : 0,
              }}
            >
              {renderSection(sectionPos)}
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}
