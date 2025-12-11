// Action type auto-suggestion tests based on real user scenarios
import { describe, it, expect } from 'vitest'
import { suggestActionType, formatTypeDetails } from '../actionTypes'
import type { ActionType, Confidence } from '../actionTypes'

describe('suggestActionType - User Scenario Tests', () => {
  // Helper function to test suggestions
  const testSuggestion = (
    title: string,
    expectedType: ActionType,
    expectedConfidence?: Confidence
  ) => {
    const result = suggestActionType(title)
    expect(result.type).toBe(expectedType)
    if (expectedConfidence) {
      expect(result.confidence).toBe(expectedConfidence)
    }
    return result
  }

  describe('Scenario 1: 직장인 A씨 (건강/자기계발)', () => {
    it('매일 30분 운동', () => {
      const result = testSuggestion('매일 30분 운동', 'routine', 'high')
      expect(result.routineFrequency).toBe('daily')
    })

    it('10kg 감량 달성', () => {
      testSuggestion('10kg 감량 달성', 'mission', 'high')
    })

    it('물 2L 마시기', () => {
      testSuggestion('물 2L 마시기', 'routine', 'medium')
    })

    it('주 3회 헬스장 가기', () => {
      const result = testSuggestion('주 3회 헬스장 가기', 'routine', 'high')
      expect(result.routineFrequency).toBe('weekly')
    })

    it('건강한 식습관 유지', () => {
      // Phase 1 improvement: Should recognize as reference (mindset)
      testSuggestion('건강한 식습관 유지', 'reference', 'high')
    })

    it('스트레스 관리 마음가짐', () => {
      testSuggestion('스트레스 관리 마음가짐', 'reference', 'high')
    })

    it('금연 성공하기', () => {
      // Phase 1 improvement: "성공" keyword should boost confidence
      testSuggestion('금연 성공하기', 'mission', 'medium')
    })

    it('매일 아침 7시 기상', () => {
      testSuggestion('매일 아침 7시 기상', 'routine', 'high')
    })
  })

  describe('Scenario 2: 대학생 B씨 (학업/자격증)', () => {
    it('토익 900점 달성', () => {
      const result = testSuggestion('토익 900점 달성', 'mission', 'high')
      expect(result.missionCompletionType).toBe('once')
    })

    it('매일 단어 50개 암기', () => {
      testSuggestion('매일 단어 50개 암기', 'routine', 'high')
    })

    it('주 2회 모의고사', () => {
      testSuggestion('주 2회 모의고사', 'routine', 'high')
    })

    it('문법책 완독', () => {
      // CRITICAL FIX: Must recognize "완독" as mission
      testSuggestion('문법책 완독', 'mission', 'medium')
    })

    it('리스닝 실력 향상', () => {
      // Should be mission (improvement goal without frequency)
      testSuggestion('리스닝 실력 향상', 'mission')
    })

    it('틀린 문제 복습하기', () => {
      testSuggestion('틀린 문제 복습하기', 'routine')
    })

    it('영어에 대한 두려움 극복', () => {
      // CRITICAL FIX: Must recognize "극복" as reference
      testSuggestion('영어에 대한 두려움 극복', 'reference', 'high')
    })

    it('꾸준히 학습하는 태도', () => {
      testSuggestion('꾸준히 학습하는 태도', 'reference', 'high')
    })
  })

  describe('Scenario 3: 프리랜서 C씨 (업무/재정)', () => {
    it('월 500만원 수입 달성', () => {
      const result = testSuggestion('월 500만원 수입 달성', 'mission', 'high')
      expect(result.missionCompletionType).toBe('periodic')
      expect(result.missionPeriodCycle).toBe('monthly')
    })

    it('매일 업무 계획 세우기', () => {
      testSuggestion('매일 업무 계획 세우기', 'routine', 'high')
    })

    it('주 5회 고객 미팅', () => {
      testSuggestion('주 5회 고객 미팅', 'routine', 'high')
    })

    it('신규 고객 10명 확보', () => {
      testSuggestion('신규 고객 10명 확보', 'mission', 'high')
    })

    it('포트폴리오 완성하기', () => {
      // CRITICAL FIX: Must recognize "완성" as mission
      testSuggestion('포트폴리오 완성하기', 'mission', 'medium')
    })

    it('월 1회 재정 점검', () => {
      const result = testSuggestion('월 1회 재정 점검', 'routine', 'high')
      expect(result.routineFrequency).toBe('monthly')
    })

    it('적극적인 마케팅 자세', () => {
      testSuggestion('적극적인 마케팅 자세', 'reference', 'high')
    })

    it('네트워킹 꾸준히 하기', () => {
      // Phase 1 improvement: "꾸준히" should boost confidence
      testSuggestion('네트워킹 꾸준히 하기', 'routine', 'high')
    })
  })

  describe('Scenario 4: 주부 D씨 (육아/가정)', () => {
    it('아침 식사 챙기기', () => {
      testSuggestion('아침 식사 챙기기', 'routine', 'medium')
    })

    it('주말마다 가족 나들이', () => {
      testSuggestion('주말마다 가족 나들이', 'routine')
    })

    it('아이와 대화 시간 갖기', () => {
      testSuggestion('아이와 대화 시간 갖기', 'routine')
    })

    it('육아서 5권 읽기', () => {
      testSuggestion('육아서 5권 읽기', 'mission', 'high')
    })

    it('집안일 효율적으로 처리', () => {
      // Should recognize as reference (mindset/approach)
      testSuggestion('집안일 효율적으로 처리', 'reference')
    })

    it('나만의 시간 확보하기', () => {
      // Should recognize as reference (goal/mindset)
      testSuggestion('나만의 시간 확보하기', 'reference')
    })

    it('긍정적인 육아 태도', () => {
      testSuggestion('긍정적인 육아 태도', 'reference', 'high')
    })

    it('월 2회 문화생활', () => {
      const result = testSuggestion('월 2회 문화생활', 'routine', 'high')
      expect(result.routineFrequency).toBe('monthly')
    })
  })

  describe('Scenario 5: 창업가 E씨 (사업/성장)', () => {
    it('시리즈 A 50억 유치', () => {
      testSuggestion('시리즈 A 50억 유치', 'mission', 'high')
    })

    it('매일 투자자 1명 컨택', () => {
      testSuggestion('매일 투자자 1명 컨택', 'routine', 'high')
    })

    it('IR 덱 완성', () => {
      // CRITICAL FIX: Must recognize "완성" as mission
      testSuggestion('IR 덱 완성', 'mission', 'medium')
    })

    it('주 1회 팀 회고', () => {
      testSuggestion('주 1회 팀 회고', 'routine', 'high')
    })

    it('MVP 개발 완료', () => {
      testSuggestion('MVP 개발 완료', 'mission', 'medium')
    })

    it('실패를 두려워하지 않기', () => {
      // CRITICAL FIX: Must recognize negative form as reference
      testSuggestion('실패를 두려워하지 않기', 'reference', 'high')
    })

    it('고객 중심 사고방식', () => {
      // Phase 1 improvement: "사고방식" should be recognized
      testSuggestion('고객 중심 사고방식', 'reference', 'high')
    })

    it('분기별 매출 목표 달성', () => {
      const result = testSuggestion('분기별 매출 목표 달성', 'mission', 'high')
      expect(result.missionCompletionType).toBe('periodic')
      expect(result.missionPeriodCycle).toBe('quarterly')
    })
  })

  describe('Critical Keywords - Phase 1 Improvements', () => {
    describe('Mission completion keywords', () => {
      it('완독 - book completion', () => {
        testSuggestion('영어 원서 완독', 'mission', 'medium')
      })

      it('완성 - project completion', () => {
        testSuggestion('프로젝트 완성', 'mission', 'medium')
      })

      it('클리어 - game/goal completion', () => {
        testSuggestion('과제 클리어', 'mission', 'medium')
      })

      it('정복 - conquest/mastery', () => {
        testSuggestion('문법 정복', 'mission', 'medium')
      })

      it('마스터 - skill mastery', () => {
        testSuggestion('영어 회화 마스터', 'mission', 'medium')
      })

      it('도달 - reaching goal', () => {
        testSuggestion('목표 체중 도달', 'mission', 'medium')
      })

      it('이루기 - achieving', () => {
        testSuggestion('꿈 이루기', 'mission', 'medium')
      })
    })

    describe('Reference/mindset keywords', () => {
      it('사고방식 - thinking style', () => {
        testSuggestion('긍정적 사고방식', 'reference', 'high')
      })

      it('관점 - perspective', () => {
        testSuggestion('새로운 관점 가지기', 'reference', 'high')
      })

      it('인식 - awareness', () => {
        testSuggestion('문제 인식', 'reference', 'high')
      })

      it('극복 - overcoming', () => {
        testSuggestion('어려움 극복', 'reference', 'high')
      })

      it('하지 않기 - negative form', () => {
        testSuggestion('포기하지 않기', 'reference', 'high')
      })

      it('두려워하지 - not fearing', () => {
        testSuggestion('실패를 두려워하지 않기', 'reference', 'high')
      })
    })

    describe('Routine frequency adverbs', () => {
      it('꾸준히 - consistently', () => {
        testSuggestion('꾸준히 운동하기', 'routine', 'high')
      })

      it('계속 - continuously', () => {
        testSuggestion('계속 공부하기', 'routine', 'high')
      })

      it('지속적으로 - sustainably', () => {
        testSuggestion('지속적으로 독서', 'routine', 'high')
      })

      it('항상 - always', () => {
        testSuggestion('항상 감사하는 마음', 'reference', 'high')
      })

      it('규칙적으로 - regularly', () => {
        testSuggestion('규칙적으로 식사하기', 'routine', 'high')
      })
    })
  })

  describe('Edge Cases', () => {
    it('향상 alone (no number, no frequency)', () => {
      const result = testSuggestion('실력 향상', 'mission')
      // Should still be mission but with lower confidence
      expect(result.confidence).not.toBe('high')
    })

    it('향상 with number goal', () => {
      testSuggestion('토익 100점 향상', 'mission', 'high')
    })

    it('향상 with frequency', () => {
      // "매일 실력 향상" is an abstract goal (mission), not a concrete routine
      testSuggestion('매일 실력 향상', 'mission', 'medium')
    })

    it('Time + verb combination', () => {
      const result = testSuggestion('30분 운동', 'routine')
      expect(result.routineFrequency).toBe('daily')
    })

    it('Abstract verb without context', () => {
      testSuggestion('시간 확보하기', 'reference')
      // Should recognize as reference or low confidence routine
    })

    it('Habit creation (meta-goal)', () => {
      testSuggestion('좋은 습관 만들기', 'reference')
    })
  })
})

describe('formatTypeDetails', () => {
  it('should format daily routine', () => {
    const result = formatTypeDetails({
      type: 'routine',
      routine_frequency: 'daily'
    })
    expect(result).toBe('매일')
  })

  it('should format weekly routine (weekdays)', () => {
    const result = formatTypeDetails({
      type: 'routine',
      routine_frequency: 'weekly',
      routine_weekdays: [1, 2, 3, 4, 5]
    })
    expect(result).toBe('평일')
  })

  it('should format weekly routine (weekend)', () => {
    const result = formatTypeDetails({
      type: 'routine',
      routine_frequency: 'weekly',
      routine_weekdays: [0, 6]
    })
    expect(result).toBe('주말')
  })

  it('should format weekly routine (specific days)', () => {
    const result = formatTypeDetails({
      type: 'routine',
      routine_frequency: 'weekly',
      routine_weekdays: [1, 3, 5] // Mon, Wed, Fri
    })
    expect(result).toBe('월수금')
  })

  it('should format weekly routine (count)', () => {
    const result = formatTypeDetails({
      type: 'routine',
      routine_frequency: 'weekly',
      routine_count_per_period: 3
    })
    expect(result).toBe('주3회')
  })

  it('should format monthly routine', () => {
    const result = formatTypeDetails({
      type: 'routine',
      routine_frequency: 'monthly',
      routine_count_per_period: 5
    })
    expect(result).toBe('월 5회')
  })

  it('should format one-time mission', () => {
    const result = formatTypeDetails({
      type: 'mission',
      mission_completion_type: 'once'
    })
    expect(result).toBe('1회 완료')
  })

  it('should format periodic mission', () => {
    const result = formatTypeDetails({
      type: 'mission',
      mission_completion_type: 'periodic',
      mission_period_cycle: 'quarterly'
    })
    expect(result).toBe('분기별')
  })

  it('should return empty string for reference', () => {
    const result = formatTypeDetails({
      type: 'reference'
    })
    expect(result).toBe('')
  })
})
