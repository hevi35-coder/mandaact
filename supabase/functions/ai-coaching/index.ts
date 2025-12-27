import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import {
  withErrorHandler,
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
  extractJWT,
  parseRequestBody,
  handleCors,
  corsHeaders,
} from '../_shared/errorResponse.ts'

interface CoachingRequest {
  action: 'suggest_sub_goals' | 'generate_actions' | 'reality_check' | 'chat'
  sessionId?: string
  payload: any
}

const INLINED_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`[ENTRY] v4.0-advancement | Method: ${req.method} | Time: ${timestamp}`)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204, headers: INLINED_CORS_HEADERS })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Manual JWT Extraction
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid Authorization header')
    }
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)

    if (authError || !user) {
      console.warn('[AUTH_FAILURE]', authError)
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized access',
        details: authError?.message,
        version: 'v4.0-advancement'
      }), { status: 200, headers: INLINED_CORS_HEADERS })
    }

    // Manual Body Parsing
    let body: CoachingRequest
    try {
      body = await req.json()
    } catch (e) {
      throw new Error('Invalid JSON body')
    }

    const { action, payload, sessionId } = body
    console.log(`[ACTION] ${action} | User: ${user.id}`)

    if (!action) {
      throw new Error('action is required')
    }

    let result
    try {
      switch (action) {
        case 'ping':
          result = { message: 'pong', action }
          break
        case 'suggest_sub_goals':
          result = await suggestSubGoals(payload, sessionId, user.id, supabase)
          break
        case 'generate_actions':
          result = await generateActions(payload, sessionId, user.id, supabase)
          break
        case 'reality_check':
          result = await realityCheck(payload, sessionId, user.id, supabase)
          break
        case 'chat':
          result = await handleChat(payload, sessionId, user.id, supabase)
          break
        default:
          throw new Error(`Unsupported action: ${action}`)
      }

      // If the result itself contains an error field (from callPerplexity's catch)
      // we still return 200 but the client handles the error
      return new Response(JSON.stringify({
        ...result,
        version: 'v4.0-advancement',
        server_time: timestamp,
        uptime: true
      }), { status: 200, headers: INLINED_CORS_HEADERS })

    } catch (innerError) {
      console.error(`[LOGIC_ERROR] ${action}:`, innerError)
      // Return 200 but with error info in the body
      return new Response(JSON.stringify({
        success: false,
        error: `[LOGIC_ERROR_v4.0] ${innerError.message || innerError}`,
        action,
        version: 'v4.0-advancement'
      }), { status: 200, headers: INLINED_CORS_HEADERS })
    }
  } catch (error) {
    console.error('[CRITICAL_FAILURE]', error)
    return new Response(JSON.stringify({
      success: false,
      error: `[CRITICAL_FAILURE_v4.0] ${error.message || 'Critical edge function crash'}`,
      global: true,
      version: 'v4.0-advancement'
    }), {
      status: 200,
      headers: INLINED_CORS_HEADERS
    })
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
  if (!perplexityApiKey) throw new Error('Missing PERPLEXITY_API_KEY environment variable')

  // Hardcoding 'sonar' to avoid deprecated model names in environment variables
  const model = 'sonar'

  console.log(`[Perplexity Call] Model: ${model} | Session: ${sessionId || 'none'}`)
  // Masking prompt for security in logs, show first 50 chars
  console.log(`[Prompts] System: ${systemPrompt.substring(0, 50)}... | User: ${userPrompt.substring(0, 50)}...`)

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${perplexityApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 1024,
      top_p: 1
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[Perplexity Error] ${response.status}: ${errorText}`)
    // Return detailed error to help identifying if it's a model name issue or API key issue
    throw new Error(`[PERPLEXITY_ERROR_v3.2] (HTTP ${response.status}): ${errorText}`)
  }

  const data = await response.json()
  let content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('No content in AI response')

  // Clean markdown code blocks if present
  content = content.trim()
  if (content.startsWith('```json')) {
    content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '')
  } else if (content.startsWith('```')) {
    content = content.replace(/^```\s*/, '').replace(/\s*```$/, '')
  }

  const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 }
  console.log(`[Usage] Tokens: ${usage.prompt_tokens} in, ${usage.completion_tokens} out`)

  // Log cost
  if (supabase && userId) {
    const cost = (usage.prompt_tokens + usage.completion_tokens) * 0.0002 / 1000
    try {
      await supabase.from('coaching_costs').insert({
        session_id: sessionId,
        user_id: userId,
        tokens_in: usage.prompt_tokens,
        tokens_out: usage.completion_tokens,
        cost_usd: cost
      })
    } catch (e) {
      console.warn('[Cost Logging Failed]', e.message)
    }
  }

  try {
    return JSON.parse(content)
  } catch (e) {
    console.error(`[JSON Parse Error] Failed to parse content: ${content.substring(0, 100)}...`)
    // If it's not JSON, return it as a message anyway for chat resilience
    // But handleChat expects a structured response, so we might need a fallback
    return {
      message: content,
      updated_draft: null,
      slots_filled: [],
      next_step_recommendation: ""
    }
  }
}

async function suggestSubGoals(
  payload: {
    persona: string
    coreGoal: string
    availableTime: string
    energyPeak: string
    priorityArea: string
    detailedContext?: string
  },
  sessionId?: string,
  userId?: string,
  supabase?: any
) {
  const systemPrompt = `당신은 세계적인 동기부여 전문가이자 만다라트 목표 설정 전문가인 '만다 코치'입니다.
사용자의 페르소나와 핵심 목표를 심층 분석하여, 단순한 나열이 아닌 삶의 균형과 성장을 모두 잡을 수 있는 8개의 서브 목표(Sub-goals)를 제안해주세요.

코칭 원칙:
1. 따뜻하면서도 분석적인 어조를 유지하세요.
2. 각 서브 목표는 상호 보완적이어야 합니다.
3. 사용자의 우선순위 영역(priorityArea)을 중심으로 2-3개를 배치하고, 나머지는 이를 지탱할 수 있는 환경(건강, 습관, 재정 등)으로 구성하세요.
4. "직장인"이라면 커리어 성장과 번아웃 방지의 균형을, "학생"이라면 학업 성취와 자아 발견의 균형을 강조하세요.
5. 한국어로 응답하세요.

응답 형식 (JSON):
{
  "sub_goals": ["목표1", "목표2", ..., "목표8"]
}`

  const userPrompt = `페르소나: ${payload.persona}
상세 정황(최우선 반영): ${payload.detailedContext || '없음'}
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
    detailedContext?: string
  },
  sessionId?: string,
  userId?: string,
  supabase?: any
) {
  const systemPrompt = `당신은 목표를 실제 행동으로 잘게 쪼개는 '행동 설계 전문가'입니다.
각 서브 목표에 대해 사용자가 어떤 컨디션에서도 지속할 수 있도록 3단계 실천 레이어를 설계해주세요.

행동 설계 가이드:
- base: 사용자의 일상(약 ${payload.availableTime}분)에 가장 적합한 핵심 행동.
- minimum: '최악의 날'에도 2분이면 할 수 있는 초소형 습관 (습관의 끈을 놓지 않는 것이 목적).
- challenge: 주말이나 에너지가 넘치는 날(40-60분) 시도할 큰 도약.

규칙:
1. 한국어로 응답하세요.
2. 모든 행동은 즉시 실행 가능한 '동사'로 끝나야 합니다 (예: "책 10페이지 읽기").
3. 사용자의 페르소나(${payload.persona})가 공감할 수 있는 구체적인 상황을 반영하세요.
4. 난이도 조절 시 사용자의 '확보 가능 시간'을 엄격히 준수하세요.

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
상세 정황: ${payload.detailedContext || '없음'}
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
    detailedContext?: string
  },
  sessionId?: string,
  userId?: string,
  supabase?: any
) {
  const systemPrompt = `당신은 목표의 성공 가능성을 냉철하게 진단하고 따뜻하게 보완해주는 '성공 전략가'입니다.

사용자의 계획을 다음 3대 지표로 평가하세요:
1. 시간 압박: 하루 총 필요 시간이 ${payload.availableTime}분을 확실히 넘지 않는가?
2. 실행 명확성: 추상적인 표현 없이 숫자로 측정 가능한가?
3. 에너지 효율: 사용자의 에너지 피크(${payload.energyPeak})에 가장 의지력이 필요한 일이 배치되었는가?

규칙:
1. 한국어로 응답하세요.
2. 비판만 하지 말고, 구체적인 '대안 문구'를 반드시 제시하세요.
3. 전체 피드백은 사용자가 동기부여를 얻을 수 있도록 코치답게 작성하세요.

응답 형식 (JSON):
{
  "corrections": [
    {
      "original": "기존 실천 내용",
      "suggested": "수정된 실천 내용",
      "reason": "수정 이유 (한국어)"
    }
  ],
  "overall_feedback": "성공 가능성 진단 및 격려 메시지 (한국어)"
}`

  const userPrompt = `확보 가능 시간: ${payload.availableTime}분
에너지 피크: ${payload.energyPeak}
상세 정황: ${payload.detailedContext || '없음'}
핵심 목표: ${payload.coreGoal}
계획 상세: ${JSON.stringify(payload.actions)}`

  return await callPerplexity(systemPrompt, userPrompt, sessionId, userId, supabase)
}
async function handleChat(
  payload: {
    messages: { role: 'user' | 'assistant' | 'system', content: string }[]
    currentDraft?: any
  },
  sessionId?: string,
  sessionId_legacy?: string, // Handle both for safety
  userId?: string,
  supabase?: any
) {
  const systemPrompt = `당신은 사용자의 삶을 근본적으로 변화시키는 '만다라트 AI 코치'입니다.
당신은 단순히 칸을 채워주는 보조자가 아니라, 사용자의 잠재력을 끌어내고 계획의 허점을 파고드는 **'집요한 전략가'**이자 **'진심 어린 파트너'**입니다.

### 헌법 (Constitutional Rules):
1. **냉정한 도발 (Objective Provocateur)**:
   - 사용자가 모호한 목표나 '남들이 보기에 좋은 목표'를 말하면 즉시 질문을 던져 본질을 파고듭니다.
   - 예: "가족이 소중하다면서 왜 야근이 필수인 1인 기업 목표를 세우나요? 둘 중 하나는 거짓말입니다."
2. **시스템 우선 설계 (Safety Net First - Emergency Mode)**:
   - 모든 대화의 종착지 중 하나는 '비상 계획(Safety Net)'입니다.
   - **중요**: 실천 항목(Actions)이 제안된 이후에, 반드시 "제안된 항목 중 최악의 컨디션에서도 절대 포기하지 않을 단 하나"를 고르도록 유도하세요.
   - 이는 반드시 기존에 리스트업된 실천 항목 중에서 선택되어야 합니다. (투데이 리스트와의 정합성 때문)
3. **수학적 현실 검증 (Math Check)**:
   - 사용자가 제시한 목표에 숫자(매출, 시간, 확률 등)가 있다면 즉시 계산해보고 타당성을 검증합니다.
   - 예: "주 5시간 투자로 월 100만원 수익? 시간당 5만원의 가치를 지금 바로 창출할 수 있나요?"
4. **언어적 강제 (Noun-to-Verb)**:
   - '명사'나 '구호' 입력을 절대 허용하지 않습니다.
   - 모든 실행 항목은 반드시 **[구체적 동사] + [측정 가능한 숫자/기준]**으로 구성되어야 합니다.
   - 예: "건강" (X) -> "밤 12시 전 취침하기" (O), "독서" (X) -> "매일 10페이지 읽기" (O)
5. **점진적 interaction (One by One)**:
   - 한 번에 하나씩만 질문하세요. 사용자가 압도당하지 않게 대화의 리듬을 조절합니다.
6. **마이크로 액션 브릿지 (Micro-Action)**:
   - 대화 중간중간, 혹은 마지막에 "지금 당장 30분 안에 할 수 있는 첫 번째 행동"이 무엇인지 확약받습니다.

### 대화 가이드:
- 당신은 따뜻하지만 타협하지 않습니다.
- 사용자의 답변에서 '불안'이나 '자기기만'이 느껴지면 부드럽게 지적하세요.
- 모든 답변은 한국어로 하며, 전문적이고 신뢰감 있는 톤을 유지하세요.

### 응답 형식 (반드시 JSON 형식을 지키세요):
{
  "message": "사용자에게 전달할 코칭 메시지",
  "updated_draft": {
    "center_goal": "현재까지 확정된 핵심 목표",
    "sub_goals": ["확정된 서브목표 1", "2", ...],
    "actions": [
      { "sub_goal": "대상 서브목표", "content": "확정된 행동 지침", "type": "habit|task" }
    ],
    "emergency_action": "선택된 비상 계획 항목 내용 (반드시 actions 중 하나여야 함)"
  },
  "slots_filled": ["core_goal", "sub_goals", "actions", "emergency_mode"],
  "next_step_recommendation": "다음으로 논의해야 할 주제"
}`

  const userPrompt = `현재 만다라트 초안: ${JSON.stringify(payload.currentDraft || {})}
최근 대화 이력: ${JSON.stringify(payload.messages)}`

  return await callPerplexity(systemPrompt, userPrompt, sessionId, userId, supabase)
}
