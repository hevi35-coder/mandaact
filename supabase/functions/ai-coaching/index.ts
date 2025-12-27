import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CoachingRequest {
  action: 'suggest_sub_goals' | 'generate_actions' | 'reality_check'
  sessionId?: string
  payload: any
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { action, payload, sessionId }: CoachingRequest = await req.json()

    if (!action) {
      return new Response(JSON.stringify({ error: 'action is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let result
    switch (action) {
      case 'suggest_sub_goals':
        result = await suggestSubGoals(payload, sessionId, user.id, supabase)
        break
      case 'generate_actions':
        result = await generateActions(payload, sessionId, user.id, supabase)
        break
      case 'reality_check':
        result = await realityCheck(payload, sessionId, user.id, supabase)
        break
      default:
        throw new Error(`Invalid action: ${action}`)
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge Function error:', error)
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

async function callPerplexity(
  systemPrompt: string,
  userPrompt: string,
  sessionId?: string,
  userId?: string,
  supabase?: any
) {
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')
  if (!perplexityApiKey) throw new Error('Missing Perplexity API key')

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${perplexityApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Perplexity API failed: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('No content in AI response')

  const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 }

  // Log cost if supabase client is provided
  if (supabase && (sessionId || userId)) {
    // Sonar pricing approx: $0.0002 / 1k tokens (conservative estimate)
    const cost = (usage.prompt_tokens + usage.completion_tokens) * 0.0002 / 1000

    await supabase.from('coaching_costs').insert({
      session_id: sessionId,
      user_id: userId,
      tokens_in: usage.prompt_tokens,
      tokens_out: usage.completion_tokens,
      cost_usd: cost
    })
  }

  return JSON.parse(content)
}

async function suggestSubGoals(
  payload: {
    persona: string
    coreGoal: string
    availableTime: string
    energyPeak: string
    priorityArea: string
  },
  sessionId?: string,
  userId?: string,
  supabase?: any
) {
  const systemPrompt = `당신은 만다라트 목표 설정을 돕는 따뜻하고 전문적인 코치입니다.
사용자의 페르소나와 핵심 목표를 바탕으로, 균형 잡힌 8개의 서브 목표(Sub-goals)를 제안해주세요.

규칙:
1. 한국어로 응답하세요.
2. 8개의 서브 목표를 배열로 반환하세요.
3. 사용자의 우선순위 영역(priorityArea)을 반영하세요.
4. "직장인"의 경우 '업무/자기계발/건강/관계/재정/취미/휴식/환경' 등의 균형을 고려하세요.
5. "학생"의 경우 '학습/진로/습관/건강/친구/취미/봉사/자기관리' 등을 고려하세요.

응답 형식 (JSON):
{
  "sub_goals": ["목표1", "목표2", ..., "목표8"]
}`

  const userPrompt = `페르소나: ${payload.persona}
핵심 목표: ${payload.coreGoal}
확보 가능 시간: ${payload.availableTime}분
에너지 피크: ${payload.energyPeak}
우선순위 영역: ${payload.priorityArea}`

  return await callPerplexity(systemPrompt, userPrompt, sessionId, userId, supabase)
}

async function generateActions(
  payload: {
    subGoals: string[]
    persona: string
    availableTime: string
  },
  sessionId?: string,
  userId?: string,
  supabase?: any
) {
  const systemPrompt = `당신은 만다라트의 각 서브 목표에 대해 3단계 실천 항목을 만드는 전문가입니다.

각 서브 목표에 대해 다음 3가지 버전을 만들어주세요:
- base: 보통의 하루에 무리 없이 가능한 수준 (20~30분 내외)
- minimum: 흐름을 끊지 않기 위한 가장 작은 행동 (5~10분 내외)
- challenge: 여력이 있을 때 시도할 수 있는 수준 (40~60분 내외)

규칙:
1. 한국어로 응답하세요.
2. 각 실천 항목은 구체적이고 측정 가능해야 합니다 (예: "10분 걷기" (O), "운동하기" (X)).
3. 사용자의 '확보 가능 시간'이 ${payload.availableTime}분임을 고려하여 난이도를 조절하세요.

응답 형식 (JSON):
{
  "actions": [
    {
      "sub_goal": "서브목표명",
      "base": "실천내용",
      "minimum": "실천내용",
      "challenge": "실천내용"
    },
    ...
  ]
}`

  const userPrompt = `서브 목표 목록: ${payload.subGoals.join(', ')}
페르소나: ${payload.persona}
확보 가능 시간: ${payload.availableTime}분`

  return await callPerplexity(systemPrompt, userPrompt, sessionId, userId, supabase)
}

async function realityCheck(
  payload: {
    coreGoal: string
    subGoals: string[]
    actions: any[]
    availableTime: string
    energyPeak: string
  },
  sessionId?: string,
  userId?: string,
  supabase?: any
) {
  const systemPrompt = `당신은 목표의 현실성을 점검하고 수정을 제안하는 코치입니다.

사용자의 전체 계획(핵심 목표, 서브 목표, 실천 항목)을 분석하여 다음 기준에 따라 제안을 해주세요:
1. 시간 과부하: 하루 총 실천 시간이 확보 가능 시간을 초과하는지?
2. 측정 가능성: 실천 항목이 모호하지 않고 숫자가 포함되어 있는지?
3. 에너지 매칭: 에너지가 높은 시간에 중요한 활동이 배치되었는지?

응답 형식 (JSON):
{
  "corrections": [
    {
      "original": "기존 실천 내용",
      "suggested": "수정된 실천 내용",
      "reason": "수정 이유 (한국어)"
    }
  ],
  "overall_feedback": "전체적인 코멘트 (따뜻한 톤)"
}`

  const userPrompt = `확보 가능 시간: ${payload.availableTime}분
에너지 피크: ${payload.energyPeak}
핵심 목표: ${payload.coreGoal}
계획 상세: ${JSON.stringify(payload.actions)}`

  return await callPerplexity(systemPrompt, userPrompt, sessionId, userId, supabase)
}
