# 배지 부정방지 시스템

**작성일**: 2025-11-12
**최종 업데이트**: 2025-11-12 (Badge Consolidation)
**상태**: 프로덕션 배포 완료
**버전**: v2.0 (25개 활성 배지)

---

## 📋 목차

1. [개요](#개요)
2. [부정방지 규칙](#부정방지-규칙)
3. [배지별 적용 규칙](#배지별-적용-규칙)
4. [검증 프로세스](#검증-프로세스)
5. [사용자 안내 문구](#사용자-안내-문구)
6. [기술 구현](#기술-구현)

---

## 개요

### 🎯 목적
- 빈 만다라트로 배지 획득 방지
- 자동화 스크립트/봇을 통한 부정 획득 차단
- 공정한 배지 획득 환경 제공

### 🛡️ 핵심 원칙
1. **투명성**: 규칙을 명확하게 공개
2. **공정성**: 모든 유저에게 동일한 기준 적용
3. **로깅**: 모든 검증 시도 기록
4. **개선**: 로그 분석을 통한 지속적 개선

---

## 부정방지 규칙

### 📐 Rule 1: 최소 액션 수 (minActionsPerMandalart)

#### **목적**
빈 만다라트 생성으로 배지 획득하는 것을 방지

#### **검증 로직**
```sql
SELECT COUNT(*) INTO v_action_count
FROM actions a
JOIN sub_goals sg ON a.sub_goal_id = sg.id
JOIN mandalarts m ON sg.mandalart_id = m.id
WHERE m.user_id = p_user_id
  AND LENGTH(a.text) >= 5;  -- 최소 5자 이상

IF v_action_count < 16 THEN
  -- 배지 획득 실패
  RETURN FALSE;
END IF;
```

#### **기준**
- **최소 액션 수**: 16개
- **최소 액션 길이**: 5자 이상
- **이유**: 만다라트의 최소 단위는 9개 액션이지만, 여유있게 16개로 설정

#### **예시**
```
✅ 통과: "매일 영어 단어 10개 외우기" (유의미한 목표, 15자)
✅ 통과: "운동 1시간" (짧지만 유의미, 7자)
❌ 실패: "ㅁㅁㅁㅁ" (무의미한 텍스트, 4자)
❌ 실패: 액션이 10개만 있는 만다라트
```

---

### 📐 Rule 2: 체크 간격 제한 (minCheckInterval)

#### **목적**
자동화 스크립트나 봇으로 빠르게 체크하는 것을 방지

#### **검증 로직**
```sql
-- 최근 24시간 내 체크 기록 분석
SELECT COUNT(*) INTO v_rapid_checks
FROM (
  SELECT checked_at,
    LAG(checked_at) OVER (ORDER BY checked_at) as prev_checked_at
  FROM check_history
  WHERE user_id = p_user_id
    AND checked_at > NOW() - INTERVAL '1 day'
) t
WHERE EXTRACT(EPOCH FROM (checked_at - prev_checked_at)) < 60;  -- 60초

IF v_rapid_checks > 5 THEN
  -- 배지 획득 실패 (빠른 체크가 5회 초과)
  RETURN FALSE;
END IF;
```

#### **기준**
- **최소 간격**: 60초
- **허용 횟수**: 5회까지
- **기간**: 최근 24시간
- **이유**: 정상적인 사용자도 가끔 빠르게 체크할 수 있으므로 5회까지 허용

#### **예시**
```
✅ 통과: 10개 액션을 각각 1분 간격으로 체크 (정상적인 사용)
✅ 통과: 5개 액션을 30초 간격으로 체크 (허용 범위 내)
❌ 실패: 10개 액션을 30초 간격으로 체크 (6회 이상 빠른 체크)
❌ 실패: 1초에 1개씩 10개 체크 (자동화 의심)
```

---

### 📐 Rule 3: 일일 최대 체크 수 (maxDailyChecks)

#### **목적**
비현실적으로 많은 체크를 통한 배지 획득 방지

#### **현재 상태**
- **설정**: `maxDailyChecks: 50` (monthly_champion 배지)
- **구현 상태**: ⚠️ **아직 검증 로직 미구현**

#### **향후 구현 필요**
```sql
-- 제안하는 검증 로직
SELECT COUNT(*) INTO v_daily_checks
FROM check_history
WHERE user_id = p_user_id
  AND DATE(checked_at AT TIME ZONE 'Asia/Seoul') = CURRENT_DATE;

IF v_daily_checks > (v_rules->>'maxDailyChecks')::INTEGER THEN
  RETURN FALSE;
END IF;
```

---

## 배지별 적용 규칙

### 🌱 첫 걸음 (first_mandalart)

**조건**: 첫 번째 만다라트 생성

**부정방지 규칙**:
```json
{
  "minActionsPerMandalart": 16,
  "minActionTextLength": 5
}
```

**검증 내용**:
- ✅ 최소 16개 액션 (5자 이상)
- ❌ 빠른 체크 감지 없음

**획득 XP**: +100 XP

**실패 예시**:
- 빈 만다라트 생성 (액션 0개)
- "ㅁㅁㅁ", "test" 같은 더미 텍스트로 채운 만다라트
- 10개만 있는 불완전한 만다라트

---

### 🏅 월간 챔피언 (monthly_champion)

**조건**: 한 달 동안 매일 100% 완료

**부정방지 규칙**:
```json
{
  "minActionsPerMandalart": 16,
  "minCheckInterval": 60,
  "maxDailyChecks": 50
}
```

**검증 내용**:
- ✅ 최소 16개 액션 (5자 이상)
- ✅ 60초 미만 간격 체크가 5회 이하
- ⚠️ ~~50개 초과 일일 체크 (미구현)~~

**획득 XP**: +1,000 XP

**실패 예시**:
- 빈 만다라트로 매일 체크
- 자동화 스크립트로 1초마다 체크
- 비현실적으로 많은 액션을 매일 체크

---

### 📈 레벨 10 (level_10)

**조건**: 레벨 10 달성

**부정방지 규칙**: 없음
```json
null
```

**이유**: 레벨 자체가 XP 누적으로 달성하는 것이므로, XP 부정방지 시스템으로 보호됨

---

## 검증 프로세스

### 🔄 배지 획득 플로우

```
1. 사용자가 배지 조건 충족
   ↓
2. 트리거 또는 함수 호출
   ↓
3. validate_badge_eligibility() 호출
   ↓
4. anti_cheat_rules 확인
   ↓
5a. 규칙 없음 → 즉시 통과 ✅
5b. 규칙 있음 → 검증 시작
   ↓
6. Rule 1: 최소 액션 수 검증
   ↓
7. Rule 2: 빠른 체크 패턴 검증
   ↓
8. Rule 3: (미래) 일일 최대 체크 검증
   ↓
9a. 모두 통과 → 배지 획득 ✅
9b. 하나라도 실패 → 획득 실패 ❌ + 로그 기록
```

### 📊 로깅 시스템

**테이블**: `badge_validation_logs`

**기록 내용**:
```sql
{
  user_id: UUID,
  badge_key: VARCHAR,
  validation_type: 'min_actions' | 'rapid_checks' | 'full_validation',
  passed: BOOLEAN,
  details: JSONB,
  created_at: TIMESTAMP
}
```

**로그 예시**:
```json
// 실패 - 최소 액션 수 미달
{
  "user_id": "...",
  "badge_key": "first_mandalart",
  "validation_type": "min_actions",
  "passed": false,
  "details": {
    "required": 16,
    "actual": 8
  }
}

// 실패 - 빠른 체크 감지
{
  "user_id": "...",
  "badge_key": "monthly_champion",
  "validation_type": "rapid_checks",
  "passed": false,
  "details": {
    "rapid_check_count": 12
  }
}

// 성공
{
  "user_id": "...",
  "badge_key": "first_mandalart",
  "validation_type": "full_validation",
  "passed": true,
  "details": {
    "timestamp": "2025-11-12T10:30:00Z"
  }
}
```

---

## 사용자 안내 문구

### 📍 배지 상세 다이얼로그에 추가할 내용

#### **위치**: `src/components/stats/BadgeDetailDialog.tsx`

#### **추가할 섹션**: "공정한 배지 획득 정책"

```typescript
{/* 공정한 배지 획득 정책 - 부정방지 규칙이 있는 배지에만 표시 */}
{badge.anti_cheat_rules && Object.keys(badge.anti_cheat_rules).length > 0 && (
  <div className="mt-4 pt-4 border-t border-border">
    <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
      <Shield className="h-3 w-3" />
      공정한 배지 획득 정책
    </div>
    <ul className="text-[10px] text-muted-foreground space-y-1">
      {badge.anti_cheat_rules.minActionsPerMandalart && (
        <li>
          • 최소 {badge.anti_cheat_rules.minActionsPerMandalart}개의 유의미한 실천 항목 필요
          <span className="text-[9px] ml-1">(각 {badge.anti_cheat_rules.minActionTextLength || 5}자 이상)</span>
        </li>
      )}
      {badge.anti_cheat_rules.minCheckInterval && (
        <li>
          • 정상적인 체크 패턴 필요
          <span className="text-[9px] ml-1">(자동화 방지)</span>
        </li>
      )}
      {badge.anti_cheat_rules.maxDailyChecks && (
        <li>
          • 하루 최대 {badge.anti_cheat_rules.maxDailyChecks}개까지 체크 가능
        </li>
      )}
    </ul>
    <p className="text-[9px] text-muted-foreground mt-2 italic">
      ※ 모든 사용자에게 공정한 배지 획득 환경을 제공하기 위한 정책입니다
    </p>
  </div>
)}
```

---

### 📍 프로필 카드 - 배지 컬렉션 설명

#### **위치**: `src/components/stats/UserProfileCard.tsx`

#### **배지 컬렉션 섹션 하단에 추가**:

```typescript
{/* 배지 획득 정책 안내 */}
{badgeCollectionOpen && allBadges.length > 0 && (
  <div className="mt-3 pt-3 border-t border-primary/10">
    <div className="text-[10px] text-muted-foreground space-y-1">
      <div className="flex items-start gap-1">
        <Shield className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold mb-0.5">공정한 배지 획득</p>
          <p>배지는 유의미한 실천과 정상적인 활동으로만 획득할 수 있습니다.</p>
        </div>
      </div>
    </div>
  </div>
)}
```

---

### 📍 배지 획득 실패 시 알림

#### **현재 상태**: ❌ 사용자에게 실패 알림 없음

#### **개선 필요**: 배지 획득 조건을 충족했지만 부정방지 검증에서 실패한 경우 안내

```typescript
// 예시: 만다라트 생성 후 배지 획득 실패 시
{
  title: "배지 획득 조건 미충족",
  description: "배지를 획득하려면 최소 16개의 유의미한 실천 항목(각 5자 이상)이 필요합니다.",
  type: "info"
}
```

---

## 기술 구현

### 📁 구현 파일

#### **데이터베이스**:
- `supabase/migrations/20251111000003_badge_system_improvements.sql`
  - `validate_badge_eligibility()` 함수
  - `check_first_mandalart_badge()` 트리거
  - `check_monthly_champion()` 함수
  - `badge_validation_logs` 테이블

#### **프론트엔드** (추가 필요):
- `src/components/stats/BadgeDetailDialog.tsx` - 정책 안내 추가
- `src/components/stats/UserProfileCard.tsx` - 배지 컬렉션 안내
- `src/types/index.ts` - Achievement 타입에 `anti_cheat_rules` 추가

### 🔧 타입 정의 추가 필요

```typescript
// src/types/index.ts
export interface Achievement {
  id: string
  key: string
  title: string
  description: string
  icon: string
  xp_reward: number
  unlock_condition: Record<string, any>
  display_order: number
  completion_type: 'one_time' | 'recurring'
  completion_window: 'daily' | 'weekly' | 'monthly' | 'permanent'
  category: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  is_hidden: boolean
  valid_from: string | null
  valid_until: string | null
  anti_cheat_rules: {  // ← 추가
    minActionsPerMandalart?: number
    minActionTextLength?: number
    minCheckInterval?: number
    maxDailyChecks?: number
  } | null
  max_count: number
  created_at: string
  updated_at: string
}
```

---

## 향후 개선 사항

### 🔮 Phase 1: 즉시 개선

1. **사용자 안내 문구 추가**
   - ✅ BadgeDetailDialog에 정책 섹션 추가
   - ✅ UserProfileCard에 안내 추가
   - ✅ Achievement 타입 업데이트

2. **실패 알림 추가**
   - ❌ 배지 획득 실패 시 사용자에게 이유 안내
   - ❌ "왜 배지를 못 받았는지" 명확한 피드백

### 🔮 Phase 2: 중기 개선

1. **maxDailyChecks 검증 구현**
   - 현재 설정만 있고 검증 로직 없음
   - `validate_badge_eligibility()` 함수에 추가

2. **로그 분석 대시보드**
   - `badge_validation_logs` 분석
   - 부정 시도 패턴 모니터링
   - 규칙 조정 필요 여부 판단

### 🔮 Phase 3: 장기 개선

1. **동적 규칙 조정**
   - 로그 분석 기반 자동 조정
   - A/B 테스트로 최적 기준 찾기

2. **추가 부정방지 규칙**
   - 계정 생성 후 즉시 배지 획득 방지 (최소 활동 기간)
   - 같은 IP에서 여러 계정 생성 감지
   - 의심스러운 패턴 자동 플래깅

---

## 모니터링 쿼리

### 📊 부정방지 효과 분석

```sql
-- 배지별 검증 실패 통계
SELECT
  badge_key,
  validation_type,
  COUNT(*) as failure_count
FROM badge_validation_logs
WHERE passed = FALSE
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY badge_key, validation_type
ORDER BY failure_count DESC;

-- 사용자별 실패 횟수
SELECT
  user_id,
  badge_key,
  COUNT(*) as attempts,
  SUM(CASE WHEN passed THEN 1 ELSE 0 END) as success_count,
  SUM(CASE WHEN NOT passed THEN 1 ELSE 0 END) as failure_count
FROM badge_validation_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id, badge_key
HAVING SUM(CASE WHEN NOT passed THEN 1 ELSE 0 END) > 3  -- 실패 3회 이상
ORDER BY failure_count DESC;

-- 빠른 체크 패턴 분석
SELECT
  user_id,
  badge_key,
  details->>'rapid_check_count' as rapid_checks
FROM badge_validation_logs
WHERE validation_type = 'rapid_checks'
  AND passed = FALSE
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY (details->>'rapid_check_count')::INTEGER DESC;
```

---

**최종 업데이트**: 2025-11-12
**작성자**: Development Team
**상태**: ✅ 프로덕션 배포 완료 (사용자 안내 추가 필요)
