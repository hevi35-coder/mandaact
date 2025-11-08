import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ActionType = 'routine' | 'mission' | 'reference'
type Confidence = 'high' | 'medium' | 'low'
type RoutineFrequency = 'daily' | 'weekly' | 'monthly'
type MissionCompletionType = 'once' | 'periodic'
type MissionPeriodCycle = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

interface ClassifyRequest {
  action_title: string
}

interface ClassificationResult {
  type: ActionType
  confidence: Confidence
  reason: string
  routine_frequency?: RoutineFrequency
  mission_completion_type?: MissionCompletionType
  mission_period_cycle?: MissionPeriodCycle
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          persistSession: false,
        },
      }
    )

    // Verify user authentication
    const jwt = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(jwt)

    if (authError || !user) {
      console.error('Auth failed:', authError)
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: authError?.message || 'Authentication failed',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const { action_title }: ClassifyRequest = await req.json()

    if (!action_title || action_title.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'action_title is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Classifying action:', action_title)

    // Call AI to classify the action
    const classification = await classifyActionWithAI(action_title)

    return new Response(
      JSON.stringify(classification),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Classify function error:', error)
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

async function classifyActionWithAI(actionTitle: string): Promise<ClassificationResult> {
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')

  if (!perplexityApiKey) {
    throw new Error('Missing Perplexity API key')
  }

  const systemPrompt = `당신은 한국어 실천 항목(action)을 3가지 타입으로 정확하게 분류하는 전문가입니다.

=== 타입 정의 ===

1. routine (루틴): 주기적으로 반복하는 습관
   특징: 빈도 기반, 지속적 실천, 반복 패턴

2. mission (미션): 완료/달성해야 할 목표
   - once: 1회성 완료 목표 (촬영, 제작, 구매, 자격증 등)
   - periodic: 주기적 달성 목표 (유지, 점검, 관리 등)

3. reference (참고): 마음가짐/가치관 (체크 불필요)

=== 핵심 분류 규칙 ===

📍 빈도 표현이 있으면 → routine
- "주N회", "월 N회": routine (weekly/monthly)
- "매일", "매주", "매월": routine (daily/weekly/monthly)
- "일요일", "월요일" 등 요일: routine (weekly)
예시:
✅ "주2회 웨이트/요가" → routine, weekly
✅ "기획 포스팅 월 1회" → routine, monthly
✅ "일요일 주간 기록" → routine, weekly

📍 1회성 행동 → mission (once)
- 촬영, 제작, 완성, 구매, 등록, 신청, 계약
- "~하기" (빈도 없음)
예시:
✅ "프로필 촬영" → mission, once
✅ "명함 제작" → mission, once
✅ "도메인 구매" → mission, once

📍 주기적 관리/점검 → mission (periodic)
- "유지", "점검", "관리", "리뷰"
- 숫자 + % + 유지
예시:
✅ "저축률 70% 유지" → mission, periodic
✅ "주간/월간 목표 점검" → mission, periodic
✅ "포트폴리오 관리" → mission, periodic

📍 "달성" 키워드 있으면 → mission
- "주N회 달성" → mission (periodic)
- "목표 달성" → mission (periodic/once)
예시:
✅ "주1회 고객 미팅 달성" → mission, periodic, weekly
✅ "매출 1억 달성" → mission, once

📍 마음가짐/태도 → reference
예시:
✅ "긍정적 마인드" → reference
✅ "감사하는 마음" → reference
✅ "도전 정신" → reference

=== 상세 예시 ===

ROUTINE (빈도 중심):
- "매일 30분 운동" → daily
- "주1회 독서" → weekly
- "주2회 웨이트/요가" → weekly
- "월 1회 기획 포스팅" → monthly
- "일요일 주간 기록" → weekly
- "매주 일기 쓰기" → weekly

MISSION (once - 1회성):
- "프로필 촬영" → once
- "자격증 취득" → once
- "책 10권 읽기" → once
- "프로젝트 완성" → once

MISSION (periodic - 주기적):
- "저축률 70% 유지" → periodic
- "주간 목표 점검" → periodic
- "월간 매출 목표 달성" → periodic, monthly
- "주1회 고객 미팅 달성" → periodic, weekly

REFERENCE (마음가짐):
- "긍정적 마인드"
- "감사하는 마음"
- "도전 정신"

=== 응답 형식 ===

반드시 JSON만 출력:
{
  "type": "routine|mission|reference",
  "confidence": "high|medium|low",
  "reason": "분류 이유 한 문장",
  "routine_frequency": "daily|weekly|monthly",
  "mission_completion_type": "once|periodic",
  "mission_period_cycle": "daily|weekly|monthly|quarterly|yearly"
}`

  const userPrompt = `다음 실천 항목을 분류해주세요: "${actionTitle}"`

  try {
    console.log('Calling Perplexity API for classification...')

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',  // Fast model for speed priority
        messages: [
          {
            role: 'user',
            content: `${systemPrompt}\n\n${userPrompt}`,
          },
        ],
        temperature: 0.1,  // Low temperature for consistent classification
        max_tokens: 500,   // Small response expected
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Perplexity API error:', errorText)
      throw new Error(`Perplexity API request failed: ${response.status}`)
    }

    const data = await response.json()
    console.log('Perplexity API response received')

    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('No content in Perplexity response')
    }

    // Extract JSON from response (in case AI adds explanation text)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Failed to extract JSON from response:', content)
      throw new Error('Failed to parse AI response as JSON')
    }

    const classification: ClassificationResult = JSON.parse(jsonMatch[0])

    // Validate classification
    return validateClassification(classification)
  } catch (error) {
    console.error('AI classification error:', error)
    throw new Error(`Failed to classify action with AI: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function validateClassification(data: ClassificationResult): ClassificationResult {
  // Validate type
  if (!['routine', 'mission', 'reference'].includes(data.type)) {
    console.warn(`Invalid type "${data.type}", defaulting to routine`)
    data.type = 'routine'
  }

  // Validate confidence
  if (!['high', 'medium', 'low'].includes(data.confidence)) {
    console.warn(`Invalid confidence "${data.confidence}", defaulting to medium`)
    data.confidence = 'medium'
  }

  // Ensure reason exists
  if (!data.reason || data.reason.trim().length === 0) {
    data.reason = '기본 분류'
  }

  // Validate routine fields
  if (data.type === 'routine' && data.routine_frequency) {
    if (!['daily', 'weekly', 'monthly'].includes(data.routine_frequency)) {
      console.warn(`Invalid routine_frequency "${data.routine_frequency}"`)
      delete data.routine_frequency
    }
  }

  // Validate mission fields
  if (data.type === 'mission') {
    if (data.mission_completion_type && !['once', 'periodic'].includes(data.mission_completion_type)) {
      console.warn(`Invalid mission_completion_type "${data.mission_completion_type}"`)
      delete data.mission_completion_type
    }

    if (data.mission_period_cycle && !['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].includes(data.mission_period_cycle)) {
      console.warn(`Invalid mission_period_cycle "${data.mission_period_cycle}"`)
      delete data.mission_period_cycle
    }
  }

  console.log('Classification validated:', data)

  return data
}
