/**
 * Report Parser Adapter for Mobile
 * 
 * Re-exports from @mandaact/shared with mobile-specific interface adaptation
 */

import {
  parseWeeklyReport as sharedParseWeeklyReport,
  parseDiagnosisReport as sharedParseDiagnosisReport,
  ReportSummary as SharedReportSummary,
} from '@mandaact/shared'

/**
 * Mobile-specific ReportSummary interface
 * Includes structured arrays instead of markdown content
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

/**
 * Convert shared ReportSummary (with markdown detailContent) to mobile format
 */
function adaptToMobileFormat(shared: SharedReportSummary): ReportSummary {
  const mobile: ReportSummary = {
    headline: shared.headline,
    metrics: shared.metrics.map(m => ({ label: m.label, value: m.value })),
    strengths: [],
    improvements: {},
    actionPlan: [],
  }

  // Parse markdown detailContent into structured arrays
  if (shared.detailContent) {
    const lines = shared.detailContent.split('\n')
    let currentSection = ''

    for (const line of lines) {
      const trimmed = line.trim()

      if (trimmed.startsWith('## ')) {
        currentSection = trimmed.replace('## ', '').trim().toLowerCase()
        continue
      }

      if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
        const content = trimmed.replace(/^[•-]\s*/, '')

        if (currentSection.includes('강점') || currentSection.includes('strength')) {
          mobile.strengths.push(content)
        } else if (currentSection.includes('개선') || currentSection.includes('improvement')) {
          if (!mobile.improvements.problem) {
            mobile.improvements.problem = content
          } else if (!mobile.improvements.insight) {
            mobile.improvements.insight = content
          }
        } else if (currentSection.includes('제안') || currentSection.includes('action')) {
          mobile.actionPlan.push(content)
        }
      }
    }
  }

  return mobile
}

/**
 * Parse weekly practice report
 * Uses shared implementation and adapts to mobile format
 */
export function parseWeeklyReport(content: string): ReportSummary {
  try {
    const shared = sharedParseWeeklyReport(content)
    return adaptToMobileFormat(shared)
  } catch (error) {
    console.error('Error parsing weekly report:', error)
    return {
      headline: '리포트를 분석할 수 없습니다',
      metrics: [],
      strengths: [],
      improvements: {},
      actionPlan: [],
    }
  }
}

/**
 * Parse diagnosis report
 * Uses shared implementation and adapts to mobile format
 */
export function parseDiagnosisReport(content: string): ReportSummary {
  try {
    const shared = sharedParseDiagnosisReport(content)
    return adaptToMobileFormat(shared)
  } catch (error) {
    console.error('Error parsing diagnosis report:', error)
    return {
      headline: '진단을 분석할 수 없습니다',
      metrics: [],
      strengths: [],
      improvements: {},
      actionPlan: [],
    }
  }
}

