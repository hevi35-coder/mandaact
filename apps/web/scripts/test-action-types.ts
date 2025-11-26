// Manual test script for action type suggestions
// Run with: npx tsx scripts/test-action-types.ts

import { suggestActionType } from '../src/lib/actionTypes'

// Test cases from user scenarios
const testCases = [
  // Scenario 1: 직장인 (건강)
  { title: '매일 30분 운동', expected: 'routine', critical: false },
  { title: '10kg 감량 달성', expected: 'mission', critical: false },
  { title: '건강한 식습관 유지', expected: 'reference', critical: true },
  { title: '금연 성공하기', expected: 'mission', critical: true },

  // Scenario 2: 대학생 (학업)
  { title: '문법책 완독', expected: 'mission', critical: true },
  { title: '리스닝 실력 향상', expected: 'mission', critical: false },
  { title: '영어에 대한 두려움 극복', expected: 'reference', critical: true },
  { title: '꾸준히 학습하는 태도', expected: 'reference', critical: false },

  // Scenario 3: 프리랜서 (업무)
  { title: '포트폴리오 완성하기', expected: 'mission', critical: true },
  { title: '네트워킹 꾸준히 하기', expected: 'routine', critical: true },

  // Scenario 4: 주부 (육아)
  { title: '집안일 효율적으로 처리', expected: 'reference', critical: false },
  { title: '나만의 시간 확보하기', expected: 'reference', critical: false },
  { title: '주말마다 가족 나들이', expected: 'routine', critical: true }, // Phase 3.2

  // Phase 3 additional tests
  { title: '팀 회고 진행', expected: 'routine', critical: false }, // Should infer weekly
  { title: '재정 점검하기', expected: 'routine', critical: false }, // Should infer monthly
  { title: '평일 아침 운동', expected: 'routine', critical: true }, // Phase 3.2

  // Scenario 5: 창업가 (사업)
  { title: 'IR 덱 완성', expected: 'mission', critical: true },
  { title: '실패를 두려워하지 않기', expected: 'reference', critical: true },
  { title: '고객 중심 사고방식', expected: 'reference', critical: true },

  // Critical keywords
  { title: '영어 원서 완독', expected: 'mission', critical: true },
  { title: '프로젝트 완성', expected: 'mission', critical: true },
  { title: '과제 클리어', expected: 'mission', critical: true },
  { title: '문법 정복', expected: 'mission', critical: true },
  { title: '영어 회화 마스터', expected: 'mission', critical: true },
  { title: '목표 체중 도달', expected: 'mission', critical: true },
  { title: '긍정적 사고방식', expected: 'reference', critical: true },
  { title: '포기하지 않기', expected: 'reference', critical: true },
  { title: '꾸준히 운동하기', expected: 'routine', critical: true },
  { title: '계속 공부하기', expected: 'routine', critical: true },
]

console.log('🧪 Action Type Suggestion Test Results\n')
console.log('='.repeat(80))

let totalTests = 0
let passedTests = 0
let criticalTests = 0
let criticalPassed = 0

testCases.forEach(({ title, expected, critical }) => {
  const result = suggestActionType(title)
  const passed = result.type === expected
  totalTests++
  if (passed) passedTests++

  if (critical) {
    criticalTests++
    if (passed) criticalPassed++
  }

  const icon = passed ? '✅' : '❌'
  const criticalLabel = critical ? ' 🔴 CRITICAL' : ''

  console.log(`${icon} "${title}"`)
  console.log(`   Expected: ${expected} | Got: ${result.type} (${result.confidence})`)
  console.log(`   Reason: ${result.reason}${criticalLabel}`)

  // Show frequency and weekdays for routines
  if (result.type === 'routine') {
    if (result.routineFrequency) {
      console.log(`   Frequency: ${result.routineFrequency}`)
    }
    if (result.routineWeekdays && result.routineWeekdays.length > 0) {
      const weekdayNames = ['일', '월', '화', '수', '목', '금', '토']
      const days = result.routineWeekdays.map(d => weekdayNames[d]).join(', ')
      console.log(`   Weekdays: ${days}`)
    }
  }

  console.log()
})

console.log('='.repeat(80))
console.log('\n📊 Test Results Summary:\n')
console.log(`Total Tests: ${totalTests}`)
console.log(`Passed: ${passedTests} / ${totalTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`)
console.log(`Failed: ${totalTests - passedTests}`)
console.log()
console.log(`🔴 Critical Tests: ${criticalTests}`)
console.log(`Critical Passed: ${criticalPassed} / ${criticalTests} (${((criticalPassed / criticalTests) * 100).toFixed(1)}%)`)
console.log(`Critical Failed: ${criticalTests - criticalPassed}`)
console.log()

if (passedTests === totalTests) {
  console.log('🎉 All tests passed!')
} else {
  console.log('⚠️  Some tests failed. Review the results above.')
}

if (criticalPassed === criticalTests) {
  console.log('🎯 All critical tests passed!')
} else {
  console.log('🚨 Some critical tests failed. These must be fixed!')
}
