/**
 * Utility functions for parsing AI-generated markdown reports
 * Extracts key metrics and structures content for display
 */

export type ReportErrorReason =
  | 'noActivity'      // No practice data for the period
  | 'parseError'      // Failed to parse AI response
  | 'emptyContent'    // Report content is empty
  | 'aiError'         // AI service error
  | null              // No error

export interface ReportSummary {
  headline: string
  metrics: Array<{
    label: string
    value: string
    variant?: 'default' | 'secondary' | 'outline'
  }>
  detailContent: string
  errorReason?: ReportErrorReason
}

/**
 * Helper function to fix truncated JSON
 * Currently unused but may be needed for handling incomplete API responses
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function fixTruncatedJSON(content: string): string {
  if (content.trim().startsWith('{') && !content.trim().endsWith('}')) {
    console.log('JSON appears to be truncated, attempting to fix...')

    // Count opening and closing brackets/braces
    const openBraces = (content.match(/{/g) || []).length
    const closeBraces = (content.match(/}/g) || []).length
    const openBrackets = (content.match(/\[/g) || []).length
    const closeBrackets = (content.match(/\]/g) || []).length

    // Add missing closing brackets/braces
    let fixedContent = content

    // Close any unclosed strings first
    if ((content.match(/"/g) || []).length % 2 !== 0) {
      fixedContent += '"'
    }

    // Add missing brackets
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      fixedContent += ']'
    }

    // Add missing braces
    for (let i = 0; i < openBraces - closeBraces; i++) {
      fixedContent += '}'
    }

    return fixedContent
  }
  return content
}

/**
 * Parse weekly practice report (JSON or markdown)
 * New reports are stored as JSON, old reports may be markdown
 */
interface WeeklyReportData {
  headline: string
  key_metrics: Array<{ label: string; value: string }>
  strengths?: string[]
  improvements?: {
    problem?: string
    insight?: string
  }
  action_plan?: {
    steps?: string[]
  }
}

interface DiagnosisReportData {
  headline: string
  structure_metrics: Array<{ label: string; value: string }>
  strengths?: string[]
  improvements?: Array<{
    area: string
    issue: string
    solution: string
  }>
  priority_tasks?: string[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const strings = value.filter((v): v is string => typeof v === 'string')
  return strings.length === value.length ? strings : null
}

function readMetricsArray(value: unknown): Array<{ label: string; value: string }> | null {
  if (!Array.isArray(value)) return null
  const metrics: Array<{ label: string; value: string }> = []
  for (const item of value) {
    if (!isPlainObject(item)) return null
    const label = readString(item.label)
    const metricValue = readString(item.value)
    if (!label || !metricValue) return null
    metrics.push({ label, value: metricValue })
  }
  return metrics
}

function readImprovementsArray(
  value: unknown
): Array<{ area: string; issue: string; solution: string }> | null {
  if (!Array.isArray(value)) return null
  const improvements: Array<{ area: string; issue: string; solution: string }> = []
  for (const item of value) {
    if (!isPlainObject(item)) return null
    const area = readString(item.area)
    const issue = readString(item.issue)
    const solution = readString(item.solution)
    if (!area || !issue || !solution) return null
    improvements.push({ area, issue, solution })
  }
  return improvements
}

/**
 * Parse weekly practice report (JSON or markdown)
 * New reports are stored as JSON, old reports may be markdown
 */
export function parseWeeklyReport(content: string): ReportSummary {
  // Check for empty content
  if (!content || content.trim() === '') {
    return {
      headline: '',
      metrics: [],
      detailContent: '',
      errorReason: 'emptyContent',
    }
  }

  // Try JSON parsing first (new format)
  try {
    const data = JSON.parse(content) as WeeklyReportData

    // Check for noActivity message in the data
    if (data.headline && (
      data.headline.includes('활동이 없습니다') ||
      data.headline.includes('No activity') ||
      data.headline.includes('no activity') ||
      data.headline.includes('기간 내 활동')
    )) {
      return {
        headline: data.headline,
        metrics: data.key_metrics?.map((m) => ({
          label: m.label,
          value: m.value,
          variant: 'default' as const
        })) || [],
        detailContent: '',
        errorReason: 'noActivity',
      }
    }

    if (data.headline && data.key_metrics) {
      // Build detail content from strengths, improvements, and action_plan
      let detailContent = ''

      if (data.strengths && Array.isArray(data.strengths) && data.strengths.length > 0) {
        detailContent += '## 💪 강점\n\n'
        data.strengths.forEach((strength: string) => {
          detailContent += `• ${strength}\n\n`
        })
      }

      if (data.improvements) {
        detailContent += '## ⚡ 개선 포인트\n\n'
        if (data.improvements.problem) {
          detailContent += `• ${data.improvements.problem}\n\n`
        }
        if (data.improvements.insight) {
          detailContent += `• ${data.improvements.insight}\n\n`
        }
      }

      if (data.action_plan) {
        detailContent += '## 🎯 MandaAct의 제안\n\n'
        if (data.action_plan.steps && Array.isArray(data.action_plan.steps)) {
          data.action_plan.steps.forEach((step: string) => {
            detailContent += `• ${step}\n\n`
          })
        }
      }

      return {
        headline: data.headline,
        metrics: data.key_metrics.map((m) => ({
          label: m.label,
          value: m.value,
          variant: 'default' as const
        })),
        detailContent: detailContent.trim()
      }
    }
  } catch (e) {
    // Fallback to markdown parsing (for old reports)
  }

  return parseWeeklyReportMarkdown(content)
}

/**
 * Parse markdown format (legacy fallback)
 */
function parseWeeklyReportMarkdown(markdown: string): ReportSummary {
  const lines = markdown.split('\n')
  const summary: ReportSummary = {
    headline: '',
    metrics: [],
    detailContent: '',
  }

  let currentSection = ''
  let detailStartIndex = -1
  const metricsLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.startsWith('# ') && !summary.headline) {
      summary.headline = line.replace('# ', '').trim()
      continue
    }

    if (line.startsWith('## ')) {
      currentSection = line.replace('## ', '').trim()

      if (currentSection.includes('💪') || currentSection.includes('강점')) {
        detailStartIndex = i
        break
      }
      continue
    }

    if (currentSection.includes('📊') || currentSection.includes('핵심 지표') || currentSection.includes('주요 지표')) {
      if (line.startsWith('- ')) {
        metricsLines.push(line.replace('- ', '').trim())
      }
    }
  }

  summary.metrics = metricsLines.map(metric => {
    const colonIndex = metric.indexOf(':')
    if (colonIndex > 0) {
      const label = metric.substring(0, colonIndex).trim()
      const value = metric.substring(colonIndex + 1).trim()
      return { label, value, variant: 'default' as const }
    }
    return { label: '', value: metric, variant: 'default' as const }
  })

  if (detailStartIndex >= 0) {
    summary.detailContent = lines.slice(detailStartIndex).join('\n')
  }

  if (!summary.headline) {
    summary.headline = ''
    summary.errorReason = 'parseError'
  }

  return summary
}

/**
 * Parse diagnosis report (JSON or markdown)
 * New reports are stored as JSON, old reports may be markdown
 */
export function parseDiagnosisReport(content: string): ReportSummary {
  // Try JSON parsing first (new format)
  try {
    const parsed = JSON.parse(content) as unknown
    if (!isPlainObject(parsed)) throw new Error('Not an object')

    const headline = readString(parsed.headline)
    const structureMetricsRaw =
      parsed.structure_metrics ?? parsed.structureMetrics
    const structureMetrics = readMetricsArray(structureMetricsRaw)

    const strengths = readStringArray(parsed.strengths)
    const improvements = readImprovementsArray(parsed.improvements)
    const priorityTasks = readStringArray(parsed.priority_tasks ?? parsed.priorityTasks)

    const data: DiagnosisReportData | null =
      headline && structureMetrics
        ? {
            headline,
            structure_metrics: structureMetrics,
            strengths: strengths ?? undefined,
            improvements: improvements ?? undefined,
            priority_tasks: priorityTasks ?? undefined,
          }
        : null

    if (data) {
      // Build detail content from strengths and improvements
      let detailContent = ''

      if (data.strengths && data.strengths.length > 0) {
        detailContent += '## 💪 강점\n\n'
        data.strengths.forEach((strength) => {
          detailContent += `• ${strength}\n\n`
        })
      }

      if (data.improvements && data.improvements.length > 0) {
        detailContent += '## ⚡ 개선 포인트\n\n'
        data.improvements.forEach((improvement) => {
          detailContent += `• **${improvement.area}**: ${improvement.issue} → ${improvement.solution}\n\n`
        })
      }

      if (data.priority_tasks && data.priority_tasks.length > 0) {
        detailContent += '## 🎯 MandaAct의 제안\n\n'
        data.priority_tasks.forEach((task) => {
          detailContent += `• ${task}\n\n`
        })
      }

      return {
        headline: data.headline,
        metrics: data.structure_metrics.map((m) => ({
          label: m.label,
          value: m.value,
          variant: 'default' as const,
        })),
        detailContent: detailContent.trim(),
      }
    }
  } catch (e) {
    // Fallback to markdown parsing (for old reports)
  }

  const parsed = parseDiagnosisReportMarkdown(content)
  if (!parsed.headline) {
    parsed.errorReason = 'parseError'
  }
  return parsed
}

/**
 * Parse markdown format (legacy fallback)
 */
function parseDiagnosisReportMarkdown(markdown: string): ReportSummary {
  const lines = markdown.split('\n')
  const summary: ReportSummary = {
    headline: '',
    metrics: [],
    detailContent: '',
  }

  let currentSection = ''
  let detailStartIndex = -1
  const structureLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Extract headline (first H1)
    if (line.startsWith('# ') && !summary.headline) {
      summary.headline = line.replace('# ', '').trim()
      continue
    }

    // Track sections
    if (line.startsWith('## ')) {
      currentSection = line.replace('## ', '').trim()

      // After 구조 평가, everything else is detail content
      if (currentSection.includes('✅') || currentSection.includes('잘하고')) {
        detailStartIndex = i
        break
      }
      continue
    }

    // Extract structure metrics from 📊 구조 평가 section
    if (currentSection.includes('📊') || currentSection.includes('구조 평가')) {
      if (line.startsWith('- ')) {
        structureLines.push(line.replace('- ', '').trim())
      }
    }
  }

  // Parse structure metrics
  summary.metrics = structureLines.map(metric => {
    const colonIndex = metric.indexOf(':')
    if (colonIndex > 0) {
      const label = metric.substring(0, colonIndex).trim()
      const value = metric.substring(colonIndex + 1).trim()

      // Determine variant based on label
      let variant: 'default' | 'secondary' | 'outline' = 'default'
      if (label.includes('완성도') || label.includes('구체성')) {
        variant = 'secondary'
      } else if (label.includes('실천 설계')) {
        variant = 'outline'
      }

      return { label, value, variant }
    }

    return { label: '', value: metric, variant: 'default' as const }
  })

  // Extract detail content
  if (detailStartIndex >= 0) {
    summary.detailContent = lines.slice(detailStartIndex).join('\n')
  }

  if (!summary.headline) {
    summary.errorReason = 'parseError'
  }

  return summary
}
