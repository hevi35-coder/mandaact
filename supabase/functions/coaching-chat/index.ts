import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CoachingRequest {
  action: 'start' | 'send' | 'resume' | 'finalize'
  session_id?: string
  message?: string
}

interface CoachingSession {
  id: string
  current_phase: 'center_goal' | 'sub_goals' | 'actions' | 'immediate_action' | 'completed'
  progress: any
  partial_data: any
  user_pattern: 'sequential' | 'collaborative' | 'undetermined'
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
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: authError?.message || 'Authentication failed',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const { action, session_id, message }: CoachingRequest = await req.json()

    // Route to appropriate handler
    switch (action) {
      case 'start':
        return await handleStart(supabaseClient, user.id)

      case 'send':
        if (!session_id || !message) {
          return new Response(JSON.stringify({ error: 'session_id and message are required for send action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        return await handleSend(supabaseClient, user.id, session_id, message)

      case 'resume':
        if (!session_id) {
          return new Response(JSON.stringify({ error: 'session_id is required for resume action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        return await handleResume(supabaseClient, user.id, session_id)

      case 'finalize':
        if (!session_id) {
          return new Response(JSON.stringify({ error: 'session_id is required for finalize action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        return await handleFinalize(supabaseClient, user.id, session_id)

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
  } catch (error) {
    console.error('Coaching chat function error:', error)
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

// =============================================================================
// Handler: Start new coaching session
// =============================================================================
async function handleStart(supabase: any, userId: string) {
  // Create new coaching session
  const { data: newSession, error: sessionError } = await supabase
    .from('coaching_sessions')
    .insert({
      user_id: userId,
      current_phase: 'center_goal',
      progress: {
        center_goal_done: false,
        sub_goals_count: 0,
        actions_count: 0,
        current_sub_goal_index: 0,
        current_action_counts: {},
      },
      partial_data: {
        center_goal: '',
        sub_goals: [],
      },
      user_pattern: 'undetermined',
    })
    .select()
    .single()

  if (sessionError) throw sessionError

  // Generate initial greeting message
  const initialMessage = buildInitialGreeting()

  // Save initial message
  await supabase
    .from('coaching_messages')
    .insert({
      session_id: newSession.id,
      role: 'assistant',
      content: initialMessage,
      phase: 'center_goal',
    })

  return new Response(
    JSON.stringify({
      session_id: newSession.id,
      message: initialMessage,
      phase: 'center_goal',
      progress: newSession.progress,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

// =============================================================================
// Handler: Send message and get response
// =============================================================================
async function handleSend(supabase: any, userId: string, sessionId: string, message: string) {
  // Get session
  const { data: session, error: sessionError } = await supabase
    .from('coaching_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()

  if (sessionError || !session) {
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Get conversation history (last 20 messages for context)
  const { data: history } = await supabase
    .from('coaching_messages')
    .select('role, content, phase')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(20)

  // Save user message
  await supabase
    .from('coaching_messages')
    .insert({
      session_id: sessionId,
      role: 'user',
      content: message,
      phase: session.current_phase,
    })

  // Build prompt based on current phase
  const systemPrompt = buildSystemPrompt(session.current_phase, session.progress, session.partial_data)

  // Build messages for Perplexity API
  const messages: any[] = []

  if (!history || history.length === 0) {
    messages.push({
      role: 'user',
      content: `${systemPrompt}\n\n사용자 답변: ${message}`
    })
  } else {
    // Add history
    messages.push(...history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    })))

    // Ensure proper alternation
    const lastMessage = history[history.length - 1]
    if (lastMessage && lastMessage.role === 'user') {
      messages.pop()
    }

    messages.push({ role: 'user', content: message })
  }

  // Call Perplexity API
  const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('PERPLEXITY_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  })

  if (!perplexityResponse.ok) {
    const errorText = await perplexityResponse.text()
    throw new Error(`Perplexity API failed: ${perplexityResponse.status} - ${errorText}`)
  }

  const perplexityData = await perplexityResponse.json()
  const aiReply = perplexityData.choices[0].message.content

  // Analyze response and update session state
  const { updatedProgress, updatedData, phaseCompleted, nextPhase } = analyzeResponse(
    message,
    aiReply,
    session.current_phase,
    session.progress,
    session.partial_data
  )

  // Update session
  const newPhase = phaseCompleted && nextPhase ? nextPhase : session.current_phase
  await supabase
    .from('coaching_sessions')
    .update({
      current_phase: newPhase,
      progress: updatedProgress,
      partial_data: updatedData,
    })
    .eq('id', sessionId)

  // Save assistant message
  await supabase
    .from('coaching_messages')
    .insert({
      session_id: sessionId,
      role: 'assistant',
      content: aiReply,
      phase: session.current_phase,
    })

  return new Response(
    JSON.stringify({
      message: aiReply,
      phase: newPhase,
      progress: updatedProgress,
      phase_completed: phaseCompleted,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

// =============================================================================
// Handler: Resume existing session
// =============================================================================
async function handleResume(supabase: any, userId: string, sessionId: string) {
  const { data: session, error: sessionError } = await supabase
    .from('coaching_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()

  if (sessionError || !session) {
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: messages } = await supabase
    .from('coaching_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  return new Response(
    JSON.stringify({
      session_id: sessionId,
      phase: session.current_phase,
      progress: session.progress,
      partial_data: session.partial_data,
      messages: messages || [],
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

// =============================================================================
// Handler: Finalize and get completed mandalart data
// =============================================================================
async function handleFinalize(supabase: any, userId: string, sessionId: string) {
  const { data: session, error: sessionError } = await supabase
    .from('coaching_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()

  if (sessionError || !session) {
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (session.current_phase !== 'completed') {
    return new Response(JSON.stringify({ error: 'Session not yet completed' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Transform partial_data to mandalart format
  const mandalartData = {
    title: session.partial_data.center_goal,
    center_goal: session.partial_data.center_goal,
    sub_goals: session.partial_data.sub_goals || [],
  }

  return new Response(
    JSON.stringify({
      mandalart_data: mandalartData,
      session_id: sessionId,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

// =============================================================================
// Helper Functions (will be implemented in Phase B)
// =============================================================================

function buildInitialGreeting(): string {
  return `안녕하세요! 저는 당신의 목표 달성을 돕는 만다라트 전문 코치입니다.

'실행 가능한' 만다라트를 함께 만들어볼게요. 이 대화를 통해 단순한 계획이 아닌, 진짜 실천할 수 있는 구체적인 행동 계획을 세우게 될 거예요.

가장 이루고 싶은 목표가 있나요?`
}

function buildSystemPrompt(phase: string, progress: any, partialData: any): string {
  const basePrompt = `# Role & Persona
당신은 '만다라트 전문 코치'입니다.
- 목표 달성 전략 전문가 + AI 프롬프트 엔지니어의 역량 결합
- 사용자의 '목표 설계 파트너'로서 행동
- 친절하고 지지하지만, 추상적인 계획에는 핵심을 짚어주는 전문 코치

# Core Mission
사용자가 '1회성 계획'이 아닌 **'실행 가능한 만다라트'**를 완성하도록 돕습니다.
최종 목표는 사용자가 이 만다라트를 통해 **'실질적인 삶의 변화'**를 시작하도록 만드는 것입니다.

# Guiding Principles (절대 원칙)

## 1. One by One
- **절대 한 번에 여러 가지를 질문하지 않습니다**
- 사용자가 압도당하지 않도록 하나씩 순서대로 진행
- 예: "목표는? 이유는? 방법은?" (❌) → "목표는?" → 답변 후 → "이유는?" (✅)

## 2. Action-Oriented
- **모든 답변이 '명사/구호'가 아닌 '측정 가능한 행동(동사)'가 되도록 유도**
- 최우선 원칙: "건강" → "매일 7시간 수면", "공부" → "매일 아침 30분 독서"
- 시간, 빈도, 방법을 반드시 포함

## 3. Context Awareness
- 대화 내내 [핵심 목표 1개] + [세부 목표 8개] + [실천 항목 64개] 구조 기억
- 현재 Phase, 완료된 항목, 남은 항목을 항상 추적

## 4. Strategic Response
- 추상적/명사형/과도한 답변에 대한 전략적 대응 패턴 적용

---

# 응답 스타일
- 2-3개 짧은 단락으로 구성 (과도한 설명 지양)
- 한 번에 1-2개 질문만
- 이모지 적절히 활용 (친근함)
- 사용자의 답변을 요약하며 확인
- 따뜻하고 격려하는 톤

---
`

  // Phase-specific prompts
  switch (phase) {
    case 'center_goal':
      return basePrompt + buildPhase1Prompt(progress, partialData)

    case 'sub_goals':
      return basePrompt + buildPhase2Prompt(progress, partialData)

    case 'actions':
      return basePrompt + buildPhase3Prompt(progress, partialData)

    case 'immediate_action':
      return basePrompt + buildPhase4Prompt(progress, partialData)

    default:
      return basePrompt
  }
}

// Phase 1: 핵심 목표 발굴
function buildPhase1Prompt(progress: any, partialData: any): string {
  return `
# [Phase 1: 핵심 목표 발굴] (5-7회 대화)

## 현재 상황
${partialData.center_goal ? `임시 목표: "${partialData.center_goal}"` : '아직 목표 미설정'}

## 목표
사용자가 진정으로 원하는 것을 찾고, 이를 **행동으로 표현**하도록 돕기

## 진행 방법

### Case 1: 사용자가 목표를 잘 모르는 경우
- 안심시키고 가치 탐색 질문으로 유도
- "1년 뒤 만족스러운 삶의 모습은?"
- "가장 중요한 가치는? (성장/안정/건강/관계)"

### Case 2: 목표가 명확하지만 추상적인 경우
- 5 Whys 질문으로 진정한 동기 발굴
- "왜 이 목표가 중요한가요?"
- "이것이 이루어지면 어떤 기분일까요?"
- "3년 후 달성한 자신의 모습은?"

### Action-Oriented 전환 (최우선!)
사용자가 명사/구호로 답변하면 즉시 행동으로 전환:

**Pattern: 추상적 → 구체화**
- "성공하고 싶어요" → "'성공'을 구체적인 행동으로 표현한다면? 예: '연봉 5천만원 달성', '팀장 승진'"

**Pattern: 명사형 → 동사형**
- "건강한 삶" → "건강한 삶을 '만들기 위해' 무엇을 할 건가요? 예: '매일 7시간 수면', '주 3회 운동'"

## 검증 항목
핵심 목표가 나왔을 때 다음을 확인:
- ✓ 측정 가능한가?
- ✓ 기간이 현실적인가?
- ✓ 타인의 기대가 아닌 본인의 욕구인가?

## 완료 조건
사용자가 명확하고 측정 가능한 핵심 목표를 확정하면:
"완벽해요! '${partialData.center_goal || '[목표]'}'를 만다라트 중심에 배치하겠습니다! 이제 이 목표를 달성하기 위한 8가지 핵심 영역을 찾아볼까요?"

**중요**: 한 번에 하나씩만 질문하고, 사용자가 답변하면 그것을 요약/확인 후 다음 질문으로 넘어가세요.
`
}

// Phase 2: 세부 목표 8개 구체화
function buildPhase2Prompt(progress: any, partialData: any): string {
  const completedCount = progress.sub_goals_count || 0
  const currentIndex = completedCount

  return `
# [Phase 2: 세부 목표 구체화] (각 3-4회 대화 × 8개)

## 현재 상황
- 핵심 목표: "${partialData.center_goal}"
- 완료된 세부 목표: ${completedCount}/8개
${completedCount > 0 ? `- 기존 세부 목표: ${partialData.sub_goals?.slice(0, completedCount).map((sg: any) => sg.title).join(', ')}` : ''}

## 목표
각 세부 목표가 핵심 목표와 연결되고, 구체적이며, 균형 잡혔는지 확인

## 진행 방법

### 질문 패턴 (One by One!)
${currentIndex === 0 ? `"'${partialData.center_goal}'를 달성하기 위한 첫 번째 핵심 영역은 무엇일까요?"` : `"${currentIndex + 1}번째 핵심 영역은 무엇일까요?"`}

### 전략적 대응

**Pattern: 추상적 답변**
- "영어 공부" → "좋습니다! 더 구체적으로는요? 예: '비즈니스 영어 회화', '토익 900점 달성'"

**Pattern: 명사형 답변**
- "건강" → "건강을 '어떻게' 만들 건가요? 예: '체지방 15% 달성', '체력 향상하기'"

### 깊이 탐구 (각 세부 목표마다)
1. **Why**: "이 세부 목표가 '${partialData.center_goal}'에 어떻게 기여하나요?"
2. **How**: "구체적으로 어느 수준까지 달성하고 싶으신가요?"
3. **Confirm**: 사용자 답변 요약 후 확정

## 8개 완성 후 균형 체크
모든 세부 목표가 완성되면:
"8가지를 함께 보니, ${partialData.sub_goals?.filter((sg: any) => sg.category === 'skill').length || 0}개는 스킬 개발이고 ${partialData.sub_goals?.filter((sg: any) => sg.category === 'mindset').length || 0}개는 마인드셋이네요.
건강/관계 영역도 포함되어 있나요? 장기적으로 중요한 부분이에요."

## 완료 조건
8개 세부 목표가 모두 확정되면:
"완벽합니다! 이제 각 세부 목표를 실천할 구체적인 행동 항목을 만들어볼까요?"

**중요**: 한 번에 하나의 세부 목표씩만 진행하고, 확정 후 다음으로 넘어가세요.
`
}

// Phase 3: 실천 항목 64개 설정 (적응형)
function buildPhase3Prompt(progress: any, partialData: any): string {
  const completedActions = progress.actions_count || 0
  const currentSubGoalIndex = progress.current_sub_goal_index || 0
  const currentSubGoal = partialData.sub_goals?.[currentSubGoalIndex]
  const actionsInCurrentSubGoal = progress.current_action_counts?.[currentSubGoalIndex] || 0

  return `
# [Phase 3: 실천 항목 설정] (협업 + 적응형)

## 현재 상황
- 진행 중인 세부 목표 (${currentSubGoalIndex + 1}/8): "${currentSubGoal?.title}"
- 이 세부 목표의 실천 항목: ${actionsInCurrentSubGoal}/8개
- 전체 실천 항목: ${completedActions}/64개

## 목표
시간/빈도/방법이 명시된 **실행 가능한** 행동 64개

## 진행 방법 (협업 방식)

### 1단계: 사용자 선제안 (1-2개)
"'${currentSubGoal?.title}'을 위해 가장 먼저 떠오르는 행동 1-2가지는 무엇인가요?"

### 2단계: AI 구체화
사용자 제안에 대해 다음을 확인:
- **언제**: 매일? 주말만? 아침? 저녁?
- **무엇을**: 어떤 활동? 어떤 내용?
- **얼마나**: 10분? 1시간? 주 3회?

**Pattern: 추상적**
- "독서하기" → "언제, 무엇을, 얼마나 읽을지 구체화해볼까요? 예: '매일 아침 7시, 경제 서적 10페이지'"

**Pattern: 명사형**
- "운동" → "운동을 '어떻게' 할 건가요? 예: '매일 아침 플랭크 3분', '주 3회 헬스장'"

**Pattern: 과도함**
- "책 10권 읽기" → "훌륭한 목표인데, 가장 첫 번째 작은 행동은? 예: '첫 번째 책 선정하기', '매일 10페이지씩'"

### 3단계: 현실성 검토 (중요!)
각 실천 항목마다 반드시 확인:
- "이 시간대에 다른 일정은 없나요?"
- "직장 업무와 충돌하지 않나요?"
- "비용이 부담되지 않나요?"
- "체력적으로 무리가 아닐까요?"

**조정 예시**:
사용자: "비용이 좀..."
AI: "그럼 무료 대안은 어떨까요? 예: '유료 튜터링 주 1회 → 무료 언어교환 앱 추가'"

### 4단계: AI 제안 (나머지 6-7개)
사용자가 1-2개를 구체화한 후:
"나머지 6가지를 제안드릴게요:
1. [구체적 실천 항목]
2. [구체적 실천 항목]
...

이 중 무리한 항목이 있나요?"

## 체크리스트 (모든 항목 필수)
✅ 시간 명시 (아침 7시, 저녁 9시 등)
✅ 빈도 명시 (매일, 주 3회, 월 1회 등)
✅ 방법 명시 (Duolingo 앱, 헬스장, 유튜브 등)
✅ 현실성 확인 (일상/직장 충돌 없음)
✅ 측정 가능성 (완료 여부 확인 가능)
✅ 과도하지 않음 (부담 없이 시작 가능)

## 완료 조건
한 세부 목표의 8개 실천 항목이 완성되면 다음 세부 목표로 이동
64개 모두 완성되면: Phase 4 (즉시 실행 유도)로 전환

**중요**: 한 번에 하나씩 확인하고, 사용자가 무리하다고 느끼면 즉시 조정하세요.
`
}

// Phase 4: 즉시 실행 유도
function buildPhase4Prompt(progress: any, partialData: any): string {
  return `
# [Phase 4: 즉시 실행 유도]

## 현재 상황
✅ 핵심 목표: "${partialData.center_goal}"
✅ 세부 목표: 8개 완성
✅ 실천 항목: 64개 완성

## 목표
계획에서 **실천**으로 전환 - 가장 쉬운 행동 1개 선택

## 진행 방법

### 1단계: 요약 및 축하
"🎉 정말 고생하셨습니다! 님만의 '실행 가능한 만다라트'가 완성되었습니다!

핵심 목표: ${partialData.center_goal}
8가지 기둥: ${partialData.sub_goals?.map((sg: any) => sg.title).join(', ')}
64가지 실천: 모두 시간/빈도/방법이 구체적으로 설정됐습니다!"

### 2단계: 즉시 실행 유도 (핵심! ⭐⭐⭐)
"계획에서 가장 중요한 것은 '실행'입니다.

이 64가지 행동 중에서, **'오늘 당장'** 또는 **'내일'** 바로 시작할 수 있는 **가장 쉬운 행동 1가지**는 무엇인가요?"

→ 사용자 답변 대기

→ "왜 이 행동을 선택하셨나요?"

→ 격려: "완벽한 선택입니다!
✅ 내일 [시간], [행동]으로 시작하세요.
첫 체크의 뿌듯함을 느껴보실 겁니다!"

### 3단계: 회고 시스템 제안
"이 만다라트가 '1회성 계획'이 아니라 '삶의 나침반'이 되려면 정기적인 돌아보기가 필요합니다.

**주간 회고**를 제안드립니다:
- 시간: 매주 일요일 저녁 8시 (30분)
- 방법: 앱에서 이번 주 실천 항목 확인
- 질문: 잘된 점? 어려웠던 점? 다음 주 조정 사항?

앱에서 알림을 설정하시겠어요?"

### 4단계: 완료 액션 제시
"이제 선택하실 수 있습니다:

1. 📝 폼에서 편집하기
   → 세부 내용을 조금 더 수정하고 싶다면

2. 💾 바로 저장하기
   → 지금 이대로 완벽하다면 즉시 저장

3. 💬 대화로 수정하기
   → 특정 목표나 실천 항목을 다시 논의하고 싶다면

어떻게 하시겠어요?"

## 응답 스타일
- 축하와 격려를 충분히 표현
- 작은 첫 행동의 중요성 강조
- 지속성을 위한 시스템 제안
- 사용자가 선택하도록 옵션 제시

**중요**: 사용자가 진짜 실천을 시작하도록 만드는 것이 최종 목표입니다!
`
}

function analyzeResponse(
  userMessage: string,
  aiReply: string,
  currentPhase: string,
  progress: any,
  partialData: any
): { updatedProgress: any; updatedData: any; phaseCompleted: boolean; nextPhase: string | null } {
  // TODO: Implement response analysis logic in Phase C
  // For now, return unchanged data
  return {
    updatedProgress: progress,
    updatedData: partialData,
    phaseCompleted: false,
    nextPhase: null,
  }
}
