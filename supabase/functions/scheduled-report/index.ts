import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
  corsHeaders,
} from '../_shared/errorResponse.ts'
import { sha256Hex, stableStringify } from '../_shared/reportCache.ts'

/**
 * Scheduled Report Generator (v3 - Weekly + Diagnosis Support)
 *
 * This function is called by pg_cron or manual trigger to generate:
 * - Weekly Practice Reports
 * - Goal Diagnosis Reports
 * Both are auto-generated on Mondays.
 *
 * Flow:
 * 1. Get pending reports (via SQL function)
 * 2. For each report: generate using Perplexity AI (in user's language)
 * 3. Save report to database
 * 4. Send push notification to user (in user's language)
 */

type Language = 'ko' | 'en'
type ReportType = 'weekly' | 'diagnosis'

interface UserForReport {
  user_id: string
  email: string
  nickname: string
  push_token: string | null
  check_count: number
  user_timezone: string
  user_language: Language
}

interface PendingReport {
  report_id: string
  user_id: string
  report_type: ReportType
  metadata: {
    mandalart_id?: string
    week_start?: string
    week_end?: string
    scheduled?: boolean
  }
  user_timezone: string
  user_language: Language
  push_token: string | null
  nickname: string
}

interface CheckRecord {
  checked_at: string
  action?: {
    type?: string
    sub_goal?: {
      id: string
      title: string
    }
  }
}

// Localization constants
const LOCALES = {
  ko: {
    periodLabel: '지난 주',
    dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
    timeNames: { morning: '아침', afternoon: '오후', evening: '저녁', night: '밤' },
    noBadges: '없음',
    pushNotification: {
      weekly: {
        title: (nickname: string) => `${nickname}님의 주간 리포트가 도착했어요!`,
        body: '지난 주 실천 패턴을 확인해보세요.',
      },
      diagnosis: {
        title: (nickname: string) => `${nickname}님의 목표 진단이 완료되었어요!`,
        body: '만다라트 계획을 점검해보세요.',
      },
    },
  },
  en: {
    periodLabel: 'Last Week',
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    timeNames: { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' },
    noBadges: 'None',
    pushNotification: {
      weekly: {
        title: (nickname: string) => `${nickname}'s weekly report is ready!`,
        body: 'Check your practice patterns from last week.',
      },
      diagnosis: {
        title: (nickname: string) => `${nickname}'s goal diagnosis is ready!`,
        body: 'Review your mandalart plan.',
      },
    },
  },
}

function getPromptVersion(reportType: ReportType): string {
  switch (reportType) {
    case 'weekly':
      return 'weekly_v3'
    case 'diagnosis':
      return 'diagnosis_v3'
  }
}

function getModelConfig(reportType: ReportType) {
  const primary =
    Deno.env.get(`AI_REPORT_${reportType.toUpperCase()}_MODEL_PRIMARY`) ??
    Deno.env.get('AI_REPORT_MODEL_PRIMARY') ??
    'sonar'

  const fallback =
    Deno.env.get(`AI_REPORT_${reportType.toUpperCase()}_MODEL_FALLBACK`) ??
    Deno.env.get('AI_REPORT_MODEL_FALLBACK') ??
    null

  const maxTokensRaw =
    Deno.env.get(`AI_REPORT_${reportType.toUpperCase()}_MAX_TOKENS`) ??
    Deno.env.get('AI_REPORT_MAX_TOKENS') ??
    '900'

  const temperatureRaw =
    Deno.env.get(`AI_REPORT_${reportType.toUpperCase()}_TEMPERATURE`) ??
    Deno.env.get('AI_REPORT_TEMPERATURE') ??
    '0.6'

  const maxTokens = Math.max(200, Math.min(2000, Number(maxTokensRaw) || 900))
  const temperature = Math.max(0, Math.min(1, Number(temperatureRaw) || 0.6))

  return { primary, fallback, maxTokens, temperature }
}

function buildCacheKey(
  reportType: ReportType,
  language: Language,
  params: {
    userTimezone?: string
    periodStart?: string
    periodEnd?: string
    mandalartId?: string
    mandalartHash?: string
  }
): string {
  if (reportType === 'weekly') {
    return `weekly:${language}:${params.userTimezone}:${params.periodStart}:${params.periodEnd}`
  }

  return `diagnosis:${language}:${params.mandalartId}:${params.mandalartHash}`
}

async function computeMandalartTitleHash(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('mandalarts')
    .select(`
      id,
      title,
      center_goal,
      sub_goals (
        id,
        title,
        actions (
          id,
          title
        )
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) {
    console.warn('Failed to compute mandalartTitleHash (continuing):', error)
    return null
  }

  const mandalarts = Array.isArray(data) ? data : []
  const normalized = mandalarts
    .map((m: any) => ({
      id: m.id ?? null,
      title: m.title ?? '',
      center_goal: m.center_goal ?? '',
      sub_goals: (Array.isArray(m.sub_goals) ? m.sub_goals : [])
        .map((sg: any) => ({
          id: sg.id ?? null,
          title: sg.title ?? '',
          actions: (Array.isArray(sg.actions) ? sg.actions : []).map((a: any) => ({
            id: a.id ?? null,
            title: a.title ?? '',
          })),
        }))
        .sort((a: any, b: any) => String(a.id).localeCompare(String(b.id))),
    }))
    .sort((a: any, b: any) => String(a.id).localeCompare(String(b.id)))

  return sha256Hex(stableStringify(normalized))
}

async function getRollingWeeklyBounds(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string
): Promise<{
  userTimezone: string
  periodStart: string
  periodEnd: string
  startTs: string
  endTsExclusive: string
}> {
  const { data, error } = await (supabaseAdmin as any)
    .rpc('get_rolling_report_period_bounds', { p_user_id: userId, p_days: 7 })
    .single()

  if (error || !data) {
    throw new Error(`Failed to get rolling period bounds: ${error?.message || 'unknown error'}`)
  }

  return {
    userTimezone: String(data.user_timezone || 'Asia/Seoul'),
    periodStart: String(data.period_start_date),
    periodEnd: String(data.period_end_date),
    startTs: String(data.period_start_ts),
    endTsExclusive: String(data.period_end_ts_exclusive),
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    // Verify this is called by service role or with valid admin key
    const authHeader = req.headers.get('authorization')
    const cronSecret = Deno.env.get('CRON_SECRET')

    // Allow service role JWT or specific cron secret
    const isServiceRole = authHeader?.includes('service_role')
    const hasCronSecret = req.headers.get('x-cron-secret') === cronSecret

    if (!isServiceRole && !hasCronSecret && cronSecret) {
      // For security, only allow authorized calls
      console.warn('Unauthorized scheduled-report call attempt')
      return createErrorResponse(
        ErrorCodes.FORBIDDEN,
        'Unauthorized access'
      )
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    console.log('Starting scheduled report generation (weekly + diagnosis)...')

    // Get pending reports (both weekly and diagnosis)
    const { data: pendingReports, error: reportsError } = await supabaseAdmin
      .rpc('get_pending_reports')

    if (reportsError) {
      console.error('Error getting pending reports:', reportsError)
      return createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to get pending reports',
        { error: reportsError }
      )
    }

    if (!pendingReports || pendingReports.length === 0) {
      console.log('No pending reports to process')
      return createSuccessResponse({
        message: 'No pending reports to process',
        processed: 0,
        notifications_sent: 0,
      })
    }

    console.log(`Found ${pendingReports.length} pending reports to process`)

    let weeklyReportsGenerated = 0
    let diagnosisReportsGenerated = 0
    let notificationsSent = 0
    const errors: Array<{ report_id: string; error: string }> = []

    // Process each pending report
    for (const report of pendingReports as PendingReport[]) {
      try {
        console.log(`Processing ${report.report_type} report: ${report.report_id} for user: ${report.user_id}`)

        const language: Language = report.user_language === 'en' ? 'en' : 'ko'
        const cacheEnabled = (Deno.env.get('AI_REPORT_CACHE_ENABLED') ?? 'true') !== 'false'
        const promptVersion = getPromptVersion(report.report_type)
        const modelConfig = getModelConfig(report.report_type)

    let reportContent: string
    let usedModel = modelConfig.primary
    let cachedFrom: string | null = null
    let inputSummary: unknown
    let inputHash: string
    let cacheKey: string | null = null

    if (report.report_type === 'weekly') {
      const bounds = await getRollingWeeklyBounds(supabaseAdmin, report.user_id)
      cacheKey = buildCacheKey('weekly', language, {
        userTimezone: bounds.userTimezone,
        periodStart: bounds.periodStart,
        periodEnd: bounds.periodEnd,
      })

      const reportData = await collectUserReportData(
        supabaseAdmin,
        report.user_id,
        bounds.userTimezone,
        language,
        new Date(bounds.startTs),
        new Date(bounds.endTsExclusive),
        bounds.periodStart,
        bounds.periodEnd
      )
      inputSummary = reportData

      inputHash = await sha256Hex(stableStringify({ promptVersion, report_type: 'weekly', language, data: reportData }))
      if (cacheEnabled) {
        const { data: cached } = await supabaseAdmin
          .from('ai_reports')
          .select('id, content, model')
          .eq('user_id', report.user_id)
          .eq('report_type', 'weekly')
          .eq('cache_key', cacheKey)
          .eq('input_hash', inputHash)
          .neq('id', report.report_id)
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

            if (cached?.content && !String(cached.content).includes('"status": "pending"')) {
              reportContent = String(cached.content)
              usedModel = String(cached.model || usedModel)
              cachedFrom = String(cached.id)
            } else {
              const generated = await generateWeeklyReport(reportData, language, modelConfig)
              reportContent = generated.content
              usedModel = generated.usedModel
              weeklyReportsGenerated++
            }
          } else {
            const generated = await generateWeeklyReport(reportData, language, modelConfig)
            reportContent = generated.content
            usedModel = generated.usedModel
            weeklyReportsGenerated++
          }
        } else if (report.report_type === 'diagnosis') {
      // Diagnosis is structure-only; do not include practice/streak in input
      const diagnosisData = await collectDiagnosisData(
        supabaseAdmin,
        report.user_id,
        report.metadata.mandalart_id,
        language
      )
      inputSummary = diagnosisData

      inputHash = await sha256Hex(stableStringify({ promptVersion, report_type: 'diagnosis', language, data: diagnosisData }))
      cacheKey = buildCacheKey('diagnosis', language, {
        mandalartId: diagnosisData.mandalart_id || undefined,
        mandalartHash: diagnosisData.mandalart_hash,
      })
      if (cacheEnabled) {
        const { data: cached } = await supabaseAdmin
          .from('ai_reports')
          .select('id, content, model')
              .eq('user_id', report.user_id)
              .eq('report_type', 'diagnosis')
              .eq('cache_key', cacheKey)
              .eq('input_hash', inputHash)
              .neq('id', report.report_id)
              .order('generated_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (cached?.content && !String(cached.content).includes('"status": "pending"')) {
              reportContent = String(cached.content)
              usedModel = String(cached.model || usedModel)
              cachedFrom = String(cached.id)
            } else {
              const generated = await generateDiagnosisReport(diagnosisData, language, modelConfig)
              reportContent = generated.content
              usedModel = generated.usedModel
              diagnosisReportsGenerated++
            }
          } else {
            const generated = await generateDiagnosisReport(diagnosisData, language, modelConfig)
            reportContent = generated.content
            usedModel = generated.usedModel
            diagnosisReportsGenerated++
          }
        } else {
          console.warn(`Unknown report type: ${report.report_type}`)
          continue
        }

    // Update the report with generated content (not insert new)
    if (!inputHash) {
      throw new Error('Missing input_hash for scheduled report')
    }
    if (!cacheKey) {
      throw new Error('Missing cache_key for scheduled report')
    }

    const { error: updateError } = await supabaseAdmin
      .from('ai_reports')
      .update({
        content: reportContent,
        language,
        cache_key: cacheKey,
        input_hash: inputHash,
        prompt_version: promptVersion,
        model: usedModel,
        metadata: {
          ...report.metadata,
              generated_at: new Date().toISOString(),
              language,
              input_summary: inputSummary,
              input_summary_version: promptVersion,
              cached_from: cachedFrom,
            },
          })
          .eq('id', report.report_id)

        if (updateError) {
          console.error(`Error updating report ${report.report_id}:`, updateError)
          errors.push({ report_id: report.report_id, error: updateError.message })
          continue
        }

        console.log(`${report.report_type} report generated for user: ${report.user_id}`)

        // Send push notification if user has push token
        if (report.push_token) {
          try {
            const locale = LOCALES[language]
            const notificationConfig = locale.pushNotification[report.report_type]
            const notificationSent = await sendPushNotification(
              report.push_token,
              notificationConfig.title(report.nickname),
              notificationConfig.body,
              { type: `${report.report_type}_report` }
            )

            if (notificationSent) {
              notificationsSent++
              console.log(`Push notification sent for ${report.report_type} report to user: ${report.user_id}`)
            }
          } catch (pushError) {
            console.error(`Push notification failed for ${report.report_id}:`, pushError)
          }
        }
      } catch (reportError) {
        console.error(`Error processing report ${report.report_id}:`, reportError)
        errors.push({
          report_id: report.report_id,
          error: reportError instanceof Error ? reportError.message : 'Unknown error',
        })
      }
    }

    const result = {
      message: 'Scheduled report generation completed',
      total_reports: pendingReports.length,
      weekly_reports_generated: weeklyReportsGenerated,
      diagnosis_reports_generated: diagnosisReportsGenerated,
      notifications_sent: notificationsSent,
      errors_count: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    }

    console.log('Scheduled report generation result:', result)
    return createSuccessResponse(result)
  } catch (error) {
    console.error('Scheduled report error:', error)
    return createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to generate scheduled reports',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
})

/**
 * Collect user data for weekly report with timezone awareness
 */
async function collectUserReportData(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  userTimezone: string,
  language: Language,
  startDate: Date,
  endDateExclusive: Date,
  periodStart: string,
  periodEnd: string
) {
  const locale = LOCALES[language]
  const mandalartTitleHash = await computeMandalartTitleHash(supabaseAdmin, userId)

  // Get check history for the period
  const { data: checks } = await supabaseAdmin
    .from('check_history')
    .select(`
      checked_at,
      action:actions(
        type,
        sub_goal:sub_goals(
          id,
          title
        )
      )
    `)
    .eq('user_id', userId)
    .gte('checked_at', startDate.toISOString())
    .lt('checked_at', endDateExclusive.toISOString())

  // Get streak data
  const { data: streakData } = await supabaseAdmin
    .from('user_stats')
    .select('current_streak, longest_streak')
    .eq('user_id', userId)
    .single()

  // Get badges earned in the period
  const { data: recentBadges } = await supabaseAdmin
    .from('user_achievements')
    .select(`achievement:achievements(title)`)
    .eq('user_id', userId)
    .gte('earned_at', startDate.toISOString())
    .lt('earned_at', endDateExclusive.toISOString())

  // Analyze patterns
  const weekdayPattern: Record<number, number> = {}
  const timePattern: Record<string, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 }
  const subGoalPattern: Record<string, { title: string; count: number }> = {}
  const actionTypePattern: Record<string, number> = { routine: 0, mission: 0, reference: 0 }

  if (checks) {
    checks.forEach((check: CheckRecord) => {
      const date = new Date(check.checked_at)
      const day = date.getDay()
      const hour = date.getHours()

      weekdayPattern[day] = (weekdayPattern[day] || 0) + 1

      if (hour >= 5 && hour < 12) timePattern.morning++
      else if (hour >= 12 && hour < 18) timePattern.afternoon++
      else if (hour >= 18 && hour < 22) timePattern.evening++
      else timePattern.night++

      const subGoalId = check.action?.sub_goal?.id
      const subGoalTitle = check.action?.sub_goal?.title
      if (subGoalId && subGoalTitle) {
        if (!subGoalPattern[subGoalId]) {
          subGoalPattern[subGoalId] = { title: subGoalTitle, count: 0 }
        }
        subGoalPattern[subGoalId].count++
      }

      const actionType = check.action?.type || 'routine'
      actionTypePattern[actionType] = (actionTypePattern[actionType] || 0) + 1
    })
  }

  const bestDay = Object.entries(weekdayPattern).sort((a, b) => b[1] - a[1])[0]
  const worstDay = Object.entries(weekdayPattern).sort((a, b) => a[1] - b[1])[0]
  const bestTime = Object.entries(timePattern).sort((a, b) => b[1] - a[1])[0]
  const bestSubGoal = Object.entries(subGoalPattern)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)[0]
  const worstSubGoal = Object.entries(subGoalPattern)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => a.count - b.count)[0]

  return {
    period: locale.periodLabel,
    periodStart,
    periodEnd,
    mandalartTitleHash,
    mandalart_title_hash: mandalartTitleHash,
    mandalarts: [],
    totalChecks: checks?.length || 0,
    uniqueDays: checks ? new Set(checks.map((c: CheckRecord) => new Date(c.checked_at).toDateString())).size : 0,
    currentStreak: streakData?.current_streak || 0,
    longestStreak: streakData?.longest_streak || 0,
    bestDay: bestDay ? { day: locale.dayNames[parseInt(bestDay[0])], count: bestDay[1] } : null,
    worstDay: worstDay ? { day: locale.dayNames[parseInt(worstDay[0])], count: worstDay[1] } : null,
    bestTime: bestTime
      ? {
          period: locale.timeNames[bestTime[0] as keyof typeof locale.timeNames],
          count: bestTime[1],
        }
      : null,
    bestSubGoal,
    worstSubGoal,
    weekdayPattern,
    timePattern,
    actionTypePattern,
    recentBadges: recentBadges || [],
    userTimezone,
  }
}

interface ReportData {
  period: string
  periodStart: string
  periodEnd: string
  mandalartTitleHash?: string | null
  mandalart_title_hash?: string | null
  mandalarts: unknown[]
  totalChecks: number
  uniqueDays: number
  currentStreak: number
  longestStreak: number
  bestDay: { day: string; count: number } | null
  worstDay: { day: string; count: number } | null
  bestTime: { period: string; count: number } | null
  bestSubGoal: { title: string; count: number } | null
  worstSubGoal: { title: string; count: number } | null
  weekdayPattern: Record<number, number>
  timePattern: Record<string, number>
  actionTypePattern: Record<string, number>
  recentBadges: Array<{ achievement?: { title?: string } }>
  userTimezone: string
}

/**
 * Get localized prompts for AI report generation
 */
function getLocalizedPrompts(language: Language) {
  if (language === 'en') {
    return {
      systemPrompt: `You are a data analysis expert. Analyze user practice patterns and provide insights.

IMPORTANT: You MUST respond in English only. The input data may contain non-English text (like Korean), but your response MUST be entirely in English.

You MUST respond with valid JSON only. Do NOT use markdown code blocks.

Exact JSON format:
{
  "headline": "One sentence about the most important pattern or change this week",
  "key_metrics": [
    {"label": "Practice Days", "value": "6 out of 7 days"},
    {"label": "Total Practices", "value": "42 times"},
    {"label": "Compared to Last Week", "value": "+15%"}
  ],
  "strengths": [
    "High focus during Thursday evenings",
    "Routine practice rate remains stable"
  ],
  "improvements": {
    "problem": "Practice frequency is very low on Wednesday and other days",
    "insight": "Thursday shows high concentration in evening hours"
  },
  "action_plan": {
    "goal": "Improve weekday practice consistency",
    "steps": [
      "Set reminder for Tuesday 3 PM",
      "Try reducing Wednesday goals to 3 items"
    ]
  }
}

Writing rules:
- Follow the JSON structure exactly
- Return JSON only, no code blocks
- key_metrics order: Practice Days → Total Practices → Compared to Last Week
- Include actual numbers in key_metrics values
- Analyze patterns and context
- Provide actionable advice`,
      userPromptTemplate: (data: ReportData, badges: string) => `Find patterns and provide insights from this data:

[Practice Status]
- Practice Days: ${data.uniqueDays} out of 7 days
- Total Practices: ${data.totalChecks} times
- Streak: Currently ${data.currentStreak} days
- New Badges: ${badges}

[Time Patterns]
- Daily distribution: ${JSON.stringify(data.weekdayPattern || {})}
- Time distribution: ${JSON.stringify(data.timePattern || {})}
- Best activity: ${data.bestDay?.day} ${data.bestDay?.count} times
- Lowest activity: ${data.worstDay?.day} ${data.worstDay?.count} times
- Preferred time: ${data.bestTime?.period} ${data.bestTime?.count} times

[Goal Performance]
- Best performance: ${data.bestSubGoal?.title} (${data.bestSubGoal?.count} times)
- Needs improvement: ${data.worstSubGoal?.title} (${data.worstSubGoal?.count} times)

[Practice Types]
- Routine: ${data.actionTypePattern?.routine || 0} times
- Mission: ${data.actionTypePattern?.mission || 0} times

Analysis perspectives:
1. Find optimal practice time from time/day patterns
2. Suggest improvement priorities from goal variance
3. Provide 1 actionable item for next week

IMPORTANT: Respond in JSON format with actual numbers in key_metrics. Write ALL text content in English only.`,
    }
  }

  // Korean (default)
  return {
    systemPrompt: `당신은 데이터 분석 전문가입니다. 사용자의 실천 패턴을 분석하여 인사이트만 제공하세요.

반드시 유효한 JSON 형식으로만 응답하세요. 마크다운 코드 블록을 사용하지 마세요.

정확한 JSON 형식:
{
  "headline": "이번 주 가장 중요한 패턴이나 변화를 한 문장으로",
  "key_metrics": [
    {"label": "실천일수", "value": "7일 중 6일"},
    {"label": "총 실천횟수", "value": "42회"},
    {"label": "전주대비 실천횟수", "value": "+15%"}
  ],
  "strengths": [
    "목요일 저녁 시간대 집중도가 높았습니다",
    "루틴 실천률이 안정적으로 유지되고 있습니다"
  ],
  "improvements": {
    "problem": "수요일과 나머지 요일의 실천 빈도가 매우 낮습니다",
    "insight": "목요일은 저녁 시간대 집중도가 높았습니다"
  },
  "action_plan": {
    "goal": "평일 실천 일관성 높이기",
    "steps": [
      "화요일 오후 3시 알림 설정하기",
      "수요일 목표를 3개로 축소해보기"
    ]
  }
}

작성 규칙:
- 반드시 위 JSON 구조를 정확히 따르세요
- 코드 블록 없이 JSON만 반환하세요
- key_metrics 순서: 실천일수 → 총 실천횟수 → 전주대비 실천횟수
- key_metrics의 value는 실제 수치를 포함하세요
- 패턴과 맥락을 분석하세요
- 실행 가능한 조언을 제공하세요`,
    userPromptTemplate: (data: ReportData, badges: string) => `다음 데이터에서 패턴을 찾아 인사이트를 제공하세요:

[실천 현황]
- 실천일수: 7일 중 ${data.uniqueDays}일
- 총 실천횟수: ${data.totalChecks}회
- 스트릭: 현재 ${data.currentStreak}일
- 새로 획득한 배지: ${badges}

[시간 패턴]
- 요일별 분포: ${JSON.stringify(data.weekdayPattern || {})}
- 시간대 분포: ${JSON.stringify(data.timePattern || {})}
- 최고 활동: ${data.bestDay?.day} ${data.bestDay?.count}회
- 최저 활동: ${data.worstDay?.day} ${data.worstDay?.count}회
- 선호 시간: ${data.bestTime?.period} ${data.bestTime?.count}회

[목표 성과]
- 최고 성과: ${data.bestSubGoal?.title} (${data.bestSubGoal?.count}회)
- 개선 필요: ${data.worstSubGoal?.title} (${data.worstSubGoal?.count}회)

[실천 타입]
- 루틴: ${data.actionTypePattern?.routine || 0}회
- 미션: ${data.actionTypePattern?.mission || 0}회

패턴 분석 관점:
1. 시간/요일 패턴에서 최적 실천 시간대 파악
2. 목표별 편차에서 개선 우선순위 제시
3. 다음 주 실행 가능한 1가지 액션

JSON 형식으로 응답하되, key_metrics에는 실제 수치를 포함하세요.`,
  }
}

/**
 * Generate weekly report using Perplexity AI with i18n support
 */
async function generateWeeklyReport(
  data: ReportData,
  language: Language,
  modelConfig: { primary: string; fallback: string | null; maxTokens: number; temperature: number }
): Promise<{ content: string; usedModel: string }> {
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')
  if (!perplexityApiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured')
  }

  const locale = LOCALES[language]
  const prompts = getLocalizedPrompts(language)
  const badges = data.recentBadges?.map((b) => b.achievement?.title).join(', ') || locale.noBadges

  const tryGenerateOnce = async (model: string): Promise<{ content: string; isValidJson: boolean; usedModel: string }> => {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: `${prompts.systemPrompt}\n\n${prompts.userPromptTemplate(data, badges)}`,
          },
        ],
        temperature: modelConfig.temperature,
        max_tokens: modelConfig.maxTokens,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Perplexity API error ${response.status}: ${errorText.substring(0, 200)}`)
    }

    const result = await response.json()
    let aiResponse = result.choices[0].message.content

    aiResponse = aiResponse.trim()
    if (aiResponse.startsWith('```json')) {
      aiResponse = aiResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (aiResponse.startsWith('```')) {
      aiResponse = aiResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    try {
      JSON.parse(aiResponse)
      return { content: aiResponse, isValidJson: true, usedModel: model }
    } catch {
      return { content: aiResponse, isValidJson: false, usedModel: model }
    }
  }

  const primary = await tryGenerateOnce(modelConfig.primary)
  if (primary.isValidJson || !modelConfig.fallback || modelConfig.fallback === modelConfig.primary) {
    if (!primary.isValidJson) console.warn('Weekly AI response is not valid JSON, returning as-is')
    return { content: primary.content, usedModel: primary.usedModel }
  }

  console.warn(`Weekly report invalid JSON (primary=${modelConfig.primary}), retrying fallback=${modelConfig.fallback}`)
  const fallback = await tryGenerateOnce(modelConfig.fallback)
  if (!fallback.isValidJson) console.warn('Weekly AI response is not valid JSON even after fallback, returning as-is')
  return { content: fallback.content, usedModel: fallback.usedModel }
}

/**
 * Send push notification via Expo Push API
 */
async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<boolean> {
  // Validate Expo push token format
  if (!expoPushToken.startsWith('ExponentPushToken[') && !expoPushToken.startsWith('ExpoPushToken[')) {
    console.warn('Invalid Expo push token format:', expoPushToken)
    return false
  }

  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data: data || {},
  }

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Expo push error:', response.status, errorText)
    return false
  }

  const result = await response.json()
  if (result.data?.status === 'error') {
    console.error('Expo push error:', result.data.message)
    return false
  }

  return true
}

// =====================================================
// Diagnosis Report Functions
// =====================================================

interface DiagnosisData {
  mandalart_id: string | null
  mandalart_hash: string
  mandalart: {
    id: string
    title: string
    center_goal: string
  } | null
  structure: {
    totalItems: number
    filledItems: number
    fillRate: number
    actionsByType: Record<string, number>
    trackableActions: number
    measurableActions: number
    specificActions: number
  }
}

/**
 * Collect data for diagnosis report
 */
async function collectDiagnosisData(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  mandalartId: string | undefined,
  _language: Language
): Promise<DiagnosisData> {
  // Get mandalart with sub_goals and actions
  let mandalartQuery = supabaseAdmin
    .from('mandalarts')
    .select(`
      id,
      title,
      center_goal,
      sub_goals (
        id,
        title,
        position,
        actions (
          id,
          title,
          position,
          type,
          frequency
        )
      )
    `)
    .eq('user_id', userId)

  if (mandalartId) {
    mandalartQuery = mandalartQuery.eq('id', mandalartId)
  } else {
    mandalartQuery = mandalartQuery.eq('is_active', true)
  }

  const { data: mandalarts } = await mandalartQuery.limit(1).single()

  // Build mandalart hash from normalized snapshot (title changes included)
  const normalizedForHash = (() => {
    if (!mandalarts) return { mandalart: null }
    const subGoals = Array.isArray(mandalarts.sub_goals) ? mandalarts.sub_goals : []
    return {
      id: mandalarts.id ?? null,
      title: mandalarts.title ?? '',
      center_goal: mandalarts.center_goal ?? '',
      sub_goals: subGoals
        .map((sg: any) => {
          const actions = Array.isArray(sg.actions) ? sg.actions : []
          return {
            id: sg.id ?? null,
            title: sg.title ?? '',
            position: sg.position ?? null,
            actions: actions.map((a: any) => ({
              id: a.id ?? null,
              title: a.title ?? '',
              position: a.position ?? null,
              type: a.type ?? 'routine',
              frequency: a.frequency ?? null,
            })),
          }
        })
        .sort((a: any, b: any) => String(a.id).localeCompare(String(b.id))),
    }
  })()

  const mandalart_hash = await sha256Hex(stableStringify(normalizedForHash))

  // Calculate structure metrics (token-efficient: counts only)
  const totalItems = 73 // 1 center + 8 sub-goals + 64 actions
  let filledItems = 0
  const actionsByType: Record<string, number> = { routine: 0, mission: 0, reference: 0 }
  let trackableActions = 0
  let measurableActions = 0
  let specificActions = 0

  if (mandalarts) {
    // Count center goal
    if (mandalarts.center_goal) filledItems++

    // Count sub-goals and actions
    const subGoals = mandalarts.sub_goals || []
    filledItems += subGoals.filter((sg: { title?: string }) => sg.title).length

    subGoals.forEach((sg: { title?: string; actions?: Array<{ title?: string; type?: string; frequency?: string }> }) => {
      const actions = sg.actions || []

      actions.forEach((action: { title?: string; type?: string; frequency?: string }) => {
        if (action.title) {
          filledItems++
          const type = action.type || 'routine'
          actionsByType[type] = (actionsByType[type] || 0) + 1

          if (type !== 'reference') {
            trackableActions++
            if (action.frequency) measurableActions++

            const hasNumber = /\d/.test(action.title)
            if (action.frequency || hasNumber) specificActions++
          }
        }
      })
    })
  }

  return {
    mandalart_id: mandalarts?.id ?? null,
    mandalart_hash,
    mandalart: mandalarts
      ? {
          id: mandalarts.id,
          title: mandalarts.title,
          center_goal: mandalarts.center_goal,
        }
      : null,
    structure: {
      totalItems,
      filledItems,
      fillRate: totalItems > 0 ? Math.round((filledItems / totalItems) * 100) : 0,
      actionsByType,
      trackableActions,
      measurableActions,
      specificActions,
    },
  }
}

/**
 * Get localized prompts for diagnosis report generation
 */
function getDiagnosisPrompts(language: Language) {
  if (language === 'en') {
    return {
      systemPrompt: `You are a Mandalart plan review expert. Provide specific and actionable improvement directions.

IMPORTANT: You MUST respond in English only. The input data may contain non-English text (like Korean), but your response MUST be entirely in English.

You must respond ONLY in valid JSON format. Do NOT use markdown code blocks.

Exact JSON format:
{
  "headline": "Your Mandalart plan is well-structured but needs clarity improvements",
  "structure_metrics": [
    {"label": "Completeness", "value": "89/146 (61%)"},
    {"label": "Expression Clarity", "value": "42% (13 of 31 are specific)"},
    {"label": "Measurability", "value": "35% (11 of 31 have frequency settings)"}
  ],
  "strengths": [
    "Exercise-related sub-goal has specific and measurable actions",
    "Clear daily routine structure"
  ],
  "improvements": [
    {
      "area": "Reading sub-goal",
      "issue": "Actions lack specificity",
      "solution": "Add reading time (e.g., '30 min daily') or page count"
    }
  ],
  "priority_tasks": [
    "Add specific time or frequency to 3 vague actions",
    "Review and update reference-type items"
  ]
}

Writing rules:
- Follow the JSON structure exactly
- Return JSON only, no code blocks
- Include actual numbers in structure_metrics values
- Provide specific, actionable improvement suggestions
- Write ALL content in English only`,
      userPromptTemplate: (data: DiagnosisData) => {
        const m = data.mandalart
        const s = data.structure
        const clarityRate = s.trackableActions > 0 ? Math.round((s.specificActions / s.trackableActions) * 100) : 0
        const measurabilityRate = s.trackableActions > 0 ? Math.round((s.measurableActions / s.trackableActions) * 100) : 0

        return `Analyze this Mandalart structure and provide improvement suggestions:

[Basic Info]
- Core Goal: "${m?.center_goal || '(not set)'}"
- Title: "${m?.title || '(not set)'}"

[Structure Analysis]
- Total Items: ${s.totalItems} items, ${s.filledItems} filled (${s.fillRate}%)
- By Type: Routine ${s.actionsByType.routine || 0}, Mission ${s.actionsByType.mission || 0}, Reference ${s.actionsByType.reference || 0}
- Clarity: ${clarityRate}% (${s.specificActions} of ${s.trackableActions} trackable actions are specific)
- Measurability: ${measurabilityRate}% (${s.measurableActions} of ${s.trackableActions} trackable actions have frequency settings)

Analysis Perspectives:
1. Completion rate (fill rate)
2. Clarity evaluation (specific expressions or frequency settings)
3. Measurability evaluation (whether achievement can be verified)
4. Balanced goal composition

IMPORTANT: Respond in JSON format with actual numbers in structure_metrics. Write ALL text content in English only.`
      },
    }
  }

  // Korean (default)
  return {
    systemPrompt: `당신은 만다라트 계획 점검 전문가입니다. 구체적이고 실행 가능한 개선 방향을 제시하세요.

반드시 유효한 JSON 형식으로만 응답하세요. 마크다운 코드 블록을 사용하지 마세요.

정확한 JSON 형식:
{
  "headline": "만다라트 계획이 잘 구성되어 있으나 명확성 개선이 필요합니다",
  "structure_metrics": [
    {"label": "완성도", "value": "89/146 (61%)"},
    {"label": "표현명확도", "value": "42% (31개 중 13개가 구체적)"},
    {"label": "측정가능성", "value": "35% (31개 중 11개가 반복주기 설정됨)"}
  ],
  "strengths": [
    "운동 관련 세부목표가 구체적이고 측정 가능합니다",
    "일일 루틴 구조가 명확합니다"
  ],
  "improvements": [
    {
      "area": "독서 세부목표",
      "issue": "실천항목이 구체적이지 않습니다",
      "solution": "읽기 시간(예: '30분씩 매일') 또는 페이지 수 추가"
    }
  ],
  "priority_tasks": [
    "모호한 실천항목 3개에 구체적인 시간이나 빈도 추가하기",
    "참고 타입 항목들 검토 및 업데이트하기"
  ]
}`,
    userPromptTemplate: (data: DiagnosisData) => {
      const m = data.mandalart
      const s = data.structure
      const clarityRate = s.trackableActions > 0 ? Math.round((s.specificActions / s.trackableActions) * 100) : 0
      const measurabilityRate = s.trackableActions > 0 ? Math.round((s.measurableActions / s.trackableActions) * 100) : 0

      return `만다라트 구조를 분석하여 개선점을 제시하세요:

[기본 정보]
- 중심 목표: "${m?.center_goal || '미설정'}"
- 제목: "${m?.title || '미설정'}"

[구조 분석]
- 전체 항목: ${s.totalItems}개 중 ${s.filledItems}개 작성 (${s.fillRate}%)
- 타입별: 루틴 ${s.actionsByType.routine || 0}개, 미션 ${s.actionsByType.mission || 0}개, 참고 ${s.actionsByType.reference || 0}개
- 표현 명확도: ${clarityRate}% (실천 항목 ${s.trackableActions}개 중 ${s.specificActions}개가 구체적)
- 측정 가능성: ${measurabilityRate}% (실천 항목 ${s.trackableActions}개 중 ${s.measurableActions}개가 반복주기 설정됨)

분석 관점:
1. 완성도 (작성률)
2. 표현 명확도 (구체적 표현 또는 반복주기 설정 여부)
3. 측정 가능성 (반복주기 설정으로 달성 여부 확인 가능한지)
4. 균형잡힌 목표 구성

JSON 형식으로 응답하되, structure_metrics에는 실제 수치를 포함하세요.`
    },
  }
}

/**
 * Generate diagnosis report using Perplexity AI
 */
async function generateDiagnosisReport(
  data: DiagnosisData,
  language: Language,
  modelConfig: { primary: string; fallback: string | null; maxTokens: number; temperature: number }
): Promise<{ content: string; usedModel: string }> {
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')
  if (!perplexityApiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured')
  }

  const prompts = getDiagnosisPrompts(language)

  const tryGenerateOnce = async (model: string): Promise<{ content: string; isValidJson: boolean; usedModel: string }> => {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: `${prompts.systemPrompt}\n\n${prompts.userPromptTemplate(data)}`,
          },
        ],
        temperature: modelConfig.temperature,
        max_tokens: modelConfig.maxTokens,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Perplexity API error ${response.status}: ${errorText.substring(0, 200)}`)
    }

    const result = await response.json()
    let aiResponse = result.choices[0].message.content

    aiResponse = aiResponse.trim()
    if (aiResponse.startsWith('```json')) {
      aiResponse = aiResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (aiResponse.startsWith('```')) {
      aiResponse = aiResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    try {
      JSON.parse(aiResponse)
      return { content: aiResponse, isValidJson: true, usedModel: model }
    } catch {
      return { content: aiResponse, isValidJson: false, usedModel: model }
    }
  }

  const primary = await tryGenerateOnce(modelConfig.primary)
  if (primary.isValidJson || !modelConfig.fallback || modelConfig.fallback === modelConfig.primary) {
    if (!primary.isValidJson) console.warn('Diagnosis AI response is not valid JSON, returning as-is')
    return { content: primary.content, usedModel: primary.usedModel }
  }

  console.warn(`Diagnosis report invalid JSON (primary=${modelConfig.primary}), retrying fallback=${modelConfig.fallback}`)
  const fallback = await tryGenerateOnce(modelConfig.fallback)
  if (!fallback.isValidJson) console.warn('Diagnosis AI response is not valid JSON even after fallback, returning as-is')
  return { content: fallback.content, usedModel: fallback.usedModel }
}
