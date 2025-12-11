import React, { forwardRef } from 'react'
import { View, Text } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { useTranslation } from 'react-i18next'
import type { Mandalart, SubGoal, Action } from '@mandaact/shared'

interface SubGoalWithActions extends SubGoal {
  actions: Action[]
}

interface MandalartWithDetails extends Mandalart {
  sub_goals: SubGoalWithActions[]
}

interface MandalartExportGridProps {
  mandalart: MandalartWithDetails
  size?: number // Grid size in pixels (default 1080 for high quality)
}

/**
 * 9x9 Mandalart Grid for high-resolution export
 * Renders a complete mandalart in a 9x9 grid format optimized for:
 * - Phone wallpapers
 * - Printing
 * - Social sharing
 */
const MandalartExportGrid = forwardRef<View, MandalartExportGridProps>(
  ({ mandalart, size = 1080 }, ref) => {
    const { t } = useTranslation()
    const cellSize = size / 9
    const borderWidth = 2
    const sectionGap = 4

    // Font sizes optimized for 1080px grid - large enough for phone wallpaper
    const fontSize = {
      coreGoal: 28, // Center goal - same as sub-goal
      subGoal: 28,  // Sub-goal titles - semibold
      action: 24,   // Action items - minimum readable on wallpaper
      title: 48,    // Mandalart title at top
      branding: 32, // Footer branding
    }

    // Get sub-goal by position (1-8)
    const getSubGoalByPosition = (position: number): SubGoalWithActions | undefined => {
      return mandalart.sub_goals.find((sg) => sg.position === position)
    }

    // Section position mapping for 3x3 layout of sections
    // Center section (0) is in the middle
    const sectionPositions = [
      [1, 2, 3],
      [4, 0, 5],
      [6, 7, 8],
    ]

    // Render a single cell
    const renderCell = (sectionPos: number, cellPos: number) => {
      const cellStyle = {
        width: cellSize - borderWidth * 2,
        height: cellSize - borderWidth * 2,
        borderWidth,
        borderColor: '#d1d5db',
      }

      // Center section (position 0)
      if (sectionPos === 0) {
        if (cellPos === 4) {
          // Center of center: Core goal with gradient
          return (
            <LinearGradient
              key={`${sectionPos}-${cellPos}`}
              colors={['#2563eb', '#9333ea', '#db2777']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[cellStyle, { alignItems: 'center', justifyContent: 'center', padding: 12 }]}
            >
              <Text
                style={{
                  fontFamily: 'Pretendard-Bold',
                  fontSize: fontSize.coreGoal,
                  color: 'white',
                  textAlign: 'center',
                  lineHeight: fontSize.coreGoal * 1.25,
                  textShadowColor: 'rgba(0,0,0,0.3)',
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 2,
                }}
                numberOfLines={3}
                textBreakStrategy="balanced"
              >
                {mandalart.center_goal}
              </Text>
            </LinearGradient>
          )
        } else {
          // Surrounding cells in center section: Sub-goal titles
          const subGoalPosition = cellPos < 4 ? cellPos + 1 : cellPos
          const subGoal = getSubGoalByPosition(subGoalPosition)
          return (
            <View
              key={`${sectionPos}-${cellPos}`}
              style={[
                cellStyle,
                {
                  backgroundColor: '#eff6ff', // blue-50
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 8,
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
                  numberOfLines={3}
                  textBreakStrategy="balanced"
                >
                  {subGoal.title}
                </Text>
              )}
            </View>
          )
        }
      }

      // Outer sections (positions 1-8)
      const subGoal = getSubGoalByPosition(sectionPos)

      if (cellPos === 4) {
        // Center of section: Sub-goal title (blue background)
        return (
          <View
            key={`${sectionPos}-${cellPos}`}
            style={[
              cellStyle,
              {
                backgroundColor: '#eff6ff', // blue-50
                alignItems: 'center',
                justifyContent: 'center',
                padding: 8,
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
                numberOfLines={3}
                textBreakStrategy="balanced"
              >
                {subGoal.title}
              </Text>
            )}
          </View>
        )
      } else {
        // Action cells (white background)
        // Convert cellPos to action position (0-7, skipping center 4)
        const actionPosition = cellPos < 4 ? cellPos + 1 : cellPos
        const action = subGoal?.actions?.find((a) => a.position === actionPosition)

        return (
          <View
            key={`${sectionPos}-${cellPos}`}
            style={[
              cellStyle,
              {
                backgroundColor: '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
              },
            ]}
          >
            {action?.title && (
              <Text
                style={{
                  fontFamily: 'Pretendard-Regular',
                  fontSize: fontSize.action,
                  color: '#374151',
                  textAlign: 'center',
                  lineHeight: fontSize.action * 1.25,
                }}
                numberOfLines={3}
                textBreakStrategy="balanced"
              >
                {action.title}
              </Text>
            )}
          </View>
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
        ref={ref}
        collapsable={false}
        style={{
          width: size,
          height: size + 140, // Extra space for title and footer
          backgroundColor: '#ffffff',
          padding: 20,
        }}
      >
        {/* Title Header */}
        <View style={{ marginBottom: 20, alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: 'Pretendard-Bold',
              fontSize: fontSize.title,
              color: '#1f2937',
              textAlign: 'center',
              lineHeight: fontSize.title * 1.3,
            }}
          >
            {mandalart.title}
          </Text>
        </View>

        {/* 9x9 Grid (3x3 sections) */}
        <View
          style={{
            backgroundColor: '#e5e7eb', // gray-200 for section gaps
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

        {/* Footer - Branding with Gradient */}
        <View style={{ marginTop: 20, alignItems: 'flex-end' }}>
          <MaskedView
            maskElement={
              <Text
                style={{
                  fontFamily: 'Pretendard-SemiBold',
                  fontSize: fontSize.branding,
                }}
              >
                {t('mandalart.detail.exportWatermark')}
              </Text>
            }
          >
            <LinearGradient
              colors={['#2563eb', '#9333ea', '#db2777']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text
                style={{
                  fontFamily: 'Pretendard-SemiBold',
                  fontSize: fontSize.branding,
                  opacity: 0,
                }}
              >
                {t('mandalart.detail.exportWatermark')}
              </Text>
            </LinearGradient>
          </MaskedView>
        </View>
      </View>
    )
  }
)

MandalartExportGrid.displayName = 'MandalartExportGrid'

export default MandalartExportGrid
