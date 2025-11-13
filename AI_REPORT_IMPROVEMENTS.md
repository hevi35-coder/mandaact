# AI 리포트 시스템 개선 프로젝트

**프로젝트 시작일**: 2025-11-13
**현재 상태**: 진행 중 🚧

---

## 📋 프로젝트 목표

AI 주간 리포트를 독립 페이지로 분리하고, 실천 분석과 만다라트 구조 진단 기능을 강화하여 사용자에게 더 가치있는 인사이트를 제공한다.

---

## 🏗️ 아키텍처 변경

### 이전 구조 (AS-IS)
```
홈 페이지
└── 4개 탭 시스템
    ├── AI 리포트 (주간/월간 서브탭)
    ├── 퀘스트
    ├── 인사이트
    └── 목표 예측
```

### 새로운 구조 (TO-BE)
```
네비게이션 메뉴
├── 홈 (대시보드)
├── 투데이 (오늘의 실천)
├── 만다라트 (관리)
└── 리포트 (독립 페이지) ✨ NEW
    ├── 실천 리포트 카드
    └── 목표 진단 카드
```

---

## ✅ 완료된 작업 (Phase 1)

### 1. **UI/UX 재구성** ✅
- [x] 불필요한 탭(퀘스트, 분석, 예측) 제거
- [x] 월간 리포트 제거 (주간 리포트만 유지)
- [x] 리포트 독립 페이지 생성 (`/reports`)
- [x] 네비게이션에 리포트 메뉴 추가
- [x] 홈페이지 간소화 (프로필 + 스트릭 + 빠른 액션)
- [x] 탭 시스템 → 2개 카드 시스템으로 변경

### 2. **컴포넌트 구조 개선** ✅
- [x] `AIWeeklyReport` 컴포넌트 리팩토링
- [x] `ReportsPage` 생성
- [x] 실천 리포트 / 목표 진단 카드 분리
- [x] 리포트 히스토리 기능 유지
- [x] 재생성 버튼 추가

### 3. **삭제된 컴포넌트**
- `QuestLog.tsx`
- `LiveInsights.tsx`
- `StrugglingGoals.tsx`
- `GoalPrediction.tsx`
- `AIInsightCard.tsx` (AIWeeklyReport로 대체)

---

## 🚧 진행 중인 작업 (Phase 2)

### 1. **Edge Function 개선** ✅ (2025-11-13 완료)
- [x] 만다라트 구조 데이터 수집 추가
  - `analyzeMandalartStructure()` 함수 구현
  - 채움률(fillRate), 평균 글자 수(avgTextLength) 계산
  - 실천 타입 분포(routine/mission/reference) 집계
- [x] 실천율 계산 로직 강화
  - 전주 대비 변화율(weekOverWeekChange) 추가
  - 실천 타입별 패턴 분석(actionTypePattern)
- [x] 스트릭 데이터 통합
  - user_stats 테이블에서 현재/최고 스트릭 조회
- [x] 배지 연계 데이터 추가
  - 기간 내 획득한 배지 목록 포함(recentBadges)

### 2. **프롬프트 엔지니어링** ✅ (2025-11-13 완료)
- [x] 구조화된 프롬프트 템플릿
  - 10년 경력 습관 전문가 페르소나
  - 정량적/정성적 분석 프레임워크 명시
- [x] 실행 가능한 조언 생성
  - 구체적 시간/행동 예시 요구
  - 가장 부진한 목표 집중 가이드
- [x] 톤 & 보이스 개선
  - 과도한 칭찬 지양, 숫자와 사실 기반
  - 친구처럼 편안하되 전문적
  - 이모지 최소화 (1-2개만)

### 3. **목표 진단 기능** ✅ (2025-11-13 완료)
- [x] 만다라트 품질 평가 지표 설계
  - 구조적 완성도 (채움률, 평균 텍스트 길이)
  - 실천 타입 분포 분석
- [x] SMART 원칙 검증 로직
  - Specific, Measurable, Achievable, Relevant, Time-bound
  - AI 프롬프트에 평가 프레임워크 내장
- [x] 균형 분석 알고리즘
  - 8개 서브골 집중도 평가
  - 실천 항목 분산도 분석
- [x] 실천 가능성 평가
  - 현재 실천율과 스트릭 데이터 연계
  - 개선 우선순위 제안

---

## 📊 계획된 기능 (Phase 3)

### 1. **데이터 시각화**
- [ ] 주간 체크 트렌드 차트
- [ ] 요일별 달성률 바 차트
- [ ] 시간대별 분포 도넛 차트
- [ ] 서브골별 달성률 비교

### 2. **프롬프트 엔지니어링**
- [ ] 구조화된 프롬프트 템플릿
- [ ] 개인화된 톤 & 보이스
- [ ] 구체적 액션 아이템 생성
- [ ] 진도 측정 가능한 목표 제안

### 3. **고급 분석**
- [ ] 지난주 대비 변화율
- [ ] 개인 최고 기록 비교
- [ ] 예상 목표 달성일 계산
- [ ] 패턴 기반 예측

---

## 🗂️ 데이터 구조 설계

### 실천 리포트 데이터
```typescript
interface PracticeReportData {
  // 기존 데이터
  totalChecks: number
  uniqueDays: number
  weekdayPattern: Record<number, number>
  timePattern: TimePattern
  bestSubGoal: SubGoalStat
  worstSubGoal: SubGoalStat

  // 신규 추가 예정
  currentStreak: number
  weekOverWeekChange: number
  badgesEarned: Badge[]
  nextMilestone: Milestone
}
```

### 목표 진단 데이터
```typescript
interface GoalDiagnosisData {
  // 구조 평가
  fillRate: number // 64개 중 채워진 항목 수
  avgTextLength: number
  alignmentScore: number // 서브골-액션 연관성

  // SMART 평가
  specificityScore: number
  measurabilityScore: number
  achievabilityScore: number

  // 균형 분석
  categoryBalance: CategoryBalance[]
  duplicatedItems: string[]

  // 개선 제안
  suggestions: Suggestion[]
}
```

---

## 💡 프롬프트 개선 계획

### 현재 프롬프트 (기본)
```
당신은 사용자의 목표 달성을 돕는 친근하고 격려하는 코치입니다.
사용자의 주간 활동 데이터를 분석하여 3-4문단의 리포트를 작성해주세요.
```

### 개선된 프롬프트 (계획)
```
역할: 10년 경력의 습관 형성 전문가이자 데이터 분석가

컨텍스트:
- 사용자 이름: {userName}
- 현재 스트릭: {currentStreak}일
- 주 목표: {centerGoal}
- 가장 중요한 서브골: {prioritySubGoal}

분석 프레임워크:
1. 정량적 분석 (숫자 기반)
   - 전주 대비 변화율 명시
   - 시간대별 패턴 해석
   - 요일별 특징 도출

2. 정성적 분석 (패턴 기반)
   - 강점 패턴 3가지
   - 개선 기회 1가지
   - 숨은 패턴 발견

3. 실행 가능한 제안
   - 구체적 시간 (예: "화요일 저녁 7시")
   - 구체적 장소 (예: "회사 퇴근길")
   - 구체적 행동 (예: "알람 설정하고 5분만")

톤:
- 친구처럼 편안하되 전문적
- 과도한 칭찬 지양
- 숫자와 사실 기반
- 이모지 최소화 (핵심만)
```

---

## 📈 성공 지표

### 단기 목표 (2주)
- [ ] 리포트 생성 속도 < 3초
- [ ] 사용자 피드백 수집 시스템 구축
- [ ] 주간 리포트 조회율 > 60%

### 중기 목표 (1개월)
- [ ] 목표 진단 기능 런칭
- [ ] 시각화 차트 최소 3개 추가
- [ ] 리포트 기반 목표 수정률 > 20%

### 장기 목표 (3개월)
- [ ] AI 추천 기반 만다라트 개선율 > 30%
- [ ] 주간 실천율 평균 20% 향상
- [ ] MAU 중 리포트 활용률 > 80%

---

## 🐛 알려진 이슈

1. **목표 진단 미구현**
   - 현재 "준비 중" 표시
   - Edge Function 개선 필요

2. **프롬프트 품질**
   - 너무 일반적인 조언
   - 개인화 부족

3. **데이터 부족**
   - 스트릭 데이터 미연동
   - 배지 정보 미포함

---

## 📝 개발 노트

### 2025-11-13 (오전)
- 프로젝트 시작
- Phase 1 완료: UI/UX 재구성
- 리포트 페이지 독립 완료
- 탭 → 카드 시스템 변경

### 2025-11-13 (오후 전반)
- Phase 2 부분 완료: Edge Function 개선
- `analyzeMandalartStructure()` 함수 추가
  - 만다라트 채움률, 평균 글자 수, 타입 분포 계산
- 데이터 수집 강화
  - 스트릭 데이터 통합 (user_stats 테이블)
  - 배지 데이터 통합 (user_achievements 테이블)
  - 전주 대비 변화율 계산
  - 실천 타입별 패턴 분석
- 프롬프트 엔지니어링 완료
  - 10년 경력 습관 전문가 페르소나
  - 정량적/정성적 분석 프레임워크
  - 구체적 조언 생성 가이드
  - 톤 & 보이스 개선 (과도한 칭찬 지양, 사실 기반)

### 2025-11-13 (오후 후반)
- Phase 2 완료: 목표 진단 기능 구현
- Edge Function에 'diagnosis' 리포트 타입 추가
  - SMART 원칙 기반 진단 프롬프트
  - 구조적 완성도 평가 (채움률, 텍스트 길이)
  - 실천 타입 분포 및 균형 분석
  - 건설적 개선 제안 (우선순위 3가지)
- AIWeeklyReport 컴포넌트 업데이트
  - 목표 진단 상태 관리 추가 (latestDiagnosis)
  - generateDiagnosis() 함수 구현
  - 목표 진단 카드 UI 완성 (버튼, 날짜 배지)
  - "준비 중" 상태 → 실제 진단 기능으로 전환
- Edge Function 재배포 완료

### Next Steps
1. ✅ ~~Edge Function에 만다라트 구조 분석 추가~~
2. ✅ ~~프롬프트 템플릿 개선~~
3. ✅ ~~목표 진단 로직 구현~~
4. 시각화 컴포넌트 추가 (Phase 3, 선택 사항)
5. 사용자 피드백 수집 및 개선

---

## 🔗 관련 파일

### Frontend
- `/src/pages/ReportsPage.tsx` - 리포트 페이지
- `/src/components/stats/AIWeeklyReport.tsx` - 리포트 컴포넌트

### Backend
- `/supabase/functions/generate-report/index.ts` - 리포트 생성 함수
- `/supabase/migrations/` - DB 스키마

### Documentation
- `/AI_REPORT_IMPROVEMENTS.md` - 이 문서
- `/CLAUDE.md` - 프로젝트 전체 가이드