# AI Report System Improvement Plan

## Executive Summary

The current AI report system collects 15+ data metrics but only displays AI-generated text, creating a significant data utilization gap. This improvement plan addresses:
- Separation of data display from AI insights
- Prompt consistency and structured output
- UI/UX restructuring with visual data representation
- Tone standardization across reports

**Key Principle**: AI generates insights only; system displays raw metrics directly.

---

## 🎯 Core Problems Identified

### 1. Data Utilization Gap
- **Current**: 15+ metrics collected → Sent to AI → AI reformats as text → Only text displayed
- **Impact**: Triple processing, data loss, inconsistency
- **Solution**: Direct display of metrics in UI, AI provides insights only

### 2. AI Output Inconsistency
- **Current**: AI generates both numbers and insights in markdown
- **Impact**: Different formats/lengths each time, parsing difficulties
- **Solution**: Structured JSON output with clear separation

### 3. Summary/Detail Ambiguity
- **Current**: Parser extracts whatever AI puts in "핵심 지표" section
- **Impact**: Unpredictable summary content
- **Solution**: Fixed summary structure with system-controlled metrics

### 4. Missing Data Visualization
- **Current**: All data as text, no charts or visual comparisons
- **Impact**: Poor data comprehension, longer reading time
- **Solution**: Add charts, progress bars, visual indicators

---

## 📋 Implementation Phases

### Phase 1: AI Prompt Restructuring (Priority 1)
**Timeline**: 1-2 days | **Impact**: High | **Effort**: Low

#### Changes Required:
1. **Restructure AI Prompts** to return JSON format
2. **Remove number generation** from AI instructions
3. **Standardize tone** across both report types
4. **Add response validation**

#### New Weekly Report Prompt:
```javascript
systemPrompt = `당신은 데이터 분석 전문가입니다.
사용자의 실천 패턴을 분석하여 인사이트만 제공하세요.

응답 형식 (JSON):
{
  "headline": "이번 주 가장 중요한 패턴이나 변화를 한 문장으로",
  "strengths": [
    "강점 1: 구체적 패턴 (예: 목요일 저녁 시간대 집중도 높음)",
    "강점 2: 지속 가능한 행동 (예: 루틴 실천률 안정적 유지)"
  ],
  "improvements": [
    "개선점 1: 구체적 문제 → 실행 가능한 액션",
    "개선점 2: 패턴 기반 제안"
  ],
  "next_focus": "다음 주 우선순위 1가지"
}

작성 규칙:
- 숫자는 절대 포함하지 마세요 (UI가 표시함)
- 패턴과 맥락을 분석하세요
- 실행 가능한 조언 (시간/요일/방법 포함)
- 과도한 칭찬 지양, 건설적 톤`
```

#### New Diagnosis Report Prompt:
```javascript
systemPrompt = `당신은 만다라트 구조 분석 전문가입니다.
SMART 원칙 기반으로 개선 방향만 제시하세요.

응답 형식 (JSON):
{
  "headline": "만다라트 현재 상태 평가 (1문장)",
  "strengths": [
    "잘된 점 1: 구조적 강점",
    "잘된 점 2: 실천 설계 강점"
  ],
  "improvements": [
    "개선 영역 1: 문제 → 구체적 해결방법",
    "개선 영역 2: 문제 → 구체적 해결방법"
  ],
  "next_focus": "가장 우선해야 할 개선 과제 1가지"
}

작성 규칙:
- 숫자/비율은 포함하지 마세요
- SMART 원칙 적용
- 구조적 문제 지적
- 실행 가능한 개선방법`
```

---

### Phase 2: Data Structure Refactoring (Priority 2)
**Timeline**: 3-4 days | **Impact**: High | **Effort**: Medium

#### New Response Structure:
```typescript
{
  success: true,
  report: {
    // AI가 생성한 인사이트만
    ai_insights: {
      headline: string,
      strengths: string[],
      improvements: string[],
      next_focus: string
    },

    // UI에서 직접 표시할 메트릭
    metrics: {
      volume: {
        totalChecks: number,
        uniqueDays: number,
        weekOverWeekChange: number,
        targetDays: number
      },
      streak: {
        current: number,
        longest: number,
        lastCheckDate: string
      },
      patterns: {
        bestDay: { day: string, count: number },
        worstDay: { day: string, count: number },
        bestTime: { period: string, count: number },
        weekdayDistribution: Record<string, number>,
        timeDistribution: Record<string, number>
      },
      goals: {
        best: { title: string, count: number },
        worst: { title: string, count: number },
        distribution: Record<string, { title: string, count: number }>
      }
    },

    // 진단 리포트용 추가 데이터
    structure?: {
      fillRate: number,
      totalItems: number,
      filledItems: number,
      avgTextLength: number,
      typeDistribution: { routine: number, mission: number, reference: number }
    }
  }
}
```

---

### Phase 3: UI Component Improvements (Priority 3)
**Timeline**: 5-7 days | **Impact**: High | **Effort**: High

#### New UI Structure:
```
┌─ 실천 리포트 카드 ────────────────────────────┐
│ 📊 실천 리포트                    [11월 13일] │
├───────────────────────────────────────────────┤
│ [요약 - 항상 표시]                            │
│                                               │
│ 💬 AI 헤드라인                               │
│ "목요일 저녁 시간대 실천 집중도가 높았습니다"│
│                                               │
│ 📊 핵심 지표 [시스템 표시]                   │
│ ┌──────────┬──────────┬──────────┐          │
│ │ 총 실천  │ 활동일   │ 스트릭   │          │
│ │ 42회     │ 6/7일    │ 12일 🔥  │          │
│ │ +15% ↑   │          │          │          │
│ └──────────┴──────────┴──────────┘          │
│                                               │
│ 📈 패턴 요약 [시스템 표시]                   │
│ • 최고: 목요일 (12회)                        │
│ • 시간: 저녁 (18회)                          │
│ • 목표: 운동 (15회)                          │
├───────────────────────────────────────────────┤
│ [상세 - 접을 수 있음]                        │
│ 👇 상세 분석 보기                            │
├───────────────────────────────────────────────┤
│ 💪 강점 [AI 인사이트]                        │
│ • 목요일 저녁 시간대 집중도 높음             │
│ • 루틴 실천률 안정적 유지                    │
│                                               │
│ ⚡ 개선 포인트 [AI 인사이트]                 │
│ • 화요일 공백 → 오후 3시 알림 설정           │
│ • 주말 실천률 낮음 → 토요일 루틴 추가        │
│                                               │
│ 🎯 다음 주 목표 [AI 인사이트]                │
│ • 화요일 실천 1회 이상 추가하기              │
│                                               │
│ 📊 상세 차트 [시스템 표시]                   │
│ [요일별 막대 차트]                           │
│ [시간대별 파이 차트]                         │
└───────────────────────────────────────────────┘
```

#### New Components to Create:
1. **MetricCard.tsx** - 지표 카드 컴포넌트
2. **PatternSummary.tsx** - 패턴 요약 컴포넌트
3. **ChartSection.tsx** - 차트 섹션 (Recharts)

---

### Phase 4: Enhanced Metrics (Priority 4)
**Timeline**: 2-3 days | **Impact**: Medium | **Effort**: Medium

#### New Metrics to Add:

1. **일관성 점수 (Consistency Score)**
   - 일별 실천 횟수의 분산 측정
   - 0-100점 (낮은 분산 = 높은 일관성)

2. **균형 점수 (Balance Score)**
   - 서브골 간 실천 분포 균등성
   - 0-100점 (균등 분포 = 높은 균형)

3. **모멘텀 지표 (Momentum Indicator)**
   - 주 초반 4일 vs 후반 3일 비교
   - "상승" | "안정" | "하락"

4. **최적 시간대 분석 (Optimal Time Window)**
   - 가장 활발한 2시간 구간 찾기
   - 예: "저녁 7-9시 (25회)"

5. **SMART 준수도 (SMART Compliance)**
   - 액션 텍스트의 구체성 분석
   - Specific, Measurable, Achievable 점수

---

## 📊 구현 우선순위

### 즉시 실행 (1-2일)
1. ✅ **AI 프롬프트 개선**
   - JSON 형식으로 변경
   - 숫자 생성 제거
   - 톤 통일

### 단기 실행 (3-5일)
2. ✅ **데이터 구조 개선**
   - Edge Function 응답 형식 변경
   - AI 인사이트와 메트릭 분리

3. ✅ **기본 UI 개선**
   - MetricCard 컴포넌트 생성
   - 요약 섹션 시스템 메트릭 표시

### 중기 실행 (5-10일)
4. ⭕ **차트 통합**
   - Recharts 설치
   - 요일별/시간대별 차트 추가

5. ⭕ **고급 메트릭 추가**
   - 일관성, 균형, 모멘텀 점수
   - SMART 분석

---

## 📝 파일별 변경 사항

### 1. Edge Function
**파일**: `/supabase/functions/generate-report/index.ts`

**변경 내용**:
- Line 413-596: 프롬프트 전면 재작성 (JSON 형식)
- Line 75-95: 응답 형식 구조 변경
- Line 340-410: 새 메트릭 계산 추가
- Line 596+: validateAIResponse 함수 추가

### 2. Frontend Component
**파일**: `/src/components/stats/AIWeeklyReport.tsx`

**변경 내용**:
- Line 183-186: 새 파서 함수 사용
- Line 307-330: MetricCard 컴포넌트로 교체
- Line 334-386: 상세 섹션 재구성 (AI 인사이트만)

### 3. 신규 파일
- `/src/components/stats/MetricCard.tsx` (~80 LOC)
- `/src/components/stats/PatternSummary.tsx` (~60 LOC)
- `/src/components/stats/ChartSection.tsx` (~150 LOC)
- `/src/lib/smartAnalysis.ts` (~120 LOC)

---

## ✅ 성공 지표

### 정량적 지표
- AI 응답 파싱 성공률: >99%
- 표시되는 메트릭 수: 12-15개 (현재 3-5개)
- 상세 섹션 열람률: +30%
- 리포트 생성 시간: <5초 유지

### 정성적 지표
- 일관된 톤과 형식
- 데이터와 인사이트의 명확한 분리
- 실행 가능한 추천사항
- 전문적이고 데이터 중심적인 외관

---

## 🚨 리스크 및 대응

### 리스크 1: AI JSON 준수
- **문제**: AI가 JSON 형식을 정확히 따르지 않을 수 있음
- **대응**: 명시적 예시 추가, 검증 및 재시도 (최대 2회)

### 리스크 2: 차트 성능
- **문제**: 모바일에서 Recharts가 느릴 수 있음
- **대응**: Lazy loading, 경량 대안 검토, 토글 옵션

### 리스크 3: 하위 호환성
- **문제**: 기존 리포트 표시 오류 가능
- **대응**: 포맷 감지 로직, 레거시 폴백, 재생성 버튼

---

## 📅 다음 단계

1. **계획 검토 및 승인** (현재)
2. **Phase 1 구현** - AI 프롬프트 개선 (Day 1-2)
3. **Phase 2 구현** - 데이터 구조 개선 (Day 3-5)
4. **Phase 3 구현** - UI 컴포넌트 개선 (Day 6-10)
5. **Phase 4 구현** - 고급 기능 추가 (Day 11-13)
6. **테스트 및 배포** (Day 14)

---

**문서 버전**: 1.0
**작성일**: 2025-11-13
**상태**: 검토 대기중