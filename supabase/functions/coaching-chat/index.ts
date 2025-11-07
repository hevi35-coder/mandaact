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
  // TODO: Implement in Phase B
  return "안녕하세요! 저는 당신의 목표 달성을 돕는 만다라트 전문 코치입니다. '실행 가능한' 만다라트를 함께 만들어볼게요. 가장 이루고 싶은 목표가 있나요?"
}

function buildSystemPrompt(phase: string, progress: any, partialData: any): string {
  // TODO: Implement comprehensive prompts in Phase B
  return `You are a Mandalart coaching assistant. Current phase: ${phase}. Help the user create actionable goals.`
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
