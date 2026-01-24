# AI Coaching Feature - PAUSED

**중단일**: 2026-01-17  
**상태**: 개발 중단 (추후 재개 가능)

---

## 📋 기능 요약

AI와 대화하며 만다라트를 함께 만드는 코칭 기능.
- 12단계 대화형 플로우 (라이프스타일 → 핵심목표 → 세부목표 8개 → 비상대책 → 최종확정)
- Perplexity AI (sonar 모델) 사용
- 실시간 만다라트 프리뷰

---

## 🔒 숨김 처리된 UI

| 파일 | 위치 | 변경 내용 |
|------|------|----------|
| `HomeScreen.tsx` | L149-151 | `<CoachingBanner />` 주석 처리 |
| `MandalartDetailScreen.tsx` | L493 | "코칭 이어하기" 버튼 제거 |
| `MethodSelector.tsx` | L16-22 | 'coaching' 옵션 주석 처리 |
| `SettingsScreen.tsx` | L793-831 | "개인정보 및 AI 데이터" 섹션 주석 처리 |

---

## 🐛 알려진 이슈 (해결 안 됨)

1. **Step 스킵 문제** - Step 11(비상대책)이 건너뛰어지는 현상
2. **Action 저장 불일치** - position 매칭은 완료했으나, 일부 0개/중복 저장
3. **AI 프롬프트 무시** - AI가 간헐적으로 지시를 무시하고 premature content 생성

---

## 📁 주요 파일 위치

### 서버 (Edge Function)
```
supabase/functions/ai-coaching/
├── index.ts              # 메인 로직 (1,880줄)
├── prompts/
│   ├── common.ts         # 공통 규칙
│   └── step-prompts.ts   # 단계별 프롬프트
├── utils/
│   ├── sanitize.ts       # 텍스트 정리
│   └── step-labels.ts    # 단계 라벨
└── tests/
    └── utils.test.ts     # 단위 테스트
```

### 클라이언트 (Mobile App)
```
apps/mobile/src/
├── screens/
│   ├── ConversationalCoachingScreen.tsx   # 메인 코칭 화면
│   ├── CoachingGateScreen.tsx             # 진입점 화면
│   └── CoachingHistoryScreen.tsx          # 대화 기록
├── components/Home/
│   └── CoachingBanner.tsx                 # 홈 배너 (숨김)
├── services/
│   └── coachingService.ts                 # API 호출
└── store/
    └── coachingStore.ts                   # Zustand 상태관리
```

### 데이터베이스
```sql
-- 테이블
coaching_sessions   -- 코칭 세션 (metadata, current_step)
coaching_costs      -- API 비용 로그

-- mandalarts 테이블 관련
coaching_session_id  -- 연결된 세션 ID
status: 'draft'      -- 코칭 중 상태
```

---

## ✅ 재개 시 TODO

1. Step 전환 로직 재설계 (forceNextStep만 사용)
2. Action position 매칭 검증
3. AI 프롬프트 간소화 및 강화
4. 전체 플로우 테스트 (새 세션으로)

---

## 🔗 관련 문서

- [코드 리뷰 리포트](file:///Users/jhsy/.gemini/antigravity/brain/cbb75bed-a34b-4748-b155-773c59c449b5/code_review_report.md)
