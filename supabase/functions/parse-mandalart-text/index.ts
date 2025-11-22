import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import {
  withErrorHandler,
  createSuccessResponse,
  createErrorResponse,
  ErrorCodes,
  extractJWT,
  parseRequestBody,
  corsHeaders,
} from '../_shared/errorResponse.ts'

interface ParseRequest {
  text: string
}

interface MandalartData {
  center_goal: string
  sub_goals: {
    title: string
    actions: string[]
  }[]
}

serve(withErrorHandler('parse-mandalart-text', async (req) => {
  // Extract JWT
  const jwt = extractJWT(req)

  // Create Supabase client with auth
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: `Bearer ${jwt}` },
      },
      auth: {
        persistSession: false,
      },
    }
  )

  // Verify user authentication
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser(jwt)

  if (authError || !user) {
    return createErrorResponse(
      ErrorCodes.UNAUTHORIZED,
      'Authentication failed',
      { error: authError }
    )
  }

  // Parse and validate request body
  const { text } = await parseRequestBody<ParseRequest>(req)

  if (!text || text.trim().length === 0) {
    return createErrorResponse(
      ErrorCodes.VALIDATION_ERROR,
      'text is required and cannot be empty'
    )
  }

  console.log('Parsing mandalart text, length:', text.length)

  try {
    // Call Perplexity API to parse the text
    const mandalartData = await parseTextWithAI(text)

    // Return success response
    return createSuccessResponse(mandalartData)
  } catch (error) {
    if (error.message?.includes('Perplexity') || error.message?.includes('API')) {
      return createErrorResponse(
        ErrorCodes.EXTERNAL_SERVICE_ERROR,
        'Failed to parse text with AI service',
        { originalError: error.message }
      )
    }
    throw error  // Let withErrorHandler catch other errors
  }
}))

async function parseTextWithAI(text: string): Promise<MandalartData> {
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY')

  if (!perplexityApiKey) {
    throw new Error('Missing Perplexity API key')
  }

  const systemPrompt = `당신은 만다라트(Mandalart) 구조를 분석하는 전문가입니다.

만다라트는 다음과 같은 구조를 가집니다:
- 1개의 핵심 목표 (중심)
- 8개의 세부 목표
- 각 세부 목표당 8개의 실천 항목 (총 64개)

사용자가 제공한 텍스트에서 이 구조를 추출하여 정확한 JSON 형식으로 반환하세요.

출력 형식:
{
  "center_goal": "핵심 목표",
  "sub_goals": [
    {
      "title": "세부 목표 1",
      "actions": ["실천 항목 1", "실천 항목 2", "실천 항목 3", "실천 항목 4", "실천 항목 5", "실천 항목 6", "실천 항목 7", "실천 항목 8"]
    }
  ]
}

중요한 규칙:
1. sub_goals는 정확히 8개여야 합니다
2. 각 sub_goal의 actions는 정확히 8개여야 합니다
3. 텍스트에 항목이 부족하면 빈 문자열("")로 채우세요
4. 텍스트에 항목이 많으면 처음 8개만 선택하세요
5. 반드시 JSON 형식으로만 응답하세요 (설명 없이)`

  const userPrompt = `다음 텍스트를 만다라트 구조로 파싱해주세요:\n\n${text}`

  try {
    console.log('Calling Perplexity API...')

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
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
        temperature: 0.1, // Low temperature for consistent parsing
        max_tokens: 4000,
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

    const parsedData: MandalartData = JSON.parse(jsonMatch[0])

    // Validate and normalize the structure
    return validateAndNormalize(parsedData)
  } catch (error) {
    console.error('AI parsing error:', error)
    throw new Error(`Failed to parse text with AI: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function validateAndNormalize(data: MandalartData): MandalartData {
  // Ensure center_goal exists
  if (!data.center_goal) {
    data.center_goal = ''
  }

  // Ensure sub_goals is an array
  if (!Array.isArray(data.sub_goals)) {
    data.sub_goals = []
  }

  // Normalize to exactly 8 sub-goals
  while (data.sub_goals.length < 8) {
    data.sub_goals.push({
      title: '',
      actions: Array(8).fill(''),
    })
  }
  if (data.sub_goals.length > 8) {
    console.warn(`Too many sub-goals (${data.sub_goals.length}), truncating to 8`)
    data.sub_goals = data.sub_goals.slice(0, 8)
  }

  // Normalize each sub-goal to have exactly 8 actions
  data.sub_goals = data.sub_goals.map((subGoal) => {
    if (!Array.isArray(subGoal.actions)) {
      subGoal.actions = []
    }

    while (subGoal.actions.length < 8) {
      subGoal.actions.push('')
    }
    if (subGoal.actions.length > 8) {
      console.warn(`Too many actions for "${subGoal.title}", truncating to 8`)
      subGoal.actions = subGoal.actions.slice(0, 8)
    }

    return {
      title: subGoal.title || '',
      actions: subGoal.actions,
    }
  })

  console.log('Validation complete:', {
    center_goal: data.center_goal,
    sub_goals_count: data.sub_goals.length,
    actions_per_subgoal: data.sub_goals.map((sg) => sg.actions.length),
  })

  return data
}
