import React, { useState, useCallback } from 'react'
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
import {
  FileText,
  Target,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Calendar,
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

// Get week dates
function getWeekDates(weekStart: string): { start: string; end: string } {
  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)

  const formatDate = (d: Date) => {
    const month = d.getMonth() + 1
    const day = d.getDate()
    return `${month}/${day}`
  }

  return {
    start: formatDate(start),
    end: formatDate(end),
  }
}

// Simple markdown renderer
function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split('\n')

  return (
    <View className="gap-2">
      {lines.map((line, index) => {
        // Headers
        if (line.startsWith('### ')) {
          return (
            <Text key={index} className="text-base font-semibold text-gray-900 mt-3">
              {line.replace('### ', '')}
            </Text>
          )
        }
        if (line.startsWith('## ')) {
          return (
            <Text key={index} className="text-lg font-bold text-gray-900 mt-4">
              {line.replace('## ', '')}
            </Text>
          )
        }
        if (line.startsWith('# ')) {
          return (
            <Text key={index} className="text-xl font-bold text-gray-900 mt-4">
              {line.replace('# ', '')}
            </Text>
          )
        }

        // Bullet points
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <View key={index} className="flex-row pl-2">
              <Text className="text-gray-400 mr-2">•</Text>
              <Text className="text-sm text-gray-700 flex-1">{line.slice(2)}</Text>
            </View>
          )
        }

        // Empty lines
        if (line.trim() === '') {
          return <View key={index} className="h-2" />
        }

        // Regular text
        return (
          <Text key={index} className="text-sm text-gray-700 leading-relaxed">
            {line}
          </Text>
        )
      })}
    </View>
  )
}

// SMART Score Bar
function SmartScoreBar({ label, score }: { label: string; score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return 'bg-green-500'
    if (s >= 60) return 'bg-amber-500'
    return 'bg-red-400'
  }

  return (
    <View className="mb-3">
      <View className="flex-row justify-between mb-1">
        <Text className="text-sm text-gray-600">{label}</Text>
        <Text className="text-sm font-medium text-gray-900">{score}점</Text>
      </View>
      <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <View
          className={`h-full rounded-full ${getColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </View>
    </View>
  )
}

export default function ReportsScreen() {
  const { user } = useAuthStore()
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'weekly' | 'diagnosis'>('weekly')
  const [selectedMandalartId, setSelectedMandalartId] = useState<string | null>(null)

  // Data fetching
  const { data: mandalarts = [] } = useActiveMandalarts(user?.id)
  const { data: weeklyReport, isLoading: weeklyLoading, refetch: refetchWeekly } = useWeeklyReport(user?.id)
  const { data: reportHistory = [] } = useReportHistory(user?.id)
  const { data: diagnosis, isLoading: diagnosisLoading } = useGoalDiagnosis(selectedMandalartId || undefined)

  // Mutations
  const generateWeeklyMutation = useGenerateWeeklyReport()
  const generateDiagnosisMutation = useGenerateGoalDiagnosis()

  // Set default mandalart if available
  React.useEffect(() => {
    if (mandalarts.length > 0 && !selectedMandalartId) {
      setSelectedMandalartId(mandalarts[0].id)
    }
  }, [mandalarts, selectedMandalartId])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetchWeekly()
    setRefreshing(false)
  }, [refetchWeekly])

  const handleGenerateWeekly = async () => {
    if (!user?.id) return

    try {
      await generateWeeklyMutation.mutateAsync({ userId: user.id })
    } catch {
      Alert.alert('오류', '리포트 생성에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  const handleGenerateDiagnosis = async () => {
    if (!selectedMandalartId) return

    try {
      await generateDiagnosisMutation.mutateAsync(selectedMandalartId)
    } catch {
      Alert.alert('오류', '진단 생성에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  const selectedMandalart = mandalarts.find(m => m.id === selectedMandalartId)

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
          <Text className="text-2xl font-bold text-gray-900">AI 리포트</Text>
          <Text className="text-sm text-gray-500 mt-1">
            AI가 분석한 실천 리포트와 목표 진단
          </Text>
        </View>

        {/* Tab Selector */}
        <View className="flex-row mx-4 mb-4 bg-gray-200 rounded-xl p-1">
          <Pressable
            className={`flex-1 py-2 rounded-lg ${activeTab === 'weekly' ? 'bg-white' : ''}`}
            onPress={() => setActiveTab('weekly')}
          >
            <View className="flex-row items-center justify-center">
              <FileText size={16} color={activeTab === 'weekly' ? '#667eea' : '#9ca3af'} />
              <Text
                className={`ml-1 text-sm font-medium ${
                  activeTab === 'weekly' ? 'text-primary' : 'text-gray-500'
                }`}
              >
                주간 리포트
              </Text>
            </View>
          </Pressable>

          <Pressable
            className={`flex-1 py-2 rounded-lg ${activeTab === 'diagnosis' ? 'bg-white' : ''}`}
            onPress={() => setActiveTab('diagnosis')}
          >
            <View className="flex-row items-center justify-center">
              <Target size={16} color={activeTab === 'diagnosis' ? '#667eea' : '#9ca3af'} />
              <Text
                className={`ml-1 text-sm font-medium ${
                  activeTab === 'diagnosis' ? 'text-primary' : 'text-gray-500'
                }`}
              >
                목표 진단
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Weekly Report Tab */}
        {activeTab === 'weekly' && (
          <View className="px-4">
            {weeklyLoading ? (
              <View className="bg-white rounded-2xl p-8 items-center">
                <ActivityIndicator size="large" color="#667eea" />
                <Text className="text-gray-500 mt-4">리포트 불러오는 중...</Text>
              </View>
            ) : weeklyReport ? (
              <>
                {/* Report Header */}
                <View className="bg-white rounded-2xl p-4 mb-4">
                  <View className="flex-row items-center mb-2">
                    <Calendar size={16} color="#667eea" />
                    <Text className="text-sm text-gray-500 ml-2">
                      {weeklyReport.week_start} ~ {weeklyReport.week_end}
                    </Text>
                  </View>
                  <Text className="text-lg font-semibold text-gray-900">
                    {weeklyReport.summary || '이번 주 실천 리포트'}
                  </Text>
                </View>

                {/* Report Content */}
                <View className="bg-white rounded-2xl p-4 mb-4">
                  <SimpleMarkdown content={weeklyReport.report_content} />
                </View>

                {/* Regenerate Button */}
                <Pressable
                  className="bg-gray-100 rounded-xl p-4 flex-row items-center justify-center mb-4"
                  onPress={handleGenerateWeekly}
                  disabled={generateWeeklyMutation.isPending}
                >
                  {generateWeeklyMutation.isPending ? (
                    <ActivityIndicator size="small" color="#667eea" />
                  ) : (
                    <Sparkles size={18} color="#667eea" />
                  )}
                  <Text className="text-primary font-medium ml-2">
                    리포트 다시 생성
                  </Text>
                </Pressable>
              </>
            ) : (
              <View className="bg-white rounded-2xl p-8 items-center">
                <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-4">
                  <FileText size={32} color="#667eea" />
                </View>
                <Text className="text-lg font-semibold text-gray-900 mb-2">
                  이번 주 리포트
                </Text>
                <Text className="text-sm text-gray-500 text-center mb-4">
                  AI가 이번 주 실천 데이터를 분석하여{'\n'}
                  맞춤 피드백을 제공합니다
                </Text>
                <Pressable
                  className="bg-primary rounded-xl px-6 py-3 flex-row items-center"
                  onPress={handleGenerateWeekly}
                  disabled={generateWeeklyMutation.isPending}
                >
                  {generateWeeklyMutation.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Sparkles size={18} color="white" />
                  )}
                  <Text className="text-white font-medium ml-2">
                    리포트 생성하기
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Report History */}
            {reportHistory.length > 0 && (
              <View className="mt-4">
                <Text className="text-lg font-semibold text-gray-900 mb-3">
                  지난 리포트
                </Text>
                <View className="bg-white rounded-2xl overflow-hidden">
                  {reportHistory.slice(0, 4).map((report, index) => {
                    const dates = getWeekDates(report.week_start)
                    return (
                      <Pressable
                        key={report.id}
                        className={`p-4 flex-row items-center ${
                          index < Math.min(reportHistory.length, 4) - 1
                            ? 'border-b border-gray-100'
                            : ''
                        }`}
                      >
                        <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                          <FileText size={18} color="#667eea" />
                        </View>
                        <View className="flex-1 ml-3">
                          <Text className="text-sm font-medium text-gray-900">
                            {dates.start} ~ {dates.end}
                          </Text>
                          <Text className="text-xs text-gray-500" numberOfLines={1}>
                            {report.summary || '주간 실천 리포트'}
                          </Text>
                        </View>
                        <ChevronRight size={18} color="#9ca3af" />
                      </Pressable>
                    )
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Goal Diagnosis Tab */}
        {activeTab === 'diagnosis' && (
          <View className="px-4">
            {/* Mandalart Selector */}
            {mandalarts.length > 0 ? (
              <>
                <View className="bg-white rounded-2xl p-4 mb-4">
                  <Text className="text-sm text-gray-500 mb-2">분석할 만다라트</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      {mandalarts.map(m => (
                        <Pressable
                          key={m.id}
                          className={`px-4 py-2 rounded-full ${
                            selectedMandalartId === m.id
                              ? 'bg-primary'
                              : 'bg-gray-100'
                          }`}
                          onPress={() => setSelectedMandalartId(m.id)}
                        >
                          <Text
                            className={`text-sm font-medium ${
                              selectedMandalartId === m.id
                                ? 'text-white'
                                : 'text-gray-700'
                            }`}
                            numberOfLines={1}
                          >
                            {m.center_goal}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {diagnosisLoading ? (
                  <View className="bg-white rounded-2xl p-8 items-center">
                    <ActivityIndicator size="large" color="#667eea" />
                    <Text className="text-gray-500 mt-4">진단 불러오는 중...</Text>
                  </View>
                ) : diagnosis ? (
                  <>
                    {/* SMART Scores */}
                    <View className="bg-white rounded-2xl p-4 mb-4">
                      <View className="flex-row items-center mb-4">
                        <TrendingUp size={18} color="#667eea" />
                        <Text className="text-lg font-semibold text-gray-900 ml-2">
                          SMART 점수
                        </Text>
                      </View>
                      <SmartScoreBar label="구체성 (Specific)" score={diagnosis.smart_scores.specific} />
                      <SmartScoreBar label="측정가능 (Measurable)" score={diagnosis.smart_scores.measurable} />
                      <SmartScoreBar label="달성가능 (Achievable)" score={diagnosis.smart_scores.achievable} />
                      <SmartScoreBar label="관련성 (Relevant)" score={diagnosis.smart_scores.relevant} />
                      <SmartScoreBar label="시한설정 (Time-bound)" score={diagnosis.smart_scores.timeBound} />
                    </View>

                    {/* Diagnosis Content */}
                    <View className="bg-white rounded-2xl p-4 mb-4">
                      <SimpleMarkdown content={diagnosis.diagnosis_content} />
                    </View>

                    {/* Regenerate Button */}
                    <Pressable
                      className="bg-gray-100 rounded-xl p-4 flex-row items-center justify-center mb-4"
                      onPress={handleGenerateDiagnosis}
                      disabled={generateDiagnosisMutation.isPending}
                    >
                      {generateDiagnosisMutation.isPending ? (
                        <ActivityIndicator size="small" color="#667eea" />
                      ) : (
                        <Sparkles size={18} color="#667eea" />
                      )}
                      <Text className="text-primary font-medium ml-2">
                        진단 다시 받기
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <View className="bg-white rounded-2xl p-8 items-center">
                    <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-4">
                      <Target size={32} color="#667eea" />
                    </View>
                    <Text className="text-lg font-semibold text-gray-900 mb-2">
                      목표 진단
                    </Text>
                    <Text className="text-sm text-gray-500 text-center mb-4">
                      AI가 만다라트 목표 구조를{'\n'}
                      SMART 기준으로 분석합니다
                    </Text>
                    <Pressable
                      className="bg-primary rounded-xl px-6 py-3 flex-row items-center"
                      onPress={handleGenerateDiagnosis}
                      disabled={generateDiagnosisMutation.isPending}
                    >
                      {generateDiagnosisMutation.isPending ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Sparkles size={18} color="white" />
                      )}
                      <Text className="text-white font-medium ml-2">
                        진단 받기
                      </Text>
                    </Pressable>
                  </View>
                )}
              </>
            ) : (
              <View className="bg-white rounded-2xl p-8 items-center">
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
          </View>
        )}

        {/* Bottom spacing */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  )
}
