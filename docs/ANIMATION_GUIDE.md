# 애니메이션 사용 가이드

**작성일:** 2025-11-12
**목적:** MandaAct 프로젝트의 일관된 애니메이션 패턴 유지 및 새로운 컴포넌트 개발 시 가이드 제공

---

## 개요

MandaAct는 역할 기반 애니메이션 시스템을 사용합니다. 각 컴포넌트의 중요도와 역할에 따라 적절한 애니메이션을 적용하여 사용자에게 직관적인 계층 구조를 제공합니다.

**핵심 원칙:**
- 🎯 **HERO**: 사용자 정체성 및 주요 지표 (느린 0.5s 애니메이션으로 무게감 강조)
- 📋 **CARD**: 일반 정보 카드 (빠른 0.3s 애니메이션으로 경쾌함)
- 📝 **LIST_ITEM**: 리스트 항목 (순차적 등장 효과)
- 🏆 **BADGE**: 성취 및 보상 요소 (스프링 애니메이션으로 즐거움 표현)

---

## 언제 어떤 애니메이션을 사용할까?

### 🎯 HERO_ANIMATION

**사용 시점:** 사용자 정체성, 주요 지표, 핵심 데이터
**예시:** UserProfileCard, StreakHero
**효과:** 0.5s 차분한 진입, 무게감
**의도:** 중요도 강조, 신뢰감

```typescript
import { HERO_ANIMATION } from '@/lib/animations'

// 🎯 HERO: Profile card emphasizes user identity with slower (0.5s) animation
<motion.div {...HERO_ANIMATION}>
  {/* 사용자 프로필, 스트릭 등 */}
</motion.div>
```

**특징:**
- Duration: 0.5s (다른 카드보다 느림)
- Easing: easeOutExpo (차분하고 부드러운 진입)
- 사용 빈도: 페이지당 1-2개 (과도하게 사용하면 특별함 상실)

---

### 📋 CARD_ANIMATION

**사용 시점:** 정보 카드, 리스트 컨테이너, 일반 섹션
**예시:** AIInsightCard, GoalPrediction, LiveInsights, StrugglingGoals
**효과:** 0.3s 빠른 진입
**의도:** 경쾌하고 반응성 좋은 UI

```typescript
import { CARD_ANIMATION, STAGGER, getStaggerDelay } from '@/lib/animations'

// 📋 CARD: Standard card animation for quick, responsive feel
{cards.map((card, index) => (
  <motion.div
    key={card.id}
    {...CARD_ANIMATION}
    transition={{
      ...CARD_ANIMATION.transition,
      delay: getStaggerDelay(index, STAGGER.SLOW)
    }}
  >
    {/* 카드 내용 */}
  </motion.div>
))}
```

**특징:**
- Duration: 0.3s (빠르고 경쾌함)
- Easing: easeOut
- Stagger와 함께 사용 권장

---

### 🏆 BADGE_ANIMATION

**사용 시점:** 성취, 보상, 게임화 요소, 배지
**예시:** UserProfileCard의 배지 컬렉션
**효과:** Spring 애니메이션 (튕김)
**의도:** 즐거움, 축하 감정

```typescript
import { BADGE_ANIMATION, BADGE_NEW_ANIMATION } from '@/lib/animations'

// 🏆 BADGE: Spring animation for playful achievement feel
<motion.div {...BADGE_ANIMATION}>
  {/* 배지 아이콘 */}
</motion.div>

// ⭐ BADGE_NEW: Stronger spring for newly unlocked badges
{isNew && (
  <motion.div {...BADGE_NEW_ANIMATION}>
    <Sparkles />
    NEW
  </motion.div>
)}
```

**특징:**
- Type: Spring (물리 기반 애니메이션)
- Stiffness: 200 (일반), 300 (NEW)
- Damping: 15 (일반), 10 (NEW - 더 강한 튕김)
- NEW 배지는 회전 효과 추가

---

### 📝 LIST_ITEM_ANIMATION

**사용 시점:** 리스트 항목, 반복 요소, 순차 등장이 필요한 경우
**예시:** QuestLog 항목, StrugglingGoals 제안 목록, 히트맵 셀
**효과:** 순차 등장 (stagger)
**의도:** 자연스러운 정보 표시

```typescript
import { LIST_ITEM_ANIMATION, STAGGER, getStaggerDelay, getNestedStaggerDelay } from '@/lib/animations'

// 단순 리스트
{items.map((item, index) => (
  <motion.div
    key={item.id}
    {...LIST_ITEM_ANIMATION}
    transition={{
      ...LIST_ITEM_ANIMATION.transition,
      delay: getStaggerDelay(index, STAGGER.NORMAL)
    }}
  >
    {item.content}
  </motion.div>
))}

// 중첩 리스트 (그룹 내 항목)
{groups.map((group, groupIndex) => (
  group.items.map((item, itemIndex) => (
    <motion.div
      key={item.id}
      {...LIST_ITEM_ANIMATION}
      transition={{
        ...LIST_ITEM_ANIMATION.transition,
        delay: getNestedStaggerDelay(groupIndex, itemIndex, STAGGER.SLOW, STAGGER.NORMAL)
      }}
    >
      {item.content}
    </motion.div>
  ))
))}
```

**특징:**
- Duration: 0.3s
- Scale 변화: 0.95 → 1 (미세한 확대)
- Stagger 필수 (순차 등장 효과)

---

## Stagger 사용 가이드

Stagger는 여러 요소가 순차적으로 나타나는 효과입니다.

### Stagger 상수

```typescript
export const STAGGER = {
  FAST: 0.03,      // 많은 항목 (히트맵 셀, 배지 등)
  NORMAL: 0.05,    // 일반 리스트 항목
  SLOW: 0.1,       // 그룹, 카드
} as const
```

### 사용 예시

```typescript
// FAST (0.03s) - 히트맵 셀처럼 많은 항목
delay: getStaggerDelay(index, STAGGER.FAST)

// NORMAL (0.05s) - 일반 리스트
delay: getStaggerDelay(index, STAGGER.NORMAL)

// SLOW (0.1s) - 카드 그룹
delay: getStaggerDelay(index, STAGGER.SLOW)

// 중첩 Stagger - 그룹별 + 항목별
delay: getNestedStaggerDelay(groupIndex, itemIndex, STAGGER.SLOW, STAGGER.NORMAL)
```

**선택 기준:**
- 항목 개수가 많을수록 → FAST
- 중요한 정보일수록 → SLOW
- 일반적인 경우 → NORMAL

---

## Exit 애니메이션

컴포넌트가 사라질 때의 애니메이션입니다.

### 사용 가능한 Exit 패턴

```typescript
import { FADE_OUT, SLIDE_OUT_UP, SLIDE_OUT_DOWN } from '@/lib/animations'
import { AnimatePresence } from 'framer-motion'

// 페이드 아웃
<AnimatePresence>
  {isVisible && (
    <motion.div
      {...CARD_ANIMATION}
      {...FADE_OUT}
    >
      내용
    </motion.div>
  )}
</AnimatePresence>

// 위로 슬라이드 아웃 (AIInsightCard에서 사용)
<AnimatePresence mode="wait">
  {report && (
    <motion.div
      {...CARD_ANIMATION}
      {...SLIDE_OUT_UP}
    >
      리포트 내용
    </motion.div>
  )}
</AnimatePresence>

// 아래로 슬라이드 아웃
<motion.div
  {...CARD_ANIMATION}
  {...SLIDE_OUT_DOWN}
>
  내용
</motion.div>
```

**사용 시점:**
- 조건부 렌더링 (isOpen, isVisible 등)
- 탭 전환
- 모달/다이얼로그

**주의사항:**
- AnimatePresence로 감싸야 exit 애니메이션 작동
- mode="wait"는 이전 요소가 완전히 사라진 후 다음 요소 표시

---

## Hover 효과

인터랙티브 요소에 호버 효과를 추가할 수 있습니다.

```typescript
import { HOVER_SCALE } from '@/lib/animations'

// 클릭 가능한 카드
<motion.div
  {...CARD_ANIMATION}
  {...HOVER_SCALE}  // whileHover: { scale: 1.02 }
  onClick={handleClick}
>
  카드 내용
</motion.div>
```

**특징:**
- Scale: 1.02 (2% 확대)
- Duration: 0.2s
- 클릭 가능한 요소에만 사용

---

## 애니메이션 병합

기본 애니메이션에 커스텀 속성을 추가하고 싶을 때 `mergeAnimation` 헬퍼를 사용합니다.

```typescript
import { mergeAnimation, CARD_ANIMATION } from '@/lib/animations'

const customAnimation = mergeAnimation(CARD_ANIMATION, {
  initial: { opacity: 0, x: -20 },  // 왼쪽에서 진입
  transition: { delay: 0.5 }        // 지연 시간 추가
})

<motion.div {...customAnimation}>
  내용
</motion.div>
```

---

## 실제 컴포넌트 예시

### UserProfileCard (HERO)

```typescript
import { HERO_ANIMATION, BADGE_ANIMATION, BADGE_NEW_ANIMATION } from '@/lib/animations'

export function UserProfileCard() {
  return (
    // 🎯 HERO: Profile card emphasizes user identity with slower (0.5s) animation
    <motion.div {...HERO_ANIMATION}>
      <Card>
        {/* 프로필 정보 */}

        {/* 배지 컬렉션 */}
        {badges.map(badge => (
          // 🏆 BADGE: Spring animation for playful achievement feel
          <motion.div key={badge.id} {...BADGE_ANIMATION}>
            {badge.icon}

            {isNew && (
              // ⭐ BADGE_NEW: Stronger spring for newly unlocked badges
              <motion.div {...BADGE_NEW_ANIMATION}>
                <Sparkles /> NEW
              </motion.div>
            )}
          </motion.div>
        ))}
      </Card>
    </motion.div>
  )
}
```

### QuestLog (CARD + LIST_ITEM)

```typescript
import { CARD_ANIMATION, LIST_ITEM_ANIMATION, HOVER_SCALE, STAGGER, getNestedStaggerDelay, getStaggerDelay } from '@/lib/animations'

export function QuestLog() {
  return (
    <Card>
      {mandalarts.map((mandalart, mandalartIndex) => (
        // 📋 CARD: Mandalart group with slow stagger
        <motion.div
          key={mandalart.id}
          {...CARD_ANIMATION}
          transition={{
            ...CARD_ANIMATION.transition,
            delay: getStaggerDelay(mandalartIndex, STAGGER.SLOW)
          }}
        >
          {/* 메인 퀘스트 */}

          {/* 사이드 퀘스트 */}
          {quests.map((quest, index) => (
            // 📝 LIST_ITEM: Quest items with nested stagger and hover
            <motion.div
              key={quest.id}
              {...LIST_ITEM_ANIMATION}
              {...HOVER_SCALE}
              transition={{
                ...LIST_ITEM_ANIMATION.transition,
                delay: getNestedStaggerDelay(mandalartIndex, index, STAGGER.SLOW, STAGGER.NORMAL)
              }}
            >
              {quest.title}
            </motion.div>
          ))}
        </motion.div>
      ))}
    </Card>
  )
}
```

### AIInsightCard (CARD + EXIT)

```typescript
import { CARD_ANIMATION, SLIDE_OUT_UP, STAGGER, getStaggerDelay } from '@/lib/animations'
import { AnimatePresence } from 'framer-motion'

export function AIInsightCard() {
  return (
    <Card>
      <AnimatePresence mode="wait">
        {report && (
          // 📋 CARD: Report card with slide-out-up exit animation
          <motion.div
            key={report.id}
            {...CARD_ANIMATION}
            {...SLIDE_OUT_UP}
          >
            {/* 리포트 단락 stagger */}
            {report.content.split('\n\n').map((paragraph, index) => (
              <motion.p
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: getStaggerDelay(index, STAGGER.SLOW) }}
              >
                {paragraph}
              </motion.p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
```

---

## 새 컴포넌트 개발 시 체크리스트

1. **컴포넌트 역할 파악**
   - [ ] 사용자 정체성/핵심 지표인가? → HERO_ANIMATION
   - [ ] 일반 정보 카드인가? → CARD_ANIMATION
   - [ ] 리스트 항목인가? → LIST_ITEM_ANIMATION
   - [ ] 성취/보상 요소인가? → BADGE_ANIMATION

2. **Stagger 필요 여부**
   - [ ] 여러 항목이 순차적으로 나타나는가? → Stagger 추가
   - [ ] 항목이 몇 개인가? → FAST/NORMAL/SLOW 선택
   - [ ] 중첩 구조인가? → getNestedStaggerDelay 사용

3. **Exit 애니메이션**
   - [ ] 조건부 렌더링인가? → AnimatePresence + Exit 패턴
   - [ ] 탭 전환인가? → mode="wait" 추가

4. **Hover 효과**
   - [ ] 클릭 가능한 요소인가? → HOVER_SCALE 추가

5. **코드 주석**
   - [ ] 이모지 + 애니메이션 타입 주석 추가
   - [ ] 예: `// 🎯 HERO: ...`, `// 📋 CARD: ...`

---

## 성능 고려사항

### 권장 사항

1. **애니메이션은 최소한으로**
   - 페이지당 HERO 애니메이션 1-2개
   - 과도한 stagger 피하기 (항목 50개 이하)

2. **will-change 자동 처리**
   - Framer Motion이 자동으로 최적화
   - 수동 will-change 불필요

3. **레이아웃 변경 피하기**
   - `opacity`, `transform` 사용 (GPU 가속)
   - `width`, `height` 변경 지양

4. **AnimatePresence는 필요한 곳만**
   - Exit 애니메이션이 필요한 곳만 사용
   - 정적 컨텐츠는 AnimatePresence 불필요

---

## 접근성

### 애니메이션 접근성 고려

```typescript
// 사용자가 motion을 비활성화한 경우 대응
import { useReducedMotion } from 'framer-motion'

export function MyComponent() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      {...(shouldReduceMotion ? {} : CARD_ANIMATION)}
    >
      내용
    </motion.div>
  )
}
```

**자동 처리:**
- Framer Motion은 `prefers-reduced-motion` 감지
- 사용자 설정에 따라 자동으로 애니메이션 단순화

---

## 트러블슈팅

### 애니메이션이 작동하지 않을 때

1. **Import 확인**
   ```typescript
   import { CARD_ANIMATION } from '@/lib/animations'
   import { motion } from 'framer-motion'
   ```

2. **Spread 문법 확인**
   ```typescript
   // ✅ 올바름
   <motion.div {...CARD_ANIMATION}>

   // ❌ 잘못됨
   <motion.div CARD_ANIMATION>
   ```

3. **Exit 애니메이션이 작동하지 않을 때**
   ```typescript
   // AnimatePresence로 감싸기
   <AnimatePresence>
     {isVisible && <motion.div {...CARD_ANIMATION} {...FADE_OUT} />}
   </AnimatePresence>
   ```

4. **Stagger가 작동하지 않을 때**
   ```typescript
   // transition 객체 병합 확인
   transition={{
     ...CARD_ANIMATION.transition,  // 기본 transition 유지
     delay: getStaggerDelay(index, STAGGER.SLOW)
   }}
   ```

---

## 변경 이력

| 날짜 | 변경 내용 | 작성자 |
|------|----------|--------|
| 2025-11-12 | 초안 작성 | - |

---

## 참고 자료

**Framer Motion 공식 문서:**
- [Variants](https://www.framer.com/motion/animation/)
- [AnimatePresence](https://www.framer.com/motion/animate-presence/)
- [Spring Animations](https://www.framer.com/motion/transition/)

**Easing 함수:**
- [Easings.net](https://easings.net/)
- [Cubic-bezier.com](https://cubic-bezier.com/)

**접근성:**
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
