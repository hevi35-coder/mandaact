import React, { useCallback } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Sparkles, ArrowRight, Clock } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCoachingStore } from '../../store/coachingStore'
import type { RootStackParamList } from '../../navigation/RootNavigator'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Modal, FlatList, ActivityIndicator, SafeAreaView as RNSafeAreaView } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export function CoachingBanner() {
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationProp>()
    const insets = useSafeAreaInsets()
    const { user } = useAuthStore()
    const { sessionId, status, summary, resumeSession } = useCoachingStore()

    // History Modal State
    const [isHistoryModalVisible, setIsHistoryModalVisible] = React.useState(false)
    const [completedSessions, setCompletedSessions] = React.useState<{ id: string; center_goal: string; created_at: string }[]>([])
    const [isLoadingHistory, setIsLoadingHistory] = React.useState(false)

    const hasActiveSession = Boolean(sessionId && status && status !== 'completed')

    const fetchCompletedSessions = useCallback(async () => {
        if (!user?.id) return
        setIsLoadingHistory(true)
        try {
            const { data, error } = await supabase
                .from('coaching_sessions')
                .select('id, metadata, created_at')
                .eq('user_id', user.id)
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(10)

            if (error) throw error

            const sessions = (data || []).map(s => ({
                id: s.id,
                center_goal: s.metadata?.draft?.center_goal || s.metadata?.core_goal_summary?.goal || 'Unknown Goal',
                created_at: s.created_at
            }))
            setCompletedSessions(sessions)
        } catch (error) {
            console.error('Failed to fetch completed sessions:', error)
        } finally {
            setIsLoadingHistory(false)
        }
    }, [user?.id])

    const handleOpenHistory = useCallback(() => {
        fetchCompletedSessions()
        setIsHistoryModalVisible(true)
    }, [fetchCompletedSessions])

    const handleSelectSession = useCallback((selectedSessionId: string) => {
        setIsHistoryModalVisible(false)
        navigation.navigate('CoachingHistory', { sessionId: selectedSessionId })
    }, [navigation])

    const handlePress = useCallback(() => {
        if (hasActiveSession) {
            if (status === 'paused') {
                resumeSession()
            }
            navigation.navigate('ConversationalCoaching')
        } else {
            navigation.navigate('CoachingGate')
        }
    }, [hasActiveSession, status, resumeSession, navigation])

    const title = hasActiveSession
        ? t('home.coachingBanner.resumeTitle')
        : t('home.coachingBanner.startTitle')

    const body = (hasActiveSession && summary?.shortSummary)
        ? summary.shortSummary
        : t('home.coachingBanner.startBody')

    const cta = hasActiveSession
        ? t('home.coachingBanner.resumeCta')
        : t('home.coachingBanner.startCta')

    return (
        <Animated.View
            entering={FadeInDown.duration(600).delay(200)}
            className="mb-6"
        >
            <Pressable
                onPress={handlePress}
                className="bg-white rounded-3xl border border-primary/10 overflow-hidden"
                style={{
                    shadowColor: '#6366f1',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.08,
                    shadowRadius: 16,
                    elevation: 4,
                }}
            >
                <View className="p-5 flex-row items-center">
                    {/* Icon Section */}
                    <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center mr-4">
                        <Sparkles size={24} color="#6366f1" />
                    </View>

                    {/* Text Section */}
                    <View className="flex-1 mr-2">
                        <View className="flex-row items-center">
                            <Text
                                className="text-base text-gray-900"
                                style={{ fontFamily: 'Pretendard-Bold' }}
                            >
                                {title}
                            </Text>
                            {!hasActiveSession && (
                                <View className="ml-2 px-1.5 py-0.5 bg-primary rounded-md">
                                    <Text className="text-[10px] text-white" style={{ fontFamily: 'Pretendard-Bold' }}>
                                        NEW
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text
                            className="text-sm text-gray-500 mt-1"
                            style={{ fontFamily: 'Pretendard-Regular' }}
                            numberOfLines={2}
                        >
                            {body}
                        </Text>
                    </View>

                    {/* CTA Arrow */}
                    <View className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center">
                        <ArrowRight size={20} color="#6366f1" />
                    </View>
                </View>

                {/* Bottom CTA Bar (Only for Start state or if desired for premium feel) */}
                {!hasActiveSession && (
                    <View className="bg-primary/5 py-2.5 px-5 flex-row items-center justify-center border-t border-primary/5">
                        <Text className="text-primary text-xs" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                            {cta}
                        </Text>
                    </View>
                )}

                {/* History Action (Secondary) */}
                <View className="bg-primary/5 py-4 px-5 border-t border-primary/10">
                    <Pressable
                        onPress={(e) => {
                            e.stopPropagation()
                            handleOpenHistory()
                        }}
                        className="flex-row items-center justify-between"
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <View className="flex-row items-center">
                            <View className="w-8 h-8 rounded-full bg-white items-center justify-center mr-3 shadow-sm">
                                <Clock size={14} color="#6366f1" />
                            </View>
                            <View>
                                <Text className="text-sm text-gray-800 font-semibold" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                                    {t('home.coachingBanner.history', '이전 코칭 기록 보기')}
                                </Text>
                                <Text className="text-[10px] text-gray-500 mt-0.5" style={{ fontFamily: 'Pretendard-Regular' }}>
                                    {t('coaching.history.subtitle', '과거 대화와 만다라트 초안을 확인하세요')}
                                </Text>
                            </View>
                        </View>
                        <View className="w-7 h-7 rounded-full bg-white items-center justify-center shadow-sm">
                            <Ionicons name="chevron-forward" size={14} color="#6366f1" />
                        </View>
                    </Pressable>
                </View>
            </Pressable>

            {/* Coaching History Selector Modal */}
            <Modal
                visible={isHistoryModalVisible}
                animationType="slide"
                transparent={true}
                presentationStyle="overFullScreen"
                statusBarTranslucent={true}
                onRequestClose={() => setIsHistoryModalVisible(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'white',
                    paddingTop: Math.max(insets.top, 47),
                    paddingBottom: insets.bottom
                }}>
                    {/* Modal Header */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 16,
                        height: 64,
                        borderBottomWidth: 1,
                        borderBottomColor: '#f3f4f6'
                    }}>
                        <View style={{ width: 40 }} />
                        <Text style={{ fontSize: 18, fontFamily: 'Pretendard-Bold', color: '#1f2937', flex: 1, textAlign: 'center' }}>
                            {t('coaching.history.title', '이전 코칭 대화')}
                        </Text>
                        <Pressable
                            onPress={() => setIsHistoryModalVisible(false)}
                            style={{ padding: 8, width: 40, alignItems: 'flex-end' }}
                        >
                            <Ionicons name="close" size={24} color="#6b7280" />
                        </Pressable>
                    </View>

                    {/* Session List */}
                    {isLoadingHistory ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator size="large" color="#6366f1" />
                        </View>
                    ) : (
                        <FlatList
                            data={completedSessions}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ padding: 16 }}
                            ListEmptyComponent={
                                <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 100 }}>
                                    <Ionicons name="chatbox-outline" size={48} color="#d1d5db" />
                                    <Text style={{ marginTop: 16, color: '#9ca3af', fontFamily: 'Pretendard-Medium' }}>
                                        {t('coaching.history.empty', '완료된 코칭 대화가 없습니다.')}
                                    </Text>
                                </View>
                            }
                            renderItem={({ item }) => (
                                <Pressable
                                    onPress={() => handleSelectSession(item.id)}
                                    style={({ pressed }) => ({
                                        backgroundColor: pressed ? '#f8fafc' : 'white',
                                        borderRadius: 16,
                                        padding: 16,
                                        marginBottom: 12,
                                        borderWidth: 1,
                                        borderColor: '#f1f5f9',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.05,
                                        shadowRadius: 2,
                                        elevation: 2
                                    })}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 20,
                                            backgroundColor: '#eff6ff',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: 12
                                        }}>
                                            <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 16, fontFamily: 'Pretendard-Bold', color: '#1e293b' }} numberOfLines={1}>
                                                {item.center_goal}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontFamily: 'Pretendard-Regular' }}>
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                                    </View>
                                </Pressable>
                            )}
                        />
                    )}
                </View>
            </Modal>
        </Animated.View>
    )
}
