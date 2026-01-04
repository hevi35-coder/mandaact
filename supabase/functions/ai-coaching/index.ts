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
  // ATTEMPT 15: Nuclear Language Fix - Complete Korean removal in EN mode
  const personaName = isEn ? 'Life Architect AI' : '만다 코치';

  const commonRules = isEn ? `
  ### IDENTITY: You are the ${personaName}, a strategic life planning assistant.
  ### LANGUAGE: ENGLISH ONLY. ABSOLUTELY NO KOREAN CHARACTERS.
  
  1. **Format**: RAW JSON ONLY.
  2. **Tone**: Professional, Logical, and Strategic.
  3. **Rules**: 
     - RESPOND IN ENGLISH ONLY.
     - Use terms: "Core Goal", "Sub-goal", "Action Items".
     - Use **DOUBLE NEWLINES** for readability.
     - NO preambles, NO technical jargon.
  4. **Output Schema**:
     {
       "message": "User-facing response",
       "updated_draft": { "center_goal": "...", "sub_goals": [...], "actions": [...] },
       "next_step_ready": boolean,
       "summary_data": { ... }
     }
  ` : `
  ### IDENTITY: 당신은 ${personaName}입니다.
  ### LANGUAGE: 한국어로만 응답하세요.
  
  1. **Format**: RAW JSON ONLY.
  2. **Tone**: 따뜻하고 도전적인 코치.
  3. **Rules**: 
     - 반드시 한국어(존댓말)로 응답.
     - "핵심 목표", "세부 목표", "실천 항목" 등 자연스러운 표현 사용.
     - 줄바꿈으로 가독성 확보.
  4. **Output Schema**:
     {
       "message": "사용자 응답",
       "updated_draft": { "center_goal": "...", "sub_goals": [...], "actions": [...] },
       "next_step_ready": boolean,
       "summary_data": { ... }
     }
  `;

  const prompts: Record<number, string> = {
    1: isEn ?
      `### Step 1: Lifestyle Discovery
       MISSION: Capture daily ROUTINE and ENERGY patterns.
       
       CHECKLIST:
       1. [ ] DAILY ROUTINE: Morning to night schedule.
       2. [ ] ENERGY: Peak performance time.

       RULE: Do NOT set "next_step_ready": true until BOTH are captured.
       OUTPUT: "summary_data": { "lifestyle_routine": "...", "lifestyle_energy": "..." }`
      :
      `### Step 1: 라이프스타일 발견
       미션: 일과 및 에너지 패턴 파악.
       
       체크리스트:
       1. [ ] 하루 일과
       2. [ ] 컨디션/에너지

       규칙: 둘 다 파악될 때까지 "next_step_ready": true 금지.
       출력: "summary_data": { "lifestyle_routine": "...", "lifestyle_energy": "..." }`,

    2: isEn ?
      `### Step 2: Core Goal Discovery
       MISSION: Define ONE meaningful Core Goal achievable in 1-3 YEARS.
       
       GUIDELINES:
       - Timeframe: 1-3 years (NOT 5-10 years - too distant)
       - Be specific: "Launch my online business" not "Be successful"
       - Challenge: "Is this truly YOUR goal, or someone else's expectation?"
       
       Exit: Goal confirmed -> set "next_step_ready": true.`
      :
      `### Step 2: 핵심 목표 발견
       미션: 1-3년 내 달성 가능한 핵심 목표 하나 정의.
       
       가이드라인:
       - 기간: 1-3년 (5-10년은 너무 장기적)
       - 구체적으로: "온라인 비즈니스 런칭" (X: "성공하기")
       - 질문: "진짜 본인을 위한 목표인가요, 남의 기대인가요?"
       
       종료: 동의하면 "next_step_ready": true.`,

    11: isEn ?
      `### Step 11: Review & Emergency
       Summarize FULL plan. Ask for Emergency Actions (minimum for bad days).
       Exit: Actions selected.`
      :
      `### Step 11: 점검 및 비상 모드
       전체 계획 요약. 비상 행동 선택 요청.
       종료: 비상 행동 선택 완료.`,

    12: isEn ?
      `### Step 12: Final Confirmation
       Present complete plan. Ask for final confirmation.
       Exit: User confirms.`
      :
      `### Step 12: 최종 확정
       완성된 계획 제시. 최종 확정 요청.
       종료: 확정 시 "next_step_ready": true.`,
  };

  // Add Steps 3-10 dynamically
  for (let i = 0; i < 8; i++) {
    const stepNum = i + 3;
    const subGoalNum = i + 1;
    prompts[stepNum] = isEn ?
      `### Step ${stepNum}: Sub-goal ${subGoalNum}
       Define Sub-goal ${subGoalNum} and propose 3-4 Action Items.
       Ask if user wants to add more or move on.
       
       IMPORTANT: When asking to proceed, say "Move to Step ${stepNum + 1} (Sub-goal ${subGoalNum + 1})?" 
       Do NOT invent step names like "Execution Tracking" or "Implementation Phase".
       
       Exit: User satisfied -> set "next_step_ready": true.`
      :
      `### Step ${stepNum}: 세부목표 ${subGoalNum}
       세부목표 ${subGoalNum} 정의 및 3-4개 실천항목 제안.
       추가 또는 다음으로 이동 여부 질문.
       
       중요: 다음 단계로 이동 시 "Step ${stepNum + 1} (세부목표 ${subGoalNum + 1})로 이동할까요?" 라고 말하세요.
       "실행 트래킹" 같은 임의의 이름을 사용하지 마세요.
       
       종료: 만족하면 "next_step_ready": true.`;
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
Suggest 8 sub - goals based on the user's core goal and context. Ensure a balance between growth and sustainability.

### Output Format(JSON):
  {
    "sub_goals": ["Goal 1", "Goal 2", ..., "Goal 8"]
  } `;

  const userPrompt = `Core Goal: ${payload.coreGoal}
  Persona: ${payload.persona}
Detailed Context: ${payload.detailedContext || 'None'}
Priority Area: ${payload.priorityArea} `;

  return await callPerplexity([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], sessionId, userId, supabase)
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
For each sub - goal, design 1 clear, actionable plan that fits the user's lifestyle context.

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

  const userPrompt = `Sub - goals: ${payload.subGoals.join(', ')}
  Persona: ${payload.persona}
Detailed Context: ${payload.detailedContext || 'None'} `;

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
  const systemPrompt = GET_STEP_PROMPT(step, isEn);

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
      // Add stronger reinforcement for retry
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

  // --- Attempt 14: Manual Code-Level Gatekeeping (v17.5) ---
  if (step === 1 && isReady) {
    const routine = aiResponse?.summary_data?.lifestyle_routine || sessionMetadata.lifestyle_routine;
    const energy = aiResponse?.summary_data?.lifestyle_energy || sessionMetadata.lifestyle_energy;

    if (!routine || !energy) {
      console.log(`[Manual Gate] BLOCKING Step 1 -> Step 2 transition.Missing data.Routine: ${!!routine}, Energy: ${!!energy} `);
      isReady = false;
      // We can also append a invisible instruction to the next prompt if we wanted to, 
      // but for now, just forcing the state is safer.
    }
  }

  // [REMOVED AGGRESSIVE FAILSAFE] - Only transition if AI explicitly sets next_step_ready

  const nextStepRaw = (isReady) ? step + 1 : step;
  const nextStep = Math.min(nextStepRaw, 12);

  // 4. Update Metadata and Persist Draft (v13.0)
  if (sessionId && supabase) {
    // Merge draft updates
    if (aiResponse?.updated_draft) {
      if (aiResponse.updated_draft.center_goal && aiResponse.updated_draft.center_goal !== 'undefined') {
        currentDraft.center_goal = aiResponse.updated_draft.center_goal;
      }
      if (aiResponse.updated_draft.sub_goals && Array.isArray(aiResponse.updated_draft.sub_goals)) {
        // v14.6: Always merge ALL non-empty sub-goals from AI response
        // This fixes the issue where adding multiple sub-goals at once wasn't reflected
        aiResponse.updated_draft.sub_goals.forEach((sg: string, i: number) => {
          if (sg && sg.trim() && i < 8) {
            currentDraft.sub_goals[i] = sg.trim();
          }
        });
      }
      if (aiResponse.updated_draft.actions && Array.isArray(aiResponse.updated_draft.actions)) {
        const normalizedNewActions = aiResponse.updated_draft.actions.map((a: any) => {
          let sgName = a.sub_goal || '';

          // Force to current step's goal if generic or missing (v15.0: Extended to all steps)
          const inferredIdx = step >= 3 ? step - 3 : 0;
          const currentSgTitle = currentDraft.sub_goals[inferredIdx];
          const isGeneric = !sgName || sgName.toLowerCase().match(/^(?:sub-?goal|goal|세부목표|목표|sg)[-:\s]*(\d+)?$/i);
          if ((isGeneric || !sgName) && currentSgTitle) {
            sgName = currentSgTitle;
          }

          return {
            sub_goal: sgName,
            content: a.content || a.title || '',
            type: (a.type === 'habit' || a.type === 'routine') ? 'habit' : 'task'
          };
        });

        // Remove existing actions for the affected sub-goals to avoid duplicates
        const updatedSgNames = new Set(normalizedNewActions.map((a: any) => a.sub_goal).filter(Boolean));
        const filteredActions = (currentDraft.actions || []).filter((a: any) => !updatedSgNames.has(a.sub_goal));

        currentDraft.actions = [...filteredActions, ...normalizedNewActions];
      }
      if (aiResponse.updated_draft.emergency_action) {
        currentDraft.emergency_action = aiResponse.updated_draft.emergency_action;
      }
    }

    const newMetadata = {
      ...sessionMetadata,
      ...(aiResponse.summary_data || {}),
      draft: currentDraft // Persist the cumulative draft
    };

    // Special handling for completed core goal in summary
    if (newMetadata.core_goal_summary?.goal && !currentDraft.center_goal) {
      currentDraft.center_goal = newMetadata.core_goal_summary.goal;
    }

    await supabase.from('coaching_sessions').update({
      metadata: newMetadata,
      current_step: nextStep
    }).eq('id', sessionId);
  }

  return {
    ...aiResponse,
    updated_draft: currentDraft, // Return the FULL merged draft
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

  console.log(`[COMMIT] Starting for User: ${userId} `);
  console.log(`[COMMIT] Sub - goals count: ${mandalart_draft.sub_goals?.length} `);
  console.log(`[COMMIT] Total Actions in Draft: ${mandalart_draft.actions?.length} `);

  const mandalartPayload: any = {
    user_id: userId,
    center_goal: mandalart_draft.center_goal,
    title: mandalart_draft.center_goal,
    input_method: 'coaching', // Changed to 'coaching' for better tracking
    raw_ocr_data: mandalart_draft,
    coaching_session_id: sessionId,
  };

  if (mandalart_draft.emergency_action) {
    mandalartPayload.emergency_action = mandalart_draft.emergency_action;
  }

  try {
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

    const mandalartId = mandalart.id;
    console.log(`[COMMIT] Mandalart created: ${mandalartId} `);

    for (let i = 0; i < mandalart_draft.sub_goals.length; i++) {
      const sgTitle = (mandalart_draft.sub_goals[i] || '').trim();
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
        console.warn(`[COMMIT] SubGoal ${i + 1} (${sgTitle}) failed: `, sgError);
        continue;
      }

      // --- v16.0: Simplified Action Matching (same as preview logic) ---
      // The draft.actions already have sub_goal field set correctly by the AI.
      // Just match by exact sub_goal name, same as CoachingHistoryScreen preview.
      const sanitize = (s: string) => (s || '').replace(/\[TRANSLATE\s+TO\s+\w+\]:\s*/gi, '').trim();

      const actionsForThisSubGoal = (mandalart_draft.actions || []).filter((a: any) => {
        if (!a || !a.sub_goal) return false;
        const actionSgName = sanitize(a.sub_goal);
        const targetSgName = sanitize(sgTitle);
        return actionSgName === targetSgName;
      });

      console.log(`[COMMIT] SubGoal ${i + 1} (${sgTitle}): ${actionsForThisSubGoal.length} actions matched`);

      if (actionsForThisSubGoal.length > 0) {
        const actionsToInsert = actionsForThisSubGoal.map((a: any, index: number) => ({
          sub_goal_id: subGoal.id,
          position: index + 1,
          title: sanitize(a.content || a.title || ''),
          type: (a.type === 'habit' || a.type === 'routine') ? 'routine' : 'mission',
          is_completed: false
        }));

        const { error: aError } = await supabase
          .from('actions')
          .insert(actionsToInsert);

        if (aError) {
          console.warn(`[COMMIT] Actions for SubGoal ${i + 1} failed: `, aError);
        } else {
          console.log(`[COMMIT] SubGoal ${i + 1}: Inserted ${actionsToInsert.length} actions`);
        }
      }
    }

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
