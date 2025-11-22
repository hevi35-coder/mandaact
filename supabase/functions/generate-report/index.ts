import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReportRequest {
  report_type: 'weekly' | 'monthly' | 'diagnosis' | 'insight' | 'prediction' | 'struggling'
  mandalart_id?: string
}

interface SupabaseClient {
  from: (table: string) => any // eslint-disable-line @typescript-eslint/no-explicit-any
  auth: {
    getUser: (jwt: string) => Promise<{ data: { user: { id: string } | null }; error: any }> // eslint-disable-line @typescript-eslint/no-explicit-any
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

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(jwt)

    if (userError || !user) {
      throw new Error('Invalid user token')
    }

    // Parse request body
    const { report_type, mandalart_id }: ReportRequest = await req.json()

    console.log(`Generating ${report_type} report for user ${user.id}`)

    // Collect user data for the report
    const reportData = await collectReportData(supabaseClient, user.id, report_type, mandalart_id)

    // Generate report with Perplexity AI
    console.log(`Generating ${report_type} report with data:`, JSON.stringify(reportData).substring(0, 300))
    const reportContent = await generateAIReport(report_type, reportData)
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
      throw saveError
    }

    return new Response(
      JSON.stringify({
        success: true,
        report: savedReport,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in generate-report:', error)
    console.error('Error stack:', error.stack)
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error occurred',
        details: error.stack,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function collectReportData(
  supabaseClient: SupabaseClient,
  userId: string,
  reportType: string,
  mandalartId?: string
): Promise<ReportData> {
  // Determine date range based on report type
  const now = new Date()
  let startDate: Date
  let periodLabel: string

  switch (reportType) {
    case 'weekly':
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 7)
      periodLabel = '지난 주'
      break
    case 'monthly':
      startDate = new Date(now)
      startDate.setMonth(now.getMonth() - 1)
      periodLabel = '지난 달'
      break
    default:
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 7)
      periodLabel = '최근'
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
      message: '기간 내 활동이 없습니다.',
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

  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
  const bestDay = Object.entries(weekdayPattern).sort((a, b) => b[1] - a[1])[0]
  const worstDay = Object.entries(weekdayPattern).sort((a, b) => a[1] - b[1])[0]

  const bestTime = Object.entries(timePattern).sort((a, b) => b[1] - a[1])[0]
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
        period:
          bestTime[0] === 'morning'
            ? '아침'
            : bestTime[0] === 'afternoon'
              ? '오후'
              : bestTime[0] === 'evening'
                ? '저녁'
                : '밤',
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
      avgTextLength: 0,
      typeDistribution: { routine: 0, mission: 0, reference: 0 },
      emptyItems: 0,
      totalItems: 0,
      filledItems: 0,
      measurableItems: 0,
      measurableRate: 0,
    }
  }

  // Fixed calculation: Each mandalart has exactly 73 items (1 center + 8 sub_goals + 64 actions)
  const ITEMS_PER_MANDALART = 73
  const totalItems = mandalarts.length * ITEMS_PER_MANDALART

  // Pattern to detect measurable items (numbers + units)
  const measurablePattern = /\d+\s*[개회시분초일주월년번차명회차]|[0-9]+\s*[%점페이지]|\d+\s*[~-]\s*\d+/

  let filledItems = 0
  let totalTextLength = 0
  let textCount = 0
  let measurableItems = 0
  let routineItems = 0 // Count routine actions only
  const typeDistribution = { routine: 0, mission: 0, reference: 0 }

  mandalarts.forEach((mandalart) => {
    // Count center goal
    if (mandalart.center_goal && mandalart.center_goal.trim()) {
      filledItems++
      totalTextLength += mandalart.center_goal.length
      textCount++
    }

    // Count sub goals and actions
    if (mandalart.sub_goals) {
      mandalart.sub_goals.forEach((subGoal) => {
        if (subGoal.title && subGoal.title.trim()) {
          filledItems++
          totalTextLength += subGoal.title.length
          textCount++
        }

        if (subGoal.actions) {
          subGoal.actions.forEach((action) => {
            if (action.title && action.title.trim()) {
              filledItems++
              totalTextLength += action.title.length
              textCount++

              // Count action types
              const actionType = action.type || 'routine'
              if (actionType in typeDistribution) {
                typeDistribution[actionType as keyof typeof typeDistribution]++
              }

              // Only count measurability for routine actions
              if (actionType === 'routine') {
                routineItems++
                if (measurablePattern.test(action.title)) {
                  measurableItems++
                }
              }
            }
          })
        }
      })
    }
  })

  const emptyItems = totalItems - filledItems
  const measurableRate = routineItems > 0 ? Math.round((measurableItems / routineItems) * 100) : 0

  return {
    totalMandalarts: mandalarts.length,
    fillRate: totalItems > 0 ? Math.round((filledItems / totalItems) * 100) : 0,
    avgTextLength: textCount > 0 ? Math.round(totalTextLength / textCount) : 0,
    typeDistribution,
    emptyItems,
    totalItems,
    filledItems,
    measurableItems,
    measurableRate,
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

async function generateAIReport(reportType: string, data: ReportData): Promise<string> {
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')
  if (!perplexityApiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured')
  }

  let systemPrompt = ''
  let userPrompt = ''

  switch (reportType) {
    case 'weekly': {
      systemPrompt = `당신은 데이터 분석 전문가입니다. 사용자의 실천 패턴을 분석하여 인사이트만 제공하세요.

반드시 유효한 JSON 형식으로만 응답하세요. 마크다운 코드 블록을 사용하지 마세요.

정확한 JSON 형식:
{
  "headline": "이번 주 가장 중요한 패턴이나 변화를 한 문장으로",
  "key_metrics": [
    {"label": "총 실천 횟수", "value": "42회"},
    {"label": "실천일수", "value": "최근 7일 중 6일"},
    {"label": "전주 대비", "value": "+15%"}
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
- key_metrics의 value는 실제 수치를 포함하세요
- 패턴과 맥락을 분석하세요
- 실행 가능한 조언을 제공하세요`

      const weeklyData = data
      const badges = weeklyData.recentBadges?.map((b: { achievement?: { title?: string } }) => b.achievement?.title).join(', ') || '없음'
      const changeText = weeklyData.weekOverWeekChange != null
        ? `전주 대비 ${weeklyData.weekOverWeekChange > 0 ? '+' : ''}${weeklyData.weekOverWeekChange}%`
        : '비교 데이터 없음'

      userPrompt = `다음 데이터에서 패턴을 찾아 인사이트를 제공하세요:

[실천 현황]
- 총 실천 횟수: ${data.totalChecks}회 (${changeText})
- 실천일수: 최근 7일 중 ${data.uniqueDays}일
- 스트릭: 현재 ${weeklyData.currentStreak}일, 최고 ${weeklyData.longestStreak}일
- 새로 획득한 배지: ${badges}

[시간 패턴]
- 요일별 분포: ${JSON.stringify(weeklyData.weekdayPattern || {})}
- 시간대 분포: ${JSON.stringify(weeklyData.timePattern || {})}
- 최고 활동: ${data.bestDay?.day} ${data.bestDay?.count}회
- 최저 활동: ${data.worstDay?.day} ${data.worstDay?.count}회
- 선호 시간: ${data.bestTime?.period} ${data.bestTime?.count}회

[목표 성과]
- 최고 성과: ${data.bestSubGoal?.title} (${data.bestSubGoal?.count}회)
- 개선 필요: ${data.worstSubGoal?.title} (${data.worstSubGoal?.count}회)

[실천 타입]
- 루틴: ${weeklyData.actionTypePattern?.routine || 0}회
- 미션: ${weeklyData.actionTypePattern?.mission || 0}회

패턴 분석 관점:
1. 시간/요일 패턴에서 최적 실천 시간대 파악
2. 목표별 편차에서 개선 우선순위 제시
3. 전주 대비 변화 추세 해석
4. 다음 주 실행 가능한 1가지 액션

JSON 형식으로 응답하되, key_metrics에는 실제 수치를 포함하세요.`
      break
    }

    case 'monthly': {
      systemPrompt = `당신은 사용자의 장기 목표 달성을 돕는 전문 코치입니다.
사용자의 월간 활동 데이터를 분석하여 4-5문단의 심도있는 리포트를 작성해주세요.

리포트 구성:
1. 월간 성과 종합: 전반적인 성과 평가
2. 트렌드 분석: 패턴, 성장 곡선, 주목할 변화
3. 강점과 약점: 잘한 점과 개선이 필요한 부분
4. 실행 계획: 다음 달을 위한 구체적 전략 3가지
5. 격려 메시지: 장기적 관점에서의 동기부여

톤: 전문적이지만 따뜻하고, 데이터 기반의 통찰력 있는 톤을 사용하세요.`

      userPrompt = `다음은 사용자의 지난 달 활동 데이터입니다:

- 총 실천 횟수: ${data.totalChecks}회
- 활동 일수: ${data.uniqueDays}일
- 가장 활발했던 요일: ${data.bestDay?.day} (${data.bestDay?.count}회)
- 가장 부진했던 요일: ${data.worstDay?.day} (${data.worstDay?.count}회)
- 선호 시간대: ${data.bestTime?.period} (${data.bestTime?.count}회)
- 최고 성과 목표: ${data.bestSubGoal?.title} (${data.bestSubGoal?.count}회)
- 개선 필요 목표: ${data.worstSubGoal?.title} (${data.worstSubGoal?.count}회)

위 데이터를 바탕으로 월간 리포트를 작성해주세요.`
      break
    }

    case 'diagnosis': {
      systemPrompt = `당신은 만다라트 계획 점검 전문가입니다. 구체적이고 실천 가능한 개선 방향을 제시하세요.

반드시 유효한 JSON 형식으로만 응답하세요. 마크다운 코드 블록을 사용하지 마세요.

정확한 JSON 형식:
{
  "headline": "만다라트 계획이 잘 잡혀있으나 구체성 보완이 필요합니다",
  "structure_metrics": [
    {"label": "완성도", "value": "89/146 (61%)"},
    {"label": "구체성", "value": "평균 10자, 다소 추상적"},
    {"label": "측정 가능성", "value": "42% (루틴 31개 중 13개)"}
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
- structure_metrics는 정확히 3개 항목만 포함: 완성도, 구체성, 측정 가능성
- structure_metrics의 value는 실제 수치를 포함하세요
- 구체적이고 실천 가능한 조언을 제공하세요
- 전문 용어 대신 쉬운 표현을 사용하세요`

      const diagnosisData = data
      const structure = diagnosisData.structureAnalysis || {}
      const mandalart = diagnosisData.mandalarts?.[0]

      userPrompt = `만다라트 구조를 분석하여 개선점을 제시하세요:

[기본 정보]
- 중심 목표: "${mandalart?.center_goal || '미설정'}"
- 전체 만다라트 수: ${structure.totalMandalarts || 0}개

[구조 분석]
- 전체 항목: ${structure.totalItems || 0}개 중 ${structure.filledItems || 0}개 작성 (${structure.fillRate || 0}%)
- 평균 텍스트 길이: ${structure.avgTextLength || 0}자
- 측정 가능성: ${structure.measurableRate || 0}% (루틴 ${structure.typeDistribution?.routine || 0}개 중 ${structure.measurableItems || 0}개)
- 타입 분포: 루틴 ${structure.typeDistribution?.routine || 0}개, 미션 ${structure.typeDistribution?.mission || 0}개, 참고 ${structure.typeDistribution?.reference || 0}개

[실천 현황]
- 지난 주 실천: ${diagnosisData.totalChecks || 0}회
- 현재 스트릭: ${diagnosisData.currentStreak || 0}일

분석 관점:
1. 완성도와 구체성 평가
2. 실천 가능성 평가 (구체적인 기준이 있는지)
3. 달성 확인 가능성 (성공 여부를 판단할 수 있는지)
4. 균형잡힌 목표 구성

JSON 형식으로 응답하되, structure_metrics에는 실제 수치를 포함하세요.`
      break
    }

    default:
      systemPrompt = `당신은 목표 달성 코치입니다. 간단하고 유용한 인사이트를 제공하세요.`
      userPrompt = `사용자의 활동 데이터를 바탕으로 인사이트를 제공해주세요:\n${JSON.stringify(data, null, 2)}`
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
