# Action Type 자동추천 로직 개선 계획 V2

**작성일**: 2025-11-11
**버전**: 2.0 (전면 재검토)
**상태**: 사용자 시나리오 기반 분석 완료

---

## 📚 웹서치 주요 발견사항

### 2024-2025 Habit Tracker 앱 트렌드

#### 1. 카테고리 자동 분류 (Auto-Categorization)
- **Me.bot**: AI 기반 자동 카테고리화 (thoughts, ideas, files)
- **Pre-installed habits**: 토픽별 사전 카테고리 (must-have habits, morning routines)
- **User satisfaction**: 카테고리화는 필수 기능으로 간주됨

#### 2. 유연한 습관 설정 (Flexible Habit Settings)
- **HabitNow**: Daily, Weekly, Monthly habits + Recurring tasks + Single tasks (one-off)
- **Strides**: Habits, Goals, Projects를 구분하여 추적
- **핵심**: 사용자 라이프스타일에 맞춘 커스터마이징

#### 3. AI 및 적응형 기능 (AI & Adaptive Features)
- **Behavioral Pattern Analysis**: 사용자 행동 패턴 분석 후 최적화 제안
- **Adaptive Recommendations**: 사용자 데이터 기반 개인화된 추천
- **Biometric Syncing**: 생체 데이터와 연동

#### 4. 진행 상황 시각화 (Progress Visualization)
- **Home Screen Overview**: 한눈에 보이는 성취도
- **Charts & Graphs**: 시각적 표현 (progress bars, percentages, streak counters)
- **Quick Snapshot**: 빠른 현황 파악

### 시장 인사이트
- **글로벌 시장 성장**: $11.41B (2024) → $38.36B (2033), CAGR 14.41%
- **핵심 성공 요인**: Goal-setting + Tracking + Analytics 통합

---

## 👥 실제 사용자 시나리오 분석

### 시나리오 1: 직장인 A씨 (건강/자기계발)

**만다라트 주제**: "2025년 건강한 삶"

| 입력 액션 | 현재 분류 결과 | 이상적 분류 | 문제점 |
|---------|-------------|----------|-------|
| 매일 30분 운동 | 루틴 (high) ✅ | 루틴 | 정확 |
| 10kg 감량 달성 | 미션 (high) ✅ | 미션 (once) | 정확 |
| 물 2L 마시기 | 루틴 (medium) ✅ | 루틴 (daily) | 정확 |
| 주 3회 헬스장 가기 | 루틴 (high) ✅ | 루틴 (weekly) | 정확 |
| 건강한 식습관 유지 | 루틴 (low) ⚠️ | 참고 | **오분류: "유지"를 루틴 키워드로 인식 못함** |
| 스트레스 관리 마음가짐 | 참고 (high) ✅ | 참고 | 정확 |
| 금연 성공하기 | 미션 (medium) ⚠️ | 미션 (once) | **신뢰도 낮음: "성공" 키워드 인식 약함** |
| 매일 아침 7시 기상 | 루틴 (high) ✅ | 루틴 (daily) | 정확 |

**발견된 문제**:
1. "유지" 키워드가 루틴에 없어서 "건강한 식습관 유지"를 참고로 분류 못함
2. "성공하기"가 미션인데 confidence가 medium에 그침

---

### 시나리오 2: 대학생 B씨 (학업/자격증)

**만다라트 주제**: "토익 900점 달성"

| 입력 액션 | 현재 분류 결과 | 이상적 분류 | 문제점 |
|---------|-------------|----------|-------|
| 토익 900점 달성 | 미션 (high) ✅ | 미션 (once) | 정확 |
| 매일 단어 50개 암기 | 루틴 (high) ✅ | 루틴 (daily) | 정확 |
| 주 2회 모의고사 | 루틴 (high) ✅ | 루틴 (weekly) | 정확 |
| 문법책 완독 | 루틴 (low) ❌ | 미션 (once) | **심각한 오분류: "완독"을 미션으로 인식 못함** |
| 리스닝 실력 향상 | 루틴 (low) ❌ | 미션 (once) | **오분류: "향상"이 있지만 수치 목표 없어서 신뢰도 낮음** |
| 틀린 문제 복습하기 | 루틴 (medium) ⚠️ | 루틴 (daily/weekly) | 정확하나 주기 불명확 |
| 영어에 대한 두려움 극복 | 루틴 (low) ❌ | 참고 | **오분류: 마음가짐인데 루틴으로 분류** |
| 꾸준히 학습하는 태도 | 참고 (high) ✅ | 참고 | 정확 |

**발견된 문제**:
1. **"완독" 키워드 누락**: 명백한 미션인데 루틴으로 오분류
2. **"향상" 단독 사용**: 수치 목표 없으면 신뢰도 급락
3. **"극복" 키워드 누락**: 마음가짐/참고 항목인데 루틴으로 분류
4. **주기 추론 부족**: "복습하기"가 루틴인 건 맞지만 daily인지 weekly인지 불명확

---

### 시나리오 3: 프리랜서 C씨 (업무/재정)

**만다라트 주제**: "월 수입 500만원 달성"

| 입력 액션 | 현재 분류 결과 | 이상적 분류 | 문제점 |
|---------|-------------|----------|-------|
| 월 500만원 수입 달성 | 미션 (high) ✅ | 미션 (periodic, monthly) | 정확 |
| 매일 업무 계획 세우기 | 루틴 (high) ✅ | 루틴 (daily) | 정확 |
| 주 5회 고객 미팅 | 루틴 (high) ✅ | 루틴 (weekly, count-based) | 정확 |
| 신규 고객 10명 확보 | 미션 (high) ✅ | 미션 (once) | 정확 |
| 포트폴리오 완성하기 | 루틴 (low) ❌ | 미션 (once) | **심각한 오분류: "완성하기" 미인식** |
| 월 1회 재정 점검 | 루틴 (medium) ✅ | 루틴 (monthly) | 정확 |
| 적극적인 마케팅 자세 | 참고 (high) ✅ | 참고 | 정확 |
| 네트워킹 꾸준히 하기 | 루틴 (low) ⚠️ | 루틴 (weekly/monthly) | **"꾸준히" 키워드 누락, 주기 불명확** |

**발견된 문제**:
1. **"완성하기" 키워드 누락**: "완성"은 있지만 "완성하기" 형태 미인식
2. **"꾸준히" 키워드 누락**: 루틴을 나타내는 핵심 부사인데 키워드에 없음
3. **주기 추론 약함**: "꾸준히"만 있고 명시적 주기가 없으면 daily로 기본 설정

---

### 시나리오 4: 주부 D씨 (육아/가정)

**만다라트 주제**: "워라밸 잡기"

| 입력 액션 | 현재 분류 결과 | 이상적 분류 | 문제점 |
|---------|-------------|----------|-------|
| 아침 식사 챙기기 | 루틴 (medium) ✅ | 루틴 (daily) | 정확 |
| 주말마다 가족 나들이 | 루틴 (medium) ⚠️ | 루틴 (weekly, weekends) | **"주말마다" 패턴 미인식** |
| 아이와 대화 시간 갖기 | 루틴 (medium) ✅ | 루틴 (daily) | 정확 |
| 육아서 5권 읽기 | 미션 (high) ✅ | 미션 (once) | 정확 |
| 집안일 효율적으로 처리 | 루틴 (low) ❌ | 참고 | **오분류: 마음가짐인데 루틴으로 분류** |
| 나만의 시간 확보하기 | 루틴 (low) ❌ | 참고 | **오분류: 목표/마음가짐인데 루틴으로 분류** |
| 긍정적인 육아 태도 | 참고 (high) ✅ | 참고 | 정확 |
| 월 2회 문화생활 | 루틴 (medium) ✅ | 루틴 (monthly, count-based) | 정확 |

**발견된 문제**:
1. **"주말마다" 패턴 미인식**: 주기적 표현이지만 키워드에 없음
2. **"효율적으로" 같은 부사**: 마음가짐/태도를 나타내는데 참고로 분류 못함
3. **"확보하기" 같은 추상적 목표**: 실천 항목이 아닌 참고/마음가짐

---

### 시나리오 5: 창업가 E씨 (사업/성장)

**만다라트 주제**: "스타트업 시리즈 A 유치"

| 입력 액션 | 현재 분류 결과 | 이상적 분류 | 문제점 |
|---------|-------------|----------|-------|
| 시리즈 A 50억 유치 | 미션 (high) ✅ | 미션 (once) | 정확 |
| 매일 투자자 1명 컨택 | 루틴 (high) ✅ | 루틴 (daily) | 정확 |
| IR 덱 완성 | 루틴 (low) ❌ | 미션 (once) | **"완성" 미인식 (동사 형태 없음)** |
| 주 1회 팀 회고 | 루틴 (high) ✅ | 루틴 (weekly) | 정확 |
| MVP 개발 완료 | 미션 (high) ✅ | 미션 (once) | 정확 |
| 실패를 두려워하지 않기 | 루틴 (low) ❌ | 참고 | **오분류: 명백한 마음가짐인데 루틴으로 분류** |
| 고객 중심 사고방식 | 참고 (high) ✅ | 참고 | 정확 |
| 분기별 매출 목표 달성 | 미션 (high) ✅ | 미션 (periodic, quarterly) | 정확 |

**발견된 문제**:
1. **"완성" vs "완성하기"**: "완성하기"는 키워드에 없지만 "완성"은 있음 (그런데 "IR 덱 완성"은 오분류)
2. **부정형 표현**: "~하지 않기" 같은 부정형 마음가짐 미인식
3. **"사고방식" 키워드 누락**: "마음가짐", "태도"는 있지만 "사고방식"은 없음

---

## 🔍 종합 문제점 분석

### 심각도 1 (Critical): 타입 완전 오분류
| 문제 | 빈도 | 예시 | 영향 |
|-----|------|------|------|
| "완독", "완성" 미션 미인식 | 매우 높음 | "문법책 완독" → 루틴 | 사용자 신뢰도 급락 |
| 마음가짐을 루틴으로 오분류 | 높음 | "영어 두려움 극복" → 루틴 | 체크 불가능한 항목에 체크박스 표시 |
| "향상", "개선" 단독 사용 시 오분류 | 높음 | "리스닝 실력 향상" → 루틴 (low) | 목표 추적 불가 |

### 심각도 2 (High): 신뢰도 낮음
| 문제 | 빈도 | 예시 | 영향 |
|-----|------|------|------|
| 주기 추론 부족 | 높음 | "복습하기" → 루틴 (medium) | daily인지 weekly인지 불명확 |
| "꾸준히", "유지" 키워드 누락 | 중간 | "꾸준히 학습" → 루틴 (low) | 루틴인 건 맞지만 신뢰도 낮음 |
| 부정형 마음가짐 미인식 | 낮음 | "실패를 두려워하지 않기" → 루틴 | 참고로 분류해야 함 |

### 심각도 3 (Medium): 주기 세부사항 불명확
| 문제 | 빈도 | 예시 | 영향 |
|-----|------|------|------|
| "주말마다" 같은 패턴 미인식 | 중간 | "주말마다 나들이" → 루틴 (medium) | 요일 지정 못함 |
| Count-based 주기 추론 약함 | 낮음 | 대부분 명시적으로 "주 3회" 입력 | 영향 적음 |

---

## 🎯 개선 계획 (재수립)

### Phase 1: 핵심 키워드 확장 (Critical 문제 해결)

#### 1.1 미션 완료 키워드 확장
**현재 문제**: "완독", "완성", "끝내기" 같은 명백한 완료 표현 누락

```typescript
// 기존
const hasCompletionKeyword = /달성|취득|완료|마치기|끝내기|획득|통과|성공|성취|감량|증가|향상|개선|증진/.test(lower)

// 개선
const hasCompletionKeyword = /달성|취득|완료|마치기|끝내기|획득|통과|성공|성취|감량|증가|향상|개선|증진|완독|완성|클리어|정복|마스터|도달|이루기/.test(lower)
```

**예상 효과**:
- "문법책 완독" → 미션 (high) ✅
- "IR 덱 완성" → 미션 (high) ✅
- "포트폴리오 완성하기" → 미션 (high) ✅

#### 1.2 참고/마음가짐 키워드 확장
**현재 문제**: 추상적 목표, 태도, 사고방식 관련 표현 누락

```typescript
// 기존
const hasReferenceKeyword = /마음|태도|정신|자세|생각|마인드|가치|철학|원칙|명언|다짐|신념|기준|명심/.test(lower)

// 개선
const hasReferenceKeyword = /마음|태도|정신|자세|생각|마인드|가치|철학|원칙|명언|다짐|신념|기준|명심|사고방식|관점|시각|인식|깨달음|교훈|지향|지혜/.test(lower)

// 부정형 패턴 추가
const isNegativeReference = /~하지\s*않기|두려워하지|망설이지|포기하지/.test(lower)
```

**예상 효과**:
- "영어 두려움 극복" → 참고 (high) ✅
- "실패를 두려워하지 않기" → 참고 (high) ✅
- "고객 중심 사고방식" → 참고 (high) ✅

#### 1.3 루틴 빈도 부사 추가
**현재 문제**: "꾸준히", "계속", "지속적으로" 같은 루틴 부사 누락

```typescript
// 새로운 패턴 추가
const hasRoutineAdverb = /꾸준히|계속|지속적으로|항상|매번|규칙적으로|반복적으로|습관적으로/.test(lower)

// Priority 4.5 (routineAdverb + verb)
if (hasRoutineAdverb && hasRoutineVerb) {
  return {
    type: 'routine',
    confidence: 'high',
    reason: '꾸준한 실천으로 보여요',
    routineFrequency: 'daily'
  }
}
```

**예상 효과**:
- "꾸준히 학습하기" → 루틴 (high) ✅
- "계속 운동하기" → 루틴 (high) ✅
- "지속적으로 독서" → 루틴 (high) ✅

---

### Phase 2: 복합 패턴 인식 (High 문제 해결)

#### 2.1 "향상", "개선" + 맥락 분석
**현재 문제**: "향상", "개선"만 있으면 미션인지 루틴인지 불명확

```typescript
// 개선 로직
const hasImprovementKeyword = /향상|개선|증진|발전|성장/.test(lower)

if (hasImprovementKeyword) {
  // 수치 목표 있으면 → 미션
  if (hasNumberGoal) {
    return { type: 'mission', confidence: 'high', reason: '수치 목표가 있는 개선 목표예요' }
  }

  // 주기 키워드 있으면 → 루틴
  if (hasDailyKeyword || hasWeeklyKeyword || hasMonthlyKeyword) {
    return { type: 'routine', confidence: 'high', reason: '주기적으로 개선하는 루틴이에요' }
  }

  // 둘 다 없으면 → 미션 (기본값, 하지만 medium confidence)
  return { type: 'mission', confidence: 'medium', reason: '개선 목표로 보여요 (수치나 주기 추가 권장)' }
}
```

**예상 효과**:
- "리스닝 실력 향상" → 미션 (medium) ⚠️ (사용자에게 수치 입력 권장)
- "매일 실력 향상" → 루틴 (high) ✅
- "토익 100점 향상" → 미션 (high) ✅

#### 2.2 "유지", "확보" 같은 추상적 동사 처리
**현재 문제**: 실천 가능 여부 판단 어려움

```typescript
// 추상적 동사 목록
const abstractVerbs = /유지|확보|갖기|만들기|되기|하기/.test(lower)

if (abstractVerbs) {
  // 마음가짐 키워드와 함께 사용되면 → 참고
  if (hasReferenceKeyword) {
    return { type: 'reference', confidence: 'high' }
  }

  // 시간 관련이면 → 참고
  if (/시간.*확보|시간.*갖기/.test(lower)) {
    return { type: 'reference', confidence: 'medium', reason: '구체적인 실천 방법 추가 권장' }
  }

  // 습관, 루틴 관련이면 → 참고
  if (/습관.*만들기/.test(lower)) {
    return { type: 'reference', confidence: 'medium', reason: '구체적인 습관 내용 추가 권장' }
  }

  // 명확한 맥락 없으면 → low confidence routine
  return { type: 'routine', confidence: 'low', reason: '구체적인 실천 방법을 추가하면 더 정확해져요' }
}
```

**예상 효과**:
- "건강한 식습관 유지" → 참고 (high) ✅
- "나만의 시간 확보하기" → 참고 (medium) ⚠️
- "좋은 습관 만들기" → 참고 (medium) ⚠️

---

### Phase 3: 주기 추론 개선 (Medium 문제 해결)

#### 3.1 맥락 기반 주기 추론
**현재 문제**: 명시적 주기 없으면 무조건 daily

```typescript
// 동사별 일반적 주기 추론
const verbFrequencyHints: Record<string, RoutineFrequency> = {
  '복습': 'daily',      // 매일 복습
  '점검': 'weekly',     // 주간 점검
  '회고': 'weekly',     // 주간 회고
  '정리': 'daily',      // 매일 정리
  '계획': 'daily',      // 매일 계획
  '나들이': 'weekly',   // 주말 나들이
  '미팅': 'weekly',     // 주간 미팅
  '보고': 'weekly',     // 주간 보고
}

// 동사 추출 및 힌트 활용
const verb = extractMainVerb(title)
const suggestedFrequency = verbFrequencyHints[verb] || 'daily'
```

**예상 효과**:
- "틀린 문제 복습하기" → 루틴 (medium, daily) ✅
- "주간 회고 진행" → 루틴 (medium, weekly) ✅
- "월간 재정 점검" → 루틴 (medium, monthly) ✅

#### 3.2 "주말마다" 같은 패턴 인식
**현재 문제**: "주말마다", "평일마다" 같은 표현 미인식

```typescript
// 새로운 패턴 추가
const hasWeekendPattern = /주말마다|주말에|토|일/.test(lower)
const hasWeekdayPattern = /평일마다|평일에|월화수목금/.test(lower)

if (hasWeekendPattern) {
  return {
    type: 'routine',
    confidence: 'high',
    reason: '주말 루틴으로 보여요',
    routineFrequency: 'weekly',
    routineWeekdays: [0, 6] // 토, 일
  }
}

if (hasWeekdayPattern) {
  return {
    type: 'routine',
    confidence: 'high',
    reason: '평일 루틴으로 보여요',
    routineFrequency: 'weekly',
    routineWeekdays: [1, 2, 3, 4, 5] // 월-금
  }
}
```

**예상 효과**:
- "주말마다 가족 나들이" → 루틴 (high, weekly, 토일) ✅
- "평일 아침 운동" → 루틴 (high, weekly, 월-금) ✅

---

### Phase 4: UI 개선 및 사용자 피드백 루프

#### 4.1 Confidence 레벨별 UI 안내
```typescript
// Low confidence → 사용자 확인 필수
if (suggestion.confidence === 'low') {
  return (
    <Alert variant="warning">
      <AlertTitle>⚠️ 자동 분류 결과를 확인해주세요</AlertTitle>
      <AlertDescription>
        "{title}"을(를) <strong>{getActionTypeLabel(suggestion.type)}</strong>로 분류했어요.
        <br />
        <strong>이유:</strong> {suggestion.reason}
        <br />
        <strong>권장:</strong> 더 구체적으로 입력하면 정확도가 높아져요.
        <br />
        <Button variant="link" size="sm">분류 수정하기</Button>
      </AlertDescription>
    </Alert>
  )
}

// Medium confidence → 확인 권장
if (suggestion.confidence === 'medium') {
  return (
    <Alert variant="info">
      <AlertTitle>💡 자동 분류 결과</AlertTitle>
      <AlertDescription>
        "{title}"을(를) <strong>{getActionTypeLabel(suggestion.type)}</strong>로 분류했어요.
        <br />
        <strong>이유:</strong> {suggestion.reason}
        <br />
        맞지 않으면 수정해주세요.
      </AlertDescription>
    </Alert>
  )
}

// High confidence → 간단 표시
if (suggestion.confidence === 'high') {
  return (
    <Badge variant="success">
      {getActionTypeLabel(suggestion.type)} (자동 분류)
    </Badge>
  )
}
```

#### 4.2 일괄 분류 검토 UI (만다라트 생성 시)
```typescript
// 64개 액션 생성 후 분류 결과 요약 표시
<Card>
  <CardHeader>
    <CardTitle>자동 분류 결과 요약</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <div className="flex justify-between">
        <span>루틴</span>
        <span>{routineCount}개</span>
      </div>
      <div className="flex justify-between">
        <span>미션</span>
        <span>{missionCount}개</span>
      </div>
      <div className="flex justify-between">
        <span>참고</span>
        <span>{referenceCount}개</span>
      </div>

      {lowConfidenceCount > 0 && (
        <Alert variant="warning">
          <AlertDescription>
            {lowConfidenceCount}개 항목이 불명확합니다. 확인해주세요.
          </AlertDescription>
        </Alert>
      )}
    </div>
  </CardContent>
</Card>
```

#### 4.3 사용자 수정 이력 수집 (향후 학습 데이터)
```typescript
// 사용자가 자동 분류 결과를 수정할 때 로깅
interface ClassificationFeedback {
  action_title: string
  suggested_type: ActionType
  suggested_confidence: Confidence
  user_corrected_type: ActionType
  created_at: timestamp
  user_id: string
}

// 피드백 데이터로 패턴 분석 가능
// 예: "완독" → 루틴으로 자동 분류 → 사용자가 미션으로 수정 (10회 발생)
// → "완독" 키워드를 미션 키워드에 추가
```

---

## 📊 예상 개선 효과 (재측정)

### 정량적 목표
| 지표 | 현재 (추정) | Phase 1 후 | Phase 2 후 | Phase 3 후 | 최종 목표 |
|-----|-----------|----------|----------|----------|---------|
| 전체 정확도 | 70% | 80% | 85% | 87% | 85%+ |
| High Confidence 비율 | 50% | 65% | 70% | 75% | 70%+ |
| Critical 오분류율 | 15% | 5% | 3% | 2% | 5% 이하 |
| 사용자 수정률 | 30% | 20% | 15% | 12% | 15% 이하 |

### 시나리오별 정확도 (Phase 1 후 예상)
| 시나리오 | 정확도 (현재) | 정확도 (개선 후) | 주요 개선 사항 |
|---------|------------|---------------|-------------|
| 직장인 A (건강) | 75% (6/8) | 100% (8/8) | "유지", "성공하기" 키워드 추가 |
| 대학생 B (학업) | 50% (4/8) | 88% (7/8) | "완독", "극복" 키워드 추가 |
| 프리랜서 C (업무) | 63% (5/8) | 100% (8/8) | "완성하기", "꾸준히" 추가 |
| 주부 D (육아) | 50% (4/8) | 88% (7/8) | "효율적으로", "확보하기" 처리 |
| 창업가 E (사업) | 63% (5/8) | 88% (7/8) | "완성", 부정형 마음가짐 처리 |

### 정성적 효과
1. **사용자 신뢰도 향상**: Critical 오분류 급감으로 "이상하게 분류된다"는 불만 해소
2. **입력 편의성 증가**: 자연스러운 표현 그대로 입력해도 정확하게 분류
3. **통계 데이터 품질**: 올바른 타입 분류로 진행률, 완료율 통계 정확도 향상
4. **학습 데이터 축적**: 사용자 수정 이력으로 지속적 개선 가능

---

## 🚀 구현 우선순위 (재조정)

### 🔴 Priority 1: Critical 문제 해결 (1-2일)
- [x] 웹서치 및 시나리오 분석 완료
- [ ] **Phase 1.1**: 미션 완료 키워드 확장 ("완독", "완성", "클리어" 등)
- [ ] **Phase 1.2**: 참고/마음가짐 키워드 확장 ("사고방식", 부정형 패턴 등)
- [ ] **Phase 1.3**: 루틴 빈도 부사 추가 ("꾸준히", "계속" 등)
- [ ] **테스트**: 5개 시나리오 재검증 (40개 항목)

### 🟡 Priority 2: High 문제 해결 (2-3일)
- [ ] **Phase 2.1**: "향상", "개선" + 맥락 분석 로직
- [ ] **Phase 2.2**: 추상적 동사 처리 로직 ("유지", "확보" 등)
- [ ] **UI**: Low/Medium Confidence 경고 UI 추가
- [ ] **테스트**: Edge case 추가 검증

### 🟢 Priority 3: Medium 문제 해결 (3-4일)
- [ ] **Phase 3.1**: 맥락 기반 주기 추론
- [ ] **Phase 3.2**: "주말마다", "평일마다" 패턴 인식
- [ ] **UI**: 일괄 분류 검토 UI (만다라트 생성 시)
- [ ] **테스트**: 주기 추론 정확도 검증

### ⚪ Priority 4: 향후 검토 (2-4주)
- [ ] **Phase 4.3**: 사용자 수정 이력 수집
- [ ] **ML 도입**: 수집된 데이터로 학습 모델 구축 검토
- [ ] **A/B 테스트**: 개선 전후 사용자 만족도 비교

---

## 📝 다음 단계

### 즉시 시작 (Priority 1)
1. `src/lib/actionTypes.ts` 키워드 확장
   - hasCompletionKeyword에 "완독", "완성", "클리어" 등 추가
   - hasReferenceKeyword에 "사고방식", 부정형 패턴 추가
   - hasRoutineAdverb 새로운 패턴 추가

2. 테스트 케이스 작성
   - `src/lib/__tests__/actionTypes.test.ts` 생성
   - 5개 시나리오 40개 항목 테스트 코드 작성

3. 검증 및 조정
   - 실제 테스트 결과 확인
   - 필요시 키워드 추가 조정

### 이후 진행 (Priority 2-3)
4. 복합 패턴 인식 로직 구현
5. UI 개선 (경고 메시지, 일괄 검토)
6. 사용자 피드백 수집 시스템 구축

---

**최종 업데이트**: 2025-11-11 (V2 - 전면 재검토 완료)
**다음 작업**: Phase 1 키워드 확장 구현
