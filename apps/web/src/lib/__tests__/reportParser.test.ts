import { describe, it, expect } from 'vitest'
import { parseWeeklyReport, parseDiagnosisReport } from '../reportParser'

describe('reportParser', () => {
    describe('parseWeeklyReport', () => {
        it('should parse valid JSON report', () => {
            const jsonReport = JSON.stringify({
                headline: '이번 주 훌륭한 진전!',
                key_metrics: [
                    { label: '완료율', value: '85%' },
                    { label: '연속 일수', value: '7일' }
                ],
                strengths: ['꾸준한 실천', '높은 완료율'],
                improvements: {
                    problem: '주말 실천율 저조',
                    insight: '주말 루틴 개선 필요'
                },
                action_plan: {
                    steps: ['주말 알림 설정', '주말 목표 조정']
                }
            })

            const result = parseWeeklyReport(jsonReport)

            expect(result.headline).toBe('이번 주 훌륭한 진전!')
            expect(result.metrics).toHaveLength(2)
            expect(result.metrics[0].label).toBe('완료율')
            expect(result.detailContent).toContain('꾸준한 실천')
            expect(result.detailContent).toContain('주말 실천율 저조')
            expect(result.detailContent).toContain('주말 알림 설정')
        })

        it('should handle markdown format', () => {
            const markdownReport = `# 이번 주 리포트

## 주요 지표
- 완료율: 85%
- 연속 일수: 7일

## 강점
- 꾸준한 실천
- 높은 완료율

## 개선 필요사항
주말 실천율이 저조합니다.

## 실행 계획
1. 주말 알림 설정
2. 주말 목표 조정`

            const result = parseWeeklyReport(markdownReport)

            expect(result.headline).toBeTruthy()
            expect(result.metrics.length).toBeGreaterThan(0)
        })

        it('should handle empty report', () => {
            const result = parseWeeklyReport('')

            expect(result.headline).toBe('리포트를 생성할 수 없습니다')
            expect(result.metrics).toEqual([])
        })
    })

    describe('parseDiagnosisReport', () => {
        it('should parse valid JSON diagnosis report', () => {
            const jsonReport = JSON.stringify({
                headline: '목표 달성 가능성 진단',
                structure_metrics: [
                    { label: '완성도', value: '80%' },
                    { label: '구체성', value: 'High' }
                ],
                strengths: ['명확한 목표'],
                improvements: [
                    { area: '실천 계획', issue: '부족함', solution: '구체화 필요' }
                ],
                priority_tasks: ['계획 세우기']
            })

            const result = parseDiagnosisReport(jsonReport)

            expect(result.headline).toBe('목표 달성 가능성 진단')
            expect(result.metrics).toHaveLength(2)
            expect(result.detailContent).toContain('명확한 목표')
            expect(result.detailContent).toContain('실천 계획')
        })

        it('should handle markdown diagnosis format', () => {
            const markdownReport = `# 진단 리포트

## 구조 평가
- 완성도: 80%

## 진단 결과
현재 진행 상황이 양호합니다.

## 위험도
낮음

## 권장사항
- 계속 유지하세요
- 주말 실천 강화`

            const result = parseDiagnosisReport(markdownReport)

            expect(result.headline).toBeTruthy()
            // The parser puts everything after "구조 평가" (if it matches specific keywords) or just parses sections
            // Let's check if metrics are parsed if we provide the correct section header
            expect(result.metrics.length).toBeGreaterThan(0)
        })
    })
})
