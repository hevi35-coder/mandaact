import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
  corsHeaders,
} from '../_shared/errorResponse.ts'

/**
 * Scheduled Report Generator (v2 - Timezone & i18n Support)
 *
 * This function is called by pg_cron or manual trigger to generate weekly reports
 * for all eligible users and send push notifications.
 *
 * Flow:
 * 1. Get users who need weekly reports (via SQL function with timezone/language)
 * 2. For each user: generate report using Perplexity AI (in user's language)
 * 3. Save report to database
 * 4. Send push notification to user (in user's language)
 */

type Language = 'ko' | 'en'

interface UserForReport {
  user_id: string
  email: string
  nickname: string
  push_token: string | null
  check_count: number
  user_timezone: string
  user_language: Language
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
      title: (nickname: string) => `${nickname}님의 주간 리포트가 도착했어요!`,
      body: '지난 주 실천 패턴을 확인해보세요.',
    },
  },
  en: {
    periodLabel: 'Last Week',
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    timeNames: { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' },
    noBadges: 'None',
    pushNotification: {
      title: (nickname: string) => `${nickname}'s weekly report is ready!`,
      body: 'Check your practice patterns from last week.',
    },
  },
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

    console.log('Starting scheduled weekly report generation...')

    // Get users who need weekly reports
    const { data: users, error: usersError } = await supabaseAdmin
      .rpc('get_users_for_weekly_report')

    if (usersError) {
      console.error('Error getting users:', usersError)
      return createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to get users for report',
        { error: usersError }
      )
    }

    if (!users || users.length === 0) {
      console.log('No users need weekly reports')
      return createSuccessResponse({
        message: 'No users need weekly reports',
        processed: 0,
        notifications_sent: 0,
      })
    }

    console.log(`Found ${users.length} users for weekly report generation`)

    let reportsGenerated = 0
    let notificationsSent = 0
    const errors: Array<{ user_id: string; error: string }> = []

    // Process each user
    for (const user of users as UserForReport[]) {
      try {
        console.log(`Processing user: ${user.user_id} (tz: ${user.user_timezone}, lang: ${user.user_language})`)

        const language: Language = user.user_language === 'en' ? 'en' : 'ko'

        // Collect user data for report (with timezone awareness)
        const reportData = await collectUserReportData(
          supabaseAdmin,
          user.user_id,
          user.user_timezone,
          language
        )

        // Generate AI report in user's language
        const reportContent = await generateWeeklyReport(reportData, language)

        // Save report to database
        const { error: saveError } = await supabaseAdmin
          .from('ai_reports')
          .insert({
            user_id: user.user_id,
            report_type: 'weekly',
            content: reportContent,
            metadata: {
              scheduled: true,
              check_count: user.check_count,
              generated_at: new Date().toISOString(),
              user_timezone: user.user_timezone,
              language: language,
            },
          })

        if (saveError) {
          console.error(`Error saving report for ${user.user_id}:`, saveError)
          errors.push({ user_id: user.user_id, error: saveError.message })
          continue
        }

        reportsGenerated++
        console.log(`Report generated for user: ${user.user_id}`)

        // Send push notification if user has push token
        if (user.push_token) {
          try {
            const nickname = user.nickname || user.email.split('@')[0]
            const locale = LOCALES[language]
            const notificationSent = await sendPushNotification(
              user.push_token,
              locale.pushNotification.title(nickname),
              locale.pushNotification.body,
              { type: 'weekly_report' }
            )

            if (notificationSent) {
              notificationsSent++
              console.log(`Push notification sent to user: ${user.user_id}`)
            }
          } catch (pushError) {
            console.error(`Push notification failed for ${user.user_id}:`, pushError)
            // Don't fail the whole process for push errors
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${user.user_id}:`, userError)
        errors.push({
          user_id: user.user_id,
          error: userError instanceof Error ? userError.message : 'Unknown error',
        })
      }
    }

    const result = {
      message: 'Weekly report generation completed',
      total_users: users.length,
      reports_generated: reportsGenerated,
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
  language: Language
) {
  const locale = LOCALES[language]

  // Calculate date range in user's timezone (last 7 days)
  // Note: Server-side calculation, so we use the timezone offset
  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(now.getDate() - 7)

  // Get mandalart info
  const { data: mandalarts } = await supabaseAdmin
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
          type
        )
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)

  // Get check history for the period
  const { data: checks } = await supabaseAdmin
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
  const { data: streakData } = await supabaseAdmin
    .from('user_levels')
    .select('current_streak')
    .eq('user_id', userId)
    .single()

  // Get badges earned in the period
  const { data: recentBadges } = await supabaseAdmin
    .from('user_achievements')
    .select(`
      *,
      achievement:achievements(*)
    `)
    .eq('user_id', userId)
    .gte('earned_at', startDate.toISOString())

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
    mandalarts: mandalarts || [],
    totalChecks: checks?.length || 0,
    uniqueDays: checks ? new Set(checks.map((c: CheckRecord) => new Date(c.checked_at).toDateString())).size : 0,
    currentStreak: streakData?.current_streak || 0,
    longestStreak: 0, // Not available in user_levels
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

Respond in JSON format with actual numbers in key_metrics.`,
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
async function generateWeeklyReport(data: ReportData, language: Language): Promise<string> {
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')
  if (!perplexityApiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured')
  }

  const locale = LOCALES[language]
  const prompts = getLocalizedPrompts(language)
  const badges = data.recentBadges?.map((b) => b.achievement?.title).join(', ') || locale.noBadges

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
          content: `${prompts.systemPrompt}\n\n${prompts.userPromptTemplate(data, badges)}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
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

  // Validate JSON
  try {
    JSON.parse(aiResponse)
    return aiResponse
  } catch {
    console.warn('AI response is not valid JSON, returning as-is')
    return aiResponse
  }
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
