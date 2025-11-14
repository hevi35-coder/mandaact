import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import type { AIReport } from '@/types'
import { Sparkles, Loader2, Calendar, TrendingUp, Target, AlertCircle, ChevronDown, ChevronUp, FileText, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import ReactMarkdown from 'react-markdown'
import { parseWeeklyReport, parseDiagnosisReport } from '@/lib/reportParser'
import { useNavigate } from 'react-router-dom'

export function AIWeeklyReport() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [latestReport, setLatestReport] = useState<AIReport | null>(null)
  const [latestDiagnosis, setLatestDiagnosis] = useState<AIReport | null>(null)
  const [reportHistory, setReportHistory] = useState<AIReport[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [generatingDiagnosis, setGeneratingDiagnosis] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPracticeOpen, setIsPracticeOpen] = useState(false)
  const [isDiagnosisOpen, setIsDiagnosisOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    loadReports()
  }, [user])

  const loadReports = async () => {
    if (!user) return
    setLoading(true)

    try {
      // Get latest weekly report
      const { data: latest } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('user_id', user.id)
        .eq('report_type', 'weekly')
        .order('generated_at', { ascending: false })
        .limit(1)
        .single()

      setLatestReport(latest || null)

      // Get latest diagnosis report
      const { data: diagnosis } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('user_id', user.id)
        .eq('report_type', 'diagnosis')
        .order('generated_at', { ascending: false })
        .limit(1)
        .single()

      setLatestDiagnosis(diagnosis || null)

      // Get report history (last 5)
      const { data: history } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('user_id', user.id)
        .eq('report_type', 'weekly')
        .order('generated_at', { ascending: false })
        .limit(5)

      setReportHistory(history || [])
    } catch (err) {
      console.error('Error loading reports:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    if (!user || generating) return

    setGenerating(true)
    setError(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        throw new Error('No active session')
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-report`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            report_type: 'weekly',
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Weekly report generation failed:', response.status, errorData)
        throw new Error(errorData.error || `Failed to generate report: ${response.status}`)
      }

      const result = await response.json()

      // Validate report content
      if (!result.report || !result.report.content) {
        console.error('Invalid report response:', result)
        throw new Error('리포트 내용이 비어있습니다.')
      }

      setLatestReport(result.report)
      await loadReports()
    } catch (err) {
      console.error('Error generating report:', err)
      setError(err instanceof Error ? err.message : '리포트 생성 중 오류가 발생했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  const generateDiagnosis = async () => {
    if (!user || generatingDiagnosis) return

    setGeneratingDiagnosis(true)
    setError(null)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        throw new Error('No active session')
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-report`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            report_type: 'diagnosis',
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Diagnosis generation failed:', response.status, errorData)
        throw new Error(errorData.error || `Failed to generate diagnosis: ${response.status}`)
      }

      const result = await response.json()
      setLatestDiagnosis(result.report)
      await loadReports()
    } catch (err) {
      console.error('Error generating diagnosis:', err)
      setError(err instanceof Error ? err.message : '목표 진단 생성 중 오류가 발생했습니다.')
    } finally {
      setGeneratingDiagnosis(false)
    }
  }

  const handleHistorySelect = async (reportId: string) => {
    if (!reportId || reportId === selectedHistoryId) {
      setSelectedHistoryId('')
      setLatestReport(reportHistory[0] || null)
      return
    }

    const selected = reportHistory.find(r => r.id === reportId)
    if (selected) {
      setLatestReport(selected)
      setSelectedHistoryId(reportId)
    }
  }

  const displayedReport = selectedHistoryId
    ? reportHistory.find(r => r.id === selectedHistoryId) || latestReport
    : latestReport

  // Parse reports for summary display
  const practiceSummary = displayedReport ? parseWeeklyReport(displayedReport.content) : null
  const diagnosisSummary = latestDiagnosis ? parseDiagnosisReport(latestDiagnosis.content) : null

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!displayedReport) {
    return (
      <div className="space-y-4">
        {/* Mock Preview Background */}
        <div className="relative">
          {/* Practice Report Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.3, y: 0 }}
            transition={{ duration: 0.5 }}
            className="pointer-events-none"
          >
            <Card className="blur-[2px]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <CardTitle>실천 리포트</CardTitle>
                  </div>
                  <Badge variant="outline">11월 14일</Badge>
                </div>
                <CardDescription>
                  최근 7일간 실천 데이터 분석 및 개선 제안
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-base font-semibold text-foreground leading-relaxed">
                  화요일 오후에 집중된 실천 패턴이 관찰되며, 평일 중 실천일수가 적어 일관성 강화가 필요합니다
                </p>
                <div className="space-y-1.5">
                  <div className="text-sm text-foreground">
                    <span className="text-muted-foreground">총 실천 횟수: </span>
                    <span className="font-medium">6회</span>
                  </div>
                  <div className="text-sm text-foreground">
                    <span className="text-muted-foreground">실천일수: </span>
                    <span className="font-medium">최근 7일 중 3일</span>
                  </div>
                  <div className="text-sm text-foreground">
                    <span className="text-muted-foreground">전주 대비: </span>
                    <span className="font-medium">데이터 없음</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Goal Diagnosis Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.3, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="pointer-events-none mt-4"
          >
            <Card className="blur-[2px]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle>목표 진단</CardTitle>
                  </div>
                  <Badge variant="outline">11월 14일</Badge>
                </div>
                <CardDescription>
                  만다라트 계획 점검 및 개선 제안
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-base font-semibold text-foreground leading-relaxed">
                  현재 만다라트 구조가 잘 설계되어 있으며, SMART 원칙을 충족하는 목표들로 구성되어 있습니다
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Overlay Card with Empty State Message */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="absolute inset-0 flex items-center justify-center p-4"
          >
            <Card className="w-full max-w-md shadow-xl bg-background/95 backdrop-blur-sm border-2">
              <CardContent className="text-center py-8 space-y-5">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                  <FileText className="h-8 w-8 text-primary" />
                </div>

                <div className="space-y-2">
                  <p className="text-xl font-semibold">아직 리포트가 없어요</p>
                  <p className="text-sm text-muted-foreground">
                    만다라트를 만들고 실천을 시작하면<br />
                    일주일 후부터 AI 리포트를 받을 수 있어요
                  </p>
                </div>

                {/* Progress Steps */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-left">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    리포트 생성을 위한 단계
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-muted-foreground">1</span>
                      </div>
                      <span className="text-muted-foreground">만다라트 만들기</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-muted-foreground">2</span>
                      </div>
                      <span className="text-muted-foreground">매일 실천 기록하기</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/tutorial')}
                    className="flex-[0.4]"
                    size="lg"
                  >
                    튜토리얼
                  </Button>
                  <Button
                    onClick={() => navigate('/mandalart/create')}
                    className="flex-[0.6]"
                    size="lg"
                  >
                    만다라트 생성
                  </Button>
                </div>

                {error && (
                  <Alert variant="destructive" className="mt-4 text-left">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
        {reportHistory.length > 1 && (
          <select
            value={selectedHistoryId}
            onChange={(e) => handleHistorySelect(e.target.value)}
            className="text-sm border rounded-md px-3 py-2 bg-background hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <option value="">최신 리포트</option>
            {reportHistory.slice(1).map(report => (
              <option key={report.id} value={report.id}>
                {format(new Date(report.generated_at), 'M월 d일 HH:mm', { locale: ko })}
              </option>
            ))}
          </select>
        )}
        <Button
          onClick={async () => {
            await generateReport()
            await generateDiagnosis()
          }}
          disabled={generating || generatingDiagnosis}
          className="whitespace-nowrap"
        >
          {generating || generatingDiagnosis ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              생성 중...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-1.5" />
              새로 생성하기
            </>
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Practice Report Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="relative">
          {/* Loading Overlay */}
          {generating && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm font-medium">새 리포트 생성 중...</p>
              </div>
            </div>
          )}

          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>실천 리포트</CardTitle>
              </div>
              {displayedReport && (
                <Badge variant="outline">
                  {format(new Date(displayedReport.generated_at), 'M월 d일', { locale: ko })}
                </Badge>
              )}
            </div>
            <CardDescription>
              최근 7일간 실천 데이터 분석 및 개선 제안
            </CardDescription>
          </CardHeader>

          {/* Summary Section - Always Visible */}
          {practiceSummary && (
            <CardContent className="space-y-4">
              {/* Headline */}
              {practiceSummary.headline && (
                <p className="text-base font-semibold text-foreground leading-relaxed">
                  {practiceSummary.headline}
                </p>
              )}

              {/* Key Metrics */}
              {practiceSummary.metrics.length > 0 && (
                <div className="space-y-1.5">
                  {practiceSummary.metrics.map((metric, idx) => (
                    <div key={idx} className="text-sm text-foreground">
                      {metric.label && <span className="text-muted-foreground">{metric.label}: </span>}
                      <span className="font-medium">{metric.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}

          {/* Collapsible Detail Section */}
          {practiceSummary && practiceSummary.detailContent && (
            <Collapsible open={isPracticeOpen} onOpenChange={setIsPracticeOpen}>
              <CardContent className="px-6 pb-2">
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <CollapsibleTrigger asChild>
                    <button
                      className="w-full text-sm font-semibold text-primary flex items-center justify-between hover:opacity-80 transition-opacity"
                    >
                      <span>상세보기</span>
                      {isPracticeOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </CollapsibleTrigger>

                  {isPracticeOpen && (
                    <div className="mt-3 prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => (
                            <h2 className="text-base font-bold text-foreground mb-3 mt-2">{children}</h2>
                          ),
                          h2: ({ children }) => (
                            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2 flex items-center gap-2">{children}</h3>
                          ),
                          ul: ({ children }) => (
                            <ul className="space-y-1 my-1.5 ml-1">{children}</ul>
                          ),
                          li: ({ children }) => (
                            <li className="text-sm text-muted-foreground leading-relaxed">{children}</li>
                          ),
                          p: ({ children }) => (
                            <p className="text-sm text-muted-foreground my-1.5 leading-relaxed">{children}</p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-foreground">{children}</strong>
                          ),
                      }}
                    >
                      {practiceSummary.detailContent}
                    </ReactMarkdown>
                    </div>
                  )}
                </div>
              </CardContent>
            </Collapsible>
          )}
        </Card>
      </motion.div>

      {/* Goal Diagnosis Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="relative">
          {/* Loading Overlay */}
          {generatingDiagnosis && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm font-medium">새 진단 생성 중...</p>
              </div>
            </div>
          )}

          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle>목표 진단</CardTitle>
              </div>
              {latestDiagnosis && (
                <Badge variant="outline">
                  {format(new Date(latestDiagnosis.generated_at), 'M월 d일', { locale: ko })}
                </Badge>
              )}
            </div>
            <CardDescription>
              만다라트 계획 점검 및 개선 제안
            </CardDescription>
          </CardHeader>

          {latestDiagnosis ? (
            <>
              {/* Summary Section - Always Visible */}
              {diagnosisSummary && (
                <CardContent className="space-y-4">
                  {/* Headline */}
                  {diagnosisSummary.headline && (
                    <p className="text-base font-semibold text-foreground leading-relaxed">
                      {diagnosisSummary.headline}
                    </p>
                  )}

                  {/* Structure Metrics */}
                  {diagnosisSummary.metrics.length > 0 && (
                    <div className="space-y-1.5">
                      {diagnosisSummary.metrics.map((metric, idx) => (
                        <div key={idx} className="text-sm text-foreground">
                          {metric.label && <span className="text-muted-foreground">{metric.label}: </span>}
                          <span className="font-medium">{metric.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}

              {/* Collapsible Detail Section */}
              {diagnosisSummary && diagnosisSummary.detailContent && (
                <Collapsible open={isDiagnosisOpen} onOpenChange={setIsDiagnosisOpen}>
                  <CardContent className="px-6 pb-2">
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                      <CollapsibleTrigger asChild>
                        <button
                          className="w-full text-sm font-semibold text-primary flex items-center justify-between hover:opacity-80 transition-opacity"
                        >
                          <span>상세보기</span>
                          {isDiagnosisOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </CollapsibleTrigger>

                      {isDiagnosisOpen && (
                        <div className="mt-3 prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => (
                              <h2 className="text-base font-bold text-foreground mb-3 mt-2">{children}</h2>
                            ),
                            h2: ({ children }) => (
                              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2 flex items-center gap-2">{children}</h3>
                            ),
                            ul: ({ children }) => (
                              <ul className="space-y-1 my-1.5 ml-1">{children}</ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="space-y-1 my-1.5 ml-1 list-decimal list-inside">{children}</ol>
                            ),
                            li: ({ children }) => (
                              <li className="text-sm text-muted-foreground leading-relaxed">{children}</li>
                            ),
                            p: ({ children }) => (
                              <p className="text-sm text-muted-foreground my-1.5 leading-relaxed">{children}</p>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-foreground">{children}</strong>
                            ),
                          }}
                        >
                          {diagnosisSummary.detailContent}
                        </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Collapsible>
              )}
            </>
          ) : (
            <CardContent>
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                  <Target className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  아직 목표 진단이 없어요
                </p>
                <p className="text-xs text-muted-foreground mb-6">
                  만다라트 구조를 분석하여<br />
                  SMART 원칙 기반의 개선 방향을 제시해드려요
                </p>
                <Button onClick={generateDiagnosis} disabled={generatingDiagnosis}>
                  {generatingDiagnosis ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      분석 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      목표 진단 받기
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>
    </div>
  )
}