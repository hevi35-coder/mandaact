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

// v20.2: Import separated modules
import { getCommonRules } from './prompts/common.ts'
import { getStepPrompts, getSubGoalPrompt } from './prompts/step-prompts.ts'
import { sanitize, cleanMessage, cleanJson, stripJargon, JARGON_PATTERNS, cleanKeyword } from './utils/sanitize.ts'
import { getStepLabel, getNextStepInfo } from './utils/step-labels.ts'


interface CoachingRequest {
  action: 'suggest_sub_goals' | 'generate_actions' | 'suggest_actions_v2' | 'reality_check' | 'chat' | 'ping' | 'commit_mandalart' | 'COMMIT_MANDALART' | 'final_commit' | 'force_next_step'
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
        version: 'v11.0-siloed-architecture'
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
    console.log(`[ACTION] ${action} | User: ${user.id} | Language: ${payload?.language} | Session: ${sessionId}`);

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
        case 'summarize_to_keyword':
          result = await summarizeToKeyword(payload, sessionId, user.id, supabase)
          break
        case 'generate_actions':
          result = await generateActions(payload, sessionId, user.id, supabase)
          break
        case 'suggest_actions_v2':
          result = await suggestActionsV2(payload, sessionId, user.id, supabase)
          break
        case 'reality_check':
          result = await realityCheck(payload, sessionId, user.id, supabase)
          break
        case 'chat':
          result = await handleChat(payload, sessionId, user.id, supabase)
          break
        case 'force_next_step':
          result = await forceNextStep(payload, sessionId, user.id, supabase)
          break
        case 'commit_mandalart':
        case 'COMMIT_MANDALART':
        case 'final_commit':
          result = await commitMandalart(payload, sessionId, user.id, supabase)
          break
        case 'force_next_step':
          // v18.2: User explicitly clicked "다음으로" button
          result = await forceNextStep(payload, sessionId, user.id, supabase)
          break
        default:
          throw new Error(`Unsupported action: ${action as any} (Length: ${(action as any)?.length})`)
      }

      // If the result itself contains an error field (from callPerplexity's catch)
      // we still return 200 but the client handles the error
      return new Response(JSON.stringify({
        ...result,
        version: 'v11.0-siloed-architecture',
        server_time: timestamp,
        uptime: true
      }), { status: 200, headers: INLINED_CORS_HEADERS })

    } catch (innerError) {
      console.error(`[LOGIC_ERROR] ${action}:`, innerError)
      // Log more context for logic errors to identify why a non-2xx might happen if it does
      const responseBody = {
        success: false,
        error: `[LOGIC_ERROR_v4.1] ${innerError.message || innerError}`,
        action,
        version: 'v11.0-siloed-architecture'
      }
      return new Response(JSON.stringify(responseBody), { status: 200, headers: INLINED_CORS_HEADERS })
    }
  } catch (error) {
    console.error('[CRITICAL_FAILURE]', error)
    return new Response(JSON.stringify({
      success: false,
      error: `[CRITICAL_FAILURE_v4.0] ${error.message || 'Critical edge function crash'}`,
      global: true,
      version: 'v11.0-siloed-architecture'
    }), {
      status: 200,
      headers: INLINED_CORS_HEADERS
    })
  }
})

async function callPerplexity(
  messages: { role: string; content: string }[],
  sessionId?: string,
  userId?: string,
  supabase?: any,
  temperature = 0.5
) {
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')
  if (!perplexityApiKey) throw new Error('Missing PERPLEXITY_API_KEY environment variable')

  const model = 'sonar'

  console.log(`[Perplexity Call] Model: ${model} | Session: ${sessionId || 'none'} | Temp: ${temperature}`)
  console.log(`[Messages Count] ${messages.length}`);

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${perplexityApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: messages,
      temperature,
      max_tokens: 4000,
      top_p: 0.9
      // Note: Perplexity Sonar doesn't support response_format: json_object
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

  // Clean citations like [1], [1][2], [1, 2], (1), etc.
  content = content.replace(/\[\d+(?:,\s*\d+)*\]/g, '')
  content = content.replace(/\s*\[\s*\]\s*/g, ' ') // Clean empty brackets if any

  console.log(`[Clean Content Snippet] ${content.substring(0, 100)}...`)

  // Step 1: Pre-parsing extraction (Find the largest JSON block)
  const startIdx = content.indexOf('{')
  const endIdx = content.lastIndexOf('}')
  let jsonStr = ''

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    jsonStr = content.substring(startIdx, endIdx + 1)
  } else {
    // Regex fallback
    const match = content.match(/\{[\s\S]*\}/)
    jsonStr = match ? match[0] : content.trim()
  }

  // Step 2: Clean common LLM JSON syntax errors (unescaped newlines inside strings)
  const cleanJson = (str: string) => {
    try {
      // Very basic cleaning for unescaped newlines in JSON values
      // This is risky but often necessary for LLMs that forget to escape \n
      return str.replace(/:\s*"([\s\S]*?)"/g, (match, p1) => {
        const escaped = p1.replace(/\n/g, '\\n').replace(/\r/g, '\\r')
        return `: "${escaped}"`
      })
    } catch (e) {
      return str
    }
  }

  const sanitizedJsonStr = cleanJson(jsonStr)

  const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0 }
  console.log(`[Usage] Tokens: ${usage.prompt_tokens} in, ${usage.completion_tokens} out`)

  // Log cost
  if (supabase && userId) {
    const cost = (usage.prompt_tokens + usage.completion_tokens) * 0.0002 / 1000
    // v20.5: Do NOT await costing to avoid blocking the main result
    supabase.from('coaching_costs').insert({
      session_id: sessionId,
      user_id: userId,
      tokens_in: usage.prompt_tokens,
      tokens_out: usage.completion_tokens,
      cost_usd: cost
    }).then(() => { }).catch(e => console.warn('[Cost Logging Failed]', e.message))
  }

  // Step 3: Try parsing multiple ways
  let finalResult;
  try {
    finalResult = JSON.parse(sanitizedJsonStr);
  } catch (e) {
    try {
      finalResult = JSON.parse(jsonStr);
    } catch (e2) {
      const messageMatch = content.match(/"message":\s*"([\s\S]*?)"/);
      finalResult = {
        message: messageMatch ? messageMatch[1].replace(/\\n/g, '\n') : content,
        updated_draft: null,
        slots_filled: [],
        next_step_recommendation: ""
      };
    }
  }

  // --- JARGON STRIPPER (v7.5) ---
  if (finalResult && finalResult.message) {
    const jargonPatterns = [
      /이를 반영해 updated_draft에 .*/g,
      /updated_draft가 업데이트되었습니다.*/g,
      /I have updated the draft.*/g,
      /JSON 형식으로 .*/g,
      /slots_filled .*/g,
      /데이터를 동기화했습니다.*/g,
      /SMART 목표/g,
      /현재 Step \d+.*?입니다\.?/g,
      /단계에 있습니다\.?/g,
      /\[.*?\]/g,
      /center_goal/gi,
      /sub_goals?/gi,
      /updated_draft/gi,
      /slots_filled/gi,
      /next_step_ready/gi,
      /summary_data/gi
    ];
    jargonPatterns.forEach(regex => {
      finalResult.message = finalResult.message.replace(regex, '');
    });
    finalResult.message = finalResult.message.trim();
  }
  return finalResult;
}

// --- Unified Prompt Constants ---

// v18.3: User-friendly step labels instead of "Step N"
const getStepLabel = (step: number, isEn: boolean): { main: string; sub: string } => {
  const labels: Record<number, { ko: string; en: string }> = {
    1: { ko: '라이프스타일 탐구', en: 'Lifestyle Discovery' },
    2: { ko: '핵심목표 설정', en: 'Core Goal Setting' },
    3: { ko: '세부목표 1 수립', en: 'Sub-goal 1 Planning' },
    4: { ko: '세부목표 2 수립', en: 'Sub-goal 2 Planning' },
    5: { ko: '세부목표 3 수립', en: 'Sub-goal 3 Planning' },
    6: { ko: '세부목표 4 수립', en: 'Sub-goal 4 Planning' },
    7: { ko: '세부목표 5 수립', en: 'Sub-goal 5 Planning' },
    8: { ko: '세부목표 6 수립', en: 'Sub-goal 6 Planning' },
    9: { ko: '세부목표 7 수립', en: 'Sub-goal 7 Planning' },
    10: { ko: '세부목표 8 수립', en: 'Sub-goal 8 Planning' },
    11: { ko: '비상 대책 (Safety Net)', en: 'Safety Net Planning' },
    12: { ko: '최종 점검', en: 'Final Review' },
  };

  const label = labels[step] || { ko: `단계 ${step}`, en: `Step ${step}` };
  return {
    main: isEn ? label.en : label.ko,
    sub: `Step ${step}`
  };
};

// --- 7-STEP PROMPT COLLECTION (v11.0) ---

const GET_STEP_PROMPT = (step: number, isEn: boolean) => {
  // ATTEMPT 15: Nuclear Language Fix - Complete Korean removal in EN mode
  const personaName = isEn ? 'Life Architect AI' : '만다 코치';

  // v18.3: Get user-friendly step label
  const stepLabel = getStepLabel(step, isEn);
  const stepLabelDisplay = isEn
    ? `${stepLabel.main} (${stepLabel.sub})`
    : `${stepLabel.main} (${stepLabel.sub})`;

  const commonRules = isEn ? `
  ### IDENTITY: You are the ${personaName}, a strategic life planning assistant.
  ### LANGUAGE: ENGLISH ONLY. ABSOLUTELY NO KOREAN CHARACTERS.
  ### CURRENT_STAGE: ${stepLabelDisplay}
  
  1. **Format**: RAW JSON ONLY.
  2. **Tone**: Professional, Logical, and Strategic.
  3. **Rules**: 
     - RESPOND IN ENGLISH ONLY.
     - Use terms: "Core Goal", "Sub-goal", "Action Items".
     - Use **DOUBLE NEWLINES** for readability.
     - NO preambles, NO technical jargon.
     - **NO introductory greetings** (e.g., "Hello, I'm Manda Coach") if the conversation is ongoing. The client already handled the initial greeting.
     - **GENDER-NEUTRAL LANGUAGE** (CRITICAL): Use inclusive, gender-neutral terms. Examples:
       - "working parent" NOT "working mom/dad"
       - "caregiver" or "parent" NOT "mother/father" (unless user explicitly identifies)
       - "business professional" NOT "businessman/businesswoman"
       - Do NOT assume gender based on: parenting, career, hobbies, or lifestyle.
  4. **MANDALART STRUCTURE** (CRITICAL):
     - A full Mandalart ALWAYS has 1 Core Goal and EXACTLY 8 Sub-goals.
     - Coaching ALWAYS follows this order: Step 1 (Lifestyle) -> Step 2 (Core Goal) -> Steps 3 to 10 (Sub-goals 1 to 8) -> Step 11 (Safety Net) -> Step 12 (Final).
     - NEVER skip steps. You MUST coach through all 8 Sub-goals even if some are empty in the draft.
  5. **MESSAGE FORMATTING** (CRITICAL):
     - The "message" field is USER-FACING text only.
     - NEVER include JSON, curly braces {}, or "summary:", "detail:" syntax in "message".
     - Write in natural prose with bullet points or numbered lists.
     - Bad: '{"summary": "Goal", "detail": "Description"}'
     - Good: '**Goal Title**\\nDescription of what this goal means...'
  6. **STEP_NAMING** (CRITICAL):
     - Do NOT say "Step 7" with numbers as primary label.
     - Use the step label as PRIMARY: "${stepLabel.main}" or "${stepLabel.main} phase"
     - Step numbers can be mentioned as secondary/supplementary info only.
     - Good: "Now entering Sub-goal 5 Planning phase." ✓
     - Good: "Sub-goal 5 (Step 7) is now locked in." ✓
     - Bad: "Move to Step 7 (Sub-goal 5)." ✗
  7. **IMMEDIATE READINESS** (PRIORITY RULE):
     - NEVER ask "Should we move to the next step?", "Proceed to Step X?" etc.
     - Step transitions are controlled ONLY by UI buttons. 
     - **CRITICAL**: Set "next_step_ready": true **IMMEDIATELY** when you propose content (e.g., goals, actions). 
     - Do NOT wait for user confirmation. Deliver the content and enable the "Next" button at the same time.
  8. **DUAL-TEXT FORMAT** (CRITICAL):
     - For center_goal, sub_goals, and actions, provide BOTH:
       - "summary": ULTRA-SHORT label (≤20 chars preferred, max 30) for grid display
       - "detail": Full description for coaching context
     - Summary must be a concise keyword/phrase, NOT a sentence
     - Examples: "Launch App", "Daily Review", "ASO Optimize"
  9. **Output Schema**:
     {
       "message": "User-facing response",
       "updated_draft": { 
         "center_goal": { "summary": "...", "detail": "..." },
         "sub_goals": [{ "summary": "...", "detail": "..." }, ...],
         "actions": [{ "sub_goal": "...", "summary": "...", "detail": "...", "type": "routine|mission|reference" }, ...]
       },
       "next_step_ready": boolean,
       "summary_data": { ... }
     }
   ` : `
  ### IDENTITY: 당신은 ${personaName}입니다.
  ### LANGUAGE: 한국어로만 응답하세요.
  ### CURRENT_STAGE: ${stepLabelDisplay}
  
  1. **Format**: RAW JSON ONLY.
  2. **Tone**: 따뜻하고 도전적인 코치.
  3. **Rules**: 
     - 반드시 한국어(존댓말)로 응답.
     - "핵심 목표", "세부 목표", "실천 항목" 등 자연스러운 표현 사용.
     - 줄바꿈으로 가독성 확보.
     - **자기소개 금지**: 이미 대화가 시작된 경우 "안녕하세요! 만다 코치입니다"와 같은 인사를 반복하지 마세요.
     - **성중립 언어 사용** (최우선): 포용적이고 성별 중립적인 표현을 사용하세요. 예시:
       - "일하는 부모" (O), "워킹맘" (X)
       - "육아 중인 분" 또는 "부모님" (O), "육아맘" (X)
       - "직장인" (O), "직장인 남성/여성" (X)
       - 육아, 직업, 취미, 라이프스타일로 성별을 가정하지 마세요. 사용자가 명시하지 않는 한 성별 중립을 유지하세요.
  4. **만다라트 구조** (최우선):
     - 만다라트는 반드시 1개의 핵심 목표와 **정확히 8개의 세부 목표**로 구성됩니다.
     - 코칭은 반드시 다음 순서를 따릅니다: Step 1 (라이프스타일) -> Step 2 (핵심목표) -> Step 3~10 (세부목표 1~8) -> Step 11 (비상대책) -> Step 12 (최종확정).
     - 절대로 단계를 건너뛰지 마세요. 초안에 세부목표가 비어있더라도 8개를 모두 채워야 합니다.
  5. **MESSAGE FORMATTING** (중요):
     - "message" 필드는 사용자에게 보여지는 텍스트만 포함.
     - JSON, 중괄호 {}, "summary:", "detail:" 문법 포함 금지.
     - 자연스러운 문장 + 글머리 기호/번호 목록 사용.
  6. **STEP_NAMING** (중요):
     - "Step 4"처럼 숫자로만 표현하지 마세요.
     - 대신 "${stepLabel.main}" 또는 "${stepLabel.main} 단계"로 표현하세요.
     - 예: "이제 세부목표 2 수립 단계입니다." ✓
     - 예: "Step 4에 도착했습니다." ✗
  7. **IMMEDIATE READINESS** (최우선 규칙):
     - 단계가 완료되거나 구체적인 제안(예: 목표 설정, 실천항목 제안 등)이 포함되면 **즉시** "next_step_ready": true를 설정하세요. 
     - 사용자의 확인을 기다리지 말고 제안과 동시에 버튼이 나타나게 하세요.
     - 단계 전환 질문(예: "다음으로 넘어갈까요?")은 절대 하지 마세요.
  8. **DUAL-TEXT FORMAT** (중요):
     - center_goal, sub_goals, actions 모두 두 가지 버전 제공:
       - "summary": 초단축 라벨 (10자 이내 권장, 불가피시 최대 15자) - 그리드 표시용
       - "detail": 전체 설명 - 코칭 맥락용
     - summary는 문장이 아닌 핵심 키워드/구문으로 작성
     - 예시: "앱 런칭", "일일 점검", "ASO 최적화"
  9. **OUTPUT FORMAT IN KOREAN** (중요):
     - 사용자에게 보여줄 때 "summary:", "detail:" 대신 한국어로 표현:
       - 예: "- 요약: MandaAct 극한 시도" 
       - 예: "- 설명: MandaAct 내에서 가능한 모든 시도와 실험을 완료하는 것"
     - 또는 '요약 : 설명' 형식 사용 가능: "MandaAct 극한 시도 : 상세 설명..."
   10. **Output Schema**:
     {
       "message": "사용자 응답",
       "updated_draft": { 
         "center_goal": { "summary": "...", "detail": "..." },
         "sub_goals": [{ "summary": "...", "detail": "..." }, ...],
         "actions": [{ "sub_goal": "...", "summary": "...", "detail": "...", "type": "routine|mission|reference" }, ...]
       },
       "next_step_ready": boolean,
       "summary_data": { ... }
     }
  `;

  const prompts: Record<number, string> = {
    1: isEn ?
      `### Step 1: Lifestyle Discovery
       MISSION: Warmly welcome the user and capture daily ROUTINE and ENERGY patterns.
       
       IF USER SAYS "FIRST TIME":
       1. Respond: "That's great! Let's build your first Mandalart together."
       2. Explain: "A Mandalart is a powerful 8x8 grid that breaks one big goal into 64 small, actionable steps. It's the secret to consistent execution."
       3. Reassure: "Don't worry, I'll guide you through every step. It's easier than it looks!"
       
       BEFORE ASKING QUESTIONS:
       - Explain WHY: "To build a plan that actually fits your real daily rhythm and energy levels, I'd like to understand your current lifestyle first."
       
       CHECKLIST:
       1. [ ] DAILY ROUTINE: Morning to night schedule.
       2. [ ] ENERGY: Peak performance time.

       RULE: Do NOT set "next_step_ready": true until BOTH are captured.
       
       CRITICAL: In Step 1, DO NOT populate "updated_draft" with center_goal, sub_goals, or actions.
       Step 1 is ONLY for gathering lifestyle data into "summary_data".
       
       OUTPUT: "summary_data": { "lifestyle_routine": "...", "lifestyle_energy": "..." }
       LEAVE "updated_draft" EMPTY or null for Step 1.`
      :
      `### Step 1: 라이프스타일 발견
       미션: 사용자를 따뜻하게 환영하고 일과 및 에너지 패턴을 파악합니다.
       
       응답 구조 (순서 엄격):
       1. 만약 사용자가 "처음이야"라고 답했다면:
          - 호응: "처음이시군요! 만나서 반갑습니다. 저와 함께 첫 번째 만다라트를 만들어봐요."
          - 설명: "만다라트는 하나의 큰 목표를 8x8 격자로 나누어 총 64개의 구체적인 행동으로 쪼개주는 강력한 도구예요. 계획을 실행으로 옮기는 가장 똑똑한 방법이죠."
          - 안심: "제가 차근차근 안내해 드릴 테니 전혀 어렵지 않을 거예요. 편안하게 대화 나누듯 따라와 주세요!"
       2. 질문 전 배경 설명 (반드시 포함):
          - "사용자님의 실제 생활 리듬과 컨디션에 딱 맞는, '실패 없는 계획'을 세우기 위해 먼저 평소 라이프스타일을 몇 가지 여쭤보려고 해요."
       3. 구체적인 질문 제시.

       금지 규칙:
       - 절대로 "안녕하세요! 만다 코치입니다"로 대화를 환기하지 마세요. (이미 첫인사에서 했습니다)
       
       체크리스트:
       1. [ ] 하루 일과
       2. [ ] 컨디션/에너지

       규칙: 둘 다 파악될 때까지 "next_step_ready": true 금지. 파악 완료 후 즉시 "next_step_ready": true 설정.
       
       중요: Step 1에서는 "updated_draft"에 center_goal, sub_goals, actions를 채우지 마세요.
       Step 1은 오직 라이프스타일 정보를 "summary_data"에 저장하는 단계입니다.
       
       출력: "summary_data": { "lifestyle_routine": "...", "lifestyle_energy": "..." }
       "updated_draft"는 비워두세요.`,

    2: isEn ?
      `### Step 2: Core Goal Discovery
       MISSION: Define ONE meaningful Core Goal through deep interview.
       
       ⚠️ CRITICAL VIOLATIONS (NEVER DO THESE):
       1. DO NOT propose sub-goals - That's for Steps 3-10
       2. DO NOT propose action items - That's for Steps 3-10
       3. DO NOT list 8 items - Step 2 is ONLY for Core Goal!
       4. DO NOT skip interview questions
       
       INTERVIEW SEQUENCE (ONE AT A TIME):
       1. User mentions a goal → Acknowledge warmly (nothing else)
       2. **MANDATORY QUESTION 1**: "Does this goal truly excite you? Why?"
       3. **MANDATORY QUESTION 2**: "Have you already started working on this? What's your progress?"
       4. **MANDATORY QUESTION 3**: "What's been the biggest challenge so far?"
       5. After interview complete → Confirm Core Goal
       
       CORRECT EXAMPLE (Step 2 first response):
       "Wow, 'Get fit' is a great goal! Does this goal truly excite you? Why?"
       
       WRONG EXAMPLE:
       "Wow, 'Get fit'! Here are 8 sub-goals: 1. Exercise routine, 2. Diet plan..." ← FORBIDDEN!
       
       OUTPUT:
       - "updated_draft": { "center_goal": { "summary": "...", "detail": "..." } } (only after interview)
       - "next_step_ready": true (only after ALL 3 questions answered)
       
       **STOP AND CHECK** before responding:
       - Is there a sub-goals list? → DELETE IT
       - Is there an actions list? → DELETE IT
       - Did you ask an interview question? → If not, ASK ONE`
      :
      `### Step 2: 핵심 목표 발견
       미션: 깊이 있는 인터뷰를 통해 핵심 목표 하나를 정의합니다.
       
       ⚠️ 절대 금지 사항 (CRITICAL VIOLATIONS):
       1. 세부목표를 제안하지 마세요 - Step 3-10에서 합니다
       2. 실천항목을 제안하지 마세요 - Step 3-10에서 합니다
       3. 8개 목록을 나열하지 마세요 - Step 2는 핵심목표만!
       4. 인터뷰 질문 생략 금지
       
       인터뷰 순서 (한 번에 하나씩만):
       1. 사용자가 목표를 언급 → 따뜻하게 호응 (다른 건 안 함)
       2. **필수 질문 1**: "이 목표가 진심으로 설레나요? 왜 그런가요?"
       3. **필수 질문 2**: "이미 시도해본 적 있나요? 현재 진행상황은?"
       4. **필수 질문 3**: "지금까지 가장 어려웠던 점은?"
       5. 인터뷰 완료 후 핵심 목표 확정
       
       올바른 예시 (Step 2 첫 응답):
       "와, '건강한 몸 만들기'라는 목표 멋져요! 이 목표가 진심으로 설레나요? 왜 그런가요?"
       
       잘못된 예시:
       "와, '건강한 몸' 목표로 8개 세부목표를 제안할게요: 1. 운동 루틴, 2. 식단 관리..." ← 이건 금지!
       
       출력:
       - "updated_draft": { "center_goal": { "summary": "...", "detail": "..." } } (인터뷰 후에만 설정)
       - "next_step_ready": true (3가지 질문 모두 답변 받은 후에만)
       
       **STOP AND CHECK**: 응답 전 확인하세요:
       - 세부목표 리스트가 있나요? → 삭제하세요
       - 실천항목 리스트가 있나요? → 삭제하세요
       - 인터뷰 질문을 했나요? → 아니면 질문하세요`,

    11: isEn ?
      `### Step 11: Safety Net Planning
       MISSION: Define 2-3 Emergency Actions (minimum viable actions for bad days).
       
       CONTEXT: User has completed their full plan. They can view details in the Preview panel.
       
       DO NOT: List all sub-goals and actions again. It's too long and redundant.
       
       INSTEAD:
       1. Briefly acknowledge they've built a complete system (1 sentence)
       2. Explain the concept of "Emergency Actions" - minimum actions for low-energy days
       3. Suggest 2-3 specific actions from their existing plan that could serve as minimum viable actions
       4. Ask them to confirm or customize
       
       Keep your message SHORT and FOCUSED. Under 200 words.
        Exit: Set "next_step_ready": true IMMEDIATELY after proposing emergency actions. Inform the user they can finalize the Mandalart in the next step.`
      :
      `### Step 11: 비상대책 수립
       미션: 비상 행동 2-3개 정의 (힘든 날에도 할 수 있는 최소한의 행동).
       
       맥락: 사용자가 전체 계획을 완성함. 세부 내용은 프리뷰 패널에서 확인 가능.
       
       금지: 모든 세부목표와 실천항목을 다시 나열하지 마세요. 너무 길고 중복됨.
       
       대신:
       1. 완성된 시스템에 대해 간단히 축하 (1문장)
       2. "비상 행동" 개념 설명 - 컨디션 안 좋은 날에도 할 수 있는 최소한의 행동
       3. 기존 실천항목 중 비상 행동으로 적합한 2-3개 제안
       4. 확정 또는 수정 요청
       
       메시지를 짧고 집중적으로 유지. 200자 이내 권장.
        종료: 제안 제시 완료 시 즉시 "next_step_ready": true. 사용자에게 다음 단계에서 즉시 만다라트를 확정할 수 있음을 안내하세요.`,

    12: isEn ?
      `### Step 12: Final Confirmation
       MISSION: Present a concise summary and get final confirmation.
       
       CONTEXT: User has completed their full plan. They can view all details in the Preview panel.
       
       DO NOT: List every sub-goal and action item again. It's redundant.
       
       INSTEAD:
       1. Congratulate them on completing the planning (1-2 sentences)
       2. Show a brief high-level summary:
          - Lifestyle context (1 line)
          - Core Goal (1 line)
          - 8 Sub-goals (titles only, no details)
          - Emergency Actions (1 line)
       3. Remind them to check the Preview panel for full details
       4. Ask for final confirmation to save
       
       Keep your message SHORT and CELEBRATORY. Under 250 words.
        Exit: Set "next_step_ready": true IMMEDIATELY after presenting the final summary. Remind them the 'Finalize' button is already active.`
      :
      `### Step 12: 최종 확정
       미션: 간결한 요약을 제시하고 최종 확정을 받습니다.
       
       맥락: 사용자가 전체 계획을 완성함. 세부 내용은 프리뷰 패널에서 확인 가능.
       
       금지: 모든 세부목표와 실천항목을 다시 나열하지 마세요. 중복됨.
       
       대신:
       1. 계획 완성을 축하 (1-2문장)
       2. 간단한 하이레벨 요약 제시:
          - 라이프스타일 맥락 (1줄)
          - 핵심목표 (1줄)
          - 8개 세부목표 (제목만, 설명 없이)
          - 비상대책 (1줄)
       3. 프리뷰 패널에서 전체 내용 확인 가능함을 안내
       4. 최종 확정 요청
       
       메시지를 짧고 축하하는 분위기로 유지. 250자 이내 권장.
        종료: 최종 요약 제시 완료 시 즉시 "next_step_ready": true. 하단의 '만다라트 생성 및 시작' 버튼이 이미 활성화되어 있음을 알려주세요.`,
  };

  // Add Steps 3-10 dynamically (8 Sub-goals Coaching)
  for (let i = 0; i < 8; i++) {
    const stepNum = i + 3;
    const subGoalNum = i + 1;
    const isLastSubGoal = subGoalNum === 8;

    // Detailed next step mapping to prevent AI "Execution Tracking" hallucinations
    const nextStepInfo = isLastSubGoal
      ? (isEn ? "Safety Net Planning (Step 11)" : "비상대책 수립 (Step 11)")
      : (isEn ? `Sub-goal ${subGoalNum + 1} (Step ${stepNum + 1})` : `세부목표 ${subGoalNum + 1} (Step ${stepNum + 1})`);

    prompts[stepNum] = isEn ?
      `### Step ${stepNum}: Sub-goal ${subGoalNum}
       
       ⚠️ **USER-FIRST APPROACH** (CRITICAL):
       1. FIRST ASK: "Do you have a specific sub-goal in mind for this area?"
       2. If YES → Help refine their idea and propose 3-8 action items for it
       3. If NO → "Let me suggest one: [your suggestion]. What do you think?"
       
       IMPORTANT: There are EXACTLY 8 sub-goals to complete.
       Current: Sub-goal ${subGoalNum}.
       Next: ${nextStepInfo}.
       
       **ACTION ITEMS**: 
       - Maximum 8 per sub-goal (don't need to fill all 8 - quality over quantity)
       - Propose 3-4 initially, ask if user wants more
       
       **ANTI-REPETITION RULES**:
       - DO NOT list previous sub-goal's action items again
       - DO NOT summarize already proposed content
       
       Exit: Set "next_step_ready": true after action items are agreed upon.`
      :
      `### Step ${stepNum}: 세부목표 ${subGoalNum}
       
       ⚠️ **사용자 우선 접근** (최우선):
       1. 먼저 질문: "혹시 이 영역에서 생각해 둔 세부목표가 있으신가요?"
       2. 있으면 → 사용자 아이디어를 다듬고, 그에 맞는 실천항목 3-8개 제안
       3. 없으면 → "없으시다면 제가 제안드릴게요. [제안] 어떠세요?"
       
       중요: 만다라트는 총 8개의 세부목표가 필수입니다.
       현재: 세부목표 ${subGoalNum}.
       다음 단계: ${nextStepInfo}.
       
       **실천항목**:
       - 세부목표당 최대 8개 (8개 모두 채울 필요 없음 - 양보다 질)
       - 처음에 3-4개 제안, 더 원하면 추가
       
       **반복 금지 규칙**:
       - 이전 세부목표의 실천항목을 다시 나열하지 마세요
       - 이미 제안한 내용을 요약하지 마세요
       
       종료: 실천항목 합의 완료 시 "next_step_ready": true.`;
  }

  return `${commonRules}\n\n${prompts[step] || prompts[1]}`;
};

// Legacy wrapper for non-chat actions (suggestSubGoals, generateActions, realityCheck)
const GET_CORE_PROMPT = (isEn: boolean) => {
  return isEn
    ? `You are a Strategic Warm Provocateur Coach.Respond ONLY in English.Be concise(1 - 2 sentences).No citations.CORE RULE: Switch to English immediately.`
    : `당신은 만다라트 전문 전략 코치입니다.반드시 한국어(존댓말, ~해요 style)로 응답하세요.반말을 절대 사용하지 마세요.간결하게(1 - 2문장).인용 금지.핵심 규칙: 지금 즉시 한국어로 전환하세요.`;
};

async function suggestSubGoals(
  payload: {
    persona?: string
    coreGoal: string
    priorityArea?: string
    detailedContext?: string
    language?: string
  },
  sessionId?: string,
  userId?: string,
  supabase?: any
) {
  const isEn = !!(payload.language && payload.language.startsWith('en'));
  const systemPrompt = `
### IDENTITY: You are a Strategic Mandalart Consultant specializing in creating punchy, meaningful labels.
### TASK: Suggest exactly 3 strategic sub-goals (pillars) for the user's Core Goal.
### RULES:
1. OUTPUT: PURE JSON ONLY.
2. FORMAT: { "sub_goals": [ { "keyword": "SHORT_LABEL", "description": "FULL_SENTENCE" }, ... ] }
3. KEYWORD (CRITICAL): 
   - MAX 10 characters (strictly enforced).
   - MUST be a clean, standalone noun or phrase.
   - ABSOLUTELY NO hanging punctuation (e.g., avoid "(", ",", "-", "의" at the end).
   - If a word doesn't fit, find a SHORTER synonym or abbreviation.
   - Bad: "앱스토어 최적화(A", "유료 광고 캠페("
   - Good: "ASO 최적화", "유료 광고", "마케팅 전략", "체력 증진"
4. DESCRIPTION: A full, professional sentence explaining the strategy.
5. COUNT: Exactly 3.
6. QUALITY: Provide distinct, high-quality strategic directions.

### EXAMPLES (Korean):
{
  "sub_goals": [
    { "keyword": "ASO 전략", "description": "앱 스토어 최적화(ASO)를 통해 전환율을 높이고 검색 순위를 상위권으로 끌어올립니다." },
    { "keyword": "SNS 마케팅", "description": "인스타그램과 틱톡을 활용해 초기 유저들의 참여를 유도하고 브랜드 인지도를 높입니다." },
    { "keyword": "유료 광고", "description": "Meta 및 Google 검색 광고를 집행하여 타겟팅된 신규 가입자를 효율적으로 확보합니다." }
  ]
}

LANGUAGE: ${isEn ? 'English' : 'Korean (Polite)'}`;

  const userPrompt = `CORE GOAL: ${payload.coreGoal}
(Generate 3 strategic pillars with CLEAN, word-based keywords following the rules above.)`;

  const result = await callPerplexity([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], sessionId, userId, supabase);

  // Post-processing: Clean up keywords in suggestions
  if (result && Array.isArray(result.sub_goals)) {
    result.sub_goals = result.sub_goals.map((item: any) => {
      if (item.keyword) {
        item.keyword = cleanKeyword(item.keyword);
        // Strict length enforcement
        if (item.keyword.length > 10) {
          item.keyword = item.keyword.substring(0, 10).trim();
        }
      }
      return item;
    });
  }

  return result;
}

async function summarizeToKeyword(
  payload: {
    text: string
    language?: string
  },
  sessionId?: string,
  userId?: string,
  supabase?: any
) {
  const isEn = !!(payload.language && payload.language.startsWith('en'));
  const systemPrompt = `
### IDENTITY: You are an expert at information condensation and strategic labeling for Mandalarts.
### TASK: Summarize the input text into ONE punchy, clear keyword or short phrase for a Mandalart grid cell.
### RULES:
1. OUTPUT: PURE JSON ONLY. { "keyword": "...", "description": "..." }
2. KEYWORD (STRICLY ENFORCED): 
   - MAX 10 characters (including spaces). 
   - MUST be a Noun or Noun Phrase that captures the CORE ESSENCE.
   - ABSOLUTELY NO trailing punctuation, parentheses, or ellipses.
   - DO NOT just cut the text. REWRITE it into a complete, standalone label.
   - Bad: "Analyze the", "경쟁사 시장을 분", "앱스토어 최적화(", "마케팅 전략..."
   - Good: "Market Study", "시장 분석", "ASO 최적화", "체력 증진", "SNS 유입"
3. DESCRIPTION: Keep the original input text for context.
4. LANGUAGE: ${isEn ? 'English' : 'Korean'}

### EXAMPLES:
Input: "Analyze the competitor market to identify unique selling points."
Output: { "keyword": "Market Study", "description": "Analyze the competitor market to identify unique selling points." }

Input: "앱 스토어 검색 최적화(ASO)를 통해 전환율을 10% 증대시키기 위해 노력합니다."
Output: { "keyword": "ASO 최적화", "description": "앱 스토어 검색 최적화(ASO)를 통해 전환율을 10% 증대시키기 위해 노력합니다." }

LANGUAGE: ${isEn ? 'English' : 'Korean'}`;

  const userPrompt = `Summarize and Extract Keyword from: "${payload.text}"`;

  const result = await callPerplexity([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], sessionId, userId, supabase);

  // Post-processing: Clean up keywords in suggestions
  if (result && result.keyword) {
    result.keyword = cleanKeyword(result.keyword);
    // Safety: ensure it doesn't exceed 10 chars
    if (result.keyword.length > 10) {
      result.keyword = result.keyword.substring(0, 10).trim();
    }
  }

  return result;
}

async function generateActions(
  payload: {
    subGoals: string[]
    persona: string
    detailedContext?: string
    language?: string
  },
  sessionId?: string,
  userId?: string,
  supabase?: any
) {
  const isEn = payload.language && payload.language.startsWith('en');
  const corePrompt = GET_CORE_PROMPT(isEn);

  const systemPrompt = `${corePrompt}

### Task Specifics:
For each sub-goal, design 1 clear, actionable plan that fits the user's lifestyle context.

### Output Format(JSON):
  {
    "actions": [
      {
        "sub_goal": "Goal Name",
        "content": "Action Content (Verb + Number)"
      },
      ...
  ]
  } `;

  const userPrompt = `Sub-goals: ${payload.subGoals.join(', ')}
  Persona: ${payload.persona}
Detailed Context: ${payload.detailedContext || 'None'} `;

  return await callPerplexity([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], sessionId, userId, supabase)
}

/**
 * v20.4: New suggestion logic for manual input mode.
 * Generates 8 specific actions for a SINGLE sub-goal.
 */
async function suggestActionsV2(
  payload: {
    subGoal: string
    coreGoal?: string
    language?: string
  },
  sessionId?: string,
  userId?: string,
  supabase?: any
) {
  const isEn = payload.language && payload.language.startsWith('en');
  const corePrompt = GET_CORE_PROMPT(isEn);

  const systemPrompt = `${corePrompt}

### Task Specifics:
Design exactly 8 specific, actionable items for the given sub-goal. 
Each item should be concise (max 15 characters) and starting with a verb if possible.
Ensure variety (some routines, some one-time tasks).

### Output Format(JSON):
  {
    "actions": ["Action 1", "Action 2", ..., "Action 8"]
  } `;

  const userPrompt = `Sub-Goal: ${payload.subGoal}
${payload.coreGoal ? `Context (Core Goal): ${payload.coreGoal}` : ''}`;

  return await callPerplexity([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], sessionId, userId, supabase)
}

async function realityCheck(
  payload: {
    coreGoal: string
    subGoals: string[]
    actions: any[]
    detailedContext?: string
    language?: string
  },
  sessionId?: string,
  userId?: string,
  supabase?: any
) {
  const isEn = payload.language && payload.language.startsWith('en');
  const corePrompt = GET_CORE_PROMPT(isEn);

  const systemPrompt = `${corePrompt}

### Task Specifics:
Diagnose the plan based on its feasibility and actionability within the user's context.

### Output Format(JSON):
  {
    "corrections": [
      {
        "original": "Original action",
        "suggested": "Improved action",
        "reason": "Reason for correction (in ${isEn ? 'English' : 'Korean'})"
      }
    ],
      "overall_feedback": "Diagnosis and encouragement (in ${isEn ? 'English' : 'Korean'})"
  } `;

  const userPrompt = `Context: ${payload.detailedContext || 'None'}
Core Goal: ${payload.coreGoal}
Plan Details: ${JSON.stringify(payload.actions)} `;

  return await callPerplexity([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], sessionId, userId, supabase)
}

// --- 7-STEP SILOED ARCHITECTURE (v11.0) ---

// Helper: Get AI Context for specific step based on previous artifacts
const getStepContext = (step: number, metadata: any, currentDraft: any) => {
  const lifestyle = metadata?.lifestyle_summary || {};
  const coreGoal = metadata?.core_goal_summary || {};
  const completedSectors = metadata?.completed_sectors || [];

  switch (step) {
    case 1: // Greeting & Lifestyle
      return `Target: New User.Context: None.Goal: Extract Lifestyle Summary.`;

    case 2: // Core Goal
      return `Target: Core Goal(핵심목표). 
      User Lifestyle: ${JSON.stringify(lifestyle)}. 
      Current Draft Goal: "${currentDraft.center_goal || ''}"`;

    default:
      // Steps 3-10: Sub-goals 1-8
      if (step >= 3 && step <= 10) {
        const subGoalIndex = step - 3; // 0 to 7
        const prevSectors = completedSectors.slice(0, subGoalIndex);
        return `Target: Sub - goal ${subGoalIndex + 1} (세부목표 ${subGoalIndex + 1}) + 8 Action Items(실천항목).
        Core Goal: "${coreGoal.goal}".
    Motivation: "${coreGoal.motivation}".
        Previous Sub - goals: ${JSON.stringify(prevSectors)}.
        User Lifestyle: ${JSON.stringify(lifestyle)}.`;
      }

      // Step 11: Review & Emergency
      if (step === 11) {
        return `Target: Safety Net(비상 모드).
        Full Draft: ${JSON.stringify(currentDraft)}.
        User Lifestyle: ${JSON.stringify(lifestyle)}.
  Goal: Identify 1 - 2 minimum actions for bad days.`;
      }

      // Step 12: Finalize
      if (step === 12) {
        return `Target: Final Confirmation.
        Full Draft: ${JSON.stringify(currentDraft)}.
        Ready to generate ? `;
      }

      return `Context: General Chat.Draft: ${JSON.stringify(currentDraft)} `;
  }
};


async function handleChat(
  payload: any,
  sessionId?: string,
  userId?: string,
  supabase?: any
) {
  const { messages, language, step = 1 } = payload;
  let currentDraft = payload.currentDraft || payload.mandalart_draft || {
    center_goal: '',
    sub_goals: Array(8).fill(''),
    actions: [],
    emergency_action: ''
  };
  // 1. Load Session Metadata & Handle Language Sovereignty (Attempt 13)
  let sessionMetadata: any = {};
  if (sessionId && supabase) {
    const { data } = await supabase.from('coaching_sessions').select('metadata').eq('id', sessionId).single();
    sessionMetadata = data?.metadata || {};
  }

  // High-Governance Language Detection
  const payloadIsEn = !!(language && String(language).toLowerCase().startsWith('en'));
  const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()?.content || '';

  // v18.2.1: Handle automatic step transition (triggered by "다음으로" button)
  const isStepTransition = lastUserMessage === '__STEP_TRANSITION__';

  const inputContainsHangul = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(lastUserMessage);

  let isEn = payloadIsEn;

  // RULE: If we have a lock, only break it if the USER explicitly typed in the other language.
  // This prevents the "Device Locale" from overriding a session that started in English.
  if (sessionMetadata.locked_language !== undefined) {
    const lockedIsEn = !!sessionMetadata.locked_language;
    if (lockedIsEn && inputContainsHangul) {
      console.log(`[Language Sovereignty] BREAKING EN LOCK -> User typed in Korean.`);
      isEn = false;
      sessionMetadata.locked_language = false;
    } else if (!lockedIsEn && !inputContainsHangul && payloadIsEn) {
      console.log(`[Language Sovereignty] BREAKING KO LOCK -> User typed in English / Latin.`);
      isEn = true;
      sessionMetadata.locked_language = true;
    } else {
      isEn = lockedIsEn; // Stay locked
    }
  } else if (sessionId) {
    sessionMetadata.locked_language = isEn;
    console.log(`[Language Sovereignty] INITIAL LOCK: ${isEn ? 'EN' : 'KO'} `);
  }

  if (isEn) {
    // Programmatically translate common keys if needed (Heuristic)
    if (currentDraft.center_goal && /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(currentDraft.center_goal)) {
      currentDraft.center_goal = `[TRANSLATE TO ENGLISH]: ${currentDraft.center_goal} `;
    }
  }

  console.log(`[Attempt 15] Language: ${isEn ? 'EN' : 'KO'} | Session: ${sessionId}`);

  // 2. Prepare Context & Prompt
  const stepContext = getStepContext(step, sessionMetadata, currentDraft);
  let systemPrompt = GET_STEP_PROMPT(step, isEn);

  // v18.2.1: Add hint for step transition (button click)
  if (isStepTransition) {
    const transitionHint = isEn
      ? `\n\n[STEP TRANSITION] User just moved to Step ${step}. 
         CRITICAL RULES:
         - DO NOT repeat, recap, or list any content from the previous step
         - DO NOT show previous action items again
         - START immediately with the NEW step's mission
         - Provide a brief welcome (1 sentence max) then propose NEW content`
      : `\n\n[STEP 전환] 사용자가 Step ${step}로 이동했습니다.
         핵심 규칙:
         - 이전 단계의 내용을 절대 반복, 요약, 나열하지 마세요
         - 이전 실천항목을 다시 보여주지 마세요
         - 즉시 새로운 단계의 미션을 시작하세요
         - 간단한 환영 인사(최대 1문장) 후 바로 새로운 제안을 제시하세요`;
    systemPrompt += transitionHint;
  }

  // ATTEMPT 15: Aggressive History Rewrite + Ensure Alternation
  const rawHistory = messages.slice(-10);
  const sanitizedHistory: { role: string; content: string }[] = [];

  let lastRole = 'assistant'; // Start expecting 'user' after system

  for (const m of rawHistory) {
    let content = m.content;
    const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(content);
    const role = m.role === 'assistant' ? 'assistant' : 'user';

    if (isEn && hasKorean) {
      content = role === 'assistant'
        ? '[Previous response - context preserved]'
        : '[User context]';
    }

    // Ensure alternation: skip if same role as last
    if (role === lastRole) {
      // Merge with previous or skip
      if (sanitizedHistory.length > 0) {
        sanitizedHistory[sanitizedHistory.length - 1].content += ' ' + content;
      }
      continue;
    }

    sanitizedHistory.push({ role, content });
    lastRole = role;
  }

  // Ensure last message before context injection is from user
  // If history ends with assistant, that's fine - we'll add user context next
  // If history ends with user, no problem

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...sanitizedHistory,
    {
      role: 'user', content: `
### CONTEXT:
- LANGUAGE: ${isEn ? 'ENGLISH ONLY' : 'KOREAN ONLY'}
- STEP: ${step}/12
- DRAFT: ${JSON.stringify(currentDraft)}
${isEn ? '### RESPOND IN ENGLISH. NO KOREAN.' : ''}
` }
  ];

  // Fix: If message before context is also 'user', merge them
  if (chatMessages.length >= 3 &&
    chatMessages[chatMessages.length - 2].role === 'user') {
    const prevContent = chatMessages[chatMessages.length - 2].content;
    chatMessages[chatMessages.length - 2].content = prevContent + '\n' + chatMessages[chatMessages.length - 1].content;
    chatMessages.pop();
  }

  console.log(`[Attempt 15] History: ${sanitizedHistory.length} msgs, Total: ${chatMessages.length}`);

  // 3. Request Completion with Retry Loop (EN mode)
  let aiResponse: any = null;
  const maxRetries = isEn ? 2 : 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    aiResponse = await callPerplexity(chatMessages, sessionId, userId, supabase);

    const responseHasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(aiResponse?.message || '');

    if (!isEn || !responseHasKorean) {
      // Success - no Korean or Korean mode
      break;
    }

    console.warn(`[Attempt 15] Retry ${attempt + 1}/${maxRetries}: Korean detected in EN response`);

    if (attempt < maxRetries) {
      // v18.4: Fix message alternation - add assistant response first, then user retry
      chatMessages.push({
        role: 'assistant',
        content: aiResponse?.message || 'Response contained Korean.'
      });
      chatMessages.push({
        role: 'user',
        content: 'ERROR: Your previous response contained Korean. RETRY in ENGLISH ONLY.'
      });
    } else {
      // Final fallback: Translation
      console.warn(`[Attempt 15] All retries failed. Triggering translation...`);
      try {
        const reflectionPrompt = [
          { role: 'system', content: 'Translate the following to professional English. Output JSON: {"message": "..."}' },
          { role: 'user', content: aiResponse.message }
        ];
        const translationResult = await callPerplexity(reflectionPrompt, sessionId, userId, supabase, 0.0);
        if (translationResult?.message) {
          aiResponse.message = translationResult.message;
        }
      } catch (err) {
        console.error(`[Attempt 15] Translation failed:`, err);
        aiResponse.message = `[Translation Required] ${aiResponse.message}`;
      }
    }
  }

  // 3.5. Smart Intent Fallback (v12.0)
  // --- Strict Transition Control (v14.5) ---
  let isReady = aiResponse?.next_step_ready === true || String(aiResponse?.next_step_ready).toLowerCase() === 'true';

  // v20.1: Clean up any JSON field leaks in message
  // v20.2: Also clean up excessive line breaks and formatting issues
  if (aiResponse?.message) {
    aiResponse.message = aiResponse.message
      // Remove JSON field leaks
      .replace(/:\s*true\b/gi, '')
      .replace(/next_step_ready\s*:/gi, '')
      .replace(/가 설정되었어요\.\s*다음 단계를 진행해 주세요!/gi, '')
      // Fix broken formatting: "word\n:" or "word\n는" patterns
      .replace(/(\S)\n+([는을를이가에서로])\s/g, '$1$2 ')
      .replace(/(\S)\n+:\s*/g, '$1: ')
      // Remove standalone dashes on their own line
      .replace(/\n\s*-\s*\n/g, '\n')
      // Reduce 3+ consecutive line breaks to max 2
      .replace(/\n{3,}/g, '\n\n')
      // Remove line break before colon
      .replace(/\n+:/g, ':')
      .trim();
  }

  // v20.0: Step 2 Sub-goal List Detection and Filtering
  // If AI generates sub-goal list OR skips interview in Step 2, replace message with interview question
  if (step === 2 && aiResponse?.message) {
    const msg = aiResponse.message;

    // Expanded detection patterns
    const hasNumberedList = /\d+\.\s*(요약|설명|세부|Sub-goal|Action)/i.test(msg) ||
      /1\.\s*[^.\n]+\n?2\.\s*[^.\n]+\n?3\./i.test(msg);
    const hasSubGoalKeywords = /(세부\s*목표|sub-?goal|8개|8\s*개)/i.test(msg);
    const hasSummaryDetailFormat = /(요약\s*:|설명\s*:|summary\s*:|detail\s*:)/i.test(msg);
    const isSkippingToSubGoals = /(세부\s*목표\s*수립\s*단계|sub-?goal\s*(planning|phase|step))/i.test(msg);
    const hasInterviewQuestion = /(설레|왜.*중요|시도해본|어려웠던|excite|challenge|progress|tried)/i.test(msg);

    // Trigger filter if: (any skip indicator detected) AND (no interview question asked)
    const shouldFilter = !hasInterviewQuestion && (
      (hasNumberedList && hasSubGoalKeywords) ||
      hasSummaryDetailFormat ||
      isSkippingToSubGoals
    );

    if (shouldFilter) {
      console.log(`[GUARD v20.1] Step 2: Detected premature skip/format. Filtering...`);
      console.log(`  - hasNumberedList: ${hasNumberedList}, hasSubGoalKeywords: ${hasSubGoalKeywords}`);
      console.log(`  - hasSummaryDetailFormat: ${hasSummaryDetailFormat}, isSkippingToSubGoals: ${isSkippingToSubGoals}`);

      // Replace with interview question
      const isEn = payload.language?.startsWith('en');
      const goalText = currentDraft.center_goal || (isEn ? 'your goal' : '목표');
      aiResponse.message = isEn
        ? `Great goal! "${goalText}" is exciting!\n\nBefore we plan the details, I'd love to understand your motivation:\n\n**Does this goal truly excite you? Why is it important to you right now?**`
        : `멋진 목표예요! "${goalText}"\n\n세부 계획을 세우기 전에, 몇 가지 여쭤볼게요.\n\n**이 목표가 진심으로 설레나요? 왜 지금 이 목표가 중요한가요?**`;

      // Block next_step_ready since we're forcing interview
      isReady = false;
      aiResponse.next_step_ready = false;

      // Clear any sub_goals/actions that AI might have generated
      if (aiResponse.updated_draft) {
        delete aiResponse.updated_draft.sub_goals;
        delete aiResponse.updated_draft.actions;
      }
    }
  }

  // --- Attempt 14: Manual Code-Level Gatekeeping (v17.5) ---
  if (step === 1 && isReady) {
    const routine = aiResponse?.summary_data?.lifestyle_routine || sessionMetadata.lifestyle_routine;
    const energy = aiResponse?.summary_data?.lifestyle_energy || sessionMetadata.lifestyle_energy;

    console.log(`[Step 1 Gate] Checking transition requirements:`);
    console.log(`  - aiResponse.next_step_ready: ${aiResponse?.next_step_ready}`);
    console.log(`  - aiResponse.summary_data: ${JSON.stringify(aiResponse?.summary_data)}`);
    console.log(`  - sessionMetadata.lifestyle_routine: ${sessionMetadata.lifestyle_routine?.substring(0, 50)}...`);
    console.log(`  - sessionMetadata.lifestyle_energy: ${sessionMetadata.lifestyle_energy?.substring(0, 50)}...`);
    console.log(`  - routine resolved: ${!!routine}`);
    console.log(`  - energy resolved: ${!!energy}`);

    if (!routine || !energy) {
      console.log(`[Manual Gate] BLOCKING Step 1 -> Step 2 transition. Missing data. Routine: ${!!routine}, Energy: ${!!energy}`);
      isReady = false;
    } else {
      console.log(`[Manual Gate] ALLOWING Step 1 -> Step 2 transition. All data present.`);
    }
  }

  // v20.3: REMOVED AUTO-STEP INCREMENT (REVERTED)
  // Step changes ONLY happen through forceNextStep (user clicking "다음으로" button)
  // This prevents the Step 11 skip bug caused by double increment
  // handleChat returns the CURRENT step, not the next step
  const nextStep = step; // Stay on current step

  // 4. Update Metadata and Persist Draft (v13.0)
  if (sessionId && supabase) {
    // Merge draft updates
    if (aiResponse?.updated_draft) {
      // v19.8: Server-side validation to prevent premature sub-goal/action generation
      // AI sometimes ignores prompt instructions and generates everything at once
      // This provides a hard guard to discard sub_goals and actions before Step 3
      if (step < 3) {
        if (aiResponse.updated_draft.sub_goals) {
          console.log(`[GUARD] Step ${step}: Discarding premature sub_goals`);
          delete aiResponse.updated_draft.sub_goals;
        }
        if (aiResponse.updated_draft.actions) {
          console.log(`[GUARD] Step ${step}: Discarding premature actions`);
          delete aiResponse.updated_draft.actions;
        }
      }
      // Step 1 should not set center_goal either - only Step 2+
      if (step < 2 && aiResponse.updated_draft.center_goal) {
        console.log(`[GUARD] Step ${step}: Discarding premature center_goal`);
        delete aiResponse.updated_draft.center_goal;
      }

      // === v18.0: Dual-Text Format Support ===
      // Handle center_goal (can be string or { summary, detail })
      if (aiResponse.updated_draft.center_goal && aiResponse.updated_draft.center_goal !== 'undefined') {
        const cg = aiResponse.updated_draft.center_goal;
        if (typeof cg === 'object' && cg.summary) {
          // New dual-text format
          currentDraft.center_goal = cg.summary;
          currentDraft.center_goal_detail = cg.detail || cg.summary;
        } else if (typeof cg === 'string') {
          // Legacy string format - truncate for summary
          currentDraft.center_goal = cg.length > 15 ? cg.substring(0, 15) : cg;
          currentDraft.center_goal_detail = cg;
        }
      }

      // Handle sub_goals (can be string[] or { summary, detail }[])
      if (aiResponse.updated_draft.sub_goals && Array.isArray(aiResponse.updated_draft.sub_goals)) {
        if (!currentDraft.sub_goals_detail) currentDraft.sub_goals_detail = Array(8).fill('');

        aiResponse.updated_draft.sub_goals.forEach((sg: any, i: number) => {
          if (i >= 8) return;

          if (typeof sg === 'object' && sg.summary) {
            // New dual-text format
            currentDraft.sub_goals[i] = sg.summary;
            currentDraft.sub_goals_detail[i] = sg.detail || sg.summary;
          } else if (typeof sg === 'string' && sg.trim()) {
            // Legacy string format - truncate for summary
            currentDraft.sub_goals[i] = sg.length > 15 ? sg.substring(0, 15) : sg;
            currentDraft.sub_goals_detail[i] = sg;
          }
        });
      }

      // Handle actions (can have content or { summary, detail })
      if (aiResponse.updated_draft.actions && Array.isArray(aiResponse.updated_draft.actions)) {
        const normalizedNewActions = aiResponse.updated_draft.actions.map((a: any) => {
          let sgName = a.sub_goal || '';

          // v18.9.5: High-Precision Position Mapping
          // Find the 1-indexed position by matching against current sub-goals
          let position = 0;
          if (sgName) {
            const cleanSgName = sgName.toLowerCase().replace(/세부목표\s*\d+\s*[-:]*/, '').trim();
            const foundIdx = currentDraft.sub_goals.findIndex((g: string) => {
              if (!g) return false;
              const cleanG = g.toLowerCase().trim();
              return cleanSgName.includes(cleanG) || cleanG.includes(cleanSgName);
            });
            if (foundIdx !== -1) {
              position = foundIdx + 1;
              sgName = currentDraft.sub_goals[foundIdx]; // Use the exact draft name
            }
          }

          // Fallback: If we are in a sub-goal specific step (3-10), assume current sub-goal if no match
          if (position === 0 && step >= 3 && step <= 10) {
            position = step - 2;
            sgName = currentDraft.sub_goals[position - 1] || sgName;
          }

          // Force to valid range
          if (position > 8) position = 0;

          // Extract summary and detail
          let summary = '';
          let detail = '';

          if (a.summary && a.detail) {
            summary = a.summary;
            detail = a.detail;
          } else {
            const content = a.content || a.title || '';
            summary = content.length > 20 ? content.substring(0, 20) : content;
            detail = content;
          }

          return {
            sub_goal: sgName,
            content: summary,
            summary,
            detail,
            type: (a.type === 'habit' || a.type === 'routine' || a.type === 'daily') ? 'routine' : 'mission',
            sub_goal_position: position
          };
        });

        // v18.9.5: Robust Position-based Filtering
        const updatedPositions = new Set(normalizedNewActions.map((a: any) => a.sub_goal_position).filter(p => p > 0));
        const filteredActions = (currentDraft.actions || []).filter((a: any) => !updatedPositions.has(a.sub_goal_position));

        currentDraft.actions = [...filteredActions, ...normalizedNewActions];
      }
      if (aiResponse.updated_draft.emergency_action) {
        currentDraft.emergency_action = aiResponse.updated_draft.emergency_action;
      }
    }

    // --- Step 18.9: Forced Presence Strategy (v3.0) ---
    // User wants 'Always On' readiness for goals/sub-goals, but 'Conservative' if they chose to continue.
    if (!isReady && step >= 2 && step <= 12) {
      const msg = (aiResponse?.message || '').toLowerCase();
      const soundsReady = msg.includes('다음 단계') || msg.includes('넘어가') || msg.includes('준비') ||
        msg.includes('준비완료') || msg.includes('완료되었습니다') || msg.includes('완성되었습니다') ||
        msg.includes('정해봤습니다') || msg.includes('제안해 드립니다') || msg.includes('세워봤습니다') ||
        msg.includes('로드맵') || msg.includes('만다라트') || msg.includes('확정') || msg.includes('마무리') || msg.includes('고생') ||
        msg.includes('완성') || msg.includes('축하') || msg.includes('화이팅') || msg.includes('홧팅') ||
        msg.includes('응원') || msg.includes('항목') ||
        msg.includes('🎉') || msg.includes('🎊') || msg.includes('🥳') ||
        (msg.includes('완성') && msg.includes('단계')) ||
        msg.includes('next step') || msg.includes('ready') || msg.includes('satisfied');

      const previouslyReady = sessionMetadata.transition_ready === true;

      // 1. Keyword failsafe ALWAYS works (highest priority)
      if (soundsReady) {
        console.log(`[Aggressive Failsafe] v3.0: Keyword hit for Step ${step}.`);
        isReady = true;
      }
      // 2. Forced readiness for the FIRST response of a step
      else if (!previouslyReady) {
        const subGoalIdx = step >= 3 ? step - 2 : 0;
        const currentTitle = step >= 3 ? currentDraft.sub_goals[subGoalIdx - 1] : currentDraft.center_goal;
        const hasContent = (currentTitle && currentTitle.trim().length > 0) || (aiResponse.updated_draft?.actions?.length > 0);

        if (hasContent || isStepTransition) {
          console.log(`[Aggressive Failsafe] v3.0: Step ${step} first proposal turn (Ready=true).`);
          isReady = true;
        }
      } else {
        console.log(`[Aggressive Failsafe] v3.0: User is continuing discussion for Step ${step}.`);
      }
      // 4. STEP 12 SPECIAL: If we are at the final step and have a substantial message, just be ready.
      if (!isReady && step === 12 && msg.length > 50 && !msg.trim().endsWith('?')) {
        console.log(`[Aggressive Failsafe] v3.0: Step 12 default readiness (Summary detected).`);
        isReady = true;
      }
    }

    // v18.4: Calculate transition_ready before saving to metadata
    const transitionReadyToSave = isReady; // Allow Step 12 to be ready

    const newMetadata = {
      ...sessionMetadata,
      ...(aiResponse.summary_data || {}),
      draft: currentDraft, // Persist the cumulative draft
      transition_ready: transitionReadyToSave // v18.4: Persist for screen re-entry
    };

    // Special handling for completed core goal in summary
    if (newMetadata.core_goal_summary?.goal && !currentDraft.center_goal) {
      currentDraft.center_goal = newMetadata.core_goal_summary.goal;
    }

    await supabase.from('coaching_sessions').update({
      metadata: newMetadata,
      current_step: nextStep
    }).eq('id', sessionId);

    // v18.9: PROACTIVE AUTO-SAVE
    // Save draft whenever it's updated, not just when 'isReady' (Ready button shown).
    // This ensures Premuim Preview/Grid remains synced during the conversation.
    const hasDraftUpdate = !!aiResponse?.updated_draft;
    const isGoalSettingStep = step >= 2;
    const hasCenterGoal = currentDraft.center_goal && currentDraft.center_goal.trim() !== '';

    if (hasDraftUpdate && isGoalSettingStep && hasCenterGoal) {
      try {
        console.log(`[AUTO-SAVE] Proactive save for session ${sessionId}, step ${step}`);
        await autoSaveDraftMandalart(sessionId, userId as string, currentDraft, supabase);
      } catch (err: any) {
        console.error('[AUTO-SAVE] Proactive save failed:', err.message);
      }
    } else {
      console.log(`[AUTO-SAVE] Skip proactive save. hasUpdate: ${hasDraftUpdate}, step: ${step}, hasGoal: ${hasCenterGoal}`);
    }
  }

  // v18.2: Button-based step transition
  // v18.9.6: If we are entering or already in Step 12, ALWAYS be ready.
  const transitionReady = (isReady || nextStep >= 12);

  // Don't auto-advance step - wait for user to click "다음으로" button
  // Only auto-advance on final step (12) to complete
  const shouldAutoAdvance = isReady && step === 12;
  const finalStep = shouldAutoAdvance ? 13 : step; // Step 13 = completion

  // Calculate hasCenterGoal outside the if block for return statement
  const hasCenterGoal = currentDraft.center_goal && currentDraft.center_goal.trim() !== '';
  const isGoalSettingStep = step >= 2;

  console.log(`[handleChat] Returning: current_step=${nextStep}, transition_ready=${transitionReady}, move_to_next=${shouldAutoAdvance}`);
  return {
    ...aiResponse,
    updated_draft: currentDraft,
    current_step: nextStep, // v18.9: Return new step (can be 12)
    next_step_ready: transitionReady,
    transition_ready: transitionReady, // v18.2: Show transition buttons
    move_to_next: shouldAutoAdvance,   // Only auto-advance on final step
    draft_saved: isReady && hasCenterGoal && isGoalSettingStep
  };

}

// v18.2: User explicitly clicked "다음으로" button to advance step
async function forceNextStep(
  payload: any,
  sessionId?: string,
  userId?: string,
  supabase?: any
) {
  if (!sessionId || !supabase) {
    throw new Error('Session ID required for step transition');
  }

  const { currentStep: clientStep } = payload;

  // v20.1: Read current step from DB (authoritative) instead of client
  // This prevents double-increment when handleChat already incremented
  const { data: sessionData } = await supabase
    .from('coaching_sessions')
    .select('current_step, metadata')
    .eq('id', sessionId)
    .single();

  const dbStep = sessionData?.current_step || clientStep || 1;
  const nextStep = Math.min(dbStep + 1, 12);

  console.log(`[FORCE_NEXT_STEP] User clicked "다음으로" - DB Step ${dbStep} → ${nextStep} (client sent: ${clientStep})`);

  const currentDraft = sessionData?.metadata?.draft;

  // v18.5: Auto-save draft before step transition
  if (userId && dbStep >= 2 && currentDraft?.center_goal) {
    try {
      console.log(`[FORCE_NEXT_STEP] Auto-saving...`);
      await autoSaveDraftMandalart(sessionId, userId, currentDraft, supabase);
    } catch (err: any) {
      console.error('[FORCE_NEXT_STEP] Save failed:', err.message);
    }
  }

  // Update session with new step and reset transition_ready (unless entering Step 12)
  const updatedMetadata = {
    ...(sessionData?.metadata || {}),
    transition_ready: nextStep === 12 // v18.9.6: Auto-activate finalize button on Step 12 entry
  };

  const { error } = await supabase
    .from('coaching_sessions')
    .update({
      current_step: nextStep,
      metadata: updatedMetadata
    })
    .eq('id', sessionId);

  if (error) {
    console.error('[FORCE_NEXT_STEP] Failed to update step:', error);
    throw error;
  }

  return {
    success: true,
    previous_step: dbStep,
    current_step: nextStep,
    message: `Step ${dbStep} → Step ${nextStep} 전환 완료`
  };
}


async function commitMandalart(
  payload: any,
  sessionId?: string,
  userId?: string,
  supabase?: any
) {
  if (!userId || !supabase) throw new Error('Auth context required');

  // === v17.0 SSoT: Fetch draft from server DB first ===
  let mandalart_draft = null;
  let draftSource = 'none';

  // Priority 1: Fetch from coaching_sessions.metadata.draft (Single Source of Truth)
  if (sessionId) {
    try {
      const { data: session, error: fetchError } = await supabase
        .from('coaching_sessions')
        .select('metadata')
        .eq('id', sessionId)
        .single();

      if (!fetchError && session?.metadata?.draft) {
        mandalart_draft = session.metadata.draft;
        draftSource = 'server_metadata';
        console.log(`[COMMIT SSoT] Draft loaded from server metadata`);
      }
    } catch (e) {
      console.warn('[COMMIT SSoT] Failed to fetch server draft:', e);
    }
  }

  // Priority 2: Fallback to client payload (backwards compatibility)
  if (!mandalart_draft && payload?.mandalart_draft) {
    mandalart_draft = payload.mandalart_draft;
    draftSource = 'client_payload';
    console.log(`[COMMIT SSoT] Using client payload as fallback`);
  }

  // Validate draft
  if (!mandalart_draft?.center_goal) {
    throw new Error(`Invalid mandalart draft (source: ${draftSource}) - center_goal missing`);
  }

  console.log(`[COMMIT] Source: ${draftSource} | User: ${userId}`);
  console.log(`[COMMIT] Center Goal: ${mandalart_draft.center_goal?.substring(0, 50)}...`);
  console.log(`[COMMIT] Sub-goals: ${mandalart_draft.sub_goals?.filter((s: string) => s).length}/8`);
  console.log(`[COMMIT] Actions: ${mandalart_draft.actions?.length || 0}`);

  // v18.0: Extract summary and detail for center_goal
  const centerGoalSummary = mandalart_draft.center_goal;
  const centerGoalDetail = mandalart_draft.center_goal_detail || mandalart_draft.center_goal;

  const mandalartPayload: any = {
    user_id: userId,
    center_goal: centerGoalSummary,
    description: centerGoalDetail,  // v18.0: Store detailed version
    title: centerGoalSummary,
    input_method: 'coaching',
    status: 'completed',  // v18.1: Final commit = completed
    raw_ocr_data: mandalart_draft,
    coaching_session_id: sessionId,
  };

  if (mandalart_draft.emergency_action) {
    mandalartPayload.emergency_action = mandalart_draft.emergency_action;
  }

  try {
    // v18.1: Check if a draft mandalart already exists for this session
    let mandalartId: string;

    const { data: existingDraft } = await supabase
      .from('mandalarts')
      .select('id')
      .eq('coaching_session_id', sessionId)
      .single();

    if (existingDraft) {
      // Update existing draft to completed
      console.log(`[COMMIT] Updating existing draft ${existingDraft.id} to completed`);

      await supabase
        .from('mandalarts')
        .update({
          ...mandalartPayload,
          status: 'completed'
        })
        .eq('id', existingDraft.id);

      mandalartId = existingDraft.id;

      // Delete existing sub_goals and actions to replace with final version
      await supabase.from('sub_goals').delete().eq('mandalart_id', mandalartId);

    } else {
      // Create new mandalart
      let { data: mandalart, error: mError } = await supabase
        .from('mandalarts')
        .insert(mandalartPayload)
        .select('id')
        .single();

      if (mError && mError.code === 'PGRST204') {
        console.log('[COMMIT] emergency_action column missing, retrying minimal...');
        delete mandalartPayload.emergency_action;
        const { data: retryData, error: retryError } = await supabase
          .from('mandalarts')
          .insert(mandalartPayload)
          .select('id')
          .single();

        if (retryError) throw retryError;
        mandalart = retryData;
      } else if (mError) {
        throw mError;
      }

      mandalartId = mandalart.id;
      console.log(`[COMMIT] Mandalart created: ${mandalartId}. Status: ${mandalartPayload.status}`);
    }

    // Insert sub-goals and actions
    let totalActionsInserted = 0;
    for (let i = 0; i < mandalart_draft.sub_goals.length; i++) {
      const sgTitle = (mandalart_draft.sub_goals[i] || '').trim();
      if (!sgTitle) continue;

      // v18.0: Get detail from sub_goals_detail array if available
      const sgDetail = mandalart_draft.sub_goals_detail?.[i] || sgTitle;

      const { data: subGoal, error: sgError } = await supabase
        .from('sub_goals')
        .insert({
          mandalart_id: mandalartId,
          position: i + 1,
          title: sgTitle,
          description: sgDetail,  // v18.0: Store detailed version
        })
        .select('id')
        .single();

      if (sgError) {
        console.warn(`[COMMIT] SubGoal ${i + 1} (${sgTitle}) failed:`, sgError);
        continue;
      }

      // v20.3: STRICT POSITION-ONLY MATCHING
      // Name matching causes duplicates (e.g., "사용자 유치" matching "사용자 유지")
      const actionsForThisSubGoal = (mandalart_draft.actions || []).filter((a: any) => {
        return a.sub_goal_position === (i + 1);
      });

      console.log(`[COMMIT] SubGoal ${i + 1} (${sgTitle}): ${actionsForThisSubGoal.length} actions matched`);

      if (actionsForThisSubGoal.length > 0) {
        const actionsToInsert = actionsForThisSubGoal.map((a: any, index: number) => {
          // v18.0: Use summary for title, detail for description
          const actionTitle = sanitize(a.summary || a.content || a.title || '');
          const actionDescription = sanitize(a.detail || a.content || a.title || '');

          return {
            sub_goal_id: subGoal.id,
            position: index + 1,
            title: actionTitle,
            description: actionDescription,  // v18.0: Store detailed version
            type: (a.type === 'habit' || a.type === 'routine') ? 'routine' : 'mission',
            is_completed: false
          };
        });

        const { error: aError } = await supabase
          .from('actions')
          .insert(actionsToInsert);

        if (aError) {
          console.warn(`[COMMIT] Actions for SubGoal ${i + 1} failed:`, aError);
        } else {
          totalActionsInserted += actionsToInsert.length;
          console.log(`[COMMIT] SubGoal ${i + 1}: Inserted ${actionsToInsert.length} actions`);
        }
      }
    }

    // Mark session as completed
    if (sessionId) {
      await supabase
        .from('coaching_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);
    }

    console.log(`[COMMIT] SUCCESS - Total actions inserted: ${totalActionsInserted}`);
    return {
      success: true,
      mandalartId,
      draftSource,
      actionsInserted: totalActionsInserted
    };
  } catch (error) {
    console.error('[COMMIT] Critical Failure:', error);
    return { success: false, error: error.message, canRetry: true };
  }
}

// v18.1: Auto-save draft mandalart during coaching
async function autoSaveDraftMandalart(
  sessionId: string,
  userId: string,
  draft: any,
  supabase: any
) {
  console.log(`[AUTO-SAVE] Starting - Session: ${sessionId}, User: ${userId}`);
  console.log(`[AUTO-SAVE] Draft center_goal: "${draft?.center_goal?.substring(0, 50)}"`);

  if (!sessionId || !userId) {
    console.error('[AUTO-SAVE] Missing sessionId or userId');
    return { skipped: true, reason: 'Missing sessionId or userId' };
  }

  if (!draft?.center_goal || draft.center_goal.trim() === '') {
    console.log('[AUTO-SAVE] No center_goal yet, skipping');
    return { skipped: true, reason: 'No center_goal yet' };
  }

  // v18.4: Debug log actions
  console.log(`[AUTO-SAVE] Draft has ${draft.actions?.length || 0} actions`);
  if (draft.actions?.length > 0) {
    console.log(`[AUTO-SAVE] Sample action:`, JSON.stringify(draft.actions[0]));
    console.log(`[AUTO-SAVE] Sub-goals:`, JSON.stringify(draft.sub_goals));
  }

  // Check if a mandalart already exists for this coaching session
  const { data: existing } = await supabase
    .from('mandalarts')
    .select('id')
    .eq('coaching_session_id', sessionId)
    .single();

  const centerGoalSummary = draft.center_goal;
  const centerGoalDetail = draft.center_goal_detail || draft.center_goal;

  if (existing) {
    // UPDATE existing draft (with user edit preservation)
    console.log(`[AUTO-SAVE] Updating existing draft: ${existing.id}`);

    // Get user-edited positions to protect
    const { data: userEditedSGs } = await supabase
      .from('sub_goals')
      .select('position')
      .eq('mandalart_id', existing.id)
      .eq('is_user_edited', true);

    const protectedPositions = new Set(userEditedSGs?.map((s: any) => s.position) || []);

    // Update mandalart metadata
    await supabase
      .from('mandalarts')
      .update({
        center_goal: centerGoalSummary,
        description: centerGoalDetail,
        raw_ocr_data: draft,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);

    // Update sub_goals and actions (respecting user edits)
    for (let i = 0; i < draft.sub_goals.length; i++) {
      const position = i + 1;
      const sgTitle = (draft.sub_goals[i] || '').trim();

      if (!sgTitle) continue;
      if (protectedPositions.has(position)) {
        console.log(`[AUTO-SAVE] Position ${position} is user-edited, skipping`);
        continue;
      }

      const sgDetail = draft.sub_goals_detail?.[i] || sgTitle;

      // Upsert sub_goal
      const { data: existingSG } = await supabase
        .from('sub_goals')
        .select('id')
        .eq('mandalart_id', existing.id)
        .eq('position', position)
        .single();

      if (existingSG) {
        await supabase
          .from('sub_goals')
          .update({ title: sgTitle, description: sgDetail })
          .eq('id', existingSG.id);

        // v18.9: Clean-Sync strategy - delete existing non-manual actions and re-insert AI's latest
        if (draft.actions && Array.isArray(draft.actions)) {
          const sgDetailValue = draft.sub_goals_detail?.[i] || sgTitle;
          const subGoalActions = draft.actions.filter((a: any) => {
            // v20.3: STRICT POSITION-ONLY MATCHING
            // Position is the only reliable identifier - name matching causes duplicates
            // (e.g., "사용자 유치" incorrectly matching "사용자 유지")
            return a.sub_goal_position === position;
          });

          console.log(`[AUTO-SAVE] Position ${position}: Found ${subGoalActions.length} actions for "${sgTitle}"`);

          // 1. Delete existing actions for this SG to sync perfectly
          const { error: delError } = await supabase.from('actions').delete().eq('sub_goal_id', existingSG.id);
          if (delError) console.error(`[AUTO-SAVE] Delete failed for SG ${position}:`, delError);

          // 2. Insert new actions with explicit positions (1-8)
          for (let j = 0; j < Math.min(subGoalActions.length, 8); j++) {
            const action = subGoalActions[j];
            const actionTitle = action.summary || action.content || action.title || '';
            const actionDetail = action.detail || actionTitle;
            if (!actionTitle) continue;

            const { error: insError } = await supabase
              .from('actions')
              .insert({
                sub_goal_id: existingSG.id,
                title: actionTitle,
                description: actionDetail,
                type: action.type || 'mission',
                position: j + 1
              });

            if (insError) console.error(`[AUTO-SAVE] Insert failed for SG ${position}, Action ${j + 1}:`, insError);
          }
        }
      } else {
        const { data: newSG } = await supabase
          .from('sub_goals')
          .insert({
            mandalart_id: existing.id,
            position,
            title: sgTitle,
            description: sgDetail
          })
          .select('id')
          .single();

        // v18.9: Save actions for this new sub_goal with positions
        if (newSG && draft.actions && Array.isArray(draft.actions)) {
          // v20.3: STRICT POSITION-ONLY MATCHING
          const subGoalActions = draft.actions.filter((a: any) => {
            return a.sub_goal_position === position;
          });

          console.log(`[AUTO-SAVE] New SG Position ${position}: Found ${subGoalActions.length} actions`);
          for (let j = 0; j < Math.min(subGoalActions.length, 8); j++) {
            const action = subGoalActions[j];
            const actionTitle = action.summary || action.content || action.title || '';
            const actionDetail = action.detail || actionTitle;
            if (!actionTitle) continue;

            await supabase
              .from('actions')
              .insert({
                sub_goal_id: newSG.id,
                title: actionTitle,
                description: actionDetail,
                type: action.type || 'mission',
                position: j + 1
              });
          }
        }
      }
    }

    return { updated: true, mandalartId: existing.id };

  } else {
    // CREATE new draft mandalart
    console.log(`[AUTO-SAVE] Creating new draft mandalart`);

    const { data: newMandalart, error: createError } = await supabase
      .from('mandalarts')
      .insert({
        user_id: userId,
        center_goal: centerGoalSummary,
        description: centerGoalDetail,
        title: centerGoalSummary,
        input_method: 'coaching',
        status: 'draft',  // v18.1: Draft status
        raw_ocr_data: draft,
        coaching_session_id: sessionId
      })
      .select('id')
      .single();

    if (createError) {
      console.error('[AUTO-SAVE] Failed to create draft:', JSON.stringify(createError));
      console.error('[AUTO-SAVE] Error code:', createError.code, 'Message:', createError.message);
      throw createError;
    }

    console.log(`[AUTO-SAVE] Created new mandalart: ${newMandalart?.id}`);

    // Insert sub_goals and their actions
    for (let i = 0; i < draft.sub_goals.length; i++) {
      const sgTitle = (draft.sub_goals[i] || '').trim();
      if (!sgTitle) continue;

      const sgDetail = draft.sub_goals_detail?.[i] || sgTitle;

      const { data: newSG } = await supabase
        .from('sub_goals')
        .insert({
          mandalart_id: newMandalart.id,
          position: i + 1,
          title: sgTitle,
          description: sgDetail
        })
        .select('id')
        .single();

      // v18.9: Save actions for this sub_goal with grid positions
      if (newSG && draft.actions && Array.isArray(draft.actions)) {
        // v20.3: STRICT POSITION-ONLY MATCHING
        const subGoalActions = draft.actions.filter((a: any) => {
          return a.sub_goal_position === (i + 1);
        });

        console.log(`[AUTO-SAVE-CREATE] Position ${i + 1}: Found ${subGoalActions.length} actions`);

        for (let j = 0; j < Math.min(subGoalActions.length, 8); j++) {
          const action = subGoalActions[j];
          const actionTitle = action.summary || action.content || action.title || '';
          const actionDetail = action.detail || actionTitle;
          if (!actionTitle) continue;

          await supabase
            .from('actions')
            .insert({
              sub_goal_id: newSG.id,
              title: actionTitle,
              description: actionDetail,
              type: action.type || 'mission',
              position: j + 1
            });
        }
      }
    }

    return { created: true, mandalartId: newMandalart.id };
  }
}

