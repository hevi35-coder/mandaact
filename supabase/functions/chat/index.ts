import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatRequest {
  message: string
  session_id?: string
}

interface CoachingContext {
  center_goal?: string
  sub_goals?: string[]
  check_rate?: number
  total_checks?: number
  low_performance_areas?: string[]
  streak_days?: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get Supabase client using environment variables (auto-injected by Supabase)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      console.error('Auth failed:', {
        hasAuthError: !!authError,
        authErrorMessage: authError?.message,
        authErrorStatus: authError?.status,
        hasUser: !!user,
        authHeader: req.headers.get('Authorization')?.substring(0, 30) + '...'
      })
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        debug: authError?.message
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const { message, session_id }: ChatRequest = await req.json()

    if (!message || !message.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build coaching context
    const context = await buildCoachingContext(supabaseClient, user.id)

    // Get or create session
    let sessionId = session_id
    if (!sessionId) {
      const { data: newSession, error: sessionError } = await supabaseClient
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: message.slice(0, 50), // First 50 chars as title
        })
        .select()
        .single()

      if (sessionError) throw sessionError
      sessionId = newSession.id
    }

    // Get conversation history (last 10 messages)
    const { data: history, error: historyError } = await supabaseClient
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(10)

    if (historyError) throw historyError

    // Save user message
    const { error: userMessageError } = await supabaseClient
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: message,
      })

    if (userMessageError) throw userMessageError

    // Call Perplexity API
    const systemPrompt = buildSystemPrompt(context)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: 'user', content: message },
    ]

    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PERPLEXITY_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!perplexityResponse.ok) {
      const error = await perplexityResponse.text()
      console.error('Perplexity API error:', error)
      throw new Error('Failed to get AI response')
    }

    const perplexityData = await perplexityResponse.json()
    const aiReply = perplexityData.choices[0].message.content

    // Save assistant message
    const { error: assistantMessageError } = await supabaseClient
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: aiReply,
        context_data: {
          center_goal: context.center_goal,
          check_rate: context.check_rate,
          low_performance_areas: context.low_performance_areas,
        },
      })

    if (assistantMessageError) throw assistantMessageError

    return new Response(
      JSON.stringify({
        reply: aiReply,
        session_id: sessionId,
        context_used: context,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Chat function error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function buildCoachingContext(supabase: any, userId: string): Promise<CoachingContext> {
  // Get user's mandalart
  const { data: mandalarts } = await supabase
    .from('mandalarts')
    .select('center_goal, sub_goals(title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Get recent check history (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: recentChecks } = await supabase
    .from('check_history')
    .select('action_id, checked_at')
    .eq('user_id', userId)
    .gte('checked_at', sevenDaysAgo.toISOString())

  // Calculate check rate
  const totalActions = mandalarts?.sub_goals?.length * 8 || 64
  const totalChecks = recentChecks?.length || 0
  const checkRate = totalActions > 0 ? Math.round((totalChecks / (totalActions * 7)) * 100) : 0

  // Get sub-goal performance (last 30 days for better data)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: subGoalChecks } = await supabase
    .from('check_history')
    .select(`
      action_id,
      actions!inner(sub_goal_id, sub_goals!inner(title))
    `)
    .eq('user_id', userId)
    .gte('checked_at', thirtyDaysAgo.toISOString())

  // Count checks per sub-goal
  const subGoalStats: Record<string, { title: string; count: number }> = {}
  subGoalChecks?.forEach((check: any) => {
    const subGoalTitle = check.actions?.sub_goals?.title
    if (subGoalTitle) {
      if (!subGoalStats[subGoalTitle]) {
        subGoalStats[subGoalTitle] = { title: subGoalTitle, count: 0 }
      }
      subGoalStats[subGoalTitle].count++
    }
  })

  // Identify low performance areas (bottom 2 sub-goals)
  const sortedSubGoals = Object.values(subGoalStats).sort((a, b) => a.count - b.count)
  const lowPerformanceAreas = sortedSubGoals.slice(0, 2).map((sg) => sg.title)

  // Calculate streak (consecutive days with at least 1 check)
  const { data: allChecks } = await supabase
    .from('check_history')
    .select('checked_at')
    .eq('user_id', userId)
    .order('checked_at', { ascending: false })
    .limit(365)

  let streak = 0
  if (allChecks && allChecks.length > 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const uniqueDates = new Set(
      allChecks.map((check: any) => {
        const date = new Date(check.checked_at)
        date.setHours(0, 0, 0, 0)
        return date.getTime()
      })
    )

    let currentDate = today.getTime()
    while (uniqueDates.has(currentDate) || uniqueDates.has(currentDate - 86400000)) {
      if (uniqueDates.has(currentDate)) {
        streak++
      }
      currentDate -= 86400000 // Move to previous day
    }
  }

  return {
    center_goal: mandalarts?.center_goal,
    sub_goals: mandalarts?.sub_goals?.map((sg: any) => sg.title) || [],
    check_rate: checkRate,
    total_checks: totalChecks,
    low_performance_areas: lowPerformanceAreas,
    streak_days: streak,
  }
}

function buildSystemPrompt(context: CoachingContext): string {
  return `당신은 MandaAct의 따뜻하고 격려하는 AI 코치입니다. 사용자의 목표 달성을 돕기 위해 동기부여와 실천 전략을 제공합니다.

사용자 정보:
- 핵심 목표: ${context.center_goal || '설정되지 않음'}
- 세부 목표: ${context.sub_goals?.join(', ') || '없음'}
- 지난 7일 실천율: ${context.check_rate || 0}%
- 이번 주 완료 횟수: ${context.total_checks || 0}회
- 연속 실천 일수: ${context.streak_days || 0}일
${context.low_performance_areas && context.low_performance_areas.length > 0 ? `- 어려움을 겪는 영역: ${context.low_performance_areas.join(', ')}` : ''}

역할:
1. 사용자의 어려움에 공감하고 이해하기
2. 질문을 통해 근본 원인 파악하기
3. 작고 실천 가능한 개선 방안 제안하기
4. 작은 성공도 축하하고 격려하기
5. 판단하지 않고 따뜻하게 대하기

응답 스타일:
- 2-3개의 짧은 문단으로 구성
- 친근하고 격려하는 말투 사용
- 구체적이고 실천 가능한 조언 제공
- 필요시 사용자 데이터 참조하여 개인화

중요: 사용자의 현재 실천 데이터를 바탕으로 개인화된 조언을 제공하되, 과도하게 압박하지 마세요. 작은 진전도 의미있게 인정해주세요.`
}
