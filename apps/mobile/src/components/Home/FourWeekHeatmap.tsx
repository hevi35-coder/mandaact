/**
 * FourWeekHeatmap Component
 * 
 * Displays a 4-week activity heatmap
 */

import React from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Calendar } from 'lucide-react-native'
import type { FourWeekHeatmapProps } from './types'

export function FourWeekHeatmap({ fourWeekData, isLoading }: FourWeekHeatmapProps) {
    const { t } = useTranslation()
    const todayStr = new Date().toISOString().split('T')[0]

    return (
        <View>
            <View className="flex-row items-center gap-2 mb-4">
                <Calendar size={16} color="#6b7280" />
                <Text className="text-sm font-medium text-gray-700">{t('home.streak.recent4Weeks')}</Text>
            </View>

            {isLoading ? (
                <View className="py-4 items-center">
                    <ActivityIndicator size="small" color="#2563eb" />
                </View>
            ) : (
                <>
                    {/* 28-day grid: 4 rows x 7 columns */}
                    <View className="mb-3" style={{ gap: 8 }}>
                        {[0, 1, 2, 3].map((rowIndex) => (
                            <View key={rowIndex} className="flex-row justify-between">
                                {fourWeekData.slice(rowIndex * 7, rowIndex * 7 + 7).map((day) => {
                                    const isToday = day.date === todayStr
                                    const intensity = day.percentage >= 80
                                        ? 'high'
                                        : day.percentage >= 50
                                            ? 'medium'
                                            : day.percentage >= 20
                                                ? 'low'
                                                : day.percentage > 0
                                                    ? 'minimal'
                                                    : 'none'

                                    // Color mapping matching web app (Tailwind green)
                                    const bgColor = intensity === 'high'
                                        ? '#22c55e' // green-500
                                        : intensity === 'medium'
                                            ? '#4ade80' // green-400
                                            : intensity === 'low'
                                                ? '#86efac' // green-300
                                                : intensity === 'minimal'
                                                    ? '#bbf7d0' // green-200
                                                    : '#e5e5e5' // neutral-200 (muted background)

                                    return (
                                        <View
                                            key={day.date}
                                            style={{
                                                width: 38,
                                                height: 38,
                                                borderRadius: 6,
                                                backgroundColor: bgColor,
                                                borderWidth: isToday ? 2 : 0,
                                                borderColor: isToday ? '#1f2937' : 'transparent', // gray-800
                                                shadowColor: intensity !== 'none' ? '#22c55e' : '#000',
                                                shadowOffset: { width: 0, height: intensity !== 'none' ? 2 : 1 },
                                                shadowOpacity: intensity !== 'none' ? 0.15 : 0.05,
                                                shadowRadius: intensity !== 'none' ? 3 : 2,
                                                elevation: intensity !== 'none' ? 2 : 1,
                                            }}
                                        />
                                    )
                                })}
                            </View>
                        ))}
                    </View>

                    {/* Legend */}
                    <View className="flex-row items-center justify-center gap-1.5">
                        <Text className="text-xs text-gray-400 mr-1">0%</Text>
                        <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#e5e5e5' }} />
                        <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#bbf7d0' }} />
                        <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#86efac' }} />
                        <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#4ade80' }} />
                        <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#22c55e' }} />
                        <Text className="text-xs text-gray-400 ml-1">100%</Text>
                    </View>
                </>
            )}
        </View>
    )
}
