import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
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
import { useTranslation } from 'react-i18next'
import { Header } from '../components'
import { BannerAd, ReportGenerateButton } from '../components/ads'
import { useInterstitialAd } from '../hooks/useInterstitialAd'
import { logger } from '../lib/logger'

import { useAuthStore } from '../store/authStore'
import { formatDateRange, formatMonthDay, formatShortDate, formatZonedWeekday, trackWeeklyReportGenerated, trackGoalDiagnosisViewed } from '../lib'
import { useActiveMandalarts } from '../hooks/useMandalarts'
import { useProfileStats } from '../hooks/useStats'
import { useSubscriptionContext } from '../context'
import { useUserProfile } from '../hooks/useUserProfile'
import {
  useWeeklyReport,
  useGenerateWeeklyReport,
  useGoalDiagnosis,
  useGenerateGoalDiagnosis,
  useReportHistory,
} from '../hooks/useReports'
import { parseWeeklyReport, parseDiagnosisReport, getMetricLabelKey, type ReportSummary, type ReportErrorReason } from '../lib/reportParser'
import { toZonedTime } from 'date-fns-tz'

// Get week dates for display
function formatWeekDates(weekStart: string, weekEnd: string, language: string, timeZone: string): string {
  return formatDateRange(weekStart, weekEnd, { language, timeZone })
}

// Get next Monday date for "다음 리포트" display
function getNextMonday(language: string, timeZone: string): string {
  const now = new Date()
  const zonedNow = toZonedTime(now, timeZone)
  const dayOfWeek = zonedNow.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7 || 7
  const nextMonday = new Date(zonedNow)
  nextMonday.setDate(zonedNow.getDate() + daysUntilMonday)

  const datePart = formatShortDate(nextMonday, { language, timeZone })
  const weekday = formatZonedWeekday(nextMonday, { language, timeZone })
  return `${datePart} (${weekday})`
}

// Helper function to get error reason message
function getErrorReasonMessage(errorReason: ReportErrorReason | undefined, t: (key: string) => string): string | null {
  if (!errorReason) return null
  return t(`reports.errorReasons.${errorReason}`)
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
  loadingText,
  viewDetailsText,
  strengthsText,
  improvementsText,
  suggestionsText,
  translateLabel,
  t,
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
  loadingText?: string
  viewDetailsText?: string
  strengthsText?: string
  improvementsText?: string
  suggestionsText?: string
  translateLabel?: (label: string) => string
  t?: (key: string) => string
}) {
  if (isLoading) {
    return (
      <View
        className="bg-white rounded-2xl p-6 mb-5 border border-gray-100"
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
            {loadingText || 'Loading...'}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View
      className="bg-white rounded-2xl mb-5 overflow-hidden relative border border-gray-100"
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
        <View
          className="absolute z-10 bg-white/90 rounded-2xl"
          style={{
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator size="large" color="#2563eb" />
          <Text
            className="text-sm text-gray-700 mt-2"
            style={{ fontFamily: 'Pretendard-Medium' }}
          >
            {generatingText}
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
          {/* Error Reason Message */}
          {summary.errorReason && t && (
            <View className="bg-gray-50 rounded-xl p-4 mb-4">
              <Text
                className="text-sm text-gray-600 leading-relaxed"
                style={{ fontFamily: 'Pretendard-Medium' }}
              >
                {getErrorReasonMessage(summary.errorReason, t)}
              </Text>
            </View>
          )}

          {/* Headline - only show if no error and headline exists */}
          {!summary.errorReason && summary.headline && (
            <Text
              className="text-base text-gray-900 leading-relaxed mb-4"
              style={{ fontFamily: 'Pretendard-SemiBold' }}
            >
              {summary.headline}
            </Text>
          )}

          {/* Key Metrics */}
          {!summary.errorReason && summary.metrics.length > 0 && (
            <View className="gap-2 mb-4">
              {summary.metrics.map((metric, idx) => (
                <View key={idx} className="flex-row">
                  <Text
                    className="text-sm text-gray-500"
                    style={{ fontFamily: 'Pretendard-Regular' }}
                  >
                    {translateLabel ? translateLabel(metric.label) : metric.label}:{' '}
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

          {/* Expandable Detail Section - only show when no error */}
          {!summary.errorReason && (summary.strengths.length > 0 || summary.actionPlan.length > 0 || summary.improvements.problem) && (
            <Pressable
              className="bg-gray-100/80 rounded-xl p-4 active:opacity-70"
              onPress={onToggleExpand}
            >
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-sm text-primary"
                  style={{ fontFamily: 'Pretendard-SemiBold' }}
                >
                  {viewDetailsText || 'View Details'}
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
                        💪 {strengthsText || 'Strengths'}
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
                        ⚡ {improvementsText || 'Areas to Improve'}
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
                        🎯 {suggestionsText || "MandaAct's Suggestions"}
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
// Policy: Case 2 (no reports + has practice) → show first report button
//         Case 3 (no reports + no practice) → show guidance only
function EmptyReportState({
  hasMandalarts,
  hasChecks,
  onGenerate,
  isGenerating,
  navigation,
  t,
}: {
  hasMandalarts: boolean
  hasChecks: boolean
  onGenerate: () => void
  isGenerating: boolean
  navigation: NativeStackNavigationProp<RootStackParamList>
  t: (key: string, params?: Record<string, unknown>) => string
}) {
  // Case 2: no reports + has practice → can generate first report
  const canGenerateFirst = hasMandalarts && hasChecks

  const StepRow = ({
    step,
    completed,
    label,
  }: {
    step: number
    completed: boolean
    label: string
  }) => (
    <View className="flex-row items-center">
      <View
        className={`w-5 h-5 rounded-full items-center justify-center mr-2 ${
          completed ? 'bg-primary' : 'border border-gray-300'
        }`}
      >
        <Text
          className={`text-xs ${completed ? 'text-white' : 'text-gray-500'}`}
          style={{ fontFamily: 'Pretendard-Medium' }}
        >
          {completed ? '✓' : String(step)}
        </Text>
      </View>
      <Text
        className={`text-sm ${completed ? 'text-gray-400 line-through' : 'text-gray-600'}`}
        style={{ fontFamily: 'Pretendard-Regular' }}
      >
        {label}
      </Text>
    </View>
  )

  return (
    <View className="bg-white rounded-2xl p-6">
      {/* Icon */}
      <View className="items-center mb-4">
        <View className="w-14 h-14 bg-gray-100 rounded-full items-center justify-center">
          <FileText size={28} color="#9ca3af" />
        </View>
      </View>

      {/* Title & Description - different messages based on condition */}
      {canGenerateFirst ? (
        <>
          <Text
            className="text-lg text-gray-900 text-center mb-2"
            style={{ fontFamily: 'Pretendard-SemiBold' }}
          >
            {t('reports.empty.firstReportTitle')}
          </Text>
          <Text
            className="text-sm text-gray-500 text-center mb-5"
            style={{ fontFamily: 'Pretendard-Regular' }}
          >
            {t('reports.empty.firstReportDesc')}
          </Text>
        </>
      ) : (
        <>
          <Text
            className="text-lg text-gray-900 text-center mb-2"
            style={{ fontFamily: 'Pretendard-SemiBold' }}
          >
            {t('reports.empty.title')}
          </Text>
          <Text
            className="text-sm text-gray-500 text-center mb-5"
            style={{ fontFamily: 'Pretendard-Regular' }}
          >
            {t('reports.empty.description')}
          </Text>
        </>
      )}

      {/* Guide Box - show only when no practice records */}
      {!hasChecks && (
        <View className="bg-gray-50 rounded-xl p-4 mb-5">
          <Text
            className="text-sm text-gray-700 mb-3"
            style={{ fontFamily: 'Pretendard-SemiBold' }}
          >
            {t('reports.empty.stepsTitle')}
          </Text>
          <View className="mb-2">
            <StepRow step={1} completed={hasMandalarts} label={t('reports.empty.step1')} />
          </View>
          <StepRow step={2} completed={hasChecks} label={t('reports.empty.step2')} />
        </View>
      )}

      {/* Action Buttons */}
      {canGenerateFirst ? (
        // Case 2: First report generation button
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
                    {t('reports.generating')}
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
                        {t('reports.empty.generateFirst')}
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
                        {t('reports.empty.generateFirst')}
                      </Text>
                    </View>
                  </LinearGradient>
                </MaskedView>
              )}
            </View>
          </LinearGradient>
        </Pressable>
      ) : hasMandalarts ? (
        // Case 3-a: Has mandalart + no practice → go to practice
        <View className="flex-row gap-3">
          <Pressable
            className="flex-1 py-3 rounded-xl border border-gray-200 bg-white"
            onPress={() => navigation.navigate('Tutorial')}
          >
            <Text
              className="text-sm text-gray-700 text-center"
              style={{ fontFamily: 'Pretendard-SemiBold' }}
            >
              {t('common.userGuide')}
            </Text>
          </Pressable>
          <Pressable
            className="flex-1 rounded-xl overflow-hidden"
            onPress={() => navigation.navigate('Main', { screen: 'Today' } as never)}
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
                      {t('reports.empty.goPractice')}
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
                      {t('reports.empty.goPractice')}
                    </Text>
                  </LinearGradient>
                </MaskedView>
              </View>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        // Case 3-b: No mandalart → create mandalart
        <View className="flex-row gap-3">
          <Pressable
            className="flex-1 py-3 rounded-xl border border-gray-200 bg-white"
            onPress={() => navigation.navigate('Tutorial')}
          >
            <Text
              className="text-sm text-gray-700 text-center"
              style={{ fontFamily: 'Pretendard-SemiBold' }}
            >
              {t('common.userGuide')}
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
                      {t('reports.empty.createMandalart')}
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
                      {t('reports.empty.createMandalart')}
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
  const { t, i18n } = useTranslation()
  const isEnglish = i18n.language === 'en'
  const { timezone } = useUserProfile(user?.id)
  const { canGenerateReport, isPremium } = useSubscriptionContext()

  // Log premium status changes for debugging
  useEffect(() => {
    console.log('[ReportsScreen] 🔄 Premium status update:', {
      isPremium,
    })
  }, [isPremium])

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

  // Interstitial ad for after report generation
  const { show: showInterstitialAd } = useInterstitialAd({
    adType: 'INTERSTITIAL_AFTER_REPORT',
    onAdClosed: () => {
      // Ad closed
    },
    onError: (error) => {
      logger.error('Interstitial ad error', error)
    },
  })

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

  // 이번 주 리포트 생성 횟수 계산
  const getThisWeekReportCount = useCallback(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)) // Monday
    startOfWeek.setHours(0, 0, 0, 0)

    return reportHistory.filter(report => {
      const reportDate = new Date(report.created_at)
      return reportDate >= startOfWeek
    }).length
  }, [reportHistory])

  const weeklyReportCount = getThisWeekReportCount()
  const canGenerateThisWeek = canGenerateReport(weeklyReportCount)

  // Premium users: Always can generate
  // Free users: 주 1회 제한 (첫 리포트 또는 주간 제한 내)
  const canDirectlyGenerate = isPremium || canGenerateFirstReport || canGenerateThisWeek

  // Translate metric labels using i18n
  const translateLabel = useCallback(
    (label: string): string => {
      const i18nKey = getMetricLabelKey(label)
      // If it's an i18n key, translate it; otherwise return original
      if (i18nKey.startsWith('reports.metrics.')) {
        return t(i18nKey)
      }
      return label
    },
    [t]
  )

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetchWeekly()
    setRefreshing(false)
  }, [refetchWeekly])

  const handleGenerateAll = async () => {
    if (!user?.id) return

    // Check if user can generate report
    if (!canDirectlyGenerate) {
      Alert.alert(
        t('reports.limitReached.title'),
        t('reports.limitReached.message')
      )
      return
    }

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

      // Show interstitial ad after report generation (only for non-premium users)
      if (!isPremium) {
        await showInterstitialAd()
      }
    } catch {
      Alert.alert(t('common.error'), t('reports.error'))
    }
  }

  const isGenerating = generateWeeklyMutation.isPending || generateDiagnosisMutation.isPending

  // Empty state conditions:
  // 1. No mandalarts at all
  // 2. Has mandalarts but no checks (first practice needed)
  // 3. Has mandalarts + checks but no reports yet → show "generate first report" button
  const showEmptyState = !weeklyLoading && !diagnosisLoading && !weeklyReport && !diagnosis && (!hasMandalarts || !hasChecks)

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
                  {t('reports.title')}
                </Text>
                <Text
                  className="text-base text-gray-500 ml-3"
                  style={{ fontFamily: 'Pretendard-Medium' }}
                >
                  {t('reports.subtitle')}
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
            t={t}
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
                {t('reports.title')}
              </Text>
              <Text
                className="text-base text-gray-500 ml-3"
                style={{ fontFamily: 'Pretendard-Medium' }}
              >
                {t('reports.subtitle')}
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
                        {t('reports.generating')}
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
                            {t('reports.empty.generateFirst')}
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
                            {t('reports.empty.generateFirst')}
                          </Text>
                        </View>
                      </LinearGradient>
                    </MaskedView>
                  )}
                </View>
              </LinearGradient>
            </Pressable>
          )}

          {/* 다음 리포트 안내 (Free 유저, 기존 리포트가 있는 경우) - 그라디언트 테두리 + 텍스트 */}
          {!isPremium && hasExistingReports && (
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
                          {t('reports.nextReport', { date: getNextMonday(i18n.language, timezone) })}
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
                          {t('reports.nextReport', { date: getNextMonday(i18n.language, timezone) })}
                        </Text>
                      </View>
                    </LinearGradient>
                  </MaskedView>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Premium 유저: 리포트 즉시 생성 버튼 (Login 버튼과 동일한 스타일) */}
          {isPremium && hasExistingReports && hasMandalarts && (
            <Pressable
              onPress={handleGenerateAll}
              disabled={generateWeeklyMutation.isPending || generateDiagnosisMutation.isPending}
              style={{
                opacity: generateWeeklyMutation.isPending || generateDiagnosisMutation.isPending ? 0.6 : 1,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 4,
              }}
            >
              <LinearGradient
                colors={['#2563eb', '#9333ea', '#db2777']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ padding: 1, borderRadius: 16 }}
              >
                <View
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 15,
                    paddingVertical: 14,
                    paddingHorizontal: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                  }}
                >
                  {generateWeeklyMutation.isPending || generateDiagnosisMutation.isPending ? (
                    <>
                      <ActivityIndicator size="small" color="#7c3aed" />
                      <Text
                        className="text-gray-700 text-base ml-2"
                        style={{ fontFamily: 'Pretendard-SemiBold' }}
                      >
                        {t('reports.generating')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} color="#7c3aed" />
                      <MaskedView
                        maskElement={
                          <Text
                            className="text-base ml-2"
                            style={{ fontFamily: 'Pretendard-SemiBold' }}
                          >
                            {t('reports.generateReport')}
                          </Text>
                        }
                      >
                        <LinearGradient
                          colors={['#2563eb', '#9333ea', '#db2777']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          <Text
                            className="text-base ml-2 opacity-0"
                            style={{ fontFamily: 'Pretendard-SemiBold' }}
                          >
                            {t('reports.generateReport')}
                          </Text>
                        </LinearGradient>
                      </MaskedView>
                    </>
                  )}
                </View>
              </LinearGradient>
            </Pressable>
          )}

          {/* ReportGenerateButton - Generate new report with rewarded ad (Free users only) */}
          {!isPremium && !canDirectlyGenerate && hasExistingReports && hasMandalarts && (
            <View className="mt-4">
              <ReportGenerateButton
                onGenerateReport={() => {
                  // Generate new report after watching ad
                  handleGenerateAll()
                }}
              />
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
                      title={t('reports.goalDiagnosis')}
                      subtitle={t('reports.goalDiagnosisSubtitle')}
                      icon={Target}
                      date={diagnosis ? formatMonthDay(diagnosis.created_at, { language: i18n.language, timeZone: timezone }) : undefined}
                      summary={diagnosisSummary}
                      isExpanded={isDiagnosisExpanded}
                      onToggleExpand={() => setIsDiagnosisExpanded(!isDiagnosisExpanded)}
                      isLoading={diagnosisLoading}
                      isGenerating={generateDiagnosisMutation.isPending}
                    generatingText={t('reports.card.newDiagnosisGenerating')}
                    viewDetailsText={t('reports.card.viewDetails')}
                    strengthsText={t('reports.card.strengths')}
                    improvementsText={t('reports.card.improvements')}
                    suggestionsText={t('reports.card.suggestions')}
                    translateLabel={translateLabel}
                    t={t}
                  />
                )}

                {/* Case 2: No mandalarts but has existing diagnosis */}
                {!hasMandalarts && diagnosis && (
                  <ReportCard
                    title={t('reports.goalDiagnosis')}
                    subtitle={t('reports.goalDiagnosisSubtitle')}
                    icon={Target}
                    date={formatMonthDay(diagnosis.created_at, { language: i18n.language, timeZone: timezone })}
                    summary={diagnosisSummary}
                    isExpanded={isDiagnosisExpanded}
                    onToggleExpand={() => setIsDiagnosisExpanded(!isDiagnosisExpanded)}
                    isLoading={diagnosisLoading}
                    isGenerating={false}
                    viewDetailsText={t('reports.card.viewDetails')}
                    strengthsText={t('reports.card.strengths')}
                    improvementsText={t('reports.card.improvements')}
                    suggestionsText={t('reports.card.suggestions')}
                    translateLabel={translateLabel}
                    t={t}
                  />
                )}

                {/* Case 3: No mandalarts and no diagnosis */}
                {!hasMandalarts && !diagnosis && (
                  <View
                    className="bg-white rounded-2xl p-6 items-center mb-5 border border-gray-100"
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
                      {t('reports.mandalartNeeded')}
                    </Text>
                    <Text
                      className="text-sm text-gray-500 text-center"
                      style={{ fontFamily: 'Pretendard-Regular' }}
                    >
                      {t('reports.mandalartNeededDesc')}
                    </Text>
                  </View>
                )}
              </Animated.View>
            </View>

            {/* Right Column: Practice Report + History */}
            <View style={{ flex: 1 }}>
              <Animated.View entering={FadeInUp.delay(100).duration(400)}>
                <ReportCard
                  title={t('reports.practiceReport')}
                  subtitle={t('reports.practiceReportSubtitle')}
                  icon={TrendingUp}
                  date={weeklyReport ? formatWeekDates(weeklyReport.week_start, weeklyReport.week_end, i18n.language, timezone) : undefined}
                  summary={weeklySummary}
                  isExpanded={isPracticeExpanded}
                  onToggleExpand={() => setIsPracticeExpanded(!isPracticeExpanded)}
                  isLoading={weeklyLoading}
                  isGenerating={generateWeeklyMutation.isPending}
                  generatingText={t('reports.card.newReportGenerating')}
                  viewDetailsText={t('reports.card.viewDetails')}
                  strengthsText={t('reports.card.strengths')}
                  improvementsText={t('reports.card.improvements')}
                  suggestionsText={t('reports.card.suggestions')}
                  translateLabel={translateLabel}
                  t={t}
                />
              </Animated.View>

              {/* Report History - iPad */}
              {reportHistory.length > 1 && (
                <Animated.View entering={FadeInUp.delay(200).duration(400)} className="mt-4">
                  <Text
                    className="text-lg text-gray-900 mb-3"
                    style={{ fontFamily: 'Pretendard-SemiBold' }}
                  >
                    {t('reports.history.title')}
                  </Text>
                  <View
                    className="bg-white rounded-2xl overflow-hidden border border-gray-100"
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
                                {formatWeekDates(report.week_start, report.week_end, i18n.language, timezone)}
                              </Text>
                              <Text
                                className="text-xs text-gray-500"
                                style={{ fontFamily: 'Pretendard-Regular' }}
                                numberOfLines={1}
                              >
                                {historySummary?.headline || report.summary || t('reports.history.weeklyReport')}
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
                                    💪 {t('reports.card.strengths')}
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
                                    ⚡ {t('reports.card.improvements')}
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
                                    🎯 {t('reports.card.suggestions')}
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
                  title={t('reports.goalDiagnosis')}
                  subtitle={t('reports.goalDiagnosisSubtitle')}
                  icon={Target}
                  date={diagnosis ? formatMonthDay(diagnosis.created_at, { language: i18n.language, timeZone: timezone }) : undefined}
                  summary={diagnosisSummary}
                  isExpanded={isDiagnosisExpanded}
                  onToggleExpand={() => setIsDiagnosisExpanded(!isDiagnosisExpanded)}
                  isLoading={diagnosisLoading}
                  isGenerating={generateDiagnosisMutation.isPending}
                generatingText={t('reports.card.newDiagnosisGenerating')}
                viewDetailsText={t('reports.card.viewDetails')}
                strengthsText={t('reports.card.strengths')}
                improvementsText={t('reports.card.improvements')}
                suggestionsText={t('reports.card.suggestions')}
                translateLabel={translateLabel}
                t={t}
              />
            )}

            {/* Case 2: No mandalarts but has existing diagnosis - show existing diagnosis */}
            {!hasMandalarts && diagnosis && (
              <>
                  <ReportCard
                    title={t('reports.goalDiagnosis')}
                    subtitle={t('reports.goalDiagnosisSubtitle')}
                    icon={Target}
                    date={formatMonthDay(diagnosis.created_at, { language: i18n.language, timeZone: timezone })}
                    summary={diagnosisSummary}
                    isExpanded={isDiagnosisExpanded}
                    onToggleExpand={() => setIsDiagnosisExpanded(!isDiagnosisExpanded)}
                    isLoading={diagnosisLoading}
                    isGenerating={false}
                    viewDetailsText={t('reports.card.viewDetails')}
                  strengthsText={t('reports.card.strengths')}
                  improvementsText={t('reports.card.improvements')}
                  suggestionsText={t('reports.card.suggestions')}
                  translateLabel={translateLabel}
                  t={t}
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
                      {t('reports.newDiagnosisNotice')}
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
                      {t('common.create')}
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
                  {t('reports.mandalartNeeded')}
                </Text>
                <Text
                  className="text-sm text-gray-500 text-center mb-5"
                  style={{ fontFamily: 'Pretendard-Regular' }}
                >
                  {t('reports.mandalartNeededDesc')}
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
                      {t('common.userGuide')}
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
                              {t('reports.empty.createMandalart')}
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
                              {t('reports.empty.createMandalart')}
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

          {/* Practice Report Card - Second */}
          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <ReportCard
              title={t('reports.practiceReport')}
              subtitle={t('reports.practiceReportSubtitle')}
              icon={TrendingUp}
              date={weeklyReport ? formatWeekDates(weeklyReport.week_start, weeklyReport.week_end, i18n.language, timezone) : undefined}
              summary={weeklySummary}
              isExpanded={isPracticeExpanded}
              onToggleExpand={() => setIsPracticeExpanded(!isPracticeExpanded)}
              isLoading={weeklyLoading}
              isGenerating={generateWeeklyMutation.isPending}
              generatingText={t('reports.card.newReportGenerating')}
              viewDetailsText={t('reports.card.viewDetails')}
              strengthsText={t('reports.card.strengths')}
              improvementsText={t('reports.card.improvements')}
              suggestionsText={t('reports.card.suggestions')}
              translateLabel={translateLabel}
              t={t}
            />
          </Animated.View>

          {/* Report History */}
          {reportHistory.length > 1 && (
            <Animated.View entering={FadeInUp.delay(200).duration(400)} className="mt-4">
              <Text
                className="text-lg text-gray-900 mb-3"
                style={{ fontFamily: 'Pretendard-SemiBold' }}
              >
                {t('reports.history.title')}
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
                            {formatWeekDates(report.week_start, report.week_end, i18n.language, timezone)}
                          </Text>
                          <Text
                            className="text-xs text-gray-500"
                            style={{ fontFamily: 'Pretendard-Regular' }}
                            numberOfLines={1}
                          >
                            {historySummary?.headline || report.summary || t('reports.history.weeklyReport')}
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
                                    {translateLabel(metric.label)}:{' '}
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
                                💪 {t('reports.card.strengths')}
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
                                ⚡ {t('reports.card.improvements')}
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
                                🎯 {t('reports.card.suggestions')}
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

      {/* Banner Ad */}
      <BannerAd location="list" />
    </View>
  )
}
