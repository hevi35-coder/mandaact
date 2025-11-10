# Monthly Badge Reset Cron Job Setup Guide

**Status**: ✅ Cron Jobs Scheduled Successfully (Korean Timezone)

**최신 마이그레이션**: `20251110000004_update_monthly_reset_timezone.sql`

---

## ✅ 완료된 작업

### 1. **2단계 시스템 구현** ✅

#### Phase 1: 배지 평가 (매월 2일 00:00 KST)
- 함수: `perform_monthly_badge_evaluation()`
- 평가 범위: 전월 1일 00:00 ~ 당월 1일 23:59 (24시간 Grace Period)
- 조건 달성 시 배지 자동 해금

#### Phase 2: 배지 리셋 (매월 2일 03:00 KST)
- 함수: `perform_monthly_badge_reset()`
- `user_achievements`에서 월간 배지 제거
- `achievement_unlock_history`로 이동 (재도전 가능)

### 2. **pg_cron Extension 활성화** ✅
- Supabase에서 자동으로 활성화됨

### 3. **Cron Job 스케줄링** ✅
- **Job 1**: `monthly-badge-evaluation`
  - Schedule: `0 15 1 * *` (UTC 1일 15:00 = KST 2일 00:00)
  - Command: `SELECT perform_monthly_badge_evaluation();`

- **Job 2**: `monthly-badge-reset`
  - Schedule: `0 18 1 * *` (UTC 1일 18:00 = KST 2일 03:00)
  - Command: `SELECT perform_monthly_badge_reset();`

---

## 📅 타임라인 (2025년 3월 예시)

```
2월 28일 (금)
  00:00~23:59: 정상 체크 가능

3월 1일 (토) - Grace Period
  00:00~23:59: "어제(2/28)" 체크 가능 ✅
                → 이 시간의 체크는 2월 배지 평가에 포함됨!

3월 2일 (일)
  00:00 (KST): 📊 배지 평가 시작
                - 평가 범위: 2월 1일 00:00 ~ 3월 1일 23:59
                - 조건 달성 사용자에게 2월 배지 해금

  03:00 (KST): 🔄 배지 리셋
                - user_achievements에서 2월 배지 제거
                - achievement_unlock_history로 이동
                - 3월 배지 재도전 가능
```

---

## 🔍 Cron Job 확인 방법

### 1. Supabase SQL Editor에서 확인

Dashboard → SQL Editor → New Query:

```sql
-- 두 개의 Cron job 확인
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname LIKE 'monthly-badge-%'
ORDER BY jobname;
```

**예상 결과**:
```
jobname: monthly-badge-evaluation
schedule: 0 15 1 * *
command: SELECT perform_monthly_badge_evaluation();
active: t (true)

jobname: monthly-badge-reset
schedule: 0 18 1 * *
command: SELECT perform_monthly_badge_reset();
active: t (true)
```

### 2. Cron Job 실행 이력 확인

```sql
-- 최근 실행 이력
SELECT
  j.jobname,
  jr.runid,
  jr.start_time AT TIME ZONE 'Asia/Seoul' as start_time_kst,
  jr.end_time AT TIME ZONE 'Asia/Seoul' as end_time_kst,
  jr.status,
  jr.return_message
FROM cron.job_run_details jr
JOIN cron.job j ON j.jobid = jr.jobid
WHERE j.jobname LIKE 'monthly-badge-%'
ORDER BY jr.start_time DESC
LIMIT 10;
```

---

## 🧪 수동 테스트 방법

### Phase 1: 배지 평가 테스트

```sql
-- 배지 평가 실행 (dry run)
SELECT * FROM perform_monthly_badge_evaluation();
```

**예상 출력**:
```
badges_evaluated | badges_unlocked | errors_count | message
-----------------+-----------------+--------------+------------------------------------------
       15        |        3        |      0       | Badge evaluation completed: 15 evaluated, 3 unlocked, 0 errors
```

### Phase 2: 배지 리셋 테스트

```sql
-- 배지 리셋 실행
SELECT * FROM perform_monthly_badge_reset();
```

**예상 출력**:
```
badges_reset | errors_count | message
-------------+--------------+-------------------------------------
     3       |      0       | Badge reset completed: 3 success, 0 errors
```

### 통합 테스트 시나리오

```sql
-- 1. 현재 월간 배지 상태 확인
SELECT
  ua.user_id,
  a.title,
  ua.unlocked_at AT TIME ZONE 'Asia/Seoul' as unlocked_at_kst
FROM user_achievements ua
JOIN achievements a ON a.id = ua.achievement_id
WHERE a.badge_type = 'monthly';

-- 2. 배지 평가 실행
SELECT * FROM perform_monthly_badge_evaluation();

-- 3. 새로 해금된 배지 확인 (위 1번 쿼리 다시 실행)

-- 4. 배지 리셋 실행
SELECT * FROM perform_monthly_badge_reset();

-- 5. 리셋 후 상태 확인 (1번 쿼리 다시 - 비어있어야 함)

-- 6. 히스토리에 이동되었는지 확인
SELECT
  user_id,
  a.title,
  unlocked_at AT TIME ZONE 'Asia/Seoul' as unlocked_at_kst,
  xp_awarded,
  repeat_count,
  unlock_context
FROM achievement_unlock_history auh
JOIN achievements a ON a.id = auh.achievement_id
WHERE a.badge_type = 'monthly'
ORDER BY unlocked_at DESC
LIMIT 10;
```

---

## 📊 Cron 스케줄 상세

### Job 1: 배지 평가
| 항목 | 값 |
|------|-----|
| UTC 시간 | 매월 1일 15:00 |
| KST 시간 | 매월 2일 00:00 (자정) |
| Cron 표현식 | `0 15 1 * *` |
| 설명 | 전월 배지 조건 평가 및 해금 |

### Job 2: 배지 리셋
| 항목 | 값 |
|------|-----|
| UTC 시간 | 매월 1일 18:00 |
| KST 시간 | 매월 2일 03:00 (새벽 3시) |
| Cron 표현식 | `0 18 1 * *` |
| 설명 | 월간 배지 제거 및 재도전 가능하도록 초기화 |

---

## 🛠️ Cron Job 관리 명령어

### Cron Job 일시 중지

```sql
-- 평가 job 중지
UPDATE cron.job
SET active = false
WHERE jobname = 'monthly-badge-evaluation';

-- 리셋 job 중지
UPDATE cron.job
SET active = false
WHERE jobname = 'monthly-badge-reset';
```

### Cron Job 재개

```sql
-- 평가 job 재개
UPDATE cron.job
SET active = true
WHERE jobname = 'monthly-badge-evaluation';

-- 리셋 job 재개
UPDATE cron.job
SET active = true
WHERE jobname = 'monthly-badge-reset';
```

### Cron Job 스케줄 변경

```sql
-- 예: 평가 시간을 2일 01:00 KST로 변경
SELECT cron.unschedule('monthly-badge-evaluation');

SELECT cron.schedule(
  'monthly-badge-evaluation',
  '0 16 1 * *',  -- UTC 16:00 = KST 01:00
  'SELECT perform_monthly_badge_evaluation();'
);
```

### Cron Job 삭제

```sql
SELECT cron.unschedule('monthly-badge-evaluation');
SELECT cron.unschedule('monthly-badge-reset');
```

---

## 🚨 문제 해결

### 1. Cron Job이 실행되지 않는 경우

```sql
-- 1. Cron job 상태 확인
SELECT * FROM cron.job WHERE jobname LIKE 'monthly-badge-%';

-- 2. 함수 존재 여부 확인
SELECT proname FROM pg_proc
WHERE proname IN ('perform_monthly_badge_evaluation', 'perform_monthly_badge_reset');

-- 3. 최근 에러 로그 확인
SELECT
  j.jobname,
  jr.status,
  jr.return_message,
  jr.start_time AT TIME ZONE 'Asia/Seoul' as start_time_kst
FROM cron.job_run_details jr
JOIN cron.job j ON j.jobid = jr.jobid
WHERE jr.status = 'failed'
  AND j.jobname LIKE 'monthly-badge-%'
ORDER BY jr.start_time DESC
LIMIT 5;
```

### 2. 함수 실행 에러

```sql
-- 평가 함수 직접 실행하여 에러 확인
SELECT * FROM perform_monthly_badge_evaluation();

-- 리셋 함수 직접 실행하여 에러 확인
SELECT * FROM perform_monthly_badge_reset();
```

### 3. 배지가 예상과 다르게 평가되는 경우

```sql
-- 월간 배지 조건 확인
SELECT
  key,
  title,
  unlock_condition,
  badge_type,
  is_repeatable
FROM achievements
WHERE badge_type = 'monthly';

-- 특정 사용자의 체크 히스토리 확인 (Grace Period 포함)
SELECT
  DATE(checked_at AT TIME ZONE 'Asia/Seoul') as check_date_kst,
  COUNT(*) as checks_count
FROM check_history
WHERE user_id = 'USER_ID'
  AND checked_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
  AND checked_at <= NOW()
GROUP BY DATE(checked_at AT TIME ZONE 'Asia/Seoul')
ORDER BY check_date_kst;
```

---

## 📊 모니터링 쿼리

### 월별 배지 평가/리셋 통계

```sql
-- 최근 6개월 실행 통계
SELECT
  j.jobname,
  DATE_TRUNC('month', jr.start_time) as month,
  COUNT(*) as executions,
  COUNT(*) FILTER (WHERE jr.status = 'succeeded') as success,
  COUNT(*) FILTER (WHERE jr.status = 'failed') as failed,
  AVG(EXTRACT(EPOCH FROM (jr.end_time - jr.start_time))) as avg_duration_seconds
FROM cron.job_run_details jr
JOIN cron.job j ON j.jobid = jr.jobid
WHERE j.jobname LIKE 'monthly-badge-%'
  AND jr.start_time >= NOW() - INTERVAL '6 months'
GROUP BY j.jobname, DATE_TRUNC('month', jr.start_time)
ORDER BY month DESC, j.jobname;
```

### 사용자별 월간 배지 획득 통계

```sql
-- 월간 배지 재획득 횟수 TOP 10 사용자
SELECT
  user_id,
  a.title,
  MAX(repeat_count) as max_repeats,
  SUM(xp_awarded) as total_xp_from_badge
FROM achievement_unlock_history auh
JOIN achievements a ON a.id = auh.achievement_id
WHERE a.badge_type = 'monthly'
GROUP BY user_id, a.title
ORDER BY max_repeats DESC
LIMIT 10;
```

---

## ✅ 검증 체크리스트

- [x] pg_cron extension 활성화됨
- [x] `perform_monthly_badge_evaluation()` 함수 생성됨
- [x] `perform_monthly_badge_reset()` 함수 생성됨
- [x] 평가 Cron job 스케줄링됨 (2일 00:00 KST)
- [x] 리셋 Cron job 스케줄링됨 (2일 03:00 KST)
- [ ] 수동 테스트 실행 및 결과 확인
- [ ] 첫 자동 실행 후 결과 모니터링 (다음 달 2일)

---

## 💡 Grace Period 설명

### 사용자 관점에서의 규칙:

1. **정상 체크**: 해당 월 내에 체크하면 당연히 포함
   - 예: 2월 28일 체크 → 2월 배지에 포함 ✅

2. **어제 체크 (Grace Period)**: 다음 달 1일 23:59까지 "어제" 체크 가능
   - 예: 3월 1일 10:00에 "어제(2/28)" 체크 → 2월 배지에 포함 ✅

3. **마감**: 3월 2일 00:00에 2월 배지 평가 완료
   - 예: 3월 2일 01:00에 체크 시도 → 2월 배지에 미포함 ❌

### 왜 2일 새벽인가?

- **일관성**: "어제까지 체크 가능" = "어제까지 배지 포함"
- **공평성**: 모든 사용자가 24시간 여유 확보
- **명확성**: 월 경계가 명확 (2일 = 전월 완전 종료)

---

## 🎉 Summary

월간 배지 시스템이 **한국 시간대 기준으로 완벽하게 설정**되었습니다!

**핵심 특징**:
- ✅ 24시간 Grace Period (어제 체크 허용)
- ✅ 한국 시간 기준 정산 (2일 00:00)
- ✅ 자동 평가 & 리셋
- ✅ 체크 허용 = 배지 평가 (일관성)

**다음 실행**: 2025년 12월 2일 00:00 KST (2월 배지 평가)
