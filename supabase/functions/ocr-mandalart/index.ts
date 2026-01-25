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

interface Page {
  width: number
  height: number
  blocks: Block[]
}

interface Block {
  blockType: string
  paragraphs: Paragraph[]
  boundingBox?: BoundingPoly
}

interface Paragraph {
  words: Word[]
  boundingBox?: BoundingPoly
}

interface Word {
  symbols: Symbol[]
  boundingBox?: BoundingPoly
}

interface Symbol {
  text: string
  boundingBox?: BoundingPoly
}

interface BoundingPoly {
  vertices: Vertex[]
}

interface Vertex {
  x?: number
  y?: number
}

interface VisionResponse {
  responses: [{
    fullTextAnnotation?: {
      pages: Page[]
      text: string
    }
  }]
}

interface ProcessedBlock {
  text: string
  cx: number
  cy: number
  width: number
  height: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    )

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt)

    if (authError || !user) throw new Error('Unauthorized')

    const { image_url }: OCRRequest = await req.json()
    if (!image_url) throw new Error('image_url is required')

    const visionResponse = await callGoogleVisionAPI(image_url)
    const mandalartData = parseOCRText(visionResponse)

    return new Response(JSON.stringify(mandalartData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('OCR function error:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function callGoogleVisionAPI(imageUrl: string): Promise<VisionResponse> {
  const gcpProjectId = Deno.env.get('GCP_PROJECT_ID')
  const gcpClientEmail = Deno.env.get('GCP_CLIENT_EMAIL')
  const gcpPrivateKey = Deno.env.get('GCP_PRIVATE_KEY')

  if (!gcpProjectId || !gcpClientEmail || !gcpPrivateKey) {
    throw new Error('Missing Google Cloud credentials')
  }

  const { SignJWT, importPKCS8 } = await import('https://deno.land/x/jose@v5.1.0/index.ts')
  const now = Math.floor(Date.now() / 1000)
  const key = await importPKCS8(gcpPrivateKey.replace(/\\n/g, '\n'), 'RS256')

  const jwt = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/cloud-vision',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(gcpClientEmail)
    .setSubject(gcpClientEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key)

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const { access_token } = await tokenResponse.json()

  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{
        image: { source: { imageUri: imageUrl } },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        imageContext: { languageHints: ['ko', 'en'] }, // Rely on auto-orientation hints
      }],
    }),
  })

  if (!response.ok) throw new Error('Failed to process image with Vision API')
  return response.json()
}

// --- Hybrid Anchoring + Auto-Orientation ---

function parseOCRText(visionResponse: VisionResponse): MandalartData {
  const fullTextAnnotation = visionResponse.responses[0]?.fullTextAnnotation
  if (!fullTextAnnotation?.pages?.length) {
    console.log('No text found in image')
    return { center_goal: '', sub_goals: [] }
  }

  const page = fullTextAnnotation.pages[0]

  // 1. Process Blocks (Raw Collection)
  let rawBlocks: ProcessedBlock[] = []

  let sumAR = 0
  let countAR = 0

  page.blocks.forEach(block => {
    block.paragraphs.forEach(para => {
      let paraText = para.words.map(w => w.symbols.map(s => s.text).join('')).join(' ').trim()
      if (!paraText) return

      const lower = paraText.toLowerCase()
      // Filter out UI noise
      if (lower.includes('scan image') || lower.includes('analyze image') || lower.includes('auto-extract')) return
      if (lower.includes('turn goals into action') || lower.includes('mandaact')) return

      const vertices = para.boundingBox?.vertices || []
      if (vertices.length < 2) return

      const xs = vertices.map(v => v.x || 0)
      const ys = vertices.map(v => v.y || 0)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)

      if (maxY - minY < 5 && maxX - minX < 5) return

      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      const w = maxX - minX
      const h = maxY - minY

      // Calculate Aspect Ratio (Width/Height)
      // Normal horizontal text: AR > 1.0 usually (or close).
      // Vertical text (rotated 90): AR < 1.0 (Tall).
      if (h > 0) {
        sumAR += (w / h)
        countAR++
      }

      rawBlocks.push({
        text: paraText,
        cx: cx,
        cy: cy,
        width: w,
        height: h,
      })
    })
  })

  if (rawBlocks.length === 0) return { center_goal: '', sub_goals: [] }

  // 2. Auto-Orientation Detection
  const avgAR = countAR > 0 ? sumAR / countAR : 1.0
  let pageWidth = page.width
  let pageHeight = page.height

  // Heuristic: If average AR < 0.8, implies text is TALL (Rotated or Transposed).
  // Check the example scrambling: 
  // - "Optimize" (square) was fine.
  // - "Segment" (wide) was transposed.
  // But if the whole coordinate system is swapped, PageWidth should effectively match PageHeight of original.

  if (avgAR < 0.85) {
    console.log(`Detected Vertical/Transposed Text (AvgAR=${avgAR.toFixed(2)}). Swapping Coordinates.`)
    // Swap coordinates
    rawBlocks = rawBlocks.map(b => ({
      ...b,
      cx: b.cy,
      cy: b.cx,
      width: b.height,
      height: b.width
    }))
    // Swap page dims
    const tmp = pageWidth
    pageWidth = pageHeight
    pageHeight = tmp
  } else {
    console.log(`Detected Horizontal Text (AvgAR=${avgAR.toFixed(2)}). Keeping Coordinates.`)
  }

  // 3. Horizontal Anchoring (Page Center)
  const gridCenterX = pageWidth / 2

  // 4. Grid Fitting (Lattice Search for SCALE)
  const minCellSize = pageWidth / 14
  const maxCellSize = pageWidth / 9
  const stepSize = 1

  let bestCellSize = (minCellSize + maxCellSize) / 2
  let bestScoreX = -Infinity

  for (let s = minCellSize; s <= maxCellSize; s += stepSize) {
    let score = 0
    rawBlocks.forEach(b => {
      // Ideal: Aligned to Center +/- k*s
      const col = (b.cx - gridCenterX) / s
      const residual = Math.abs(col - Math.round(col))
      const tolerance = 0.15
      if (residual < 0.4) {
        score += Math.exp(-Math.pow(residual / tolerance, 2))
      }
    })

    if (score > bestScoreX) {
      bestScoreX = score
      bestCellSize = s
    }
  }

  // 5. Vertical Anchoring (Sliding Window Cluster)
  const relRows: number[] = []
  rawBlocks.forEach(b => {
    relRows.push(Math.round(b.cy / bestCellSize))
  })

  // Build histogram
  const rowCounts: Record<number, number> = {}
  let minRelRow = Infinity
  let maxRelRow = -Infinity
  relRows.forEach(r => {
    rowCounts[r] = (rowCounts[r] || 0) + 1
    minRelRow = Math.min(minRelRow, r)
    maxRelRow = Math.max(maxRelRow, r)
  })

  // We want to find a continuous window of 9 rows [k, k+8] that contains the most blocks.
  // This helps exclude Title (at k-2) or Footer (at k+10).

  let bestWindowStart = minRelRow
  let maxWindowCount = -Infinity

  // Search range: from minRelRow to maxRelRow - 8
  const searchEnd = Math.max(minRelRow, maxRelRow - 8)

  for (let start = minRelRow; start <= searchEnd; start++) {
    let count = 0
    for (let r = start; r < start + 9; r++) {
      count += (rowCounts[r] || 0)
    }
    if (count > maxWindowCount) {
      maxWindowCount = count
      bestWindowStart = start
    }
  }

  // Ideally, the Grid is in rows [bestWindowStart, bestWindowStart + 8].
  // The center of this window is `bestWindowStart + 4`.
  // We want this center to map to Logical Row 4.
  // So: `(bestWindowStart + 4) + RowOffset = 4`.
  // `RowOffset = -bestWindowStart`.

  const rowOffset = -bestWindowStart
  // But wait, if we used Median directly?
  // Median of cluster is approx `bestWindowStart + 4`.
  // `Offset = 4 - Median`.
  // `Offset = 4 - (bestWindowStart + 4) = -bestWindowStart`. Consistent.

  console.log(`Auto-Orient: Size=${bestCellSize.toFixed(1)}, RowOffset=${rowOffset}, WindowStart=${bestWindowStart}`)

  // 6. Mapping
  const grid: string[][] = Array(9).fill(null).map(() => Array(9).fill(''))

  rawBlocks.forEach(b => {
    const rawCol = Math.round((b.cx - gridCenterX) / bestCellSize)
    const col = 4 + rawCol // Center index is 4

    const rawRelRow = Math.round(b.cy / bestCellSize)
    const row = rawRelRow + rowOffset

    if (col >= 0 && col <= 8 && row >= 0 && row <= 8) {
      if (grid[row][col]) {
        if (!grid[row][col].includes(b.text)) {
          grid[row][col] += ' ' + b.text
        }
      } else {
        grid[row][col] = b.text
      }
    }
  })

  // 7. Extract Content
  const center_goal = grid[4][4] || ''
  const sub_goals = []

  const blockDefs = [
    { id: 'TL', r: 1, c: 1, ranges: { r: [0, 2], c: [0, 2] } },
    { id: 'TM', r: 1, c: 4, ranges: { r: [0, 2], c: [3, 5] } },
    { id: 'TR', r: 1, c: 7, ranges: { r: [0, 2], c: [6, 8] } },
    { id: 'ML', r: 4, c: 1, ranges: { r: [3, 5], c: [0, 2] } },
    { id: 'MR', r: 4, c: 7, ranges: { r: [3, 5], c: [6, 8] } },
    { id: 'BL', r: 7, c: 1, ranges: { r: [6, 8], c: [0, 2] } },
    { id: 'BM', r: 7, c: 4, ranges: { r: [6, 8], c: [3, 5] } },
    { id: 'BR', r: 7, c: 7, ranges: { r: [6, 8], c: [6, 8] } },
  ]

  blockDefs.forEach(blk => {
    let title = grid[blk.r][blk.c] || ''
    const actions: string[] = []

    for (let r = blk.ranges.r[0]; r <= blk.ranges.r[1]; r++) {
      for (let c = blk.ranges.c[0]; c <= blk.ranges.c[1]; c++) {
        if (r === blk.r && c === blk.c) continue;
        const text = grid[r][c]
        if (text) actions.push(text)
      }
    }

    if (title || actions.length > 0) {
      if (!title) {
        // Fallback logic
        if (blk.id === 'TL') title = grid[3][3] || ''
        else if (blk.id === 'TM') title = grid[3][4] || ''
        else if (blk.id === 'TR') title = grid[3][5] || ''
        else if (blk.id === 'ML') title = grid[4][3] || ''
        else if (blk.id === 'MR') title = grid[4][5] || ''
        else if (blk.id === 'BL') title = grid[5][3] || ''
        else if (blk.id === 'BM') title = grid[5][4] || ''
        else if (blk.id === 'BR') title = grid[5][5] || ''
      }
      if (title || actions.length > 0) sub_goals.push({ title, actions })
    }
  })

  return { center_goal, sub_goals }
}
