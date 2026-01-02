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
  action: 'suggest_sub_goals' | 'generate_actions' | 'reality_check' | 'chat' | 'ping' | 'commit_mandalart' | 'COMMIT_MANDALART' | 'final_commit'
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
        case 'commit_mandalart':
        case 'COMMIT_MANDALART':
        case 'final_commit':
          result = await commitMandalart(payload, sessionId, user.id, supabase)
          break
        default:
          throw new Error(`Unsupported action: ${action} (Length: ${action?.length})`)
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
      temperature: 0.5,
      max_tokens: 4000,
      top_p: 0.9
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

// --- 7-STEP PROMPT COLLECTION (v11.0) ---

const GET_STEP_PROMPT = (step: number, isEn: boolean) => {
  const language = isEn ? 'English' : 'Korean';

  const commonRules = `
  1. **Format**: RAW JSON ONLY. NEVER use markdown code blocks (e.g. \` \` \`json).
  2. **Tone**: Warm & Provocateur Coach.
  3. **Rules**: 
     - **POLITE LANGUAGE (CRITICAL)**: Use polite Korean (존댓말, ~해요/~예요 style). NEVER use informal language (반말).
     - NO preambles like "Here is the response" or "Step 11...".
     - NO technical jargon or code field names (e.g., NEVER say "center_goal", "updated_draft", "session", "JSON").
     - Use human terms: "핵심 목표" instead of center_goal, "세부 목표" instead of sub_goal.
     - NO summary labels (Part 1, Step 1).
  4. **Output Schema**:
     {
       "message": "User-facing response (Keep it concise, NO boilerplate)",
       "updated_draft": {
         "center_goal": "string (only if changed)",
         "sub_goals": ["Goal 1", "Goal 2", ...],
         "actions": [
           {"sub_goal": "STRICT_MATCH_TITLE", "content": "Action detail", "type": "task|habit"}
         ],
         "emergency_action": "string (Step 11+)"
       },
       "next_step_ready": boolean,
       "summary_data": { ... }
     }
  `;

  const prompts: Record<number, string> = {
    1: isEn ?
      `### Step 1: Greeting & Lifestyle
       1. Explain Mandalart briefly (Core Goal -> 8 Sub-goals -> Action Items).
       2. **[SPLIT]**
       3. Ask ONE question about their daily energy/schedule/pain points.
       4. **Exit Condition**: If user shared enough context, set "next_step_ready": true AND "summary_data": {"lifestyle_summary": "User summary..."}.`
      :
      `### Step 1: 인사 및 라이프스타일 발견
       1. 만다라트를 짧게 설명(핵심목표 -> 8개 세부목표 -> 실천항목)하고 안심시키세요.
       2. **[SPLIT]**
       3. **질문**: 현재 하루 일과나 에너지가 어떤지 물어보세요.
       4. **종료 조건**: 유저가 충분히 답했다면 "next_step_ready": true 설정하고, "summary_data": {"lifestyle_summary": "요약된 정보..."}를 반환하세요.`,

    2: isEn ?
      `### Step 2: Core Goal Definition
       1. Based on [User Context], help define a "Heart-beating" Core Goal.
       2. **[SPLIT]**
       3. Challenge them: "Is this for YOU or others?"
       4. **Exit Condition**: Goal confirmed. Update "updated_draft" and set "next_step_ready": true.`
      :
      `### Step 2: 핵심 목표 설정
       1. [User Context]를 바탕으로 가슴 뛰는 핵심 목표를 찾도록 도우세요.
       2. **[SPLIT]**
       3. 질문: "진짜 본인을 위한 목표인가요?"
       4. **종료 조건**: 유저가 **동의(예: "그래", "맞아", "준비됐어", "진심이야", "응", "고정해줘" 등)**하거나 목표가 확정되면, **반드시 "next_step_ready": true**를 설정하고, "updated_draft"에 center_goal을 넣으며, "summary_data": {"core_goal_summary": {"goal": "핵심 목표명", "motivation": "핵심 동기/이유"}}를 반환하여 다음 단계로 넘어가세요.
       5. **주의**: 유저가 긍정적인 답변을 했다면 절대로 질문을 반복하지 마세요. 즉시 다음 단계(세부목표 설정)로 넘어가야 합니다.
          (참고: 유저에게 요약해줄 땐 '동력' 대신 '핵심 동기' 또는 '이유'라는 표현을 쓰세요.)`,

    // Steps 3-10: Sub-goals 1-8 (Dynamic)
    ...Array.from({ length: 8 }, (_, i) => {
      const stepNum = i + 3; // 3 to 10
      const subGoalNum = i + 1; // 1 to 8
      const isLast = subGoalNum === 8;

      return {
        [stepNum]: isEn ?
          `### Step ${stepNum}: Sub-goal ${subGoalNum} (Deep Dive)
           1. Propose direction for Sub-goal ${subGoalNum} based on Core Goal.
           2. Define 8 Concrete Action Items immediately.
           3. ${isLast ? "This is the LAST sub-goal. Mention moving to 'Emergency/Review' next." : `Mention moving to Sub-goal ${subGoalNum + 1} next.`}
           4. **Exit Condition**: Sub-goal ${subGoalNum} + 8 Action Items saved in "updated_draft". Set "summary_data": {"new_sector": "Sub-goal Name"}.`
          :
          `### Step ${stepNum}: 세부목표 ${subGoalNum} (딥다이브)
            1. 핵심 목표에 맞는 ${subGoalNum}번째 세부목표(Sub-goal)를 제안하세요.
            2. **가독성 & 말풍선 분리 (필수)**:
               - 답변은 반드시 **[SPLIT]** 태그로 구분하여 3개로 나누세요.
               - (1) 세부목표 제안 및 이유설명 **[SPLIT]**
               - (2) 8개의 실천항목 (형식: '- 제목 : 상세내용 (목표 : 시간)', 각 항목 뒤 줄바꿈 필수) **[SPLIT]**
               - **주의**: '실천항목 1:' 처럼 번호를 붙이지 말고 바로 제목부터 쓰세요. **반드시 콜론(:)을 사용하세요.**
               - (3) ${isLast ? "마지막 세부목표임을 알리고, '현실성 점검(비상 모드)'으로 넘어갈지 묻는 질문" : "다음 세부목표로 넘어갈지 묻는 질문"}
            3. **주의**: 세부목표는 8개가 끝입니다. ${isLast ? "**절대 '세부목표 9'를 언급하지 마세요.** 다음은 '비상 모드'입니다." : ""}
            4. **종료 조건**: 유저가 **동의(예: "좋아", "진행해")**하거나 내용을 확정하면, **즉시** "updated_draft"에 해당 세부목표와 실천항목을 포함시키고, "next_step_ready": true와 "summary_data"를 반환하세요.`
      };
    }).reduce((acc, curr) => ({ ...acc, ...curr }), {}),

    11: isEn ?
      `### Step 11: Review & Emergency Mode
       1. Provide a clear summary of the FULL draft.
          - Formatting:
            - **Core Goal: [Goal]**
            - **Sub-goal [N]: [Title]**
            - List action items as ' - Action Item' under each sub-goal.
            - Use single line breaks between sub-goal sections.
       2. **[SPLIT]**
       3. Ask to pick "Emergency Actions" for bad days (Safety Net).
       4. **Exit Condition**: Emergency actions selected.`
      :
      `### Step 11: 현실성 점검 및 비상 모드
       1. 지금까지 완성된 전체 계획(세부목표 1~8)을 요약합니다.
          - **포맷팅**:
            - **핵심목표: [목표명]**
            - **세부목표 [번호]: [제목]**
            - 실천항목: '- 제목 : 상세설명 (목표 : 시간)'
          - **준수사항**: 모든 실천항목(64개)을 빠짐없이 나열하고, 세부목표 섹션 사이는 한 줄만 띕니다. '실천항목 1' 등의 번호는 절대 생략하세요.
       2. **[SPLIT]**
       3. **비상 모드 질문 & 추천**: 
          - 컨디션이 최악일 때도 할 수 있는 '최소 행동(1~2개)'을 골라달라고 하세요.
          - 계획에서 부담 없는 **'루틴'**을 찾아 예시로 추천하세요. (예: "매일 10분 독서" 등)
          - "Step 11", "비상 모드 단계입니다" 같은 말은 절대 하지 마세요.
       4. **종료 및 전환**: 유저가 선택을 마치면, 선택한 항목을 'emergency_action'에 저장하고 차분하게 다음을 안내하세요.
          - **톤앤매너**: 과한 호응(퍼펙트!, 🔥 등)을 피하고, 진중한 코치로서 전체 여정의 마무리를 축하하세요.
          - **안내**: "이제 모든 조각이 맞춰졌습니다. 마지막으로 완성된 전체 만다라트를 한눈에 살펴보고, 최종 확정하는 단계로 넘어갈까요?"와 같이 다음 단계(전체 리뷰)의 목적을 명확히 설명하세요.
          - "Step 12" 같은 시스템 용어는 절대 사용 금지.`,

    12: isEn ?
      `### Step 12: Final Confirmation
       1. Present the FULL Mandalart Plan.
       2. **Formatting Rule**:
          - Use **DOUBLE LINE BREAKS** between Sub-goals.
          - Use **SINGLE LINE BREAKS** between Action Items.
          - Format: **Sub-goal Name** (New Line) - Action...
       3. **[SPLIT]**
       4. Ask for final confirmation.`
      :
      `### Step 12: 최종 확정
       1. 지금까지의 모든 노력이 집약된 **전체 만다라트 계획**을 한눈에 보여주어 성취감을 느끼게 하세요.
       2. **포맷팅 규칙 (가독성 필수)**:
          - **세부목표 [번호]: [제목]** 형식으로 쓰고, 세부목표 사이는 **반드시 두 줄 공백**으로 띄우세요.
          - 세부목표 아래 8개 실천항목은 '- 제목 : 상세설명' 형식으로 한 줄씩 붙여 쓰세요. (콜론 사용 필수)
          - 예시:
            **세부목표 1: 건강**
            - 실천항목 1
            - 실천항목 2

            **세부목표 2: 커리어**
       3. **[SPLIT]**
       4. 이 만다라트가 유저의 삶에 가져올 변화를 언급하며, 마지막으로 수정할 곳은 없는지 혹은 이대로 확정(Launch)할지 물으세요. 
       5. **존댓말 준수**: "쏜다", "준비됐어" 같은 표현 대신 "넘어갈까요?", "준비되셨나요?" 등을 사용하세요.
       6. **종료 조건**: 유저가 **확정(Launch/저장/좋아 등)** 의사를 밝히면 즉시 "next_step_ready": true를 반환하여 자동 저장을 유도하세요. "Step 12" 같은 기술 용어는 절대 사용 금지.`,
  };

  return `${commonRules}\n\n${prompts[step] || prompts[1]}`;

};

// Legacy wrapper for non-chat actions (suggestSubGoals, generateActions, realityCheck)
const GET_CORE_PROMPT = (isEn: boolean) => {
  return isEn
    ? `You are a Strategic Warm Provocateur Coach. Respond in English. Be concise (1-2 sentences). No citations.`
    : `당신은 만다라트 전문 전략 코치입니다. 반드시 정중한 존댓말(~해요 style)로 응답하세요. 반말을 절대 사용하지 마세요. 간결하게 (1-2문장). 인용 금지.`;
};

async function suggestSubGoals(
  payload: {
    persona: string
    coreGoal: string
    priorityArea: string
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
Suggest 8 sub-goals based on the user's core goal and context. Ensure a balance between growth and sustainability.

### Output Format (JSON):
{
  "sub_goals": ["Goal 1", "Goal 2", ..., "Goal 8"]
}`;

  const userPrompt = `Core Goal: ${payload.coreGoal}
Persona: ${payload.persona}
Detailed Context: ${payload.detailedContext || 'None'}
Priority Area: ${payload.priorityArea}`;

  return await callPerplexity(systemPrompt, userPrompt, sessionId, userId, supabase)
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

### Output Format (JSON):
{
  "actions": [
    {
      "sub_goal": "Goal Name",
      "content": "Action Content (Verb + Number)"
    },
    ...
  ]
}`;

  const userPrompt = `Sub-goals: ${payload.subGoals.join(', ')}
Persona: ${payload.persona}
Detailed Context: ${payload.detailedContext || 'None'}`;

  return await callPerplexity(systemPrompt, userPrompt, sessionId, userId, supabase)
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

### Output Format (JSON):
{
  "corrections": [
    {
      "original": "Original action",
      "suggested": "Improved action",
      "reason": "Reason for correction (in ${isEn ? 'English' : 'Korean'})"
    }
  ],
  "overall_feedback": "Diagnosis and encouragement (in ${isEn ? 'English' : 'Korean'})"
}`;

  const userPrompt = `Context: ${payload.detailedContext || 'None'}
Core Goal: ${payload.coreGoal}
Plan Details: ${JSON.stringify(payload.actions)}`;

  return await callPerplexity(systemPrompt, userPrompt, sessionId, userId, supabase)
}

// --- 7-STEP SILOED ARCHITECTURE (v11.0) ---

// Helper: Get AI Context for specific step based on previous artifacts
const getStepContext = (step: number, metadata: any, currentDraft: any) => {
  const lifestyle = metadata?.lifestyle_summary || {};
  const coreGoal = metadata?.core_goal_summary || {};
  const completedSectors = metadata?.completed_sectors || [];

  switch (step) {
    case 1: // Greeting & Lifestyle
      return `Target: New User. Context: None. Goal: Extract Lifestyle Summary.`;

    case 2: // Core Goal
      return `Target: Core Goal (핵심목표). 
      User Lifestyle: ${JSON.stringify(lifestyle)}. 
      Current Draft Goal: "${currentDraft.center_goal || ''}"`;

    default:
      // Steps 3-10: Sub-goals 1-8
      if (step >= 3 && step <= 10) {
        const subGoalIndex = step - 3; // 0 to 7
        const prevSectors = completedSectors.slice(0, subGoalIndex);
        return `Target: Sub-goal ${subGoalIndex + 1} (세부목표 ${subGoalIndex + 1}) + 8 Action Items (실천항목).
        Core Goal: "${coreGoal.goal}".
        Motivation: "${coreGoal.motivation}".
        Previous Sub-goals: ${JSON.stringify(prevSectors)}.
        User Lifestyle: ${JSON.stringify(lifestyle)}.`;
      }

      // Step 11: Review & Emergency
      if (step === 11) {
        return `Target: Safety Net (비상 모드).
        Full Draft: ${JSON.stringify(currentDraft)}.
        User Lifestyle: ${JSON.stringify(lifestyle)}.
        Goal: Identify 1-2 minimum actions for bad days.`;
      }

      // Step 12: Finalize
      if (step === 12) {
        return `Target: Final Confirmation.
        Full Draft: ${JSON.stringify(currentDraft)}.
        Ready to generate?`;
      }

      return `Context: General Chat. Draft: ${JSON.stringify(currentDraft)}`;
  }
};


async function handleChat(
  payload: any,
  sessionId?: string,
  userId?: string,
  supabase?: any
) {
  const { messages, language, step = 1 } = payload;
  const currentDraft = payload.currentDraft || payload.mandalart_draft || {};
  const isEn = language && language.startsWith('en');

  // 1. Load Session Metadata (Artifacts)

  let sessionMetadata = {};
  if (sessionId && supabase) {
    const { data } = await supabase.from('coaching_sessions').select('metadata').eq('id', sessionId).single();
    sessionMetadata = data?.metadata || {};
  }

  // 2. Prepare Context & Prompt
  const stepContext = getStepContext(step, sessionMetadata, currentDraft);
  const systemPrompt = GET_STEP_PROMPT(step, isEn);


  const userPrompt = `
  [STEP: ${step}/12]
  [CONTEXT]: ${stepContext}
  [HISTORY]: ${JSON.stringify(messages.slice(-6))}
  [INSTRUCTION]: If the user is agreeing, confirming, or saying "yes/okay/그래/맞아", you MUST set "next_step_ready": true and move to the next step. Do not keep the user in the same step. Follow the system prompt strictly. Return RAW JSON only.
  `;

  // 3. Call AI
  const aiResponse = await callPerplexity(systemPrompt, userPrompt, sessionId, userId, supabase);

  // 3.5. Smart Intent Fallback (v12.0)
  // Sometimes AI confirms verbally but forgets the technical "next_step_ready": true flag.
  let isReady = aiResponse?.next_step_ready === true || String(aiResponse?.next_step_ready).toLowerCase() === 'true';

  if (!isReady && aiResponse?.message) {
    const msg = aiResponse.message;
    const transitionKeywords = [
      '다음 단계로', '다음으로', '확정되었습니다', '최종 확정', '저장하겠습니다',
      '세부 목표로', '세부 목표를', '직행!', '준비되셨나요?', '넘어갈까요?'
    ];
    // If message contains transition intent AND doesn't end with a question mark (to avoid asking instead of moving)
    // Actually, even if it asks "Shall we move?", if it's the end of Step 2, we should probably allow it
    if (transitionKeywords.some(k => msg.includes(k)) && step < 12) {
      console.log(`[Failsafe] Detected transition intent in message. Forcing next_step_ready: true`);
      isReady = true;
    }
  }

  const nextStepRaw = (isReady) ? step + 1 : step;
  const nextStep = Math.min(nextStepRaw, 12);

  // 4. Update Metadata if summary is provided OR next step is ready
  if ((aiResponse?.summary_data || aiResponse?.next_step_ready) && sessionId && supabase) {
    const newMetadata = { ...sessionMetadata, ...(aiResponse.summary_data || {}) };

    // Special handling for completed sectors array
    if (aiResponse.summary_data?.new_sector) {
      const sectors = newMetadata.completed_sectors || [];
      if (!sectors.includes(aiResponse.summary_data.new_sector)) {
        sectors.push(aiResponse.summary_data.new_sector);
      }
      newMetadata.completed_sectors = sectors;
    }

    await supabase.from('coaching_sessions').update({
      metadata: newMetadata,
      current_step: nextStep
    }).eq('id', sessionId);
  }

  return {
    ...aiResponse,
    current_step: nextStep,
    move_to_next: isReady || false
  };

}



async function commitMandalart(
  payload: any,
  sessionId?: string,
  userId?: string,
  supabase?: any
) {
  if (!userId || !supabase) throw new Error('Auth context required');
  const { mandalart_draft } = payload;
  if (!mandalart_draft?.center_goal) throw new Error('Invalid mandalart draft');

  console.log(`[COMMIT] Starting for User: ${userId}`);

  // 1. Dynamic Column Detection for 'mandalarts' table
  // We probe the schema by doing a dummy query or using a safe insert
  // For resilience, we define the "Minimum Viable" set and then "Bonus" columns

  const mandalartPayload: any = {
    user_id: userId,
    center_goal: mandalart_draft.center_goal,
    title: mandalart_draft.center_goal,
    input_method: 'manual',
    raw_ocr_data: mandalart_draft, // Save the FULL JSON here as backup!
  };

  // Optional: Try adding emergency_action if we think it might exist
  // We'll use a safer approach: Try inserting with it, if fails, retry without it.
  if (mandalart_draft.emergency_action) {
    mandalartPayload.emergency_action = mandalart_draft.emergency_action;
  }

  try {
    // 2. Insert Mandalart
    let { data: mandalart, error: mError } = await supabase
      .from('mandalarts')
      .insert(mandalartPayload)
      .select('id')
      .single();

    if (mError && mError.code === 'PGRST204') {
      console.log('[COMMIT] emergency_action missing, retrying minimal...');
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

    const mandalartId = mandalart.id;

    // 3. Insert Sub-goals and Actions in batches/loops
    // This is safer to do sequentially or in small chunks for RLS and reliability
    for (let i = 0; i < mandalart_draft.sub_goals.length; i++) {
      const sgTitle = mandalart_draft.sub_goals[i];
      if (!sgTitle) continue;

      const { data: subGoal, error: sgError } = await supabase
        .from('sub_goals')
        .insert({
          mandalart_id: mandalartId,
          position: i + 1,
          title: sgTitle,
        })
        .select('id')
        .single();

      if (sgError) {
        console.warn(`[COMMIT] SubGoal ${i + 1} failed:`, sgError);
        continue;
      }

      const actionsToInsert = mandalart_draft.actions
        .filter((a: any) => {
          if (!a || (!a.sub_goal && !a.title)) return false;
          // Robust matching: trim and case-insensitive
          const actionSgName = (a.sub_goal || '').trim().toLowerCase();
          const targetSgName = (sgTitle || '').trim().toLowerCase();
          return actionSgName === targetSgName || targetSgName.includes(actionSgName) || actionSgName.includes(targetSgName);
        })
        .map((a: any, index: number) => ({
          sub_goal_id: subGoal.id,
          position: index + 1,
          title: (a.content || a.title || '').trim(), // Support both content and title fields
          type: (a.type === 'habit' || a.type === 'routine') ? 'routine' : 'mission', // Map to DB types if needed
          is_completed: false
        }));

      if (actionsToInsert.length > 0) {
        const { error: aError } = await supabase
          .from('actions')
          .insert(actionsToInsert);

        if (aError) console.warn(`[COMMIT] Actions for SubGoal ${i + 1} failed:`, aError);
      }
    }

    // 4. Update Session Status
    if (sessionId) {
      await supabase
        .from('coaching_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);
    }

    return { success: true, mandalartId };
  } catch (error) {
    console.error('[COMMIT] Critical Failure:', error);
    return { success: false, error: error.message };
  }
}
