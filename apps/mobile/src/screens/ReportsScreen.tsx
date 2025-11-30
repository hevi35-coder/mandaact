import React, { useState, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/RootNavigator'
import { useScrollToTop } from '../navigation/RootNavigator'
import Animated, { FadeInUp } from 'react-native-reanimated'
import {
  FileText,
  Target,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  Calendar,
} from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { Header } from '../components'

import { useAuthStore } from '../store/authStore'
import { trackWeeklyReportGenerated, trackGoalDiagnosisViewed } from '../lib'
import { useActiveMandalarts } from '../hooks/useMandalarts'
import { useProfileStats } from '../hooks/useStats'
import {
  useWeeklyReport,
  useGenerateWeeklyReport,
  useGoalDiagnosis,
  useGenerateGoalDiagnosis,
  useReportHistory,
} from '../hooks/useReports'
import { parseWeeklyReport, parseDiagnosisReport, type ReportSummary } from '../lib/reportParser'

// Get week dates for display
function formatWeekDates(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart)
  const end = new Date(weekEnd)
  const formatDate = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`
  return `${formatDate(start)} ~ ${formatDate(end)}`
}

// Get next Monday date for "다음 리포트" display
function getNextMonday(): string {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7
  const nextMonday = new Date(now)
  nextMonday.setDate(now.getDate() + daysUntilMonday)
  return `${nextMonday.getMonth() + 1}월 ${nextMonday.getDate()}일 (월)`
}

// Report Card Component - Matches web design
function ReportCard({
  title,
  subtitle,
  icon: Icon,
  date,
  summary,
  isExpanded,
  onToggleExpand,
  isLoading,
  isGenerating,
  generatingText,
}: {
  title: string
  subtitle: string
  icon: typeof TrendingUp
  date?: string
  summary: ReportSummary | null
  isExpanded: boolean
  onToggleExpand: () => void
  isLoading?: boolean
  isGenerating?: boolean
  generatingText?: string
}) {
  if (isLoading) {
    return (
      <View
        className="bg-white rounded-3xl p-6 mb-5 border border-gray-100"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        <View className="items-center py-8">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text
            className="text-base text-gray-500 mt-4"
            style={{ fontFamily: 'Pretendard-Medium' }}
          >
            불러오는 중...
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View
      className="bg-white rounded-3xl mb-5 overflow-hidden relative border border-gray-100"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      {/* Loading Overlay - shown when generating */}
      {isGenerating && (
        <View className="absolute inset-0 bg-white/80 z-10 items-center justify-center rounded-3xl">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text
            className="text-sm text-gray-700 mt-2"
            style={{ fontFamily: 'Pretendard-Medium' }}
          >
            {generatingText || '생성 중...'}
          </Text>
        </View>
      )}
      {/* Header */}
      <View className="p-5 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Icon size={22} color="#6b7280" />
            <Text
              className="text-lg text-gray-900"
              style={{ fontFamily: 'Pretendard-SemiBold' }}
            >
              {title}
            </Text>
          </View>
          {date && (
            <View className="bg-gray-100 px-3 py-1.5 rounded-full">
              <Text
                className="text-xs text-gray-600"
                style={{ fontFamily: 'Pretendard-Medium' }}
              >
                {date}
              </Text>
            </View>
          )}
        </View>
        <Text
          className="text-sm text-gray-500 mt-1"
          style={{ fontFamily: 'Pretendard-Regular' }}
        >
          {subtitle}
        </Text>
      </View>

      {/* Summary Content */}
      {summary && (
        <View className="p-5">
          {/* Headline */}
          <Text
            className="text-base text-gray-900 leading-relaxed mb-4"
            style={{ fontFamily: 'Pretendard-SemiBold' }}
          >
            {summary.headline}
          </Text>

          {/* Key Metrics */}
          {summary.metrics.length > 0 && (
            <View className="gap-2 mb-4">
              {summary.metrics.map((metric, idx) => (
                <View key={idx} className="flex-row">
                  <Text
                    className="text-sm text-gray-500"
                    style={{ fontFamily: 'Pretendard-Regular' }}
                  >
                    {metric.label}:{' '}
                  </Text>
                  <Text
                    className="text-sm text-gray-900"
                    style={{ fontFamily: 'Pretendard-Medium' }}
                  >
                    {metric.value}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Expandable Detail Section */}
          {(summary.strengths.length > 0 || summary.actionPlan.length > 0 || summary.improvements.problem) && (
            <Pressable
              className="bg-primary/5 rounded-2xl p-4 border border-primary/10"
              onPress={onToggleExpand}
            >
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-sm text-primary"
                  style={{ fontFamily: 'Pretendard-SemiBold' }}
                >
                  상세보기
                </Text>
                {isExpanded ? (
                  <ChevronUp size={16} color="#2563eb" />
                ) : (
                  <ChevronDown size={16} color="#2563eb" />
                )}
              </View>

              {isExpanded && (
                <View className="mt-4 gap-4">
                  {/* Strengths */}
                  {summary.strengths.length > 0 && (
                    <View>
                      <Text
                        className="text-sm text-gray-900 mb-2"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                      >
                        💪 강점
                      </Text>
                      {summary.strengths.map((strength, idx) => (
                        <Text
                          key={idx}
                          className="text-sm text-gray-600 mb-1"
                          style={{ fontFamily: 'Pretendard-Regular' }}
                        >
                          • {strength}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Improvements */}
                  {(summary.improvements.problem || summary.improvements.insight || summary.improvements.items?.length) && (
                    <View>
                      <Text
                        className="text-sm text-gray-900 mb-2"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                      >
                        ⚡ 개선 포인트
                      </Text>
                      {summary.improvements.problem && (
                        <Text
                          className="text-sm text-gray-600 mb-1"
                          style={{ fontFamily: 'Pretendard-Regular' }}
                        >
                          • {summary.improvements.problem}
                        </Text>
                      )}
                      {summary.improvements.insight && (
                        <Text
                          className="text-sm text-gray-600 mb-1"
                          style={{ fontFamily: 'Pretendard-Regular' }}
                        >
                          • {summary.improvements.insight}
                        </Text>
                      )}
                      {summary.improvements.items?.map((item, idx) => (
                        <Text
                          key={idx}
                          className="text-sm text-gray-600 mb-1"
                          style={{ fontFamily: 'Pretendard-Regular' }}
                        >
                          • <Text style={{ fontFamily: 'Pretendard-Medium' }}>{item.area}</Text>: {item.issue} → {item.solution}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Action Plan */}
                  {summary.actionPlan.length > 0 && (
                    <View>
                      <Text
                        className="text-sm text-gray-900 mb-2"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                      >
                        🎯 MandaAct의 제안
                      </Text>
                      {summary.actionPlan.map((step, idx) => (
                        <Text
                          key={idx}
                          className="text-sm text-gray-600 mb-1"
                          style={{ fontFamily: 'Pretendard-Regular' }}
                        >
                          • {step}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </Pressable>
          )}
        </View>
      )}

    </View>
  )
}

// Empty State Component
// 정책: Case 2 (리포트 없음 + 실천 있음) → 첫 리포트 생성 버튼
//       Case 3 (리포트 없음 + 실천 없음) → 안내 메시지만
function EmptyReportState({
  hasMandalarts,
  hasChecks,
  onGenerate,
  isGenerating,
  navigation,
}: {
  hasMandalarts: boolean
  hasChecks: boolean
  onGenerate: () => void
  isGenerating: boolean
  navigation: NativeStackNavigationProp<RootStackParamList>
}) {
  // Case 2: 리포트 없음 + 실천 있음 → 첫 리포트 생성 가능
  const canGenerateFirst = hasMandalarts && hasChecks

  return (
    <View className="bg-white rounded-2xl p-6">
      {/* Icon */}
      <View className="items-center mb-4">
        <View className="w-14 h-14 bg-gray-100 rounded-full items-center justify-center">
          <FileText size={28} color="#9ca3af" />
        </View>
      </View>

      {/* Title & Description - 조건에 따라 다른 메시지 */}
      {canGenerateFirst ? (
        <>
          <Text
            className="text-lg text-gray-900 text-center mb-2"
            style={{ fontFamily: 'Pretendard-SemiBold' }}
          >
            첫 리포트를 받아보세요!
          </Text>
          <Text
            className="text-sm text-gray-500 text-center mb-5"
            style={{ fontFamily: 'Pretendard-Regular' }}
          >
            실천 기록을 바탕으로{'\n'}AI가 맞춤형 분석을 제공합니다
          </Text>
        </>
      ) : (
        <>
          <Text
            className="text-lg text-gray-900 text-center mb-2"
            style={{ fontFamily: 'Pretendard-SemiBold' }}
          >
            아직 리포트가 없어요
          </Text>
          <Text
            className="text-sm text-gray-500 text-center mb-5"
            style={{ fontFamily: 'Pretendard-Regular' }}
          >
            실천을 시작하면 매주 월요일{'\n'}AI 리포트가 자동으로 생성됩니다
          </Text>
        </>
      )}

      {/* Guide Box - 실천 없는 경우만 표시 */}
      {!hasChecks && (
        <View className="bg-gray-50 rounded-xl p-4 mb-5">
          <Text
            className="text-sm text-gray-700 mb-3"
            style={{ fontFamily: 'Pretendard-SemiBold' }}
          >
            리포트 생성을 위한 단계
          </Text>
          <View className="flex-row items-center mb-2">
            <View className={`w-5 h-5 rounded-full items-center justify-center mr-2 ${hasMandalarts ? 'bg-primary' : 'border border-gray-300'}`}>
              <Text className={`text-xs ${hasMandalarts ? 'text-white' : 'text-gray-500'}`} style={{ fontFamily: 'Pretendard-Medium' }}>
                {hasMandalarts ? '✓' : '1'}
              </Text>
            </View>
            <Text className={`text-sm ${hasMandalarts ? 'text-gray-400 line-through' : 'text-gray-600'}`} style={{ fontFamily: 'Pretendard-Regular' }}>
              만다라트 만들기
            </Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-5 h-5 rounded-full border border-gray-300 items-center justify-center mr-2">
              <Text className="text-xs text-gray-500" style={{ fontFamily: 'Pretendard-Medium' }}>2</Text>
            </View>
            <Text className="text-sm text-gray-600" style={{ fontFamily: 'Pretendard-Regular' }}>
              실천 기록하기 (1회 이상)
            </Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      {canGenerateFirst ? (
        // Case 2: 첫 리포트 생성 버튼
        <Pressable
          onPress={onGenerate}
          disabled={isGenerating}
          className="rounded-xl overflow-hidden"
        >
          <LinearGradient
            colors={['#2563eb', '#9333ea', '#db2777']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ padding: 1, borderRadius: 12 }}
          >
            <View className="bg-white rounded-xl py-3 items-center justify-center">
              {isGenerating ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#2563eb" />
                  <Text
                    className="text-primary text-sm ml-2"
                    style={{ fontFamily: 'Pretendard-SemiBold' }}
                  >
                    생성 중...
                  </Text>
                </View>
              ) : (
                <MaskedView
                  maskElement={
                    <View className="flex-row items-center">
                      <Sparkles size={16} color="#000" />
                      <Text
                        className="text-sm ml-2"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                      >
                        첫 리포트 생성하기
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
                      <Sparkles size={16} color="#000" />
                      <Text
                        className="text-sm ml-2"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                      >
                        첫 리포트 생성하기
                      </Text>
                    </View>
                  </LinearGradient>
                </MaskedView>
              )}
            </View>
          </LinearGradient>
        </Pressable>
      ) : hasMandalarts ? (
        // Case 3-a: 만다라트 있음 + 실천 없음 → 실천하러 가기
        <View className="flex-row gap-3">
          <Pressable
            className="flex-1 py-3 rounded-xl border border-gray-200 bg-white"
            onPress={() => navigation.navigate('Tutorial')}
          >
            <Text
              className="text-sm text-gray-700 text-center"
              style={{ fontFamily: 'Pretendard-SemiBold' }}
            >
              사용 가이드
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 rounded-xl overflow-hidden"
            onPress={() => navigation.navigate('Main' as never)}
          >
            <LinearGradient
              colors={['#2563eb', '#9333ea', '#db2777']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ padding: 1, borderRadius: 12 }}
            >
              <View className="bg-white rounded-xl py-3 items-center justify-center">
                <MaskedView
                  maskElement={
                    <Text
                      className="text-sm text-center"
                      style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                      실천하러 가기
                    </Text>
                  }
                >
                  <LinearGradient
                    colors={['#2563eb', '#9333ea', '#db2777']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text
                      className="text-sm opacity-0"
                      style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                      실천하러 가기
                    </Text>
                  </LinearGradient>
                </MaskedView>
              </View>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        // Case 3-b: 만다라트 없음 → 만다라트 생성
        <View className="flex-row gap-3">
          <Pressable
            className="flex-1 py-3 rounded-xl border border-gray-200 bg-white"
            onPress={() => navigation.navigate('Tutorial')}
          >
            <Text
              className="text-sm text-gray-700 text-center"
              style={{ fontFamily: 'Pretendard-SemiBold' }}
            >
              사용 가이드
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 rounded-xl overflow-hidden"
            onPress={() => navigation.navigate('CreateMandalart')}
          >
            <LinearGradient
              colors={['#2563eb', '#9333ea', '#db2777']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ padding: 1, borderRadius: 12 }}
            >
              <View className="bg-white rounded-xl py-3 items-center justify-center">
                <MaskedView
                  maskElement={
                    <Text
                      className="text-sm text-center"
                      style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                      만다라트 생성
                    </Text>
                  }
                >
                  <LinearGradient
                    colors={['#2563eb', '#9333ea', '#db2777']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text
                      className="text-sm opacity-0"
                      style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                      만다라트 생성
                    </Text>
                  </LinearGradient>
                </MaskedView>
              </View>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  )
}

export default function ReportsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { user } = useAuthStore()

  // iPad detection
  const { width: screenWidth } = useWindowDimensions()
  const isTablet = Platform.OS === 'ios' && screenWidth >= 768

  // Scroll to top on tab re-press
  const scrollRef = useRef<ScrollView>(null)
  useScrollToTop('Reports', scrollRef)

  const [refreshing, setRefreshing] = useState(false)
  const [isPracticeExpanded, setIsPracticeExpanded] = useState(false)
  const [isDiagnosisExpanded, setIsDiagnosisExpanded] = useState(false)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)

  // Data fetching
  const { data: mandalarts = [] } = useActiveMandalarts(user?.id)
  const { data: weeklyReport, isLoading: weeklyLoading, refetch: refetchWeekly } = useWeeklyReport(user?.id)
  const { data: reportHistory = [] } = useReportHistory(user?.id)
  const { data: diagnosis, isLoading: diagnosisLoading } = useGoalDiagnosis(
    mandalarts.length > 0 ? mandalarts[0].id : undefined
  )
  const { data: profileStats } = useProfileStats(user?.id)

  // Mutations
  const generateWeeklyMutation = useGenerateWeeklyReport()
  const generateDiagnosisMutation = useGenerateGoalDiagnosis()

  // Parse reports
  const weeklySummary = useMemo(() => {
    if (!weeklyReport?.report_content) return null
    return parseWeeklyReport(weeklyReport.report_content)
  }, [weeklyReport])

  const diagnosisSummary = useMemo(() => {
    if (!diagnosis?.diagnosis_content) return null
    return parseDiagnosisReport(diagnosis.diagnosis_content)
  }, [diagnosis])

  const hasMandalarts = mandalarts.length > 0
  const hasChecks = (profileStats?.totalChecks || 0) > 0
  const hasExistingReports = reportHistory.length > 0

  // 첫 리포트 생성 조건: 리포트 0개 + 실천 1회 이상
  const canGenerateFirstReport = !hasExistingReports && hasChecks && hasMandalarts

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetchWeekly()
    setRefreshing(false)
  }, [refetchWeekly])

  const handleGenerateAll = async () => {
    if (!user?.id) return

    try {
      // Generate diagnosis first (shown first on screen)
      if (mandalarts.length > 0) {
        await generateDiagnosisMutation.mutateAsync(mandalarts[0].id)
        trackGoalDiagnosisViewed({
          mandalart_id: mandalarts[0].id,
          generated: true,
        })
      }
      await generateWeeklyMutation.mutateAsync({ userId: user.id })
      trackWeeklyReportGenerated({
        week_start: new Date().toISOString().split('T')[0],
        generated: true,
      })
    } catch {
      Alert.alert('오류', '리포트 생성에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  const isGenerating = generateWeeklyMutation.isPending || generateDiagnosisMutation.isPending

  // True empty state - no mandalarts AND no existing reports/diagnosis
  const showEmptyState = !weeklyLoading && !diagnosisLoading && !weeklyReport && !diagnosis && !hasMandalarts

  if (showEmptyState) {
    return (
      <View className="flex-1 bg-gray-50">
        <Header />
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-5 pt-5"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Page Title - Center Aligned */}
          <View className="mb-5">
            <View className="items-center">
              <View className="flex-row items-center">
                <Text
                  className="text-3xl text-gray-900"
                  style={{ fontFamily: 'Pretendard-Bold' }}
                >
                  리포트
                </Text>
                <Text
                  className="text-base text-gray-500 ml-3"
                  style={{ fontFamily: 'Pretendard-Medium' }}
                >
                  맞춤형 분석과 코칭
                </Text>
              </View>
            </View>
          </View>

          <EmptyReportState
            hasMandalarts={hasMandalarts}
            hasChecks={hasChecks}
            onGenerate={handleGenerateAll}
            isGenerating={isGenerating}
            navigation={navigation}
          />
        </ScrollView>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-gray-50">
      <Header />
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-5 pt-5"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Page Title - Center Aligned */}
        <View className="mb-5">
          <View className="items-center mb-4">
            <View className="flex-row items-center">
              <Text
                className="text-3xl text-gray-900"
                style={{ fontFamily: 'Pretendard-Bold' }}
              >
                리포트
              </Text>
              <Text
                className="text-base text-gray-500 ml-3"
                style={{ fontFamily: 'Pretendard-Medium' }}
              >
                맞춤형 분석과 코칭
              </Text>
            </View>
          </View>

          {/* 첫 리포트 생성 버튼 (리포트 0개 + 실천 1회 이상) */}
          {canGenerateFirstReport && (
            <Pressable
              onPress={handleGenerateAll}
              disabled={isGenerating}
              className="rounded-2xl overflow-hidden"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <LinearGradient
                colors={['#2563eb', '#9333ea', '#db2777']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ padding: 1, borderRadius: 16 }}
              >
                <View className="bg-white rounded-2xl py-4 items-center justify-center">
                  {isGenerating ? (
                    <View className="flex-row items-center">
                      <ActivityIndicator size="small" color="#2563eb" />
                      <Text
                        className="text-primary text-base ml-2"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                      >
                        생성 중...
                      </Text>
                    </View>
                  ) : (
                    <MaskedView
                      maskElement={
                        <View className="flex-row items-center">
                          <Sparkles size={18} color="#000" />
                          <Text
                            className="text-base ml-2"
                            style={{ fontFamily: 'Pretendard-SemiBold' }}
                          >
                            첫 리포트 생성하기
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
                          <Sparkles size={18} color="#000" />
                          <Text
                            className="text-base ml-2"
                            style={{ fontFamily: 'Pretendard-SemiBold' }}
                          >
                            첫 리포트 생성하기
                          </Text>
                        </View>
                      </LinearGradient>
                    </MaskedView>
                  )}
                </View>
              </LinearGradient>
            </Pressable>
          )}

          {/* 다음 리포트 안내 (기존 리포트가 있는 경우) - 그라디언트 테두리 + 텍스트 */}
          {hasExistingReports && (
            <View
              className="rounded-2xl overflow-hidden"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <LinearGradient
                colors={['#2563eb', '#9333ea', '#db2777']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ padding: 1, borderRadius: 16 }}
              >
                <View className="bg-white rounded-2xl py-4 px-5 flex-row items-center justify-center">
                  <MaskedView
                    maskElement={
                      <View className="flex-row items-center">
                        <Calendar size={18} color="#000" />
                        <Text
                          className="text-base ml-2"
                          style={{ fontFamily: 'Pretendard-Medium' }}
                        >
                          다음 리포트: {getNextMonday()}
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
                        <Calendar size={18} color="#000" />
                        <Text
                          className="text-base ml-2"
                          style={{ fontFamily: 'Pretendard-Medium' }}
                        >
                          다음 리포트: {getNextMonday()}
                        </Text>
                      </View>
                    </LinearGradient>
                  </MaskedView>
                </View>
              </LinearGradient>
            </View>
          )}
        </View>

        {/* iPad: 2-column layout (Left: Goal Diagnosis, Right: Practice Report) */}
        {isTablet ? (
          <View style={{ flexDirection: 'row', gap: 16 }}>
            {/* Left Column: Goal Diagnosis */}
            <View style={{ flex: 1 }}>
              <Animated.View entering={FadeInUp.duration(400)}>
                {/* Case 1: Has mandalarts - show normal ReportCard */}
                {hasMandalarts && (
                  <ReportCard
                    title="목표 진단"
                    subtitle="만다라트 계획 점검 및 개선 제안"
                    icon={Target}
                    date={diagnosis ? new Date(diagnosis.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) : undefined}
                    summary={diagnosisSummary}
                    isExpanded={isDiagnosisExpanded}
                    onToggleExpand={() => setIsDiagnosisExpanded(!isDiagnosisExpanded)}
                    isLoading={diagnosisLoading}
                    isGenerating={generateDiagnosisMutation.isPending}
                    generatingText="새 진단 생성 중..."
                  />
                )}

                {/* Case 2: No mandalarts but has existing diagnosis */}
                {!hasMandalarts && diagnosis && (
                  <ReportCard
                    title="목표 진단"
                    subtitle="만다라트 계획 점검 및 개선 제안"
                    icon={Target}
                    date={new Date(diagnosis.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                    summary={diagnosisSummary}
                    isExpanded={isDiagnosisExpanded}
                    onToggleExpand={() => setIsDiagnosisExpanded(!isDiagnosisExpanded)}
                    isLoading={diagnosisLoading}
                    isGenerating={false}
                  />
                )}

                {/* Case 3: No mandalarts and no diagnosis */}
                {!hasMandalarts && !diagnosis && (
                  <View
                    className="bg-white rounded-3xl p-6 items-center mb-5 border border-gray-100"
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.06,
                      shadowRadius: 12,
                      elevation: 3,
                    }}
                  >
                    <View className="w-14 h-14 bg-gray-100 rounded-full items-center justify-center mb-4">
                      <Target size={28} color="#6b7280" />
                    </View>
                    <Text
                      className="text-lg text-gray-900 mb-2"
                      style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                      만다라트 필요
                    </Text>
                    <Text
                      className="text-sm text-gray-500 text-center"
                      style={{ fontFamily: 'Pretendard-Regular' }}
                    >
                      목표 진단을 받으려면{'\n'}만다라트를 생성하거나 활성화해주세요
                    </Text>
                  </View>
                )}
              </Animated.View>
            </View>

            {/* Right Column: Practice Report + History */}
            <View style={{ flex: 1 }}>
              <Animated.View entering={FadeInUp.delay(100).duration(400)}>
                <ReportCard
                  title="실천 리포트"
                  subtitle="최근 7일간 실천 데이터 분석 및 개선 제안"
                  icon={TrendingUp}
                  date={weeklyReport ? formatWeekDates(weeklyReport.week_start, weeklyReport.week_end) : undefined}
                  summary={weeklySummary}
                  isExpanded={isPracticeExpanded}
                  onToggleExpand={() => setIsPracticeExpanded(!isPracticeExpanded)}
                  isLoading={weeklyLoading}
                  isGenerating={generateWeeklyMutation.isPending}
                  generatingText="새 리포트 생성 중..."
                />
              </Animated.View>

              {/* Report History - iPad */}
              {reportHistory.length > 1 && (
                <Animated.View entering={FadeInUp.delay(200).duration(400)} className="mt-4">
                  <Text
                    className="text-lg text-gray-900 mb-3"
                    style={{ fontFamily: 'Pretendard-SemiBold' }}
                  >
                    지난 실천리포트
                  </Text>
                  <View
                    className="bg-white rounded-3xl overflow-hidden border border-gray-100"
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.06,
                      shadowRadius: 12,
                      elevation: 3,
                    }}
                  >
                    {reportHistory.slice(1, 5).map((report, index) => {
                      const isExpanded = expandedHistoryId === report.id
                      const historySummary = report.report_content ? parseWeeklyReport(report.report_content) : null

                      return (
                        <View key={report.id}>
                          <Pressable
                            className={`p-4 flex-row items-center ${
                              index < Math.min(reportHistory.length - 1, 4) - 1 && !isExpanded
                                ? 'border-b border-gray-100'
                                : ''
                            }`}
                            onPress={() => setExpandedHistoryId(isExpanded ? null : report.id)}
                          >
                            <View className="w-11 h-11 bg-gray-100 rounded-full items-center justify-center">
                              <FileText size={20} color="#2563eb" />
                            </View>
                            <View className="flex-1 ml-3">
                              <Text
                                className="text-sm text-gray-900"
                                style={{ fontFamily: 'Pretendard-Medium' }}
                              >
                                {formatWeekDates(report.week_start, report.week_end)}
                              </Text>
                              <Text
                                className="text-xs text-gray-500"
                                style={{ fontFamily: 'Pretendard-Regular' }}
                                numberOfLines={1}
                              >
                                {historySummary?.headline || report.summary || '주간 실천 리포트'}
                              </Text>
                            </View>
                            {isExpanded ? (
                              <ChevronUp size={18} color="#9ca3af" />
                            ) : (
                              <ChevronDown size={18} color="#9ca3af" />
                            )}
                          </Pressable>

                          {/* Expanded Content */}
                          {isExpanded && historySummary && (
                            <View className={`px-4 pb-4 bg-gray-50 ${
                              index < Math.min(reportHistory.length - 1, 4) - 1
                                ? 'border-b border-gray-100'
                                : ''
                            }`}>
                              <Text
                                className="text-sm text-gray-900 leading-relaxed mb-3"
                                style={{ fontFamily: 'Pretendard-SemiBold' }}
                              >
                                {historySummary.headline}
                              </Text>

                              {historySummary.metrics.length > 0 && (
                                <View className="gap-1 mb-3">
                                  {historySummary.metrics.map((metric, idx) => (
                                    <View key={idx} className="flex-row">
                                      <Text className="text-sm text-gray-500" style={{ fontFamily: 'Pretendard-Regular' }}>
                                        {metric.label}:{' '}
                                      </Text>
                                      <Text className="text-sm text-gray-900" style={{ fontFamily: 'Pretendard-Medium' }}>
                                        {metric.value}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              )}

                              {historySummary.strengths.length > 0 && (
                                <View className="mb-3">
                                  <Text className="text-sm text-gray-900 mb-1" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                                    💪 강점
                                  </Text>
                                  {historySummary.strengths.map((strength, idx) => (
                                    <Text key={idx} className="text-sm text-gray-600" style={{ fontFamily: 'Pretendard-Regular' }}>
                                      • {strength}
                                    </Text>
                                  ))}
                                </View>
                              )}

                              {(historySummary.improvements.problem || historySummary.improvements.insight || historySummary.improvements.items?.length) && (
                                <View className="mb-3">
                                  <Text className="text-sm text-gray-900 mb-1" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                                    ⚡ 개선 포인트
                                  </Text>
                                  {historySummary.improvements.problem && (
                                    <Text className="text-sm text-gray-600" style={{ fontFamily: 'Pretendard-Regular' }}>
                                      • {historySummary.improvements.problem}
                                    </Text>
                                  )}
                                  {historySummary.improvements.insight && (
                                    <Text className="text-sm text-gray-600" style={{ fontFamily: 'Pretendard-Regular' }}>
                                      • {historySummary.improvements.insight}
                                    </Text>
                                  )}
                                  {historySummary.improvements.items?.map((item, idx) => (
                                    <Text key={idx} className="text-sm text-gray-600" style={{ fontFamily: 'Pretendard-Regular' }}>
                                      • <Text style={{ fontFamily: 'Pretendard-Medium' }}>{item.area}</Text>: {item.issue} → {item.solution}
                                    </Text>
                                  ))}
                                </View>
                              )}

                              {historySummary.actionPlan.length > 0 && (
                                <View>
                                  <Text className="text-sm text-gray-900 mb-1" style={{ fontFamily: 'Pretendard-SemiBold' }}>
                                    🎯 MandaAct의 제안
                                  </Text>
                                  {historySummary.actionPlan.map((step, idx) => (
                                    <Text key={idx} className="text-sm text-gray-600" style={{ fontFamily: 'Pretendard-Regular' }}>
                                      • {step}
                                    </Text>
                                  ))}
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      )
                    })}
                  </View>
                </Animated.View>
              )}
            </View>
          </View>
        ) : (
        /* Phone: Single-column layout */
        <View>
          {/* Goal Diagnosis Card - First (목표 설정) */}
          <Animated.View entering={FadeInUp.duration(400)}>
            {/* Case 1: Has mandalarts - show normal ReportCard */}
            {hasMandalarts && (
              <ReportCard
                title="목표 진단"
                subtitle="만다라트 계획 점검 및 개선 제안"
                icon={Target}
                date={diagnosis ? new Date(diagnosis.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) : undefined}
                summary={diagnosisSummary}
                isExpanded={isDiagnosisExpanded}
                onToggleExpand={() => setIsDiagnosisExpanded(!isDiagnosisExpanded)}
                isLoading={diagnosisLoading}
                isGenerating={generateDiagnosisMutation.isPending}
                generatingText="새 진단 생성 중..."
              />
            )}

            {/* Case 2: No mandalarts but has existing diagnosis - show existing diagnosis */}
            {!hasMandalarts && diagnosis && (
              <>
                <ReportCard
                  title="목표 진단"
                  subtitle="만다라트 계획 점검 및 개선 제안"
                  icon={Target}
                  date={new Date(diagnosis.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                  summary={diagnosisSummary}
                  isExpanded={isDiagnosisExpanded}
                  onToggleExpand={() => setIsDiagnosisExpanded(!isDiagnosisExpanded)}
                  isLoading={diagnosisLoading}
                  isGenerating={false}
                />
                {/* Notice for new diagnosis */}
                <View
                  className="bg-white rounded-2xl p-4 mb-5 flex-row items-center border border-gray-100"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                    <Target size={20} color="#6b7280" />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-sm text-gray-700"
                      style={{ fontFamily: 'Pretendard-Medium' }}
                    >
                      새 진단을 받으려면 만다라트를 생성하거나 활성화하세요
                    </Text>
                  </View>
                  <Pressable
                    className="px-3 py-1.5 bg-gray-900 rounded-lg"
                    onPress={() => navigation.navigate('CreateMandalart')}
                  >
                    <Text
                      className="text-xs text-white"
                      style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                      생성
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* Case 3: No mandalarts and no diagnosis - show "mandalart needed" card */}
            {!hasMandalarts && !diagnosis && (
              <View
                className="bg-white rounded-3xl p-6 items-center mb-5 border border-gray-100"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  elevation: 3,
                }}
              >
                <View className="w-14 h-14 bg-gray-100 rounded-full items-center justify-center mb-4">
                  <Target size={28} color="#6b7280" />
                </View>
                <Text
                  className="text-lg text-gray-900 mb-2"
                  style={{ fontFamily: 'Pretendard-SemiBold' }}
                >
                  만다라트 필요
                </Text>
                <Text
                  className="text-sm text-gray-500 text-center mb-5"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                >
                  목표 진단을 받으려면{'\n'}만다라트를 생성하거나 활성화해주세요
                </Text>
                <View className="flex-row gap-3 w-full">
                  <Pressable
                    className="flex-1 py-3 rounded-xl border border-gray-200 bg-white"
                    onPress={() => navigation.navigate('Tutorial')}
                  >
                    <Text
                      className="text-sm text-gray-700 text-center"
                      style={{ fontFamily: 'Pretendard-SemiBold' }}
                    >
                      사용 가이드
                    </Text>
                  </Pressable>
                  <Pressable
                    className="flex-1 rounded-xl overflow-hidden"
                    onPress={() => navigation.navigate('CreateMandalart')}
                  >
                    <LinearGradient
                      colors={['#2563eb', '#9333ea', '#db2777']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ padding: 1, borderRadius: 12 }}
                    >
                      <View className="bg-white rounded-xl py-3 items-center justify-center">
                        <MaskedView
                          maskElement={
                            <Text
                              className="text-sm text-center"
                              style={{ fontFamily: 'Pretendard-SemiBold' }}
                            >
                              만다라트 생성
                            </Text>
                          }
                        >
                          <LinearGradient
                            colors={['#2563eb', '#9333ea', '#db2777']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                          >
                            <Text
                              className="text-sm opacity-0"
                              style={{ fontFamily: 'Pretendard-SemiBold' }}
                            >
                              만다라트 생성
                            </Text>
                          </LinearGradient>
                        </MaskedView>
                      </View>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Practice Report Card - Second (실천 결과) */}
          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <ReportCard
              title="실천 리포트"
              subtitle="최근 7일간 실천 데이터 분석 및 개선 제안"
              icon={TrendingUp}
              date={weeklyReport ? formatWeekDates(weeklyReport.week_start, weeklyReport.week_end) : undefined}
              summary={weeklySummary}
              isExpanded={isPracticeExpanded}
              onToggleExpand={() => setIsPracticeExpanded(!isPracticeExpanded)}
              isLoading={weeklyLoading}
              isGenerating={generateWeeklyMutation.isPending}
              generatingText="새 리포트 생성 중..."
            />
          </Animated.View>

          {/* Report History */}
          {reportHistory.length > 1 && (
            <Animated.View entering={FadeInUp.delay(200).duration(400)} className="mt-4">
              <Text
                className="text-lg text-gray-900 mb-3"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                지난 실천리포트
              </Text>
              <View
                className="bg-white rounded-3xl overflow-hidden border border-gray-100"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  elevation: 3,
                }}
              >
                {reportHistory.slice(1, 5).map((report, index) => {
                  const isExpanded = expandedHistoryId === report.id
                  const historySummary = report.report_content ? parseWeeklyReport(report.report_content) : null

                  return (
                    <View key={report.id}>
                      <Pressable
                        className={`p-4 flex-row items-center ${
                          index < Math.min(reportHistory.length - 1, 4) - 1 && !isExpanded
                            ? 'border-b border-gray-100'
                            : ''
                        }`}
                        onPress={() => setExpandedHistoryId(isExpanded ? null : report.id)}
                      >
                        <View className="w-11 h-11 bg-gray-100 rounded-full items-center justify-center">
                          <FileText size={20} color="#2563eb" />
                        </View>
                        <View className="flex-1 ml-3">
                          <Text
                            className="text-sm text-gray-900"
                            style={{ fontFamily: 'Pretendard-Medium' }}
                          >
                            {formatWeekDates(report.week_start, report.week_end)}
                          </Text>
                          <Text
                            className="text-xs text-gray-500"
                            style={{ fontFamily: 'Pretendard-Regular' }}
                            numberOfLines={1}
                          >
                            {historySummary?.headline || report.summary || '주간 실천 리포트'}
                          </Text>
                        </View>
                        {isExpanded ? (
                          <ChevronUp size={18} color="#9ca3af" />
                        ) : (
                          <ChevronDown size={18} color="#9ca3af" />
                        )}
                      </Pressable>

                      {/* Expanded Content */}
                      {isExpanded && historySummary && (
                        <View className={`px-4 pb-4 bg-gray-50 ${
                          index < Math.min(reportHistory.length - 1, 4) - 1
                            ? 'border-b border-gray-100'
                            : ''
                        }`}>
                          {/* Headline */}
                          <Text
                            className="text-sm text-gray-900 leading-relaxed mb-3"
                            style={{ fontFamily: 'Pretendard-SemiBold' }}
                          >
                            {historySummary.headline}
                          </Text>

                          {/* Metrics */}
                          {historySummary.metrics.length > 0 && (
                            <View className="gap-1 mb-3">
                              {historySummary.metrics.map((metric, idx) => (
                                <View key={idx} className="flex-row">
                                  <Text
                                    className="text-sm text-gray-500"
                                    style={{ fontFamily: 'Pretendard-Regular' }}
                                  >
                                    {metric.label}:{' '}
                                  </Text>
                                  <Text
                                    className="text-sm text-gray-900"
                                    style={{ fontFamily: 'Pretendard-Medium' }}
                                  >
                                    {metric.value}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}

                          {/* Strengths */}
                          {historySummary.strengths.length > 0 && (
                            <View className="mb-3">
                              <Text
                                className="text-sm text-gray-900 mb-1"
                                style={{ fontFamily: 'Pretendard-SemiBold' }}
                              >
                                💪 강점
                              </Text>
                              {historySummary.strengths.map((strength, idx) => (
                                <Text
                                  key={idx}
                                  className="text-sm text-gray-600"
                                  style={{ fontFamily: 'Pretendard-Regular' }}
                                >
                                  • {strength}
                                </Text>
                              ))}
                            </View>
                          )}

                          {/* Improvements */}
                          {(historySummary.improvements.problem || historySummary.improvements.insight || historySummary.improvements.items?.length) && (
                            <View className="mb-3">
                              <Text
                                className="text-sm text-gray-900 mb-1"
                                style={{ fontFamily: 'Pretendard-SemiBold' }}
                              >
                                ⚡ 개선 포인트
                              </Text>
                              {historySummary.improvements.problem && (
                                <Text
                                  className="text-sm text-gray-600"
                                  style={{ fontFamily: 'Pretendard-Regular' }}
                                >
                                  • {historySummary.improvements.problem}
                                </Text>
                              )}
                              {historySummary.improvements.insight && (
                                <Text
                                  className="text-sm text-gray-600"
                                  style={{ fontFamily: 'Pretendard-Regular' }}
                                >
                                  • {historySummary.improvements.insight}
                                </Text>
                              )}
                              {historySummary.improvements.items?.map((item, idx) => (
                                <Text
                                  key={idx}
                                  className="text-sm text-gray-600"
                                  style={{ fontFamily: 'Pretendard-Regular' }}
                                >
                                  • <Text style={{ fontFamily: 'Pretendard-Medium' }}>{item.area}</Text>: {item.issue} → {item.solution}
                                </Text>
                              ))}
                            </View>
                          )}

                          {/* Action Plan */}
                          {historySummary.actionPlan.length > 0 && (
                            <View>
                              <Text
                                className="text-sm text-gray-900 mb-1"
                                style={{ fontFamily: 'Pretendard-SemiBold' }}
                              >
                                🎯 MandaAct의 제안
                              </Text>
                              {historySummary.actionPlan.map((step, idx) => (
                                <Text
                                  key={idx}
                                  className="text-sm text-gray-600"
                                  style={{ fontFamily: 'Pretendard-Regular' }}
                                >
                                  • {step}
                                </Text>
                              ))}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
            </Animated.View>
          )}
        </View>
        )}

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </View>
  )
}
