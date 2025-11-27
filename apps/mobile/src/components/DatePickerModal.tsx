import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native'
import {
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react-native'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from 'date-fns'
import { ko } from 'date-fns/locale/ko'
import { isToday as isTodayFn } from '@mandaact/shared'

interface DatePickerModalProps {
  visible: boolean
  selectedDate: Date
  onSelect: (date: Date) => void
  onClose: () => void
}

export default function DatePickerModal({
  visible,
  selectedDate,
  onSelect,
  onClose,
}: DatePickerModalProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate)

  const weekDays = ['일', '월', '화', '수', '목', '금', '토']

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const daysArray: Date[] = []
    let day = startDate

    while (day <= endDate) {
      daysArray.push(day)
      day = addDays(day, 1)
    }

    return daysArray
  }, [currentMonth])

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const handleSelectDate = (date: Date) => {
    onSelect(date)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/50 justify-center items-center px-4"
        onPress={onClose}
      >
        <Pressable
          className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
            <Pressable onPress={onClose} className="p-2">
              <X size={20} color="#6b7280" />
            </Pressable>
            <Text className="text-base font-semibold text-gray-900">
              날짜 선택
            </Text>
            <View className="w-10" />
          </View>

          {/* Month Navigation */}
          <View className="flex-row items-center justify-between px-4 py-3">
            <Pressable
              onPress={handlePrevMonth}
              className="p-2 rounded-full active:bg-gray-100"
            >
              <ChevronLeft size={20} color="#374151" />
            </Pressable>
            <Text className="text-lg font-semibold text-gray-900">
              {format(currentMonth, 'yyyy년 M월', { locale: ko })}
            </Text>
            <Pressable
              onPress={handleNextMonth}
              className="p-2 rounded-full active:bg-gray-100"
            >
              <ChevronRight size={20} color="#374151" />
            </Pressable>
          </View>

          {/* Week Days Header */}
          <View className="flex-row px-2">
            {weekDays.map((day, index) => (
              <View key={index} className="flex-1 items-center py-2">
                <Text
                  className={`text-xs font-medium ${
                    index === 0
                      ? 'text-red-500'
                      : index === 6
                        ? 'text-blue-500'
                        : 'text-gray-500'
                  }`}
                >
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <ScrollView className="px-2 pb-4">
            <View className="flex-row flex-wrap">
              {days.map((day, index) => {
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const isSelected = isSameDay(day, selectedDate)
                const isToday = isTodayFn(day)
                const dayOfWeek = day.getDay()
                const isSunday = dayOfWeek === 0
                const isSaturday = dayOfWeek === 6

                return (
                  <Pressable
                    key={index}
                    onPress={() => handleSelectDate(day)}
                    className="w-[14.28%] aspect-square items-center justify-center"
                  >
                    <View
                      className={`w-10 h-10 rounded-full items-center justify-center ${
                        isSelected
                          ? 'bg-gray-900'
                          : isToday
                            ? 'bg-gray-100'
                            : ''
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          isSelected
                            ? 'text-white'
                            : !isCurrentMonth
                              ? 'text-gray-300'
                              : isSunday
                                ? 'text-red-500'
                                : isSaturday
                                  ? 'text-blue-500'
                                  : 'text-gray-900'
                        }`}
                      >
                        {format(day, 'd')}
                      </Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
