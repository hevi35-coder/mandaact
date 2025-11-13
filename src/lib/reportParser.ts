/**
 * Utility functions for parsing AI-generated markdown reports
 * Extracts key metrics and structures content for display
 */

export interface ReportSummary {
  headline: string
  metrics: Array<{
    label: string
    value: string
    variant?: 'default' | 'secondary' | 'outline'
  }>
  detailContent: string
}

/**
 * Helper function to fix truncated JSON
 */
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
 * Tries JSON first, falls back to markdown parsing
 */
export function parseWeeklyReport(content: string): ReportSummary {
  // Try to fix truncated JSON
  const jsonContent = fixTruncatedJSON(content)

  // Try JSON parsing first
  try {
    const data = JSON.parse(jsonContent)

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
        metrics: data.key_metrics.map((m: any) => ({
          label: m.label,
          value: m.value,
          variant: 'default' as const
        })),
        detailContent: detailContent.trim()
      }
    }
  } catch (e) {
    // Not JSON, try markdown parsing
  }

  // Fallback to markdown parsing
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

    if (currentSection.includes('📊') || currentSection.includes('핵심 지표')) {
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

  return summary
}

/**
 * Parse diagnosis report (JSON or markdown)
 * Tries JSON first, falls back to markdown parsing
 */
export function parseDiagnosisReport(content: string): ReportSummary {
  console.log('Parsing diagnosis report, content:', content?.substring(0, 200))

  // Try to fix truncated JSON
  const jsonContent = fixTruncatedJSON(content)

  // Try JSON parsing first
  try {
    const data = JSON.parse(jsonContent)
    console.log('Parsed diagnosis JSON:', data)

    if (data.headline && data.structure_metrics) {
      // Build detail content from strengths and improvements
      let detailContent = ''

      if (data.strengths && Array.isArray(data.strengths) && data.strengths.length > 0) {
        detailContent += '## ✅ 잘하고 있는 점\n\n'
        data.strengths.forEach((strength: string) => {
          detailContent += `• ${strength}\n\n`
        })
      }

      if (data.improvements && Array.isArray(data.improvements) && data.improvements.length > 0) {
        detailContent += '## 🔧 개선이 필요한 부분\n\n'
        data.improvements.forEach((improvement: string) => {
          detailContent += `• ${improvement}\n\n`
        })
      }

      if (data.next_steps && Array.isArray(data.next_steps) && data.next_steps.length > 0) {
        detailContent += '## 📌 다음 단계 제안\n\n'
        data.next_steps.forEach((step: string, index: number) => {
          detailContent += `${index + 1}. ${step}\n\n`
        })
      }

      return {
        headline: data.headline,
        metrics: data.structure_metrics.map((m: any) => ({
          label: m.label,
          value: m.value,
          variant: 'default' as const
        })),
        detailContent: detailContent.trim()
      }
    }
  } catch (e) {
    console.log('JSON parsing failed for diagnosis, falling back to markdown:', e)
    // Not JSON, try markdown parsing
  }

  // Fallback to markdown parsing
  console.log('Using markdown parsing for diagnosis report')
  return parseDiagnosisReportMarkdown(content)
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

  return summary
}
