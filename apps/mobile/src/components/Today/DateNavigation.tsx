/**
 * DateNavigation Component
 * 
 * Handles date selection with previous/next/today buttons and calendar picker
 */

import React, { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Calendar } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale/ko'
import { enUS } from 'date-fns/locale/en-US'
import i18n from '../../i18n'
import DatePickerModal from '../DatePickerModal'
import type { DateNavigationProps } from './types'

// Helper function to format date based on current language
function formatLocalizedDate(date: Date, language: string): string {
    if (language === 'ko') {
        return format(date, 'M월 d일 (EEE)', { locale: ko })
    }
    return format(date, 'MMM d (EEE)', { locale: enUS })
}

export function DateNavigation({
    selectedDate,
    isToday,
    onPreviousDay,
    onNextDay,
    onToday,
    onDateSelect,
}: DateNavigationProps) {
    const { t } = useTranslation()
    const [datePickerVisible, setDatePickerVisible] = useState(false)

    const handleDateSelect = (date: Date) => {
        onDateSelect(date)
        setDatePickerVisible(false)
    }

    return (
        <>
            <View className="flex-row items-center justify-between">
                {/* Previous / Today / Next Buttons */}
                <View className="flex-row items-center rounded-lg border border-gray-300 overflow-hidden bg-white">
                    <Pressable
                        onPress={onPreviousDay}
                        className="px-3 py-2 border-r border-gray-300 active:bg-gray-100"
                    >
                        <Text className="text-sm text-gray-700">{t('common.previous')}</Text>
                    </Pressable>

                    <Pressable
                        onPress={onToday}
                        className="px-4 py-2 border-r border-gray-300 active:bg-gray-100"
                    >
                        {isToday ? (
                            <MaskedView
                                maskElement={
                                    <Text className="text-sm font-medium">{t('common.today')}</Text>
                                }
                            >
                                <LinearGradient
                                    colors={['#2563eb', '#9333ea', '#db2777']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Text className="text-sm font-medium opacity-0">{t('common.today')}</Text>
                                </LinearGradient>
                            </MaskedView>
                        ) : (
                            <Text className="text-sm font-medium text-gray-700">{t('common.today')}</Text>
                        )}
                    </Pressable>

                    <Pressable
                        onPress={onNextDay}
                        className="px-3 py-2 active:bg-gray-100"
                    >
                        <Text className="text-sm text-gray-700">{t('common.next')}</Text>
                    </Pressable>
                </View>

                {/* Date Display Button - Opens Calendar Modal */}
                <Pressable
                    onPress={() => setDatePickerVisible(true)}
                    className="flex-row items-center bg-white border border-gray-300 rounded-lg px-3 py-2 active:bg-gray-50"
                >
                    {isToday ? (
                        <MaskedView
                            maskElement={
                                <View className="flex-row items-center">
                                    <Calendar size={16} color="#000" />
                                    <Text className="text-sm ml-2">
                                        {formatLocalizedDate(selectedDate, i18n.language)}
                                    </Text>
                                </View>
                            }
                        >
                            <LinearGradient
                                colors={['#2563eb', '#9333ea', '#db2777']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <View className="flex-row items-center opacity-0">
                                    <Calendar size={16} color="#000" />
                                    <Text className="text-sm ml-2">
                                        {formatLocalizedDate(selectedDate, i18n.language)}
                                    </Text>
                                </View>
                            </LinearGradient>
                        </MaskedView>
                    ) : (
                        <>
                            <Calendar size={16} color="#6b7280" />
                            <Text className="text-sm text-gray-700 ml-2">
                                {formatLocalizedDate(selectedDate, i18n.language)}
                            </Text>
                        </>
                    )}
                </Pressable>
            </View>

            {/* Date Picker Modal */}
            <DatePickerModal
                visible={datePickerVisible}
                selectedDate={selectedDate}
                onClose={() => setDatePickerVisible(false)}
                onSelectDate={handleDateSelect}
            />
        </>
    )
}
