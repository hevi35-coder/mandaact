import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import type { AIReport } from '@/types'
import { Sparkles, Loader2, Calendar, History } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CARD_ANIMATION, SLIDE_OUT_UP, STAGGER, getStaggerDelay } from '@/lib/animations'

export function AIInsightCard() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('weekly')
  const [latestReport, setLatestReport] = useState<AIReport | null>(null)
  const [reportHistory, setReportHistory] = useState<AIReport[]>([])
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    loadReports()
  }, [user, activeTab])

  const loadReports = async () => {
    if (!user) return

    // Get latest report of current type
    const { data: latest } = await supabase
      .from('ai_reports')
      .select('*')
      .eq('user_id', user.id)
      .eq('report_type', activeTab)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()

    setLatestReport(latest || null)

    // Get report history (last 5)
    const { data: history } = await supabase
      .from('ai_reports')
      .select('*')
      .eq('user_id', user.id)
      .eq('report_type', activeTab)
      .order('generated_at', { ascending: false })
      .limit(5)

    setReportHistory(history || [])
    setSelectedHistoryId('')
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
            report_type: activeTab,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to generate report')
      }

      const result = await response.json()
      setLatestReport(result.report)
      await loadReports()
    } catch (err) {
      console.error('Error generating report:', err)
      setError(err instanceof Error ? err.message : '리포트 생성 중 오류가 발생했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  const displayedReport = selectedHistoryId && selectedHistoryId !== 'latest'
    ? reportHistory.find((r) => r.id === selectedHistoryId)
    : latestReport

  // Check if user can generate a new report (rate limiting)
  const canGenerate = () => {
    if (!latestReport) return true
    const lastGenerated = new Date(latestReport.generated_at)
    const now = new Date()
    const hoursSinceLastReport = (now.getTime() - lastGenerated.getTime()) / (1000 * 60 * 60)

    // Weekly: Can generate once per day
    // Monthly: Can generate once per week
    if (activeTab === 'weekly') {
      return hoursSinceLastReport >= 24
    } else {
      return hoursSinceLastReport >= 24 * 7
    }
  }

  const getNextGenerationTime = () => {
    if (!latestReport) return null
    const lastGenerated = new Date(latestReport.generated_at)
    const hoursToWait = activeTab === 'weekly' ? 24 : 24 * 7
    const nextTime = new Date(lastGenerated.getTime() + hoursToWait * 60 * 60 * 1000)
    return nextTime
  }

  if (!user) {
    return null
  }

  const nextGenTime = getNextGenerationTime()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI 리포트
            </CardTitle>
            <CardDescription>AI가 분석한 맞춤형 성과 리포트</CardDescription>
          </div>
          <Sparkles className="h-8 w-8 text-purple-500/30" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'weekly' | 'monthly')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="weekly">주간 리포트</TabsTrigger>
            <TabsTrigger value="monthly">월간 리포트</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-4">
            {/* Generate Button */}
            <div className="flex items-center gap-2">
              <Button
                onClick={generateReport}
                disabled={!canGenerate() || generating}
                className="flex-1"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {activeTab === 'weekly' ? '주간' : '월간'} 리포트 생성
                  </>
                )}
              </Button>

              {reportHistory.length > 0 && (
                <Select value={selectedHistoryId || 'latest'} onValueChange={setSelectedHistoryId}>
                  <SelectTrigger className="w-[180px]">
                    <History className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="최신 리포트" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">최신 리포트</SelectItem>
                    {reportHistory.slice(1).map((report) => (
                      <SelectItem key={report.id} value={report.id}>
                        {new Date(report.generated_at).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Rate Limit Warning */}
            {!canGenerate() && nextGenTime && (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  다음 리포트는 {nextGenTime.toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })} 이후에 생성할 수 있습니다.
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Report Content */}
            <AnimatePresence mode="wait">
              {displayedReport ? (
                // 📋 CARD: Report card with slide-out-up exit animation
                <motion.div
                  key={displayedReport.id}
                  {...CARD_ANIMATION}
                  {...SLIDE_OUT_UP}
                >
                  <div className="p-6 bg-background rounded-lg border-2 border-purple-500/10 space-y-4">
                    {/* Report Meta */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground border-b pb-3">
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(displayedReport.generated_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {selectedHistoryId && <span className="text-xs">과거 리포트</span>}
                    </div>

                    {/* Report Text */}
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {displayedReport.content.split('\n\n').map((paragraph, index) => (
                        // Paragraph stagger with SLOW interval
                        <motion.p
                          key={index}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: getStaggerDelay(index, STAGGER.SLOW) }}
                          className="leading-relaxed"
                        >
                          {paragraph}
                        </motion.p>
                      ))}
                    </div>

                    {/* AI Badge */}
                    <div className="flex items-center gap-2 pt-4 border-t text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3" />
                      <span>AI가 생성한 리포트입니다</span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-muted-foreground"
                >
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-purple-500/30" />
                  <p className="mb-2">아직 생성된 {activeTab === 'weekly' ? '주간' : '월간'} 리포트가 없습니다.</p>
                  <p className="text-sm">버튼을 클릭하여 AI 리포트를 생성해보세요!</p>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
