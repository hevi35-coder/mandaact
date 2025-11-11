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

interface Vertex {
  x?: number
  y?: number
}

interface BoundingPoly {
  vertices: Vertex[]
}

interface TextAnnotation {
  description: string
  boundingPoly?: BoundingPoly
}

interface VisionResponse {
  responses: [{
    textAnnotations?: TextAnnotation[]
  }]
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

async function callGoogleVisionAPI(imageUrl: string): Promise<VisionResponse> {
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
            type: 'DOCUMENT_TEXT_DETECTION',
          },
        ],
        imageContext: {
          languageHints: ['ko', 'en'],
        },
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

  // Return full Vision API response for better parsing
  return data.responses[0]
}

async function createGoogleJWT(clientEmail: string, privateKey: string): Promise<string> {
  // Import jose for JWT creation
  const { SignJWT, importPKCS8 } = await import('https://deno.land/x/jose@v5.1.0/index.ts')

  const now = Math.floor(Date.now() / 1000)
  const expiry = now + 3600 // 1 hour

  // Clean up private key
  const cleanedKey = privateKey.replace(/\\n/g, '\n')

  console.log('Creating Google JWT...')
  console.log('Client Email:', clientEmail)
  console.log('Private Key length:', cleanedKey.length)
  console.log('Private Key starts with:', cleanedKey.substring(0, 50))

  // Import private key
  const key = await importPKCS8(cleanedKey, 'RS256')

  // Create JWT with required scope for Cloud Vision API
  const jwt = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/cloud-vision',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(expiry)
    .sign(key)

  console.log('JWT created successfully')

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

function parseOCRText(visionResponse: VisionResponse): MandalartData {
  // Extract text annotations with position information
  const textAnnotations = visionResponse.responses[0]?.textAnnotations || []

  if (textAnnotations.length === 0) {
    console.warn('No text detected in image')
    return {
      center_goal: '',
      sub_goals: [],
    }
  }

  // Skip first annotation (it's the full text)
  const blocks = textAnnotations.slice(1)

  if (blocks.length === 0) {
    return {
      center_goal: '',
      sub_goals: [],
    }
  }

  console.log(`Detected ${blocks.length} text blocks`)

  // Calculate image bounds
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity

  blocks.forEach((block: TextAnnotation) => {
    const vertices = block.boundingPoly?.vertices || []
    vertices.forEach((v: Vertex) => {
      minX = Math.min(minX, v.x || 0)
      maxX = Math.max(maxX, v.x || 0)
      minY = Math.min(minY, v.y || 0)
      maxY = Math.max(maxY, v.y || 0)
    })
  })

  const width = maxX - minX
  const height = maxY - minY
  const cellWidth = width / 9
  const cellHeight = height / 9

  console.log(`Grid dimensions: ${width}x${height}, Cell size: ${cellWidth}x${cellHeight}`)

  // Group text by grid cell (9x9)
  const grid: string[][] = Array(9).fill(null).map(() => Array(9).fill(''))

  blocks.forEach((block: TextAnnotation) => {
    const vertices = block.boundingPoly?.vertices || []
    if (vertices.length === 0) return

    // Calculate center of text block
    const centerX = vertices.reduce((sum: number, v: Vertex) => sum + (v.x || 0), 0) / vertices.length
    const centerY = vertices.reduce((sum: number, v: Vertex) => sum + (v.y || 0), 0) / vertices.length

    // Determine grid position (0-8)
    const col = Math.floor((centerX - minX) / cellWidth)
    const row = Math.floor((centerY - minY) / cellHeight)

    // Ensure within bounds
    const gridCol = Math.max(0, Math.min(8, col))
    const gridRow = Math.max(0, Math.min(8, row))

    const text = block.description || ''

    // Append text to cell (handling multi-line text in same cell)
    if (grid[gridRow][gridCol]) {
      grid[gridRow][gridCol] += ' ' + text
    } else {
      grid[gridRow][gridCol] = text
    }
  })

  // Extract center goal (position 4,4 in 0-indexed grid)
  const center_goal = grid[4][4] || ''

  console.log('Center goal:', center_goal)

  // Extract 8 sub-goals from 3x3 blocks
  // Mandalart structure: 9x9 grid divided into 9 3x3 blocks
  // Center 3x3 block contains center goal and 8 sub-goals
  const sub_goals = []

  // The 8 surrounding cells of center (4,4)
  const subGoalPositions = [
    [3, 3], [3, 4], [3, 5],  // Top row
    [4, 3],         [4, 5],  // Middle row (skip center)
    [5, 3], [5, 4], [5, 5],  // Bottom row
  ]

  subGoalPositions.forEach(([row, col]) => {
    const title = grid[row][col] || ''

    // Extract actions for this sub-goal from corresponding 3x3 block
    const actions: string[] = []

    // Determine which 3x3 block this sub-goal corresponds to
    // This is a simplified approach - you may need to adjust based on your Mandalart layout
    const blockRow = row < 4 ? 0 : (row > 4 ? 2 : 1)
    const blockCol = col < 4 ? 0 : (col > 4 ? 2 : 1)

    // Extract 8 actions from the corresponding 3x3 block (excluding center which is the sub-goal)
    const baseRow = blockRow * 3
    const baseCol = blockCol * 3

    for (let r = baseRow; r < baseRow + 3; r++) {
      for (let c = baseCol; c < baseCol + 3; c++) {
        // Skip the center of this 3x3 block (it's the sub-goal title)
        if (r === baseRow + 1 && c === baseCol + 1) continue

        const actionText = grid[r][c] || ''
        if (actionText && actionText !== title) {
          actions.push(actionText)
        }
      }
    }

    if (title) {
      sub_goals.push({
        title,
        actions: actions.slice(0, 8), // Max 8 actions
      })
    }
  })

  console.log(`Parsed ${sub_goals.length} sub-goals`)

  return {
    center_goal,
    sub_goals,
  }
}
