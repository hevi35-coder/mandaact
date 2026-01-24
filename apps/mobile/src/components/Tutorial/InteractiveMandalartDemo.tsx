import React, { useState, useEffect } from 'react'
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native'
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
    Easing,
    runOnJS,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { useTranslation } from 'react-i18next'

// Optional haptics - won't crash if not installed
let Haptics: any = null
try {
    Haptics = require('expo-haptics')
} catch (e) {
    console.log('expo-haptics not available')
}

interface InteractiveMandalartDemoProps {
    onInteractionComplete?: () => void
    size?: number
}

export default function InteractiveMandalartDemo({
    onInteractionComplete,
    size = 180,
}: InteractiveMandalartDemoProps) {
    const { t } = useTranslation()
    const { width } = useWindowDimensions()
    const isTablet = width >= 768
    const [tapped, setTapped] = useState(false)
    const [showTooltip, setShowTooltip] = useState(false)

    // Pulse animation for center cell
    const pulseScale = useSharedValue(1)
    const tooltipOpacity = useSharedValue(0)
    const tooltipTranslateY = useSharedValue(10)
    const centerCellScale = useSharedValue(1)

    // Start pulse animation on mount
    useEffect(() => {
        if (!tapped) {
            pulseScale.value = withRepeat(
                withSequence(
                    withTiming(1.08, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
                ),
                -1, // infinite
                true
            )
        }
    }, [tapped])

    const handleCenterTap = () => {
        if (tapped) return

        // Haptic feedback (optional)
        if (Haptics?.impactAsync) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        }

        // Stop pulse and animate tap
        pulseScale.value = 1
        centerCellScale.value = withSequence(
            withSpring(0.9, { damping: 10, stiffness: 400 }),
            withSpring(1.1, { damping: 8, stiffness: 300 }),
            withSpring(1, { damping: 10, stiffness: 400 })
        )

        // Show tooltip
        setTapped(true)
        setShowTooltip(true)
        tooltipOpacity.value = withTiming(1, { duration: 300 })
        tooltipTranslateY.value = withSpring(0, { damping: 15, stiffness: 200 })

        // Notify parent
        if (onInteractionComplete) {
            setTimeout(() => {
                runOnJS(onInteractionComplete)()
            }, 500)
        }
    }

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: tapped ? 1 : pulseScale.value }],
    }))

    const centerCellStyle = useAnimatedStyle(() => ({
        transform: [{ scale: centerCellScale.value }],
    }))

    const tooltipStyle = useAnimatedStyle(() => ({
        opacity: tooltipOpacity.value,
        transform: [{ translateY: tooltipTranslateY.value }],
    }))

    const gap = 8
    const cellSize = (size - gap * 2) / 3 // 3 cells with 2 gaps

    const renderCell = (index: number) => {
        const isCenter = index === 4

        if (isCenter) {
            return (
                <Animated.View key={index} style={[pulseStyle, centerCellStyle]}>
                    <Pressable onPress={handleCenterTap} disabled={tapped}>
                        <LinearGradient
                            colors={tapped ? ['#2563eb', '#9333ea', '#db2777'] : ['#3b82f6', '#a855f7', '#ec4899']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{
                                width: cellSize,
                                height: cellSize,
                                borderRadius: cellSize * 0.2,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {!tapped && (
                                <Text style={styles.tapHint}>👆</Text>
                            )}
                            {tapped && (
                                <Text style={styles.checkmark}>✓</Text>
                            )}
                        </LinearGradient>
                    </Pressable>
                </Animated.View>
            )
        }

        return (
            <View
                key={index}
                style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: cellSize * 0.2,
                    backgroundColor: '#e5e7eb',
                }}
            />
        )
    }

    // Render as 3 explicit rows
    const renderRow = (rowIndex: number) => (
        <View key={rowIndex} style={{ flexDirection: 'row', gap }}>
            {[0, 1, 2].map(colIndex => renderCell(rowIndex * 3 + colIndex))}
        </View>
    )

    return (
        <View style={styles.container}>
            {/* Status area - fixed height to prevent layout shift */}
            <View style={styles.statusArea}>
                {showTooltip ? (
                    <Animated.View style={[styles.tooltipRow, tooltipStyle]}>
                        <View style={styles.tooltip}>
                            <Text style={styles.tooltipEmoji}>🎯</Text>
                            <Text style={[styles.tooltipText, isTablet && styles.tooltipTextTablet]}>
                                {t('tutorial.interactiveDemo.coreGoal', { defaultValue: '핵심 목표!' })}
                            </Text>
                        </View>
                        <View style={styles.rewardBadge}>
                            <Text style={styles.rewardText}>+5 XP</Text>
                        </View>
                    </Animated.View>
                ) : (
                    <Text style={[styles.hintText, isTablet && styles.hintTextTablet]}>
                        {t('tutorial.interactiveDemo.tapHint', { defaultValue: '중앙 셀을 탭해보세요' })}
                    </Text>
                )}
            </View>

            {/* Grid */}
            <View style={{ gap }}>
                {[0, 1, 2].map(rowIndex => renderRow(rowIndex))}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusArea: {
        height: 40,
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: 8,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cell: {
        margin: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    outerCell: {
        backgroundColor: '#e5e7eb',
    },
    tapHint: {
        fontSize: 24,
    },
    checkmark: {
        fontSize: 28,
        color: 'white',
        fontWeight: 'bold',
    },
    tooltipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    tooltip: {
        backgroundColor: '#1f2937',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    tooltipEmoji: {
        fontSize: 16,
    },
    tooltipText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Pretendard-Bold',
    },
    tooltipTextTablet: {
        fontSize: 20,
    },
    hintText: {
        fontSize: 14,
        color: '#6b7280',
        fontFamily: 'Pretendard-Medium',
    },
    hintTextTablet: {
        fontSize: 18,
    },
    rewardBadge: {
        backgroundColor: '#fef3c7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#fbbf24',
    },
    rewardText: {
        color: '#d97706',
        fontSize: 14,
        fontFamily: 'Pretendard-Bold',
    },
})
