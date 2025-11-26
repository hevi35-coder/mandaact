# XP 시스템 개선 방안

**작성일**: 2025-11-12
**상태**: 계획 단계 (문서화 완료)
**우선순위**: 중요 (동기부여 핵심 요소)

---

## 📊 현황 분석

### 현재 XP 시스템

**XP 획득량**:
- 기본: 10 XP/체크
- 스트릭 보너스(7일+): +5 XP/체크 (총 15 XP)
- 완벽한 하루(100%): +50 XP
- 완벽한 주(80%+): +200 XP

**레벨 산식**:
```typescript
// XP → Level
level = Math.floor(Math.sqrt(totalXP / 100)) + 1

// Level → Required XP
requiredXP = (level - 1)² × 100
```

**레벨별 요구량**:
| 레벨 | 필요 XP | 이전 레벨과 차이 | 일일 10체크 기준 |
|------|---------|------------------|------------------|
| 1 | 0 | - | - |
| 2 | 100 | 100 | 10일 |
| 3 | 400 | 300 | 30일 |
| 4 | 900 | 500 | 50일 |
| 5 | 1,600 | 700 | 70일 |
| 6 | 2,500 | 900 | 90일 |
| 10 | 10,000 | 1,900 | 190일 |
| 20 | 36,100 | - | 361일 |

---

## 🚨 문제점

### 1. 기하급수적 증가
- 레벨 3→4는 레벨 1→2의 **5배** 시간 소요
- 제곱 곡선(quadratic)으로 후반 가속 급증

### 2. 후반 슬럼프
- 레벨 10 이후 사실상 레벨업 불가능
- 레벨 20 도달은 1년 이상 소요 (비현실적)

### 3. 동기부여 저하
- 진행 바가 거의 채워지지 않는 느낌
- 성장 체감 부족
- 이탈 위험 증가

---

## 🎯 개선 목표

1. **지속적 성취감**: 레벨업이 꾸준히 일어나는 느낌
2. **장기 동기부여**: 레벨 10-20도 현실적으로 도달 가능
3. **초기 유지**: 첫 경험 유지 (레벨 1-3)
4. **유연한 확장**: 향후 콘텐츠 추가 대비

---

## ✅ 베스트 프랙티스 (연구 기반)

### 게이미피케이션 효과
- 게임화 앱: 평균 **20-30% 참여도 증가** (Statista 2024)
- 목표 근접 인식 시: 달성 확률 **2배** 증가
- 게임화 교육: 스킬 평가 결과 **14%** 향상

### 레벨 진행 곡선 타입

**선형 (Linear)**:
- 매 레벨 동일한 XP 요구
- 단순하지만 단조로움
- 성장 체감 부족

**지수 (Exponential)** - 현재 시스템:
- 초반 느리다가 후반 급증
- 업그레이드 필수성 강조
- **문제**: 후반 벽 (paywall 느낌)

**로그 (Logarithmic)**:
- 초반 빠르게, 후반 완만하게
- 장기 플레이어 친화적
- MMO에서 많이 사용

**하이브리드**:
- 구간별 다른 곡선 적용
- 초반: 빠른 진행 (선형)
- 중반: 적당한 도전 (로그)
- 후반: 완만한 증가 (로그)

---

## 🎯 개선 방안

### 방안 1: XP 배율 시스템 (추천 - Phase 1)

**장점**:
- ✅ 기존 밸런스 유지
- ✅ 즉시 적용 가능
- ✅ 구현 복잡도 낮음
- ✅ AB 테스트 용이

**구현**:
```typescript
interface XPMultiplier {
  type: string
  multiplier: number
  condition: () => boolean
  duration?: number  // 지속 기간 (일)
}

const xpMultipliers: XPMultiplier[] = [
  {
    type: 'weekend',
    multiplier: 1.5,
    condition: () => [0, 6].includes(new Date().getDay())
  },
  {
    type: 'comeback',
    multiplier: 1.5,
    condition: () => daysSinceLastCheck >= 3,
    duration: 3
  },
  {
    type: 'level_milestone',
    multiplier: 2.0,
    condition: () => [5, 10, 15, 20].includes(currentLevel),
    duration: 7
  },
  {
    type: 'perfect_week_bonus',
    multiplier: 2.0,
    condition: () => lastWeekPerfect,
    duration: 7
  }
]
```

**예상 효과**:
- 평균 XP 획득량: 10 XP → 12-15 XP (20-50% 증가)
- 레벨 5 도달: 70일 → 47-56일
- 레벨 10 도달: 190일 → 127-152일

---

### 방안 2: 하이브리드 로그 곡선 (Phase 2)

**공식 변경**:
```typescript
// 현재
level = Math.floor(Math.sqrt(totalXP / 100)) + 1

// 제안
level = Math.floor(Math.log(totalXP / 50 + 1) * 5) + 1
```

**레벨 요구량 비교**:
| 레벨 | 현재 XP | 제안 XP | 감소율 | 일수 변화 |
|------|---------|---------|--------|-----------|
| 2 | 100 | 100 | 0% | 10→10일 |
| 3 | 400 | 250 | 37% | 30→18일 |
| 4 | 900 | 450 | 50% | 50→28일 |
| 5 | 1,600 | 700 | 56% | 70→40일 |
| 10 | 10,000 | 2,300 | 77% | 190→53일 |
| 20 | 36,100 | 7,500 | 79% | 361→138일 |

**장점**:
- ✅ 초기 동일, 후반 훨씬 완만
- ✅ 레벨 20까지 현실적
- ✅ 지속적 성취감

**주의사항**:
- ⚠️ 기존 유저 XP 재계산 필요
- ⚠️ 레벨 조정 로직 구현
- ⚠️ 커뮤니케이션 필요 (개선 안내)

---

### 방안 3: 시즌 시스템 (Phase 3)

**개념**:
```typescript
interface ProgressionSystem {
  mainLevel: number        // 누적, 느린 진행 (영구)
  seasonLevel: number      // 90일 리셋, 빠른 진행
  masteryLevels: {
    [mandalartId: string]: number  // 만다라트별 마스터리
  }
}
```

**시즌 레벨 특징**:
- 90일마다 리셋
- 선형 곡선: `seasonLevel = Math.floor(totalSeasonXP / 100)`
- 빠른 달성감 제공
- 시즌 보상 (배지, 타이틀, 특별 테마)

**장점**:
- ✅ 장기/단기 목표 동시 충족
- ✅ 주기적 신선함
- ✅ 신규/복귀 유저 친화
- ✅ 소셜 경쟁 요소 추가 가능

---

## 📋 구현 로드맵

### Phase 1: XP 배율 시스템 (즉시)
**목표**: 동기부여 즉시 개선
**기간**: 2-3일

**작업 항목**:
- [ ] `src/lib/xpMultipliers.ts` 생성
- [ ] `calculateTodayXP()` 함수 수정
- [ ] 배율 UI 표시 (XP 획득 시 "×1.5" 표시)
- [ ] 배율 안내 (XP 획득 방법 섹션)
- [ ] 테스트: 주말, 컴백, 마일스톤 시나리오

**예상 효과**:
- 평균 레벨업 속도 20-50% 증가
- 특별한 순간 강조 (주말, 컴백)
- 이탈 방지 효과

---

### Phase 2: 하이브리드 곡선 전환 (중기)
**목표**: 근본적 밸런스 개선
**기간**: 1주

**작업 항목**:
- [ ] 새 레벨 공식 구현 및 테스트
- [ ] 기존 유저 XP 재계산 로직
- [ ] 레벨 변화 통지 시스템
- [ ] 마이그레이션 스크립트 작성
- [ ] 변경사항 공지 (릴리스 노트)
- [ ] AB 테스트 (신규 유저 대상)

**마이그레이션 전략**:
```typescript
// 기존 유저 처리
const oldLevel = calculateLevelFromXP(totalXP, 'quadratic')
const newLevel = calculateLevelFromXP(totalXP, 'logarithmic')

if (newLevel >= oldLevel) {
  // 레벨 상승 또는 동일 → 적용
  updateUserLevel(userId, newLevel)
  showNotification('레벨 시스템 개선으로 레벨이 올랐습니다!')
} else {
  // 레벨 하락 → 보상 제공
  const compensationXP = getXPForLevel(oldLevel) - totalXP
  addBonusXP(userId, compensationXP)
  showNotification('레벨 시스템 개선 보상을 받았습니다!')
}
```

---

### Phase 3: 시즌 시스템 (장기)
**목표**: 장기 참여 유도
**기간**: 2-3주

**작업 항목**:
- [ ] 시즌 데이터 모델 설계
- [ ] 시즌 XP 계산 로직
- [ ] 시즌 보상 시스템
- [ ] 시즌 UI/UX 설계
- [ ] 리더보드 (선택)
- [ ] 시즌 테마/스토리

---

## 📊 성공 지표 (KPI)

### 정량적 지표
- **DAU (Daily Active Users)**: 15% 증가 목표
- **평균 세션 시간**: 20% 증가
- **7일 리텐션**: 60% → 75%
- **30일 리텐션**: 40% → 55%
- **레벨 5 도달율**: 30% → 50%
- **레벨 10 도달율**: 5% → 20%

### 정성적 지표
- 유저 피드백 (앱스토어 리뷰)
- "성장하는 느낌" 설문 점수
- 이탈 인터뷰 결과

---

## 🔍 리스크 및 대응

### 리스크 1: 인플레이션
**문제**: XP가 너무 쉽게 얻어지면 가치 하락
**대응**:
- 배율 효과 모니터링
- 필요시 조정 가능한 구조
- 보상도 함께 상향 (배지 XP, 완벽한 주 보너스)

### 리스크 2: 기존 유저 불만
**문제**: 레벨 시스템 변경 시 반발 가능
**대응**:
- 레벨 하락 없도록 보장
- 레벨 상승 시 축하 메시지
- 충분한 사전 공지
- 보상 제공 (보너스 XP, 특별 배지)

### 리스크 3: 복잡도 증가
**문제**: 시스템이 복잡해져 혼란 가능
**대응**:
- 단계적 도입 (Phase별 구분)
- 명확한 UI/UX 설명
- 튜토리얼/가이드 제공

---

## 참고 자료

### 연구/통계
- Statista 2024: 게임화 앱 20-30% 참여도 증가
- Growth Engineering: 목표 근접 인식 시 2배 달성률
- Intellum: 게임화 교육 14% 성과 향상

### 게임 디자인 이론
- [GameDesign Math: RPG Level-based Progression](https://www.davideaversa.it/blog/gamedesign-math-rpg-level-based-progression/)
- [Example Level Curve Formulas](https://www.designthegame.com/learning/tutorial/example-level-curve-formulas-game-progression)

### 관련 파일
- `src/lib/stats.ts`: 현재 XP 계산 로직
- `src/lib/badgeEvaluator.ts`: 배지 XP 보상
- `src/components/stats/UserProfileCard.tsx`: 레벨 UI
