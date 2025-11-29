import React, { useMemo } from 'react'
import { View, Text, Pressable } from 'react-native'
import { format, getDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale/ko'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import type { HeatmapData } from '../hooks/useStats'

interface ActivityHeatmapProps {
  data: HeatmapData[]
  month: Date
  onMonthChange: (month: Date) => void
  isLoading?: boolean
}

// Heatmap level colors
const LEVEL_COLORS = {
  0: '#f3f4f6', // gray-100
  1: '#c7d2fe', // indigo-200
  2: '#a5b4fc', // indigo-300
  3: '#818cf8', // indigo-400
  4: '#2563eb', // primary (blue-600)
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export default function ActivityHeatmap({
  data,
  month,
  onMonthChange,
  isLoading,
}: ActivityHeatmapProps) {
  // Build calendar grid
  const calendarData = useMemo(() => {
    const monthStart = startOfMonth(month)
    const monthEnd = endOfMonth(month)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

    // Create a map for quick lookup
    const dataMap = new Map(data.map((d) => [d.date, d]))

    // Calculate padding for first row
    const firstDayOfWeek = getDay(monthStart)

    // Build weeks array
    const weeks: Array<Array<{ date: Date; data: HeatmapData | null } | null>> = []
    let currentWeek: Array<{ date: Date; data: HeatmapData | null } | null> = []

    // Add padding for first row
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null)
    }

    // Add days
    days.forEach((day) => {
      const dateStr = format(day, 'yyyy-MM-dd')
      currentWeek.push({
        date: day,
        data: dataMap.get(dateStr) || null,
      })

      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    })

    // Add remaining days of last week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null)
      }
      weeks.push(currentWeek)
    }

    return weeks
  }, [data, month])

  // Calculate total checks for the month
  const totalChecks = useMemo(() => {
    return data.reduce((sum, d) => sum + d.count, 0)
  }, [data])

  const activeDays = useMemo(() => {
    return data.filter((d) => d.count > 0).length
  }, [data])

  return (
    <View className="bg-white rounded-2xl p-4">
      {/* Header with month navigation */}
      <View className="flex-row items-center justify-between mb-4">
        <Pressable
          onPress={() => onMonthChange(subMonths(month, 1))}
          className="p-2"
        >
          <ChevronLeft size={20} color="#6b7280" />
        </Pressable>
        <Text className="text-lg font-semibold text-gray-900">
          {format(month, 'yyyy년 M월', { locale: ko })}
        </Text>
        <Pressable
          onPress={() => onMonthChange(addMonths(month, 1))}
          className="p-2"
        >
          <ChevronRight size={20} color="#6b7280" />
        </Pressable>
      </View>

      {/* Weekday labels */}
      <View className="flex-row mb-2">
        {WEEKDAY_LABELS.map((label, index) => (
          <View key={index} className="flex-1 items-center">
            <Text
              className={`text-xs ${
                index === 0 ? 'text-red-400' : index === 6 ? 'text-blue-400' : 'text-gray-400'
              }`}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {isLoading ? (
        <View className="h-[200px] items-center justify-center">
          <Text className="text-gray-400">불러오는 중...</Text>
        </View>
      ) : (
        <View className="gap-1">
          {calendarData.map((week, weekIndex) => (
            <View key={weekIndex} className="flex-row gap-1">
              {week.map((day, dayIndex) => {
                if (!day) {
                  return <View key={dayIndex} className="flex-1 aspect-square" />
                }

                const level = day.data?.level || 0
                const isToday =
                  format(day.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

                return (
                  <View
                    key={dayIndex}
                    className="flex-1 aspect-square rounded-md items-center justify-center"
                    style={{
                      backgroundColor: LEVEL_COLORS[level],
                      borderWidth: isToday ? 2 : 0,
                      borderColor: '#2563eb',
                    }}
                  >
                    <Text
                      className={`text-xs ${
                        level >= 3 ? 'text-white' : 'text-gray-600'
                      }`}
                    >
                      {format(day.date, 'd')}
                    </Text>
                  </View>
                )
              })}
            </View>
          ))}
        </View>
      )}

      {/* Stats summary */}
      <View className="flex-row justify-around mt-4 pt-4 border-t border-gray-100">
        <View className="items-center">
          <Text className="text-lg font-bold text-primary">{activeDays}</Text>
          <Text className="text-xs text-gray-500">활동일</Text>
        </View>
        <View className="items-center">
          <Text className="text-lg font-bold text-gray-900">{totalChecks}</Text>
          <Text className="text-xs text-gray-500">총 체크</Text>
        </View>
        <View className="items-center">
          <Text className="text-lg font-bold text-green-500">
            {activeDays > 0 ? Math.round(totalChecks / activeDays) : 0}
          </Text>
          <Text className="text-xs text-gray-500">일평균</Text>
        </View>
      </View>

      {/* Legend */}
      <View className="flex-row items-center justify-center mt-3 gap-1">
        <Text className="text-xs text-gray-400 mr-2">적음</Text>
        {[0, 1, 2, 3, 4].map((level) => (
          <View
            key={level}
            className="w-4 h-4 rounded"
            style={{ backgroundColor: LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] }}
          />
        ))}
        <Text className="text-xs text-gray-400 ml-2">많음</Text>
      </View>
    </View>
  )
}
