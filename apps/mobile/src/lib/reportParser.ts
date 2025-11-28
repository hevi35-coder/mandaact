/**
 * Utility functions for parsing AI-generated JSON reports
 * Extracts key metrics and structures content for display
 */

export interface ReportSummary {
  headline: string
  metrics: Array<{
    label: string
    value: string
  }>
  strengths: string[]
  improvements: {
    problem?: string
    insight?: string
    items?: Array<{
      area: string
      issue: string
      solution: string
    }>
  }
  actionPlan: string[]
}

interface WeeklyReportData {
  headline: string
  key_metrics: Array<{ label: string; value: string }>
  strengths?: string[]
  improvements?: {
    problem?: string
    insight?: string
  }
  action_plan?: {
    goal?: string
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

/**
 * Parse weekly practice report (JSON format)
 */
export function parseWeeklyReport(content: string): ReportSummary {
  const defaultSummary: ReportSummary = {
    headline: '리포트를 분석할 수 없습니다',
    metrics: [],
    strengths: [],
    improvements: {},
    actionPlan: [],
  }

  try {
    const data = JSON.parse(content) as WeeklyReportData

    if (data.headline && data.key_metrics) {
      return {
        headline: data.headline,
        metrics: data.key_metrics.map((m) => ({
          label: m.label,
          value: m.value,
        })),
        strengths: data.strengths || [],
        improvements: {
          problem: data.improvements?.problem,
          insight: data.improvements?.insight,
        },
        actionPlan: data.action_plan?.steps || [],
      }
    }
  } catch {
    // Try markdown parsing for legacy reports
    return parseMarkdownReport(content)
  }

  return defaultSummary
}

/**
 * Parse diagnosis report (JSON format)
 */
export function parseDiagnosisReport(content: string): ReportSummary {
  const defaultSummary: ReportSummary = {
    headline: '진단을 분석할 수 없습니다',
    metrics: [],
    strengths: [],
    improvements: {},
    actionPlan: [],
  }

  try {
    const data = JSON.parse(content) as DiagnosisReportData

    if (data.headline && data.structure_metrics) {
      return {
        headline: data.headline,
        metrics: data.structure_metrics.map((m) => ({
          label: m.label,
          value: m.value,
        })),
        strengths: data.strengths || [],
        improvements: {
          items: data.improvements || [],
        },
        actionPlan: data.priority_tasks || [],
      }
    }
  } catch {
    // Try markdown parsing for legacy reports
    return parseMarkdownReport(content)
  }

  return defaultSummary
}

/**
 * Parse markdown format (legacy fallback)
 */
function parseMarkdownReport(markdown: string): ReportSummary {
  const lines = markdown.split('\n')
  const summary: ReportSummary = {
    headline: '',
    metrics: [],
    strengths: [],
    improvements: {},
    actionPlan: [],
  }

  let currentSection = ''

  for (const line of lines) {
    const trimmed = line.trim()

    // Extract headline (first H1)
    if (trimmed.startsWith('# ') && !summary.headline) {
      summary.headline = trimmed.replace('# ', '').trim()
      continue
    }

    // Track sections
    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.replace('## ', '').trim().toLowerCase()
      continue
    }

    // Extract content based on section
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.slice(2).trim()

      if (currentSection.includes('지표') || currentSection.includes('metric')) {
        const colonIndex = content.indexOf(':')
        if (colonIndex > 0) {
          summary.metrics.push({
            label: content.substring(0, colonIndex).trim(),
            value: content.substring(colonIndex + 1).trim(),
          })
        }
      } else if (currentSection.includes('강점') || currentSection.includes('strength')) {
        summary.strengths.push(content)
      } else if (currentSection.includes('개선') || currentSection.includes('improvement')) {
        if (!summary.improvements.problem) {
          summary.improvements.problem = content
        } else if (!summary.improvements.insight) {
          summary.improvements.insight = content
        }
      } else if (currentSection.includes('제안') || currentSection.includes('action') || currentSection.includes('plan')) {
        summary.actionPlan.push(content)
      }
    }
  }

  if (!summary.headline) {
    summary.headline = '리포트'
  }

  return summary
}
