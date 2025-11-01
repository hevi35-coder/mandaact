import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OCRRequest {
  image_url: string
}

interface MandalartData {
  center_goal: string
  sub_goals: {
    title: string
    actions: string[]
  }[]
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
    const { image_url }: OCRRequest = await req.json()

    if (!image_url) {
      return new Response(JSON.stringify({ error: 'image_url is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Call Google Cloud Vision API
    const visionResponse = await callGoogleVisionAPI(image_url)

    // Parse the OCR text into Mandalart structure
    const mandalartData = parseOCRText(visionResponse)

    return new Response(
      JSON.stringify(mandalartData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('OCR function error:', error)
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

async function callGoogleVisionAPI(imageUrl: string): Promise<string> {
  const gcpProjectId = Deno.env.get('GCP_PROJECT_ID')
  const gcpClientEmail = Deno.env.get('GCP_CLIENT_EMAIL')
  const gcpPrivateKey = Deno.env.get('GCP_PRIVATE_KEY')

  if (!gcpProjectId || !gcpClientEmail || !gcpPrivateKey) {
    throw new Error('Missing Google Cloud credentials')
  }

  // Create JWT token for Google Cloud authentication
  const jwtToken = await createGoogleJWT(gcpClientEmail, gcpPrivateKey)

  // Call Vision API
  const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate`

  const requestBody = {
    requests: [
      {
        image: {
          source: {
            imageUri: imageUrl,
          },
        },
        features: [
          {
            type: 'TEXT_DETECTION',
            maxResults: 1,
          },
        ],
      },
    ],
  }

  const response = await fetch(visionApiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Vision API error:', error)
    throw new Error('Failed to process image with Vision API')
  }

  const data = await response.json()
  const fullText = data.responses[0]?.fullTextAnnotation?.text || ''

  return fullText
}

async function createGoogleJWT(clientEmail: string, privateKey: string): Promise<string> {
  // Import jose for JWT creation
  const { SignJWT, importPKCS8 } = await import('https://deno.land/x/jose@v5.1.0/index.ts')

  const now = Math.floor(Date.now() / 1000)
  const expiry = now + 3600 // 1 hour

  // Clean up private key
  const cleanedKey = privateKey.replace(/\\n/g, '\n')

  // Import private key
  const key = await importPKCS8(cleanedKey, 'RS256')

  // Create JWT
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(expiry)
    .sign(key)

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text()
    console.error('Token exchange error:', error)
    throw new Error('Failed to get access token')
  }

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

function parseOCRText(text: string): MandalartData {
  // This is a simplified parser
  // You may need to adjust this based on your Mandalart image format

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)

  // Try to identify center goal (usually at the center or first line)
  const center_goal = lines[0] || ''

  // Extract sub-goals and actions
  // This is a placeholder - adjust based on your actual image format
  const sub_goals = []

  // Simple heuristic: assume evenly distributed text
  const itemsPerSubGoal = Math.floor((lines.length - 1) / 8)

  for (let i = 0; i < 8; i++) {
    const startIdx = 1 + (i * itemsPerSubGoal)
    const endIdx = startIdx + itemsPerSubGoal
    const subGoalLines = lines.slice(startIdx, endIdx)

    if (subGoalLines.length > 0) {
      sub_goals.push({
        title: subGoalLines[0] || '',
        actions: subGoalLines.slice(1, 9), // Up to 8 actions
      })
    }
  }

  return {
    center_goal,
    sub_goals,
  }
}
