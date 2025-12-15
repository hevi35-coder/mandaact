// Dump action type suggestion results (KO/EN) for quick review.
// Run with: npx tsx scripts/dump-action-type-suggestions-v2.ts

import { suggestActionTypeV2 } from '@mandaact/shared'

type Case = { id: string; ko: string; en: string }

const CASES: Case[] = [
  { id: 'C01', ko: '매일 30분 운동', en: 'Work out 30 minutes daily' },
  { id: 'C02', ko: '주 3회 헬스장 가기', en: 'Gym 3 times per week' },
  { id: 'C03', ko: '월수금 요가', en: 'Mon Wed Fri yoga' },
  { id: 'C04', ko: '주말마다 가족 나들이', en: 'Family outing on weekends' },
  { id: 'C05', ko: '자격증 취득', en: 'Get AWS certification' },
  { id: 'C06', ko: '실패를 두려워하지 않기', en: 'Do not fear failure' },
]

function row(title: string) {
  const r = suggestActionTypeV2(title)
  const s = r.extracted_settings
  return {
    type: r.type,
    confidence: r.confidence,
    reason_code: r.reason_code,
    routine_frequency: s.routine_frequency ?? '',
    routine_weekdays: Array.isArray(s.routine_weekdays) ? s.routine_weekdays.join(',') : '',
    routine_count_per_period: s.routine_count_per_period ?? '',
    mission_completion_type: s.mission_completion_type ?? '',
    mission_period_cycle: s.mission_period_cycle ?? '',
  }
}

console.log([
  'case_id',
  'lang',
  'title',
  'type',
  'confidence',
  'reason_code',
  'routine_frequency',
  'routine_weekdays',
  'routine_count_per_period',
  'mission_completion_type',
  'mission_period_cycle',
].join('\t'))

for (const c of CASES) {
  for (const [lang, title] of [['ko', c.ko], ['en', c.en]] as const) {
    const r = row(title)
    console.log([
      c.id,
      lang,
      title,
      r.type,
      r.confidence,
      r.reason_code,
      r.routine_frequency,
      r.routine_weekdays,
      r.routine_count_per_period,
      r.mission_completion_type,
      r.mission_period_cycle,
    ].join('\t'))
  }
}

