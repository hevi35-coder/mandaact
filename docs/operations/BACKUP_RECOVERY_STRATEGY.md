# MandaAct 백업 & 복구 전략

**최종 업데이트**: 2025-11-30
**버전**: 1.0

---

## 1. 개요

MandaAct의 데이터 백업 및 복구 전략을 정의합니다. Supabase를 백엔드로 사용하므로 Supabase의 백업 기능을 최대한 활용합니다.

### 1.1 데이터 중요도 분류

| 테이블 | 중요도 | 설명 |
|--------|--------|------|
| `auth.users` | 🔴 Critical | 사용자 인증 정보 |
| `mandalarts` | 🔴 Critical | 핵심 목표 데이터 |
| `sub_goals` | 🔴 Critical | 세부 목표 데이터 |
| `actions` | 🔴 Critical | 실천 항목 데이터 |
| `check_history` | 🔴 Critical | 실천 기록 (핵심 데이터) |
| `user_gamification` | 🟡 Important | XP, 레벨, 스트릭 |
| `user_achievements` | 🟡 Important | 획득한 배지 |
| `achievement_unlock_history` | 🟢 Moderate | 배지 해제 이력 |
| `xp_multipliers` | 🟢 Moderate | XP 배율 (재생성 가능) |
| `daily_xp_log` | 🟢 Moderate | 일별 XP 로그 |

### 1.2 데이터 관계도

```
auth.users
    └─ mandalarts (CASCADE)
        └─ sub_goals (CASCADE)
            └─ actions (CASCADE)
                └─ check_history (CASCADE)
    └─ user_gamification
        └─ user_achievements
            └─ achievement_unlock_history
    └─ xp_multipliers
    └─ daily_xp_log
```

---

## 2. Supabase 자동 백업

### 2.1 Supabase Pro 플랜 백업 기능

Supabase Pro 플랜 이상에서 제공되는 자동 백업:

| 기능 | Pro | Team | Enterprise |
|------|-----|------|------------|
| 일일 백업 | ✅ | ✅ | ✅ |
| Point-in-Time Recovery | ❌ | ✅ (7일) | ✅ (30일) |
| 백업 보관 기간 | 7일 | 14일 | 30일 |
| 수동 백업 다운로드 | ✅ | ✅ | ✅ |

### 2.2 백업 설정 확인 방법

Supabase Dashboard에서:
1. Project Settings → Database → Backups 탭
2. 백업 스케줄 및 보관 기간 확인
3. 최근 백업 상태 확인

### 2.3 수동 백업 생성

```bash
# pg_dump를 사용한 수동 백업
pg_dump \
  -h db.YOUR_PROJECT_REF.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -F c \
  -f backup_$(date +%Y%m%d_%H%M%S).dump

# 특정 스키마만 백업 (public만)
pg_dump \
  -h db.YOUR_PROJECT_REF.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -n public \
  -F c \
  -f backup_public_$(date +%Y%m%d_%H%M%S).dump
```

### 2.4 Supabase CLI를 통한 백업

```bash
# 프로젝트 연결
supabase link --project-ref YOUR_PROJECT_REF

# 데이터베이스 덤프 (스키마 + 데이터)
supabase db dump -f backup.sql

# 스키마만 덤프
supabase db dump -f schema_only.sql --schema-only

# 데이터만 덤프
supabase db dump -f data_only.sql --data-only
```

---

## 3. 데이터 복구 프로시저

### 3.1 전체 복구 (재해 복구)

**시나리오**: 프로젝트 전체 복구가 필요한 경우

```bash
# 1. 새 프로젝트 생성 또는 기존 프로젝트 초기화

# 2. 백업에서 복구
psql \
  -h db.YOUR_PROJECT_REF.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -f backup.sql

# 3. RLS 정책 확인
# Supabase Dashboard에서 RLS 활성화 상태 확인
```

### 3.2 특정 테이블 복구

**시나리오**: 실수로 특정 테이블 데이터 삭제

```sql
-- 1. 트랜잭션 시작
BEGIN;

-- 2. 기존 데이터 백업 (혹시 모를 경우)
CREATE TABLE _backup_check_history AS
SELECT * FROM check_history;

-- 3. 테이블 TRUNCATE (CASCADE 주의!)
TRUNCATE TABLE check_history;

-- 4. 백업에서 데이터 복원 (pg_restore 또는 INSERT)
-- pg_restore 사용 시:
-- pg_restore -h HOST -U USER -d DB -t check_history backup.dump

-- 5. 확인 후 커밋
COMMIT;

-- 6. 백업 테이블 삭제
DROP TABLE _backup_check_history;
```

### 3.3 특정 사용자 데이터 복구

**시나리오**: 특정 사용자의 데이터만 복구

```sql
-- 1. 사용자 ID 확인
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- 2. 백업에서 해당 사용자 데이터 추출
-- (별도 파일로 저장해야 함)

-- 3. 현재 데이터 삭제 (CASCADE로 연관 데이터 포함)
DELETE FROM mandalarts WHERE user_id = 'USER_ID';

-- 4. 백업에서 복원
-- INSERT INTO mandalarts SELECT * FROM backup_mandalarts WHERE user_id = 'USER_ID';
-- (sub_goals, actions, check_history도 순서대로)
```

### 3.4 Point-in-Time Recovery (PITR)

Team/Enterprise 플랜에서만 가능:

1. Supabase Dashboard → Database → Backups
2. "Point-in-Time Recovery" 클릭
3. 원하는 시점 선택 (최대 7일/30일 이내)
4. 복구 시작

---

## 4. 마이그레이션 롤백

### 4.1 마이그레이션 히스토리 확인

```sql
-- Supabase 마이그레이션 테이블 확인
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC;
```

### 4.2 수동 롤백 스크립트 생성

각 마이그레이션에 대해 롤백 스크립트를 준비:

```sql
-- 예: 20251112000005_badge_system_v5_renewal.sql 롤백

-- 롤백 전 백업
CREATE TABLE _backup_achievements AS SELECT * FROM achievements;
CREATE TABLE _backup_user_achievements AS SELECT * FROM user_achievements;

-- 롤백 실행
DROP TABLE IF EXISTS achievement_unlock_history;
DROP TABLE IF EXISTS user_achievements;
DROP TABLE IF EXISTS achievements;

-- 이전 버전 스키마 복원 (필요 시)
-- 또는 이전 마이그레이션 다시 실행
```

### 4.3 마이그레이션 롤백 테스트 절차

```bash
# 1. 로컬 Supabase 시작
supabase start

# 2. 마이그레이션 적용
supabase db push

# 3. 테스트 데이터 삽입
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -c "INSERT INTO mandalarts (...) VALUES (...);"

# 4. 롤백 스크립트 실행
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -f rollback_script.sql

# 5. 데이터 무결성 확인
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -c "SELECT COUNT(*) FROM mandalarts;"

# 6. 로컬 Supabase 종료
supabase stop
```

---

## 5. RLS 정책 검증

### 5.1 RLS 정책 목록 확인

```sql
-- 모든 RLS 정책 확인
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 5.2 RLS 정책 테스트

```sql
-- 테스트 사용자로 전환 (서비스 키 사용 시)
SET ROLE authenticated;
SET request.jwt.claim.sub = 'test-user-id';

-- SELECT 테스트
SELECT * FROM mandalarts;

-- INSERT 테스트
INSERT INTO mandalarts (user_id, title, center_goal, input_method)
VALUES ('test-user-id', 'Test', 'Test Goal', 'manual');

-- 다른 사용자 데이터 접근 테스트 (실패해야 함)
SELECT * FROM mandalarts WHERE user_id = 'other-user-id';

-- 역할 복원
RESET ROLE;
```

### 5.3 보안 테스트 체크리스트

| 테스트 항목 | 예상 결과 | 통과 |
|------------|----------|------|
| 인증된 사용자가 자신의 만다라트 조회 | 성공 | ☐ |
| 인증된 사용자가 타인의 만다라트 조회 | 빈 결과 | ☐ |
| 비인증 사용자가 만다라트 조회 | 거부 | ☐ |
| 인증된 사용자가 자신의 체크 기록 생성 | 성공 | ☐ |
| 인증된 사용자가 타인의 체크 기록 생성 | 거부 | ☐ |
| 서비스 키로 모든 데이터 접근 | 성공 | ☐ |

---

## 6. 백업 스케줄 권장사항

### 6.1 자동 백업 (Supabase 제공)

- **일일 백업**: Supabase Pro 기본 제공
- **보관 기간**: 최소 7일 (Pro), 14일 (Team) 권장

### 6.2 수동 백업 스케줄

| 백업 유형 | 주기 | 보관 기간 | 저장 위치 |
|----------|------|----------|----------|
| 전체 백업 | 주 1회 (일요일) | 4주 | S3/GCS |
| 증분 백업 | 일 1회 | 7일 | S3/GCS |
| 마이그레이션 전 | 매 배포 | 영구 | Git (스키마만) |
| 스키마 백업 | 월 1회 | 12개월 | Git |

### 6.3 백업 자동화 스크립트

```bash
#!/bin/bash
# backup_mandaact.sh

# 설정
PROJECT_REF="your-project-ref"
DB_PASSWORD="your-db-password"
BACKUP_DIR="/backups/mandaact"
S3_BUCKET="s3://mandaact-backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 디렉토리 생성
mkdir -p $BACKUP_DIR

# 백업 생성
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h db.$PROJECT_REF.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -F c \
  -f $BACKUP_DIR/backup_$DATE.dump

# 압축
gzip $BACKUP_DIR/backup_$DATE.dump

# S3 업로드 (AWS CLI 필요)
aws s3 cp $BACKUP_DIR/backup_$DATE.dump.gz $S3_BUCKET/

# 오래된 로컬 백업 삭제 (7일 이상)
find $BACKUP_DIR -name "*.dump.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.dump.gz"
```

---

## 7. 재해 복구 계획 (DRP)

### 7.1 복구 목표

| 지표 | 목표 |
|------|------|
| RPO (Recovery Point Objective) | 24시간 |
| RTO (Recovery Time Objective) | 4시간 |

### 7.2 재해 시나리오별 대응

#### 시나리오 A: 데이터 손상

1. 손상 범위 파악
2. 최근 정상 백업 확인
3. 해당 테이블/데이터만 복구
4. 데이터 무결성 검증
5. 서비스 재개

#### 시나리오 B: 프로젝트 삭제/손실

1. Supabase 신규 프로젝트 생성
2. 마이그레이션 순차 적용
3. 백업에서 데이터 복원
4. RLS 정책 검증
5. Edge Function 재배포
6. 환경 변수 재설정
7. DNS/도메인 업데이트
8. 서비스 재개

#### 시나리오 C: Supabase 장애

1. Supabase 상태 확인 (status.supabase.com)
2. 사용자 공지 (서비스 일시 중단)
3. Supabase 복구 대기
4. 복구 후 데이터 무결성 확인
5. 서비스 재개

### 7.3 비상 연락망

| 역할 | 담당자 | 연락처 |
|------|--------|--------|
| 프로젝트 관리자 | TBD | - |
| 기술 담당자 | TBD | - |
| Supabase 지원 | - | support@supabase.com |

---

## 8. 점검 및 테스트

### 8.1 정기 점검 (월 1회)

- [ ] Supabase Dashboard에서 백업 상태 확인
- [ ] 최근 백업 다운로드 테스트
- [ ] RLS 정책 검증 쿼리 실행
- [ ] 마이그레이션 히스토리 검토

### 8.2 분기 복구 테스트

- [ ] 로컬 환경에서 백업 복원 테스트
- [ ] 복원된 데이터 무결성 검증
- [ ] 마이그레이션 롤백 테스트
- [ ] 복구 소요 시간 측정 및 기록

---

## 9. 관련 문서

- [Supabase Backup 공식 문서](https://supabase.com/docs/guides/platform/backups)
- [PostgreSQL pg_dump 문서](https://www.postgresql.org/docs/current/app-pgdump.html)
- [Supabase CLI 문서](https://supabase.com/docs/guides/cli)

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2025-11-30 | 최초 작성 |
