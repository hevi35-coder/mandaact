# Phase 2 배지 시스템 구현 가이드

## 실행 순서

### 1. Phase 2 배지 추가
파일: `05_phase2_badges.sql`

**추가되는 배지 (5개)**:
- 🎯 **집중력** (silver) - 한 만다라트 50% 완성
- 🏆 **완벽주의자** (gold) - 한 만다라트 100% 완성
- 💪 **100의 힘** (silver, 반복) - 누적 100회 실천마다
- 🎆 **새해의 다짐** (platinum, 한정판) - 2025년 1월 1-7일 100% 달성
- 💭 **대화의 달인** (gold, 소셜) - AI 코칭 100회

### 2. 만다라트 완성도 함수 구현
파일: `06_mandalart_completion_functions.sql`

**기능**:
- `get_mandalart_completion()` - 만다라트 완성률 계산
- `check_mandalart_completion_badges()` - 50%/100% 배지 자동 부여
- 체크 시 자동 트리거
- 누적 100회 배지 자동 부여

### 3. AI 코칭 배지 트리거
파일: `07_ai_coach_badge_function.sql`

**기능**:
- 사용자 메시지 100개 달성 시 자동 배지 부여
- chat_messages 테이블 INSERT 트리거

## Supabase Dashboard 실행

1. https://supabase.com/dashboard/project/gxnvovnwlqjstpcsprqr/sql/new 접속

2. 순서대로 SQL 실행:
   ```
   05_phase2_badges.sql
   ↓
   06_mandalart_completion_functions.sql
   ↓
   07_ai_coach_badge_function.sql
   ```

3. 각 단계마다 성공 메시지 확인

## 프론트엔드 변경사항

### 1. 타입 정의 업데이트
- `src/types/index.ts` - Achievement, UserAchievement 타입 확장

### 2. 배지 상세 페이지 개선
- `src/components/stats/BadgeDetailDialog.tsx`
  - 카테고리/등급 배지 표시
  - 반복 획득 횟수 표시
  - 한정판 배지 유효기간 표시

### 3. UI 카테고리별 그룹화
- `src/components/stats/UserProfileCard.tsx`
  - 배지를 카테고리별로 그룹화
  - 등급별 색상 차별화
  - 반복 획득 배지 횟수 표시

## 테스트 시나리오

### 1. 만다라트 완성도 배지
```
1. 만다라트 생성 (64개 액션)
2. 32개 액션 체크 → 🎯 집중력 배지 획득
3. 64개 액션 모두 체크 → 🏆 완벽주의자 배지 획득
```

### 2. 누적 실천 배지
```
1. 총 체크 횟수 확인
2. 100회, 200회, 300회... 달성 시마다 💪 100의 힘 배지 획득
3. 배지 상세에서 획득 횟수 확인
```

### 3. AI 코칭 배지
```
1. AI 코치와 대화
2. 100개 메시지 전송
3. 💭 대화의 달인 배지 자동 획득
```

### 4. 한정판 배지 (2025년 1월)
```
1. 2025년 1월 1-7일 기간에 매일 100% 달성
2. 🎆 새해의 다짐 배지 획득
3. 기간 외에는 획득 불가 (상세 페이지에 경고 표시)
```

## 검증 쿼리

### 배지 추가 확인
```sql
SELECT key, title, category, tier, xp_reward
FROM achievements
WHERE key IN (
  'mandalart_50',
  'mandalart_100',
  'checks_100_v2',
  'new_year_2025',
  'ai_coach_100'
)
ORDER BY display_order;
```

### 트리거 확인
```sql
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_mandalart_completion_check',
  'trigger_cumulative_checks_badge',
  'trigger_ai_coach_badge'
);
```

### 사용자 배지 확인
```sql
SELECT
  ua.user_id,
  a.key,
  a.title,
  ua.count,
  ua.unlocked_at
FROM user_achievements ua
JOIN achievements a ON ua.achievement_id = a.id
WHERE a.key IN (
  'mandalart_50',
  'mandalart_100',
  'checks_100_v2',
  'ai_coach_100'
)
ORDER BY ua.unlocked_at DESC;
```

## 주의사항

1. **트리거 순서**: 배지 데이터 먼저 추가 후 트리거 생성
2. **한정판 배지**: valid_from/until 날짜 확인
3. **반복 배지**: max_count, count 필드 정상 작동 확인
4. **XP 보상**: 각 배지 획득 시 XP 정확히 부여되는지 확인

## 롤백 (필요 시)

```sql
-- Phase 2 배지 삭제
DELETE FROM achievements
WHERE key IN (
  'mandalart_50',
  'mandalart_100',
  'checks_100_v2',
  'new_year_2025',
  'ai_coach_100'
);

-- 트리거 삭제
DROP TRIGGER IF EXISTS trigger_mandalart_completion_check ON check_history;
DROP TRIGGER IF EXISTS trigger_cumulative_checks_badge ON check_history;
DROP TRIGGER IF EXISTS trigger_ai_coach_badge ON chat_messages;

-- 함수 삭제
DROP FUNCTION IF EXISTS get_mandalart_completion(UUID);
DROP FUNCTION IF EXISTS check_mandalart_completion_badges(UUID, UUID);
DROP FUNCTION IF EXISTS trigger_check_mandalart_completion();
DROP FUNCTION IF EXISTS check_cumulative_checks_badges();
DROP FUNCTION IF EXISTS check_ai_coach_badges();
```

---
*Phase 2 배지 시스템 - 2024-11-11*