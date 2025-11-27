# XP 시스템 웹/모바일 구현 차이 분석

**작성일**: 2025-11-27
**상태**: 수정 완료

## 배경

모바일 앱에서 TodayScreen에서 실천항목을 체크해도 HomeScreen의 XP/레벨이 업데이트되지 않는 문제가 발견되었습니다. 웹과 모바일의 XP 시스템 구현을 비교 분석하여 차이점을 파악했습니다.

## 핵심 문제 요약

| 구분 | 웹 | 모바일 | 문제점 |
|------|-----|--------|--------|
| **XP 표시 데이터 소스** | `user_levels` 테이블 | `user_gamification` 테이블 | 🔴 **다른 테이블 사용** |
| **XP 업데이트** | `user_levels` (shared xpService) | `user_levels` (shared xpService) | ✅ 동일 |
| **XP 멀티플라이어** | 웹 전용 `xpMultipliers.ts` | shared `xpService.ts` (기본만) | 🟡 **웹에만 추가 기능** |
| **배지 평가** | `badgeEvaluator.ts` | ❌ 미구현 | 🔴 **모바일 미구현** |
| **완벽한 주 보너스** | `activatePerfectWeekBonus()` | ❌ 미구현 | 🔴 **모바일 미구현** |
| **레벨업 마일스톤** | `activateLevelMilestoneBonus()` | ❌ 미구현 | 🔴 **모바일 미구현** |

## 세부 분석

### 1. HomeScreen XP가 업데이트 안 되는 이유

**원인**:
- 모바일 `HomeScreen.tsx`의 `useUserGamification` 훅: `user_gamification` 테이블 조회
- shared `xpService.ts`의 `updateUserXP()`: `user_levels` 테이블 업데이트

**결과**:
TodayScreen에서 체크 → `user_levels`에 XP 증가 → HomeScreen은 `user_gamification` 조회 → 변경 안 보임

**관련 파일**:
- `apps/mobile/src/hooks/useStats.ts:100-123` - `useUserGamification` 훅
- `packages/shared/src/lib/xpService.ts:127-162` - `updateUserXP` 함수

### 2. 배지 시스템 누락

**웹 구현** (`apps/web/src/pages/TodayChecklistPage.tsx:281-292`):
```typescript
const { checkAndUnlockAchievements } = await import('@/lib/stats')
const newlyUnlocked = await checkAndUnlockAchievements(user.id)
if (newlyUnlocked && newlyUnlocked.length > 0) {
  for (const badge of newlyUnlocked) {
    showCelebration({ title: '새로운 배지 획득!', description: `🏆 ${badge.title}` })
  }
}
```

**모바일**: ❌ TodayScreen에 배지 확인 로직 없음

**관련 파일**:
- `apps/web/src/lib/badgeEvaluator.ts` - 웹 배지 평가 시스템
- `apps/web/src/lib/stats.ts:1001-1168` - `checkAndUnlockAchievements` 함수

### 3. XP 멀티플라이어 차이

**웹** (`apps/web/src/lib/xpMultipliers.ts`):
| 보너스 | 조건 | 배율 | 지속 |
|--------|------|------|------|
| Weekend | 토/일요일 | 1.5x | 해당일 |
| Comeback | 3일+ 부재 후 복귀 | 1.5x | 3일 |
| Level Milestone | 레벨 5/10/15/20/25/30 달성 | 2x | 7일 |
| Perfect Week | 주간 80%+ 달성 | 2x | 7일 |

**Shared** (`packages/shared/src/lib/xpService.ts`):
- `getActiveMultipliers()` - `user_bonus_xp` 테이블 조회 (레코드 있으면 적용)
- Weekend 보너스만 자체 계산
- **보너스 활성화 로직 없음** (웹에서만 활성화)

### 4. 완벽한 주 보너스 활성화 누락

**웹** (`apps/web/src/pages/TodayChecklistPage.tsx:272-278`):
```typescript
const completionStats = await getCompletionStats(user.id)
if (completionStats.week.percentage >= 80) {
  const activated = await activatePerfectWeekBonus(user.id)
  if (activated) {
    console.log('✨ Perfect week bonus activated: 2x XP for 7 days')
  }
}
```

**모바일**: ❌ 구현 없음

## 수정 완료 내역

### Phase 1: Critical (필수) ✅

#### 1.1 HomeScreen XP 데이터 소스 변경 ✅
- `useUserGamification` 훅이 `user_levels` 테이블을 조회하도록 수정
- `xpService.getStreakStats()`로 스트릭 데이터 조합

#### 1.2 배지 평가 시스템 추가 ✅
- shared에 `badgeService.ts` 생성 (DI 패턴)
- TodayScreen에서 체크 후 배지 평가 호출

### Phase 2: Important (권장) ✅

#### 2.1 XP 멀티플라이어 서비스 확장 ✅
- shared `xpService.ts`에 `activatePerfectWeekBonus()` 추가
- shared `xpService.ts`에 `activateLevelMilestoneBonus()` 로직 추가
- shared `xpService.ts`에 `checkComebackBonus()` 추가

#### 2.2 완벽한 주 보너스 활성화 ✅
- `useXPUpdate` 훅에 `checkPerfectWeek()` 추가
- TodayScreen에서 체크 후 주간 완료율 확인 및 보너스 활성화

## 데이터베이스 테이블 관계

```
user_levels (XP 시스템 핵심 테이블)
├── user_id (PK)
├── level
├── total_xp
├── nickname
└── last_perfect_day_date

user_gamification (레거시/중복 테이블?)
├── user_id (PK)
├── nickname
├── total_xp
├── current_level
├── current_streak
└── longest_streak

user_bonus_xp (XP 배율 보너스)
├── user_id
├── bonus_type (comeback, level_milestone, perfect_week)
├── multiplier
├── activated_at
└── expires_at
```

**참고**: `user_gamification`과 `user_levels` 테이블이 중복되어 있음. 향후 통합 검토 필요.

## 관련 파일

### Shared Package
- `packages/shared/src/lib/xpService.ts` - XP 서비스 (DI 패턴)
- `packages/shared/src/lib/xpUtils.ts` - XP 계산 유틸리티

### Web App
- `apps/web/src/lib/stats.ts` - 통계 및 XP 함수
- `apps/web/src/lib/xpMultipliers.ts` - XP 배율 시스템
- `apps/web/src/lib/badgeEvaluator.ts` - 배지 평가 시스템
- `apps/web/src/pages/TodayChecklistPage.tsx` - 체크 시 XP/배지 로직
- `apps/web/src/components/stats/UserProfileCard.tsx` - XP 표시 컴포넌트

### Mobile App
- `apps/mobile/src/hooks/useStats.ts` - 통계 훅 (useUserGamification)
- `apps/mobile/src/lib/xp.ts` - XP 서비스 인스턴스
- `apps/mobile/src/screens/TodayScreen.tsx` - 체크 시 XP 로직
- `apps/mobile/src/screens/HomeScreen.tsx` - XP 표시 화면
