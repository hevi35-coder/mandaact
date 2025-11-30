import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  withErrorHandler,
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
  extractJWT,
  parseRequestBody,
  corsHeaders,
} from '../_shared/errorResponse.ts'

interface ReportRequest {
  report_type: 'weekly' | 'monthly' | 'diagnosis' | 'insight' | 'prediction' | 'struggling'
  mandalart_id?: string
  language?: 'ko' | 'en' // Default: 'ko'
}

// Localization constants
const LOCALES = {
  ko: {
    periodLabels: {
      weekly: '지난 주',
      monthly: '지난 달',
      default: '최근',
    },
    dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
    timeNames: {
      morning: '아침',
      afternoon: '오후',
      evening: '저녁',
      night: '밤',
    },
    noActivity: '기간 내 활동이 없습니다.',
    noBadges: '없음',
  },
  en: {
    periodLabels: {
      weekly: 'Last Week',
      monthly: 'Last Month',
      default: 'Recent',
    },
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    timeNames: {
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
      night: 'Night',
    },
    noActivity: 'No activity during this period.',
    noBadges: 'None',
  },
} as const

type Language = 'ko' | 'en'

// Supabase query builder types
interface QueryBuilder {
  select: (columns?: string) => QueryBuilder
  eq: (column: string, value: unknown) => QueryBuilder
  neq: (column: string, value: unknown) => QueryBuilder
  gte: (column: string, value: unknown) => QueryBuilder
  lte: (column: string, value: unknown) => QueryBuilder
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder
  limit: (count: number) => QueryBuilder
  single: () => Promise<{ data: unknown; error: Error | null }>
  maybeSingle: () => Promise<{ data: unknown; error: Error | null }>
}

interface SupabaseAuthError {
  message: string
  status?: number
  code?: string
}

interface SupabaseClient {
  from: (table: string) => QueryBuilder
  auth: {
    getUser: (jwt: string) => Promise<{
      data: { user: { id: string } | null }
      error: SupabaseAuthError | null
    }>
  }
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

serve(withErrorHandler('generate-report', async (req) => {
  try {
    // Extract JWT
    const jwt = extractJWT(req)

    // Create Supabase client with auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: `Bearer ${jwt}` },
        },
      }
    )

    // Verify user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(jwt)

    if (userError || !user) {
      return createErrorResponse(
        ErrorCodes.UNAUTHORIZED,
        'Invalid user token',
        { error: userError }
      )
    }

    // Parse and validate request body
    const { report_type, mandalart_id, language = 'ko' } = await parseRequestBody<ReportRequest>(req)

    if (!report_type) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'report_type is required'
      )
    }

    // Validate language parameter
    const lang: Language = language === 'en' ? 'en' : 'ko'

    console.log(`Generating ${report_type} report for user ${user.id} in ${lang}`)

    // Collect user data for the report
    const reportData = await collectReportData(supabaseClient, user.id, report_type, mandalart_id, lang)

    // Generate report with Perplexity AI
    console.log(`Generating ${report_type} report with data:`, JSON.stringify(reportData).substring(0, 300))
    const reportContent = await generateAIReport(report_type, reportData, lang)
    console.log(`Generated ${report_type} report content:`, reportContent?.substring(0, 200))

    // Save report to database
    const { data: savedReport, error: saveError } = await supabaseClient
      .from('ai_reports')
      .insert({
        user_id: user.id,
        report_type,
        content: reportContent,
        metadata: {
          mandalart_id,
          data_snapshot: reportData,
        },
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving report:', saveError)
      return createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to save report',
        { error: saveError }
      )
    }

    // Return success response
    return createSuccessResponse({
      report: savedReport,
    })
  } catch (error) {
    // Specific error handling
    if (error.message?.includes('Perplexity')) {
      return createErrorResponse(
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        'AI service temporarily unavailable',
        { originalError: error.message }
      )
    }

    // Re-throw to be caught by withErrorHandler wrapper
    throw error
  }
}))

async function collectReportData(
  supabaseClient: SupabaseClient,
  userId: string,
  reportType: string,
  mandalartId?: string,
  language: Language = 'ko'
): Promise<ReportData> {
  const locale = LOCALES[language]

  // Determine date range based on report type
  const now = new Date()
  let startDate: Date
  let periodLabel: string

  switch (reportType) {
    case 'weekly':
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 7)
      periodLabel = locale.periodLabels.weekly
      break
    case 'monthly':
      startDate = new Date(now)
      startDate.setMonth(now.getMonth() - 1)
      periodLabel = locale.periodLabels.monthly
      break
    default:
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 7)
      periodLabel = locale.periodLabels.default
  }

  // Get mandalart info with full structure
  let mandalartQuery = supabaseClient
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
          routine_frequency,
          routine_weekdays,
          routine_count_per_period,
          mission_completion_type,
          mission_status,
          ai_suggestion
        )
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (mandalartId) {
    mandalartQuery = mandalartQuery.eq('id', mandalartId)
  }

  const { data: mandalarts } = await mandalartQuery

  // Analyze Mandalart structure
  const structureAnalysis = analyzeMandalartStructure(mandalarts || [])

  // Get check history for the period
  const { data: checks } = await supabaseClient
    .from('check_history')
    .select(`
      *,
      action:actions(
        *,
        sub_goal:sub_goals(
          *,
          mandalart:mandalarts(*)
        )
      )
    `)
    .eq('user_id', userId)
    .gte('checked_at', startDate.toISOString())

  // Get streak data
  const { data: streakData } = await supabaseClient
    .from('user_stats')
    .select('current_streak, longest_streak, last_check_date')
    .eq('user_id', userId)
    .single()

  // Get badges earned in the period
  const { data: recentBadges } = await supabaseClient
    .from('user_achievements')
    .select(`
      *,
      achievement:achievements(*)
    `)
    .eq('user_id', userId)
    .gte('earned_at', startDate.toISOString())
    .order('earned_at', { ascending: false })

  // For diagnosis, we don't need check history (structure analysis is enough)
  if (!checks || checks.length === 0) {
    if (reportType === 'diagnosis') {
      // Return structure data even without activity
      return {
        period: periodLabel,
        mandalarts: mandalarts || [],
        structureAnalysis,
        totalChecks: 0,
        currentStreak: streakData?.current_streak || 0,
        longestStreak: streakData?.longest_streak || 0,
        recentBadges: recentBadges || [],
      }
    }

    return {
      period: periodLabel,
      mandalarts: mandalarts || [],
      structureAnalysis,
      totalChecks: 0,
      currentStreak: streakData?.current_streak || 0,
      longestStreak: streakData?.longest_streak || 0,
      recentBadges: recentBadges || [],
      message: locale.noActivity,
    }
  }

  // Analyze patterns
  const weekdayPattern: Record<number, number> = {}
  const timePattern: Record<string, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 }
  const subGoalPattern: Record<string, { title: string; count: number }> = {}
  const actionTypePattern: Record<string, number> = { routine: 0, mission: 0, reference: 0 }

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

    // Track action type patterns
    const actionType = check.action?.type || 'routine'
    actionTypePattern[actionType] = (actionTypePattern[actionType] || 0) + 1
  })

  const dayNames = locale.dayNames
  const bestDay = Object.entries(weekdayPattern).sort((a, b) => b[1] - a[1])[0]
  const worstDay = Object.entries(weekdayPattern).sort((a, b) => a[1] - b[1])[0]

  const bestTime = Object.entries(timePattern).sort((a, b) => b[1] - a[1])[0]
  const timeNames = locale.timeNames
  const bestSubGoal = Object.entries(subGoalPattern)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)[0]
  const worstSubGoal = Object.entries(subGoalPattern)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => a.count - b.count)[0]

  // Calculate week-over-week change if possible
  const previousStartDate = new Date(startDate)
  previousStartDate.setDate(previousStartDate.getDate() - 7)

  const { data: previousChecks } = await supabaseClient
    .from('check_history')
    .select('id')
    .eq('user_id', userId)
    .gte('checked_at', previousStartDate.toISOString())
    .lt('checked_at', startDate.toISOString())

  const weekOverWeekChange = previousChecks && previousChecks.length > 0
    ? Math.round(((checks.length - previousChecks.length) / previousChecks.length) * 100)
    : null

  return {
    period: periodLabel,
    mandalarts: mandalarts || [],
    structureAnalysis,
    totalChecks: checks.length,
    uniqueDays: new Set(checks.map((c: CheckRecord) => new Date(c.checked_at).toDateString())).size,
    currentStreak: streakData?.current_streak || 0,
    longestStreak: streakData?.longest_streak || 0,
    weekOverWeekChange,
    bestDay: bestDay ? { day: dayNames[parseInt(bestDay[0])], count: bestDay[1] } : null,
    worstDay: worstDay ? { day: dayNames[parseInt(worstDay[0])], count: worstDay[1] } : null,
    bestTime: bestTime
      ? {
        period: timeNames[bestTime[0] as keyof typeof timeNames] || bestTime[0],
        count: bestTime[1],
      }
      : null,
    bestSubGoal,
    worstSubGoal,
    weekdayPattern,
    timePattern,
    actionTypePattern,
    recentBadges: recentBadges || [],
  }
}

interface Action {
  title: string
  type?: string
  routine_frequency?: string
  routine_weekdays?: number[]
  routine_count_per_period?: number
  mission_completion_type?: string
  mission_status?: string
}

interface SubGoal {
  title: string
  actions: Action[]
}

interface Mandalart {
  center_goal: string
  sub_goals: SubGoal[]
}

function analyzeMandalartStructure(mandalarts: Mandalart[]) {
  if (!mandalarts || mandalarts.length === 0) {
    return {
      totalMandalarts: 0,
      fillRate: 0,
      typeDistribution: { routine: 0, mission: 0, reference: 0 },
      emptyItems: 0,
      totalItems: 0,
      filledItems: 0,
      measurableItems: 0,
      measurableRate: 0,
      specificItems: 0,
      specificRate: 0,
    }
  }

  // Fixed calculation: Each mandalart has exactly 73 items (1 center + 8 sub_goals + 64 actions)
  const ITEMS_PER_MANDALART = 73
  const totalItems = mandalarts.length * ITEMS_PER_MANDALART

  // Patterns to detect specific/clear expressions in text (supplementary to metadata)
  const specificTextPatterns = [
    /\d+\s*[개회시분초일주월년번차명권장]/, // 숫자+단위: "30분", "3회", "5장"
    /매일|매주|매월|주\s*\d+회|일\s*\d+회/, // 빈도: "매일", "주 3회", "일 2회"
    /아침|점심|저녁|오전|오후|밤|새벽/,      // 시간대
    /[0-9]+\s*시|[0-9]+:[0-9]+/,           // 구체적 시간: "7시", "7:30"
    /월요일|화요일|수요일|목요일|금요일|토요일|일요일|평일|주말/, // 요일
  ]

  let filledItems = 0
  let measurableItems = 0
  let specificItems = 0
  let trackableActions = 0 // Count routine + mission actions (exclude reference)
  const typeDistribution = { routine: 0, mission: 0, reference: 0 }

  mandalarts.forEach((mandalart) => {
    // Count center goal
    if (mandalart.center_goal && mandalart.center_goal.trim()) {
      filledItems++
    }

    // Count sub goals and actions
    if (mandalart.sub_goals) {
      mandalart.sub_goals.forEach((subGoal) => {
        if (subGoal.title && subGoal.title.trim()) {
          filledItems++
        }

        if (subGoal.actions) {
          subGoal.actions.forEach((action) => {
            if (action.title && action.title.trim()) {
              filledItems++

              // Count action types
              const actionType = action.type || 'routine'
              if (actionType in typeDistribution) {
                typeDistribution[actionType as keyof typeof typeDistribution]++
              }

              // Only count measurability for routine and mission (exclude reference)
              if (actionType !== 'reference') {
                trackableActions++

                // Check measurability based on metadata settings
                let isMeasurable = false

                if (actionType === 'routine') {
                  // Routine is measurable if frequency/weekdays/count is set
                  isMeasurable = !!(
                    action.routine_frequency ||
                    (action.routine_weekdays && action.routine_weekdays.length > 0) ||
                    action.routine_count_per_period
                  )
                } else if (actionType === 'mission') {
                  // Mission is measurable if completion type is set
                  isMeasurable = !!action.mission_completion_type
                }

                if (isMeasurable) {
                  measurableItems++
                }

                // Check specificity (text patterns as supplementary)
                // An action is specific if it has metadata settings OR clear text patterns
                const hasTextSpecificity = specificTextPatterns.some(pattern => pattern.test(action.title))
                if (isMeasurable || hasTextSpecificity) {
                  specificItems++
                }
              }
            }
          })
        }
      })
    }
  })

  const emptyItems = totalItems - filledItems
  const measurableRate = trackableActions > 0 ? Math.round((measurableItems / trackableActions) * 100) : 0
  const specificRate = trackableActions > 0 ? Math.round((specificItems / trackableActions) * 100) : 0

  return {
    totalMandalarts: mandalarts.length,
    fillRate: totalItems > 0 ? Math.round((filledItems / totalItems) * 100) : 0,
    typeDistribution,
    emptyItems,
    totalItems,
    filledItems,
    measurableItems,
    measurableRate,
    specificItems,
    specificRate,
  }
}

interface ReportData {
  period: string
  mandalarts: Mandalart[]
  structureAnalysis: ReturnType<typeof analyzeMandalartStructure>
  totalChecks: number
  uniqueDays?: number
  currentStreak?: number
  longestStreak?: number
  weekOverWeekChange?: number | null
  bestDay?: { day: string; count: number } | null
  worstDay?: { day: string; count: number } | null
  bestTime?: { period: string; count: number } | null
  bestSubGoal?: { title: string; count: number } | null
  worstSubGoal?: { title: string; count: number } | null
  weekdayPattern?: Record<string, number>
  timePattern?: Record<string, number>
  actionTypePattern?: Record<string, number>
  recentBadges?: Array<{ achievement?: { title?: string } }>
  message?: string
}

// Get localized prompts based on language
function getLocalizedPrompts(language: Language) {
  const locale = LOCALES[language]
  const isEnglish = language === 'en'

  return {
    weekly: {
      system: isEnglish
        ? `You are a data analysis expert. Analyze user's practice patterns and provide insights.

You must respond ONLY in valid JSON format. Do NOT use markdown code blocks.

Exact JSON format:
{
  "headline": "One sentence summarizing this week's most important pattern or change",
  "key_metrics": [
    {"label": "Practice Days", "value": "6 out of 7 days"},
    {"label": "Total Practices", "value": "42 times"},
    {"label": "Week-over-Week Change", "value": "+15% (37→42)"}
  ],
  "strengths": [
    "High focus during Thursday evening time slot",
    "Routine practice rate is stable"
  ],
  "improvements": {
    "problem": "Practice frequency on Wednesday and other days is very low",
    "insight": "Thursday showed high concentration in evening time slot"
  },
  "action_plan": {
    "goal": "Improve weekday practice consistency",
    "steps": [
      "Set reminder for Tuesday at 3 PM",
      "Reduce Wednesday goals to 3 items"
    ]
  }
}

Rules:
- Follow the exact JSON structure above
- Return JSON only without code blocks
- key_metrics order: Practice Days → Total Practices → Week-over-Week Change
- Include actual numbers in key_metrics values
- For week-over-week, show percentage with specific counts (e.g., "+15% (37→42)")
- Analyze patterns and context
- Provide actionable advice`
        : `당신은 데이터 분석 전문가입니다. 사용자의 실천 패턴을 분석하여 인사이트만 제공하세요.

반드시 유효한 JSON 형식으로만 응답하세요. 마크다운 코드 블록을 사용하지 마세요.

정확한 JSON 형식:
{
  "headline": "이번 주 가장 중요한 패턴이나 변화를 한 문장으로",
  "key_metrics": [
    {"label": "실천일수", "value": "7일 중 6일"},
    {"label": "총 실천횟수", "value": "42회"},
    {"label": "전주대비 실천횟수", "value": "+15% (37회→42회)"}
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
- 전주대비는 퍼센트와 함께 구체적 횟수 변화도 표시 (예: "+15% (37회→42회)")
- 패턴과 맥락을 분석하세요
- 실행 가능한 조언을 제공하세요`,

      userPromptTemplate: (data: ReportData, badges: string, changeText: string) =>
        isEnglish
          ? `Find patterns in the following data and provide insights:

[Practice Status]
- Practice Days: ${data.uniqueDays} out of 7 days
- Total Practices: ${data.totalChecks || 0} times
- Week-over-Week Change: ${changeText}
- Streak: Current ${data.currentStreak || 0} days, Best ${data.longestStreak || 0} days
- New Badges Earned: ${badges}

[Time Patterns]
- Day Distribution: ${JSON.stringify(data.weekdayPattern || {})}
- Time Distribution: ${JSON.stringify(data.timePattern || {})}
- Most Active: ${data.bestDay?.day} ${data.bestDay?.count} times
- Least Active: ${data.worstDay?.day} ${data.worstDay?.count} times
- Preferred Time: ${data.bestTime?.period} ${data.bestTime?.count} times

[Goal Performance]
- Best Performance: ${data.bestSubGoal?.title} (${data.bestSubGoal?.count} times)
- Needs Improvement: ${data.worstSubGoal?.title} (${data.worstSubGoal?.count} times)

[Practice Types]
- Routine: ${data.actionTypePattern?.routine || 0} times
- Mission: ${data.actionTypePattern?.mission || 0} times

Analysis Perspectives:
1. Identify optimal practice times from time/day patterns
2. Suggest improvement priorities from goal variance
3. Interpret week-over-week change trends
4. Provide 1 actionable step for next week

Respond in JSON format with actual numbers in key_metrics.`
          : `다음 데이터에서 패턴을 찾아 인사이트를 제공하세요:

[실천 현황]
- 실천일수: 7일 중 ${data.uniqueDays}일
- 총 실천횟수: ${data.totalChecks || 0}회
- 전주대비 실천횟수: ${changeText}
- 스트릭: 현재 ${data.currentStreak || 0}일, 최고 ${data.longestStreak || 0}일
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
3. 전주 대비 변화 추세 해석
4. 다음 주 실행 가능한 1가지 액션

JSON 형식으로 응답하되, key_metrics에는 실제 수치를 포함하세요.`,
    },

    diagnosis: {
      system: isEnglish
        ? `You are a Mandalart plan review expert. Provide specific and actionable improvement directions.

You must respond ONLY in valid JSON format. Do NOT use markdown code blocks.

Exact JSON format:
{
  "headline": "Your Mandalart plan is well-structured but needs clarity improvements",
  "structure_metrics": [
    {"label": "Completion", "value": "89/146 (61%)"},
    {"label": "Clarity", "value": "42% (13 of 31 are specific)"},
    {"label": "Measurability", "value": "35% (11 of 31 are measurable)"}
  ],
  "strengths": [
    "All items are filled without gaps",
    "Routine-focused, actionable structure"
  ],
  "improvements": [
    {"area": "Action Specificity", "issue": "Achievement criteria unclear", "solution": "Add numeric goals to each action (e.g., 30 min, 3 times)"},
    {"area": "Balance", "issue": "Concentrated in specific areas", "solution": "Add 2 actions to underrepresented areas"}
  ],
  "priority_tasks": [
    "Specify exact time and frequency for top 3 routines",
    "Set at least 5 criteria to verify completion",
    "Create weekly review checklist"
  ]
}

Rules:
- Follow the exact JSON structure above
- Return JSON only without code blocks
- structure_metrics must have exactly 3 items: Completion, Clarity, Measurability
- Include actual numbers in structure_metrics values
- Clarity: % of items with specific expressions (e.g., "30 min", "every morning", "3 times/week")
- Measurability: % of items with numeric achievement verification (e.g., "3 times", "5 pages")
- Provide specific and actionable advice
- Use simple language instead of jargon`
        : `당신은 만다라트 계획 점검 전문가입니다. 구체적이고 실천 가능한 개선 방향을 제시하세요.

반드시 유효한 JSON 형식으로만 응답하세요. 마크다운 코드 블록을 사용하지 마세요.

정확한 JSON 형식:
{
  "headline": "만다라트 계획이 잘 잡혀있으나 표현 명확도 보완이 필요합니다",
  "structure_metrics": [
    {"label": "완성도", "value": "89/146 (61%)"},
    {"label": "표현 명확도", "value": "42% (31개 중 13개가 구체적)"},
    {"label": "측정 가능성", "value": "35% (31개 중 11개가 측정 가능)"}
  ],
  "strengths": [
    "모든 항목이 빠짐없이 채워져 있습니다",
    "루틴 중심의 실천 가능한 구조입니다"
  ],
  "improvements": [
    {"area": "액션 구체화", "issue": "달성 기준이 명확하지 않음", "solution": "각 액션에 숫자 목표 추가 (예: 30분, 3회)"},
    {"area": "균형 개선", "issue": "특정 영역에 편중", "solution": "부족한 영역에 액션 2개 추가"}
  ],
  "priority_tasks": [
    "상위 3개 루틴에 구체적 시간과 횟수 명시하기",
    "실천 여부를 확인할 수 있는 기준 5개 이상 설정하기",
    "주간 점검 체크리스트 만들기"
  ]
}

작성 규칙:
- 반드시 위 JSON 구조를 정확히 따르세요
- 코드 블록 없이 JSON만 반환하세요
- structure_metrics는 정확히 3개 항목만 포함: 완성도, 표현 명확도, 측정 가능성
- structure_metrics의 value는 실제 수치를 포함하세요
- 표현 명확도: 숫자+단위, 시간대, 빈도 표현이 있는 항목 비율 (예: "30분", "매일 아침", "주 3회")
- 측정 가능성: 숫자로 달성 여부 확인 가능한 항목 비율 (예: "3회", "5장")
- 구체적이고 실천 가능한 조언을 제공하세요
- 전문 용어 대신 쉬운 표현을 사용하세요`,

      userPromptTemplate: (data: ReportData) => {
        const structure = data.structureAnalysis || {}
        const mandalart = data.mandalarts?.[0]
        const trackableCount = (structure.typeDistribution?.routine || 0) + (structure.typeDistribution?.mission || 0)

        return isEnglish
          ? `Analyze the Mandalart structure and suggest improvements:

[Basic Info]
- Core Goal: "${mandalart?.center_goal || 'Not set'}"
- Total Mandalarts: ${structure.totalMandalarts || 0}

[Structure Analysis]
- Total Items: ${structure.filledItems || 0} of ${structure.totalItems || 0} filled (${structure.fillRate || 0}%)
- Clarity: ${structure.specificRate || 0}% (${structure.specificItems || 0} of ${trackableCount} trackable items are specific)
- Measurability: ${structure.measurableRate || 0}% (${structure.measurableItems || 0} of ${trackableCount} trackable items have frequency set)
- Type Distribution: Routine ${structure.typeDistribution?.routine || 0}, Mission ${structure.typeDistribution?.mission || 0}, Reference ${structure.typeDistribution?.reference || 0}

[Practice Status]
- Last Week Practice: ${data.totalChecks || 0} times
- Current Streak: ${data.currentStreak || 0} days

Analysis Perspectives:
1. Completion rate (fill rate)
2. Clarity evaluation (specific expressions or frequency settings)
3. Measurability evaluation (whether achievement can be verified by frequency settings)
4. Balanced goal composition (excluding reference items)

Respond in JSON format with actual numbers in structure_metrics.`
          : `만다라트 구조를 분석하여 개선점을 제시하세요:

[기본 정보]
- 중심 목표: "${mandalart?.center_goal || '미설정'}"
- 전체 만다라트 수: ${structure.totalMandalarts || 0}개

[구조 분석]
- 전체 항목: ${structure.totalItems || 0}개 중 ${structure.filledItems || 0}개 작성 (${structure.fillRate || 0}%)
- 표현 명확도: ${structure.specificRate || 0}% (실천 항목 ${trackableCount}개 중 ${structure.specificItems || 0}개가 구체적)
- 측정 가능성: ${structure.measurableRate || 0}% (실천 항목 ${trackableCount}개 중 ${structure.measurableItems || 0}개가 반복주기 설정됨)
- 타입 분포: 루틴 ${structure.typeDistribution?.routine || 0}개, 미션 ${structure.typeDistribution?.mission || 0}개, 참고 ${structure.typeDistribution?.reference || 0}개

[실천 현황]
- 지난 주 실천: ${data.totalChecks || 0}회
- 현재 스트릭: ${data.currentStreak || 0}일

분석 관점:
1. 완성도 평가 (항목 채움률)
2. 표현 명확도 평가 (구체적 표현 또는 반복주기 설정 여부)
3. 측정 가능성 평가 (반복주기가 설정되어 달성 여부 확인 가능한지)
4. 균형잡힌 목표 구성 (참고 항목 제외 기준)

JSON 형식으로 응답하되, structure_metrics에는 실제 수치를 포함하세요.`
      },
    },

    default: {
      system: isEnglish
        ? `You are a goal achievement coach. Provide simple and useful insights.`
        : `당신은 목표 달성 코치입니다. 간단하고 유용한 인사이트를 제공하세요.`,
    },

    noBadges: locale.noBadges,
    noComparisonData: isEnglish ? 'No comparison data' : '비교 데이터 없음',
  }
}

async function generateAIReport(reportType: string, data: ReportData, language: Language = 'ko'): Promise<string> {
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')
  if (!perplexityApiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured')
  }

  let systemPrompt = ''
  let userPrompt = ''

  // Get localized prompts based on language
  const prompts = getLocalizedPrompts(language)

  switch (reportType) {
    case 'weekly': {
      systemPrompt = prompts.weekly.system

      const weeklyData = data
      const badges = weeklyData.recentBadges?.map((b: { achievement?: { title?: string } }) => b.achievement?.title).join(', ') || prompts.noBadges

      // Calculate previous week's checks for detailed comparison
      const currentChecks = data.totalChecks || 0
      let changeText = prompts.noComparisonData

      if (weeklyData.weekOverWeekChange != null) {
        const divisor = 1 + weeklyData.weekOverWeekChange / 100
        if (divisor > 0 && currentChecks > 0) {
          const prevChecks = Math.round(currentChecks / divisor)
          changeText = `${weeklyData.weekOverWeekChange > 0 ? '+' : ''}${weeklyData.weekOverWeekChange}% (${prevChecks}→${currentChecks})`
        } else if (weeklyData.weekOverWeekChange === 0) {
          changeText = `0% (${currentChecks}→${currentChecks})`
        } else {
          changeText = `${weeklyData.weekOverWeekChange}%`
        }
      }

      userPrompt = prompts.weekly.userPromptTemplate(data, badges, changeText)
      break
    }

    case 'diagnosis': {
      systemPrompt = prompts.diagnosis.system
      userPrompt = prompts.diagnosis.userPromptTemplate(data)
      break
    }

    default:
      systemPrompt = prompts.default.system
      userPrompt = language === 'en'
        ? `Please provide insights based on the user's activity data:\n${JSON.stringify(data, null, 2)}`
        : `사용자의 활동 데이터를 바탕으로 인사이트를 제공해주세요:\n${JSON.stringify(data, null, 2)}`
  }

  // Call Perplexity API
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${perplexityApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'user',
          content: `${systemPrompt}\n\n${userPrompt}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000, // Increased from 1000 to prevent JSON truncation
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Perplexity API error:', response.status, errorText)
    throw new Error(`Perplexity API error ${response.status}: ${errorText.substring(0, 200)}`)
  }

  const result = await response.json()
  let aiResponse = result.choices[0].message.content

  // Clean up response if it's wrapped in code blocks
  aiResponse = aiResponse.trim()
  if (aiResponse.startsWith('```json')) {
    aiResponse = aiResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
  } else if (aiResponse.startsWith('```')) {
    aiResponse = aiResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
  }

  // Store JSON directly for better data integrity and smaller storage size
  try {
    const jsonResponse = JSON.parse(aiResponse)

    // Validate response structure based on report type
    if (!validateAIResponse(jsonResponse, reportType)) {
      console.warn('AI response validation failed, using raw response')
      return aiResponse
    }

    // Return JSON string directly (no markdown conversion)
    return JSON.stringify(jsonResponse)
  } catch (e) {
    console.warn('Response is not valid JSON, returning as-is')
    return aiResponse
  }
}

// Validate AI response structure
function validateAIResponse(response: Record<string, unknown>, reportType: string): boolean {
  try {
    switch (reportType) {
      case 'weekly':
        return !!(
          response.headline &&
          response.key_metrics && Array.isArray(response.key_metrics) &&
          response.strengths && Array.isArray(response.strengths) &&
          response.improvements &&
          response.action_plan
        )

      case 'diagnosis':
        return !!(
          response.headline &&
          response.structure_metrics && Array.isArray(response.structure_metrics) &&
          response.strengths && Array.isArray(response.strengths) &&
          response.improvements && Array.isArray(response.improvements) &&
          response.priority_tasks && Array.isArray(response.priority_tasks)
        )

      default:
        return true
    }
  } catch {
    return false
  }
}
