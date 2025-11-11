import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReportRequest {
  report_type: 'weekly' | 'monthly' | 'insight' | 'prediction' | 'struggling'
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
    const reportContent = await generateAIReport(report_type, reportData)

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
    return new Response(
      JSON.stringify({
        error: error.message,
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
) {
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

  // Get mandalart info
  let mandalartQuery = supabaseClient
    .from('mandalarts')
    .select('id, title, center_goal')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (mandalartId) {
    mandalartQuery = mandalartQuery.eq('id', mandalartId)
  }

  const { data: mandalarts } = await mandalartQuery

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

  if (!checks || checks.length === 0) {
    return {
      period: periodLabel,
      mandalarts: mandalarts || [],
      totalChecks: 0,
      message: '기간 내 활동이 없습니다.',
    }
  }

  // Analyze patterns
  const weekdayPattern: Record<number, number> = {}
  const timePattern: Record<string, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 }
  const subGoalPattern: Record<string, { title: string; count: number }> = {}

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

  return {
    period: periodLabel,
    mandalarts: mandalarts || [],
    totalChecks: checks.length,
    uniqueDays: new Set(checks.map((c: CheckRecord) => new Date(c.checked_at).toDateString())).size,
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
  }
}

async function generateAIReport(reportType: string, data: Record<string, unknown>): Promise<string> {
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')
  if (!perplexityApiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured')
  }

  let systemPrompt = ''
  let userPrompt = ''

  switch (reportType) {
    case 'weekly':
      systemPrompt = `당신은 사용자의 목표 달성을 돕는 친근하고 격려하는 코치입니다.
사용자의 주간 활동 데이터를 분석하여 3-4문단의 리포트를 작성해주세요.

리포트 구성:
1. 긍정적인 시작: 주간 성과 칭찬 및 요약
2. 구체적 분석: 요일별, 시간대별, 목표별 패턴 분석
3. 개선 제안: 1-2가지 구체적이고 실행 가능한 조언
4. 다음 주 목표: 격려와 함께 다음 주 방향 제시

톤: 친근하고 긍정적이며 동기부여적인 톤을 사용하세요.`

      userPrompt = `다음은 사용자의 지난 주 활동 데이터입니다:

- 총 실천 횟수: ${data.totalChecks}회
- 활동 일수: ${data.uniqueDays}일
- 가장 활발했던 요일: ${data.bestDay?.day} (${data.bestDay?.count}회)
- 가장 부진했던 요일: ${data.worstDay?.day} (${data.worstDay?.count}회)
- 선호 시간대: ${data.bestTime?.period} (${data.bestTime?.count}회)
- 최고 성과 목표: ${data.bestSubGoal?.title} (${data.bestSubGoal?.count}회)
- 개선 필요 목표: ${data.worstSubGoal?.title} (${data.worstSubGoal?.count}회)

위 데이터를 바탕으로 주간 리포트를 작성해주세요.`
      break

    case 'monthly':
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
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Perplexity API error:', errorText)
    throw new Error(`Perplexity API error: ${response.status}`)
  }

  const result = await response.json()
  return result.choices[0].message.content
}
