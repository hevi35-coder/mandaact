import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInUp } from 'react-native-reanimated'
import {
  FileText,
  Target,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  AlertCircle,
} from 'lucide-react-native'

import { useAuthStore } from '../store/authStore'
import { useActiveMandalarts } from '../hooks/useMandalarts'
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
      <View className="bg-white rounded-2xl p-6 mb-4">
        <View className="items-center py-8">
          <ActivityIndicator size="large" color="#667eea" />
          <Text className="text-gray-500 mt-4">불러오는 중...</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="bg-white rounded-2xl mb-4 overflow-hidden relative">
      {/* Loading Overlay - shown when generating */}
      {isGenerating && (
        <View className="absolute inset-0 bg-white/80 z-10 items-center justify-center rounded-2xl">
          <ActivityIndicator size="large" color="#667eea" />
          <Text className="text-sm font-medium text-gray-700 mt-2">{generatingText || '생성 중...'}</Text>
        </View>
      )}
      {/* Header */}
      <View className="p-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Icon size={20} color="#667eea" />
            <Text className="text-lg font-semibold text-gray-900">{title}</Text>
          </View>
          {date && (
            <View className="bg-gray-100 px-3 py-1 rounded-full">
              <Text className="text-xs text-gray-600">{date}</Text>
            </View>
          )}
        </View>
        <Text className="text-sm text-gray-500 mt-1">{subtitle}</Text>
      </View>

      {/* Summary Content */}
      {summary && (
        <View className="p-4">
          {/* Headline */}
          <Text className="text-base font-semibold text-gray-900 leading-relaxed mb-4">
            {summary.headline}
          </Text>

          {/* Key Metrics */}
          {summary.metrics.length > 0 && (
            <View className="gap-2 mb-4">
              {summary.metrics.map((metric, idx) => (
                <View key={idx} className="flex-row">
                  <Text className="text-sm text-gray-500">{metric.label}: </Text>
                  <Text className="text-sm font-medium text-gray-900">{metric.value}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Expandable Detail Section */}
          {(summary.strengths.length > 0 || summary.actionPlan.length > 0 || summary.improvements.problem) && (
            <Pressable
              className="bg-primary/5 rounded-xl p-3 border border-primary/10"
              onPress={onToggleExpand}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-primary">상세보기</Text>
                {isExpanded ? (
                  <ChevronUp size={16} color="#667eea" />
                ) : (
                  <ChevronDown size={16} color="#667eea" />
                )}
              </View>

              {isExpanded && (
                <View className="mt-4 gap-4">
                  {/* Strengths */}
                  {summary.strengths.length > 0 && (
                    <View>
                      <Text className="text-sm font-semibold text-gray-900 mb-2">💪 강점</Text>
                      {summary.strengths.map((strength, idx) => (
                        <Text key={idx} className="text-sm text-gray-600 mb-1">• {strength}</Text>
                      ))}
                    </View>
                  )}

                  {/* Improvements */}
                  {(summary.improvements.problem || summary.improvements.insight || summary.improvements.items?.length) && (
                    <View>
                      <Text className="text-sm font-semibold text-gray-900 mb-2">⚡ 개선 포인트</Text>
                      {summary.improvements.problem && (
                        <Text className="text-sm text-gray-600 mb-1">• {summary.improvements.problem}</Text>
                      )}
                      {summary.improvements.insight && (
                        <Text className="text-sm text-gray-600 mb-1">• {summary.improvements.insight}</Text>
                      )}
                      {summary.improvements.items?.map((item, idx) => (
                        <Text key={idx} className="text-sm text-gray-600 mb-1">
                          • <Text className="font-medium">{item.area}</Text>: {item.issue} → {item.solution}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Action Plan */}
                  {summary.actionPlan.length > 0 && (
                    <View>
                      <Text className="text-sm font-semibold text-gray-900 mb-2">🎯 MandaAct의 제안</Text>
                      {summary.actionPlan.map((step, idx) => (
                        <Text key={idx} className="text-sm text-gray-600 mb-1">• {step}</Text>
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
function EmptyReportState({
  hasMandalarts,
  onGenerate,
  isGenerating,
}: {
  hasMandalarts: boolean
  onGenerate: () => void
  isGenerating: boolean
}) {
  return (
    <View className="relative">
      {/* Blurred Preview */}
      <View className="opacity-30">
        <View className="bg-white rounded-2xl p-4 mb-4">
          <View className="flex-row items-center gap-2 mb-2">
            <TrendingUp size={20} color="#667eea" />
            <Text className="text-lg font-semibold text-gray-900">실천 리포트</Text>
          </View>
          <Text className="text-base font-semibold text-gray-900 mb-2">
            화요일 오후에 집중된 실천 패턴이 관찰되며...
          </Text>
          <View className="gap-1">
            <Text className="text-sm text-gray-500">총 실천 횟수: 6회</Text>
            <Text className="text-sm text-gray-500">실천일수: 최근 7일 중 3일</Text>
          </View>
        </View>
      </View>

      {/* Overlay Card */}
      <View className="absolute inset-0 items-center justify-center p-4">
        <View className="bg-white rounded-2xl p-6 shadow-lg w-full max-w-sm border-2 border-gray-200">
          <View className="items-center">
            <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-4">
              <FileText size={32} color="#667eea" />
            </View>
            <Text className="text-xl font-semibold text-gray-900 mb-2">아직 리포트가 없어요</Text>
            <Text className="text-sm text-gray-500 text-center mb-6">
              {hasMandalarts ? (
                '실천 데이터를 분석하여\n맞춤형 AI 리포트를 생성해드려요'
              ) : (
                '만다라트를 만들고 실천을 시작하면\n일주일 후부터 AI 리포트를 받을 수 있어요'
              )}
            </Text>

            {hasMandalarts && (
              <Pressable
                className="bg-primary rounded-xl px-6 py-3 flex-row items-center"
                onPress={onGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Sparkles size={18} color="white" />
                )}
                <Text className="text-white font-medium ml-2">
                  {isGenerating ? '생성 중...' : '리포트 생성'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  )
}

export default function ReportsScreen() {
  const { user } = useAuthStore()
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
      }
      await generateWeeklyMutation.mutateAsync({ userId: user.id })
    } catch {
      Alert.alert('오류', '리포트 생성에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  const isGenerating = generateWeeklyMutation.isPending || generateDiagnosisMutation.isPending

  // No reports state
  if (!weeklyLoading && !diagnosisLoading && !weeklyReport && !diagnosis) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Header */}
          <View className="px-4 pt-4 pb-2">
            <View className="flex-row items-center">
              <Text className="text-2xl font-bold text-gray-900">리포트</Text>
              <Text className="text-sm text-gray-500 ml-3">맞춤형 분석과 코칭</Text>
            </View>
          </View>

          <View className="px-4 mt-4">
            <EmptyReportState
              hasMandalarts={hasMandalarts}
              onGenerate={handleGenerateAll}
              isGenerating={isGenerating}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View className="px-4 pt-4 pb-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="text-2xl font-bold text-gray-900">리포트</Text>
              <Text className="text-sm text-gray-500 ml-3">맞춤형 분석과 코칭</Text>
            </View>
          </View>
        </View>

        {/* Generate Button */}
        {hasMandalarts && (
          <View className="px-4 mb-4">
            <Pressable
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex-row items-center justify-center"
              onPress={handleGenerateAll}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#667eea" />
              ) : (
                <Sparkles size={16} color="#667eea" />
              )}
              <Text className="text-primary font-semibold ml-2">
                {isGenerating ? '생성 중...' : '새로 생성하기'}
              </Text>
            </Pressable>
          </View>
        )}

        <View className="px-4">
          {/* Goal Diagnosis Card - First (목표 설정) */}
          <Animated.View entering={FadeInUp.duration(400)}>
            {hasMandalarts ? (
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
            ) : (
              <View className="bg-white rounded-2xl p-8 items-center mb-4">
                <View className="w-16 h-16 bg-amber-50 rounded-full items-center justify-center mb-4">
                  <AlertCircle size={32} color="#f59e0b" />
                </View>
                <Text className="text-lg font-semibold text-gray-900 mb-2">
                  만다라트 필요
                </Text>
                <Text className="text-sm text-gray-500 text-center">
                  목표 진단을 받으려면{'\n'}
                  먼저 만다라트를 생성해주세요
                </Text>
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
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                지난 실천리포트
              </Text>
              <View className="bg-white rounded-2xl overflow-hidden">
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
                        <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                          <FileText size={18} color="#667eea" />
                        </View>
                        <View className="flex-1 ml-3">
                          <Text className="text-sm font-medium text-gray-900">
                            {formatWeekDates(report.week_start, report.week_end)}
                          </Text>
                          <Text className="text-xs text-gray-500" numberOfLines={1}>
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
                          <Text className="text-sm font-semibold text-gray-900 leading-relaxed mb-3">
                            {historySummary.headline}
                          </Text>

                          {/* Metrics */}
                          {historySummary.metrics.length > 0 && (
                            <View className="gap-1 mb-3">
                              {historySummary.metrics.map((metric, idx) => (
                                <View key={idx} className="flex-row">
                                  <Text className="text-sm text-gray-500">{metric.label}: </Text>
                                  <Text className="text-sm font-medium text-gray-900">{metric.value}</Text>
                                </View>
                              ))}
                            </View>
                          )}

                          {/* Strengths */}
                          {historySummary.strengths.length > 0 && (
                            <View className="mb-3">
                              <Text className="text-sm font-semibold text-gray-900 mb-1">💪 강점</Text>
                              {historySummary.strengths.map((strength, idx) => (
                                <Text key={idx} className="text-sm text-gray-600">• {strength}</Text>
                              ))}
                            </View>
                          )}

                          {/* Improvements */}
                          {(historySummary.improvements.problem || historySummary.improvements.insight || historySummary.improvements.items?.length) && (
                            <View className="mb-3">
                              <Text className="text-sm font-semibold text-gray-900 mb-1">⚡ 개선 포인트</Text>
                              {historySummary.improvements.problem && (
                                <Text className="text-sm text-gray-600">• {historySummary.improvements.problem}</Text>
                              )}
                              {historySummary.improvements.insight && (
                                <Text className="text-sm text-gray-600">• {historySummary.improvements.insight}</Text>
                              )}
                              {historySummary.improvements.items?.map((item, idx) => (
                                <Text key={idx} className="text-sm text-gray-600">
                                  • <Text className="font-medium">{item.area}</Text>: {item.issue} → {item.solution}
                                </Text>
                              ))}
                            </View>
                          )}

                          {/* Action Plan */}
                          {historySummary.actionPlan.length > 0 && (
                            <View>
                              <Text className="text-sm font-semibold text-gray-900 mb-1">🎯 MandaAct의 제안</Text>
                              {historySummary.actionPlan.map((step, idx) => (
                                <Text key={idx} className="text-sm text-gray-600">• {step}</Text>
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

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  )
}
