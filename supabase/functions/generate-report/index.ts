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

function analyzeMandalartStructure(mandalarts: any[]) {
  if (!mandalarts || mandalarts.length === 0) {
    return {
      totalMandalarts: 0,
      fillRate: 0,
      avgTextLength: 0,
      typeDistribution: { routine: 0, mission: 0, reference: 0 },
      emptyItems: 0,
    }
  }

  let totalItems = 0
  let filledItems = 0
  let totalTextLength = 0
  let textCount = 0
  const typeDistribution = { routine: 0, mission: 0, reference: 0 }
  let emptyItems = 0

  mandalarts.forEach((mandalart: any) => {
    // Count center goal
    totalItems++
    if (mandalart.center_goal && mandalart.center_goal.trim()) {
      filledItems++
      totalTextLength += mandalart.center_goal.length
      textCount++
    } else {
      emptyItems++
    }

    // Count sub goals and actions
    if (mandalart.sub_goals) {
      mandalart.sub_goals.forEach((subGoal: any) => {
        totalItems++
        if (subGoal.title && subGoal.title.trim()) {
          filledItems++
          totalTextLength += subGoal.title.length
          textCount++
        } else {
          emptyItems++
        }

        if (subGoal.actions) {
          subGoal.actions.forEach((action: any) => {
            totalItems++
            if (action.title && action.title.trim()) {
              filledItems++
              totalTextLength += action.title.length
              textCount++

              // Count action types
              const actionType = action.type || 'routine'
              typeDistribution[actionType as keyof typeof typeDistribution]++
            } else {
              emptyItems++
            }
          })
        }
      })
    }
  })

  return {
    totalMandalarts: mandalarts.length,
    fillRate: totalItems > 0 ? Math.round((filledItems / totalItems) * 100) : 0,
    avgTextLength: textCount > 0 ? Math.round(totalTextLength / textCount) : 0,
    typeDistribution,
    emptyItems,
    totalItems,
    filledItems,
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
      systemPrompt = `당신은 10년 경력의 습관 형성 전문가입니다. 다음 형식을 **정확히** 따라 작성하세요.

# [이번 주 가장 중요한 성과나 변화를 한 문장으로 임팩트 있게]

## 📊 핵심 지표
- [핵심 지표 1: 숫자 포함]
- [핵심 지표 2: 숫자 포함]
- [핵심 지표 3: 숫자 포함]

## 💪 강점
- [강점 1: 구체적 패턴, 1줄]
- [강점 2: 구체적 패턴, 1줄]

## ⚡ 개선 포인트
**문제:** [구체적 문제, 1줄]
**→ 실행:** [구체적 액션 아이템, 시간/요일/장소 포함, 1줄]

## 🎯 다음 주 목표
[한 문장으로 다음 주 방향 제시]

작성 규칙:
- 헤드라인은 임팩트 있게 (숫자나 성과 중심)
- 각 항목은 1줄로 간결하게
- 이모지는 섹션 제목에만 사용
- 과도한 칭찬 지양, 숫자와 사실 기반
- 액션 아이템은 구체적 시간/요일 포함`

      const weeklyData = data as any
      const badges = weeklyData.recentBadges?.map((b: any) => b.achievement?.title).join(', ') || '없음'
      const changeText = weeklyData.weekOverWeekChange !== null
        ? `전주 대비 ${weeklyData.weekOverWeekChange > 0 ? '+' : ''}${weeklyData.weekOverWeekChange}%`
        : '비교 데이터 없음'

      userPrompt = `다음은 사용자의 지난 주 활동 데이터입니다:

[실천 통계]
- 총 실천 횟수: ${data.totalChecks}회 (${changeText})
- 활동 일수: ${data.uniqueDays}일 / 7일
- 현재 스트릭: ${weeklyData.currentStreak}일 (최고 기록: ${weeklyData.longestStreak}일)
- 새로 획득한 배지: ${badges}

[패턴 분석]
- 가장 활발한 요일: ${data.bestDay?.day} (${data.bestDay?.count}회)
- 가장 부진한 요일: ${data.worstDay?.day} (${data.worstDay?.count}회)
- 선호 시간대: ${data.bestTime?.period} (${data.bestTime?.count}회)
- 실천 타입 분포: 루틴 ${weeklyData.actionTypePattern?.routine || 0}회, 미션 ${weeklyData.actionTypePattern?.mission || 0}회

[목표별 성과]
- 최고 성과 목표: ${data.bestSubGoal?.title} (${data.bestSubGoal?.count}회)
- 개선 필요 목표: ${data.worstSubGoal?.title} (${data.worstSubGoal?.count}회)

위 데이터를 바탕으로 실천 리포트를 작성해주세요. 구체적이고 실행 가능한 조언을 포함하되, 과도한 칭찬은 지양하세요.`
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

    case 'diagnosis':
      systemPrompt = `당신은 만다라트 코치입니다. 다음 형식을 **정확히** 따라 작성하세요.

# [만다라트 현재 상태를 한 문장으로 요약]

## 📊 구조 평가
- 완성도: [채움률] (73개 중 [채운 개수]개 작성)
- 구체성: [평균 텍스트 길이]자 ([짧음/적당/충분] 평가)
- 실천 설계: 루틴 [개수]개, 미션 [개수]개

## ✅ 잘하고 있는 점
- [강점 1: 구체적으로, 1줄]
- [강점 2: 구체적으로, 1줄]

## 💡 개선이 필요한 영역
- **[영역명]**: [문제점, 1줄]
- **[영역명]**: [문제점, 1줄]

## 🎯 우선순위 개선 과제
1. **[과제 1]**: [구체적 액션, 1줄]
2. **[과제 2]**: [구체적 액션, 1줄]
3. **[과제 3]**: [구체적 액션, 1줄]

작성 규칙:
- 헤드라인은 현재 상태를 명확히
- SMART 원칙 용어 사용하되 짧게
- 개선 과제는 실행 가능한 것만
- 이모지는 섹션 제목에만
- 건설적 톤, 비판 지양`

      const diagnosisData = data as any
      const structure = diagnosisData.structureAnalysis || {}
      const mandalart = diagnosisData.mandalarts?.[0]

      userPrompt = `다음은 사용자의 만다라트 구조 데이터입니다:

[기본 정보]
- 중심 목표: "${mandalart?.center_goal || '미설정'}"
- 전체 만다라트 수: ${structure.totalMandalarts || 0}개

[구조 분석]
- 전체 항목 수: ${structure.totalItems || 0}개 (중심 1 + 서브골 8 + 액션 64)
- 작성 완료: ${structure.filledItems || 0}개 (${structure.fillRate || 0}%)
- 미작성 항목: ${structure.emptyItems || 0}개
- 평균 텍스트 길이: ${structure.avgTextLength || 0}자

[실천 타입 분포]
- 루틴: ${structure.typeDistribution?.routine || 0}개
- 미션: ${structure.typeDistribution?.mission || 0}개
- 참고: ${structure.typeDistribution?.reference || 0}개

[실천 현황]
- 지난 주 실천 횟수: ${diagnosisData.totalChecks || 0}회
- 현재 스트릭: ${diagnosisData.currentStreak || 0}일

위 데이터를 바탕으로 만다라트 품질을 진단하고, 구체적인 개선 방향을 제시해주세요.
사용자가 실제로 실행할 수 있는 조언을 중심으로 작성하세요.`
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
