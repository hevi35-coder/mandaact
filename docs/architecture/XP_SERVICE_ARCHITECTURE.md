# XP 서비스 아키텍처

**작성일**: 2025-11-27
**상태**: 구현 완료

## 배경

모바일 앱에서 체크 시 XP가 증가하지 않는 문제가 발견되었습니다. 원인 분석 결과:

- **웹 앱**: `apps/web/src/lib/stats.ts`에 XP 부여 로직 있음
- **모바일 앱**: XP 부여 로직 누락
- **공통 패키지**: `@mandaact/shared`에는 순수 계산 유틸리티만 존재

## 문제점

웹의 비즈니스 로직(`stats.ts`, `xpMultipliers.ts`)이 Supabase 클라이언트를 직접 import하여 shared로 이동 불가:

```typescript
// apps/web/src/lib/stats.ts
import { supabase } from './supabase'  // 웹 전용 경로

// apps/mobile/src/lib/supabase.ts  // 모바일은 경로가 다름
```

## 검토한 방안

| 방법 | 설명 | 장점 | 단점 |
|-----|------|-----|------|
| **1. 의존성 주입** | Supabase 클라이언트를 파라미터로 받는 서비스 팩토리 | 코드 중복 제거, 테스트 용이 | 약간의 보일러플레이트 |
| 2. Context/Provider | React Context로 서비스 제공 | 훅처럼 자연스러운 사용 | React 전용 |
| 3. 순수 함수 + 래핑 | 계산만 shared, DB 접근은 각 앱에서 | 가장 단순 | DB 로직 중복 |
| 4. API 엔드포인트 | Edge Function으로 중앙화 | 보안 강화, 치트 방지 | 네트워크 지연 |
| 5. DB 트리거 | INSERT 시 자동 XP 부여 | 완벽한 일관성 | 디버깅 어려움, 알림 불가 |

## 선택: 방법 1 (의존성 주입)

현재 프로젝트 규모와 요구사항에 가장 적합한 방법으로 **의존성 주입 패턴**을 선택했습니다.

### 구조

```
packages/shared/src/lib/
├── xpUtils.ts          # 순수 계산 유틸리티 (기존)
├── xpService.ts        # XP 서비스 팩토리 (신규)
└── index.ts            # export

apps/web/src/lib/
├── supabase.ts         # Supabase 클라이언트
└── xp.ts               # xpService 인스턴스 생성 (신규)

apps/mobile/src/lib/
├── supabase.ts         # Supabase 클라이언트
└── xp.ts               # xpService 인스턴스 생성 (신규)
```

### 사용 예시

```typescript
// packages/shared/src/lib/xpService.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export interface XPService {
  updateUserXP: (userId: string, xpToAdd: number) => Promise<UpdateResult>
  getStreakStats: (userId: string) => Promise<StreakStats>
  getActiveMultipliers: (userId: string) => Promise<XPMultiplier[]>
  checkAndAwardPerfectDayXP: (userId: string, date?: string) => Promise<PerfectDayResult>
}

export function createXPService(supabase: SupabaseClient): XPService {
  return {
    updateUserXP: async (userId, xpToAdd) => { /* ... */ },
    getStreakStats: async (userId) => { /* ... */ },
    // ...
  }
}
```

```typescript
// apps/web/src/lib/xp.ts
import { createXPService } from '@mandaact/shared'
import { supabase } from './supabase'

export const xpService = createXPService(supabase)
```

```typescript
// apps/mobile/src/lib/xp.ts
import { createXPService } from '@mandaact/shared'
import { supabase } from './supabase'

export const xpService = createXPService(supabase)
```

```typescript
// 사용처 (웹 또는 모바일)
import { xpService } from '../lib/xp'

await xpService.updateUserXP(userId, 10)
```

## XP 시스템 로직

### XP 부여 규칙

| 항목 | XP | 조건 |
|-----|---|------|
| 기본 체크 | +10 | 실천 항목 체크 시 |
| 스트릭 보너스 | +5 | 7일+ 연속 실천 시 |
| 완벽한 하루 | +50 | 당일 100% 완료 시 (1회/일) |

### XP 멀티플라이어

| 타입 | 배율 | 조건 | 지속 |
|-----|-----|------|-----|
| 주말 보너스 | 1.5x | 토/일요일 | 해당일 |
| 컴백 보너스 | 1.5x | 3일+ 부재 후 복귀 | 3일간 |
| 레벨 마일스톤 | 2.0x | 레벨 5, 10, 15, 20, 25, 30 도달 | 7일간 |
| 완벽한 주 | 2.0x | 주간 80%+ 달성 | 7일간 |

### 레벨 계산

하이브리드 로그 커브 사용:
- Level 1: 100 XP
- Level 2: 200 XP
- Level 3+: `100 * level^1.8`

## 마이그레이션 계획

1. ✅ 문제 분석 및 아키텍처 결정
2. ✅ shared에 `xpService.ts` 생성
3. ✅ 웹 앱에서 shared 서비스 사용하도록 수정
4. ✅ 모바일 앱 중복 코드 제거 및 shared 사용
5. ✅ TypeScript 체크 및 테스트

## 관련 파일

- `packages/shared/src/lib/xpService.ts` - XP 서비스 팩토리
- `packages/shared/src/lib/xpUtils.ts` - 레벨 계산 유틸리티
- `apps/web/src/lib/xp.ts` - 웹 XP 서비스 인스턴스
- `apps/mobile/src/lib/xp.ts` - 모바일 XP 서비스 인스턴스
- `apps/web/src/pages/TodayChecklistPage.tsx` - 웹 체크 로직
- `apps/mobile/src/screens/TodayScreen.tsx` - 모바일 체크 로직
