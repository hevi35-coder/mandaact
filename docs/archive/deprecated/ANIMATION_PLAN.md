# 애니메이션 계층형 정책 구현 계획

**작성일:** 2025-11-12
**상태:** 계획 단계
**목표:** 역할별로 차별화된 애니메이션 시스템을 구축하여 UserProfileCard의 특별함을 유지하면서도 프로젝트 전체의 일관성을 확보

---

## 배경

### 현재 상황 분석

**UserProfileCard의 특별한 애니메이션:**
```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}  // 다른 카드보다 느림
>
```

**왜 느낌이 좋은가?**
- 0.5초 duration으로 다른 카드들(0.3초 또는 spring)보다 약간 느림
- 단일 진입으로 우아하고 차분함
- 사용자 정체성을 나타내는 카드로서 무게감 표현

### 문제점

**불일치 항목:**
- Duration: `0.5s` vs `0.3s` vs 명시 없음
- Spring 설정: `200/15` vs `300/10` vs `200/20`
- Stagger 간격: `0.01s` vs `0.05s` vs `0.1s`
- Exit 애니메이션: AIInsightCard만 있음

**컴포넌트별 현황:**

| 컴포넌트 | 진입 애니메이션 | Stagger | 특징 |
|---------|----------------|---------|------|
| UserProfileCard | `0.5s linear` | ❌ | 차분한 단일 진입 |
| StreakHero | `spring` | 히트맵 0.01s | 활발한 스프링 |
| QuestLog | `0.1s 스태거` | 그룹+항목 | 계층적 등장 |
| AIInsightCard | `0.3s` + exit | 단락 0.1s | 상태 전환 |
| GoalPrediction | `0.1s 스태거` | 카드별 | 순차 등장 |
| LiveInsights | `0.1s 스태거` | 카드별 | 순차 등장 |
| StrugglingGoals | `0.1s 스태거` | 중첩 | 측면 진입 |

---

## 선택한 방향: 옵션 A - 계층형 정책

**핵심 원칙:**
1. **컴포넌트 역할에 따라 애니메이션 차별화**
2. **상수화를 통한 일관성 확보**
3. **UserProfileCard의 특별함 유지**
4. **확장성과 유지보수성 향상**

---

## Phase 1: 애니메이션 상수 시스템 구축

### 1.1 애니메이션 상수 파일 생성

**파일 위치:** `/src/lib/animations.ts`

**정의할 애니메이션 타입:**

```typescript
import type { Transition, Variant } from 'framer-motion'

// ============================================
// 애니메이션 타입 정의
// ============================================

/**
 * 🎯 HERO/PROFILE - 무게감, 차분함
 *
 * 사용 대상: UserProfileCard, StreakHero
 * 특징: 0.5s 느린 진입, 사용자 정체성/주요 지표 강조
 * 의도: 중요도 강조, 신뢰감, 무게감
 */
export const HERO_ANIMATION = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: 0.5,
    ease: [0.16, 1, 0.3, 1] // easeOutExpo
  }
} as const

/**
 * 📋 CARD - 빠르고 경쾌함
 *
 * 사용 대상: AIInsightCard, GoalPrediction, LiveInsights
 * 특징: 0.3s 빠른 진입
 * 의도: 경쾌하고 반응성 좋은 UI
 */
export const CARD_ANIMATION = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: 0.3,
    ease: 'easeOut'
  }
} as const

/**
 * 📝 LIST_ITEM - 순차적 등장
 *
 * 사용 대상: QuestLog, LiveInsights 항목
 * 특징: 미세한 스케일 변화 + stagger
 * 의도: 리스트 항목의 자연스러운 등장
 */
export const LIST_ITEM_ANIMATION = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: {
    duration: 0.3,
    ease: 'easeOut'
  }
} as const

/**
 * 🏆 BADGE - 활발한 스프링
 *
 * 사용 대상: 배지, 성취, 보상 요소
 * 특징: Spring 애니메이션 (튕기는 느낌)
 * 의도: 즐거움, 축하 감정
 */
export const BADGE_ANIMATION = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 15
  }
} as const

/**
 * ⭐ BADGE_NEW - 더 강한 스프링 (NEW 인디케이터)
 *
 * 사용 대상: 새로 획득한 배지 인디케이터
 * 특징: 더 빠른 spring + 회전
 * 의도: 강한 어텐션, 축하
 */
export const BADGE_NEW_ANIMATION = {
  initial: { scale: 0, rotate: -12 },
  animate: { scale: 1, rotate: 0 },
  transition: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 10
  }
} as const

/**
 * 👆 HOVER - 호버 상태
 *
 * 사용 대상: 인터랙티브 카드, 버튼
 * 특징: 미세한 스케일 변화
 * 의도: 클릭 가능함을 암시
 */
export const HOVER_SCALE = {
  whileHover: { scale: 1.02 },
  transition: { duration: 0.2 }
} as const

// ============================================
// EXIT 애니메이션
// ============================================

/**
 * 💨 FADE_OUT - 페이드 아웃
 */
export const FADE_OUT = {
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
} as const

/**
 * ⬆️ SLIDE_OUT_UP - 위로 슬라이드 아웃
 */
export const SLIDE_OUT_UP = {
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
} as const

/**
 * ⬇️ SLIDE_OUT_DOWN - 아래로 슬라이드 아웃
 */
export const SLIDE_OUT_DOWN = {
  exit: { opacity: 0, y: 20 },
  transition: { duration: 0.3 }
} as const

// ============================================
// Stagger 헬퍼
// ============================================

/**
 * Stagger 지연 계산
 * @param index - 항목 인덱스
 * @param baseDelay - 기본 지연 시간 (기본값: 0.05초)
 */
export function getStaggerDelay(index: number, baseDelay: number = 0.05): number {
  return index * baseDelay
}

/**
 * 중첩 Stagger 지연 계산
 * @param groupIndex - 그룹 인덱스
 * @param itemIndex - 항목 인덱스
 * @param groupDelay - 그룹 간 지연 (기본값: 0.1초)
 * @param itemDelay - 항목 간 지연 (기본값: 0.05초)
 */
export function getNestedStaggerDelay(
  groupIndex: number,
  itemIndex: number,
  groupDelay: number = 0.1,
  itemDelay: number = 0.05
): number {
  return groupIndex * groupDelay + itemIndex * itemDelay
}

/**
 * 애니메이션 병합 헬퍼
 * @param base - 기본 애니메이션
 * @param override - 오버라이드할 속성
 */
export function mergeAnimation<T extends Record<string, any>>(
  base: T,
  override: Partial<T>
): T {
  return {
    ...base,
    ...override,
    transition: {
      ...(base.transition || {}),
      ...(override.transition || {})
    }
  }
}

// ============================================
// Stagger 상수
// ============================================

export const STAGGER = {
  FAST: 0.03,      // 히트맵 셀 등
  NORMAL: 0.05,    // 일반 리스트 항목
  SLOW: 0.1,       // 그룹, 카드
} as const
```

### 1.2 TypeScript 타입 정의 보강

필요시 `framer-motion` 타입 재export:

```typescript
// Re-export for convenience
export type { Variant, Transition, AnimationControls } from 'framer-motion'
```

---

## Phase 2: 기존 컴포넌트 마이그레이션

### 2.1 Hero 컴포넌트

#### UserProfileCard.tsx
```typescript
// Before
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>

// After
import { HERO_ANIMATION, BADGE_ANIMATION, BADGE_NEW_ANIMATION } from '@/lib/animations'

<motion.div {...HERO_ANIMATION}>
  {/* ... */}

  {/* 배지 애니메이션도 상수화 */}
  <motion.div
    key={badge.id}
    {...BADGE_ANIMATION}
  >

  {/* NEW 인디케이터 */}
  {isNew && (
    <motion.div {...BADGE_NEW_ANIMATION}>
      <Sparkles className="h-2.5 w-2.5" />
      NEW
    </motion.div>
  )}
```

**변경 내용:**
- ✅ 카드 진입: `HERO_ANIMATION` 사용 (0.5s 유지)
- ✅ 배지: `BADGE_ANIMATION` 사용
- ✅ NEW 인디케이터: `BADGE_NEW_ANIMATION` 사용

#### StreakHero.tsx
```typescript
// Before
<motion.div
  initial={{ scale: 0.9, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
>

// After
import { HERO_ANIMATION, STAGGER, getStaggerDelay } from '@/lib/animations'

<motion.div {...HERO_ANIMATION}>
  {/* 히트맵 셀 - FAST stagger 사용 */}
  <motion.div
    {...LIST_ITEM_ANIMATION}
    transition={{
      ...LIST_ITEM_ANIMATION.transition,
      delay: getStaggerDelay(index, STAGGER.FAST)
    }}
  >
```

**변경 내용:**
- ✅ 메인 컨테이너: spring → `HERO_ANIMATION` (0.5s)
- ✅ 히트맵 셀: `STAGGER.FAST` (0.03s) 사용

### 2.2 일반 카드 컴포넌트

#### QuestLog.tsx
```typescript
// Before
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: mandalartIndex * 0.1 }}
>

// After
import { CARD_ANIMATION, LIST_ITEM_ANIMATION, STAGGER, getNestedStaggerDelay, HOVER_SCALE } from '@/lib/animations'

{/* 만다라트 그룹 */}
<motion.div
  {...CARD_ANIMATION}
  transition={{
    ...CARD_ANIMATION.transition,
    delay: getStaggerDelay(mandalartIndex, STAGGER.SLOW)
  }}
>

{/* 퀘스트 항목 */}
<motion.div
  {...LIST_ITEM_ANIMATION}
  {...HOVER_SCALE}
  transition={{
    ...LIST_ITEM_ANIMATION.transition,
    delay: getNestedStaggerDelay(mandalartIndex, index, STAGGER.SLOW, STAGGER.NORMAL)
  }}
>
```

**변경 내용:**
- ✅ 그룹: `CARD_ANIMATION` + `STAGGER.SLOW` (0.1s)
- ✅ 항목: `LIST_ITEM_ANIMATION` + 중첩 stagger
- ✅ 호버: `HOVER_SCALE` 추가

#### AIInsightCard.tsx
```typescript
// Before
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>

// After
import { CARD_ANIMATION, SLIDE_OUT_UP, getStaggerDelay, STAGGER } from '@/lib/animations'

<AnimatePresence mode="wait">
  {displayedReport && (
    <motion.div
      {...CARD_ANIMATION}
      {...SLIDE_OUT_UP}
    >
      {/* 단락 stagger */}
      {displayedReport.content.split('\n\n').map((paragraph, index) => (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: getStaggerDelay(index, STAGGER.SLOW) }}
        >
```

**변경 내용:**
- ✅ 진입: `CARD_ANIMATION`
- ✅ Exit: `SLIDE_OUT_UP` (기존 로직 유지)
- ✅ 단락: `STAGGER.SLOW` (0.1s)

#### GoalPrediction.tsx, LiveInsights.tsx, StrugglingGoals.tsx
```typescript
// 유사한 패턴으로 적용
import { CARD_ANIMATION, LIST_ITEM_ANIMATION, getStaggerDelay, STAGGER } from '@/lib/animations'

<motion.div
  {...CARD_ANIMATION}
  transition={{
    ...CARD_ANIMATION.transition,
    delay: getStaggerDelay(index, STAGGER.SLOW)
  }}
>
```

### 2.3 배지/Achievement 컴포넌트

이미 UserProfileCard에서 처리됨 (2.1 참조)

---

## Phase 3: Exit 애니메이션 추가

### 3.1 AnimatePresence 패턴 통일

**대상 컴포넌트:**
- AIInsightCard ✅ (이미 있음)
- BadgeDetailDialog (모달)
- 기타 조건부 렌더링 섹션

### 3.2 표준 Exit 패턴 적용

```typescript
import { AnimatePresence } from 'framer-motion'
import { FADE_OUT, SLIDE_OUT_DOWN } from '@/lib/animations'

<AnimatePresence>
  {isOpen && (
    <motion.div
      {...CARD_ANIMATION}
      {...FADE_OUT}
    >
```

---

## Phase 4: 문서화 및 테스팅

### 4.1 코드 주석 추가

각 컴포넌트에 애니메이션 사용 이유 명시:

```typescript
// 🎯 HERO: Profile card emphasizes user identity with slower (0.5s) animation
<motion.div {...HERO_ANIMATION}>

// 📋 CARD: Standard card animation for quick, responsive feel
<motion.div {...CARD_ANIMATION}>

// 🏆 BADGE: Spring animation for playful achievement feel
<motion.div {...BADGE_ANIMATION}>
```

### 4.2 애니메이션 가이드 문서 작성

**파일:** `/docs/ANIMATION_GUIDE.md`

```markdown
# 애니메이션 사용 가이드

## 언제 어떤 애니메이션을 사용할까?

### 🎯 HERO_ANIMATION
**사용 시점:** 사용자 정체성, 주요 지표
**예시:** UserProfileCard, StreakHero
**효과:** 0.5s 차분한 진입, 무게감
**의도:** 중요도 강조, 신뢰감

### 📋 CARD_ANIMATION
**사용 시점:** 정보 카드, 리스트 컨테이너
**예시:** AIInsightCard, GoalPrediction
**효과:** 0.3s 빠른 진입
**의도:** 경쾌하고 반응성 좋은 UI

### 🏆 BADGE_ANIMATION
**사용 시점:** 성취, 보상, 게임화 요소
**예시:** 배지, 업적
**효과:** Spring 애니메이션 (튕김)
**의도:** 즐거움, 축하 감정

### 📝 LIST_ITEM_ANIMATION
**사용 시점:** 리스트 항목, 반복 요소
**예시:** 퀘스트 목록, 인사이트 카드
**효과:** 순차 등장 (stagger)
**의도:** 자연스러운 정보 표시

## Stagger 사용 가이드

```typescript
import { STAGGER, getStaggerDelay } from '@/lib/animations'

// FAST (0.03s) - 많은 항목 (히트맵 셀 등)
delay: getStaggerDelay(index, STAGGER.FAST)

// NORMAL (0.05s) - 일반 리스트
delay: getStaggerDelay(index, STAGGER.NORMAL)

// SLOW (0.1s) - 그룹, 카드
delay: getStaggerDelay(index, STAGGER.SLOW)
```

## Exit 애니메이션

```typescript
import { FADE_OUT, SLIDE_OUT_UP } from '@/lib/animations'

// 페이드 아웃
<motion.div {...CARD_ANIMATION} {...FADE_OUT}>

// 위로 슬라이드 아웃
<motion.div {...CARD_ANIMATION} {...SLIDE_OUT_UP}>
```
```

### 4.3 테스팅 체크리스트

- [ ] UserProfileCard - 0.5s 진입 확인
- [ ] StreakHero - 0.5s 진입 확인 (spring에서 변경됨)
- [ ] 배지 애니메이션 - 스프링 효과 확인
- [ ] NEW 배지 - 회전 + 강한 스프링 확인
- [ ] QuestLog - 중첩 stagger 확인
- [ ] AIInsightCard - exit 애니메이션 확인
- [ ] 호버 상태 - 모든 인터랙티브 요소 확인
- [ ] 전체 페이지 로딩 - 순차적 등장 자연스러움 확인

---

## 작업 체크리스트

### Phase 1: 상수 시스템 구축
- [ ] `/src/lib/animations.ts` 파일 생성
- [ ] 모든 애니메이션 상수 정의
- [ ] 헬퍼 함수 작성
- [ ] TypeScript 타입 검증

### Phase 2: 컴포넌트 마이그레이션
- [ ] UserProfileCard.tsx
- [ ] StreakHero.tsx
- [ ] QuestLog.tsx
- [ ] AIInsightCard.tsx
- [ ] GoalPrediction.tsx
- [ ] LiveInsights.tsx
- [ ] StrugglingGoals.tsx
- [ ] BadgeDetailDialog.tsx (필요시)

### Phase 3: Exit 애니메이션
- [ ] 조건부 렌더링 섹션 파악
- [ ] AnimatePresence 추가
- [ ] Exit 애니메이션 적용

### Phase 4: 문서화
- [ ] 코드 주석 추가
- [ ] ANIMATION_GUIDE.md 작성
- [ ] 테스팅 완료
- [ ] 팀 리뷰

---

## 예상 효과

### ✅ 통일성
- 애니메이션 상수화로 일관된 UX
- 유지보수 용이 (한 곳에서 관리)
- 새 개발자 온보딩 간소화

### ✅ 차별성
- UserProfileCard의 특별함 유지 (0.5s hero animation)
- 역할별 적절한 애니메이션 적용
- 사용자가 컴포넌트 중요도를 직관적으로 인지

### ✅ 확장성
- 새 컴포넌트 추가 시 명확한 가이드
- 재사용 가능한 애니메이션 패턴
- 프로젝트 성장에 따라 확장 가능

### ✅ 성능
- 불필요한 애니메이션 제거 기회
- 최적화된 transition 설정
- 일관된 렌더링 성능

---

## 작업 범위

**변경 파일 (예상):**
- 신규: `/src/lib/animations.ts`
- 신규: `/docs/ANIMATION_GUIDE.md`
- 수정: 8개 컴포넌트
  - UserProfileCard.tsx
  - StreakHero.tsx
  - QuestLog.tsx
  - AIInsightCard.tsx
  - GoalPrediction.tsx
  - StrugglingGoals.tsx
  - LiveInsights.tsx
  - BadgeDetailDialog.tsx (필요 시)

**추정 시간:** 1-2시간
**위험도:** 낮음 (시각적 변경만, 기능 영향 없음)
**롤백 가능성:** 높음 (애니메이션만 변경)

---

## 참고 자료

**Framer Motion 문서:**
- [Variants](https://www.framer.com/motion/animation/)
- [AnimatePresence](https://www.framer.com/motion/animate-presence/)
- [Spring Animations](https://www.framer.com/motion/transition/)

**Easing 함수 참고:**
- [Easings.net](https://easings.net/)
- [Cubic-bezier.com](https://cubic-bezier.com/)

---

## 변경 이력

| 날짜 | 변경 내용 | 작성자 |
|------|----------|--------|
| 2025-11-12 | 초안 작성 | - |
