# 백업 & 복구 전략

**작성일**: 2025-11-25
**상태**: Phase 8 - 모니터링 & 운영 강화

---

## 목적

MandaAct 프로덕션 환경의 데이터 손실 방지 및 장애 복구를 위한 백업/복구 전략을 정의합니다.

---

## 1. 백업 대상

### 1.1 데이터베이스 (PostgreSQL via Supabase)

**백업 항목**:
- `mandalarts` - 만다라트 데이터
- `sub_goals` - 세부 목표
- `actions` - 실천 항목
- `check_history` - 체크 히스토리
- `user_gamification` - XP/레벨 데이터
- `user_achievements` - 배지 획득 기록
- `achievement_unlock_history` - 배지 획득 히스토리
- `xp_multipliers` - XP 배율 기록

**백업 제외**:
- `auth.users` - Supabase Auth가 자동 관리
- 임시 세션 데이터

---

### 1.2 파일 스토리지 (Supabase Storage)

**백업 항목**:
- `mandalart-images` 버킷 - 사용자가 업로드한 만다라트 이미지

**백업 주기**:
- 이미지는 변경되지 않으므로 주 1회 백업으로 충분

---

### 1.3 환경 설정

**백업 항목**:
- `.env.local` (민감 정보 제외)
- Supabase Edge Functions 설정
- RLS 정책
- 데이터베이스 마이그레이션 파일

**백업 방법**:
- Git 리포지토리에 버전 관리
- `.env.local`은 별도 보안 저장소에 암호화 저장

---

## 2. 백업 전략

### 2.1 Supabase 자동 백업

**설정 위치**: Supabase Dashboard → Database → Backups

**백업 설정**:
```
Plan: Pro (필요 시 업그레이드)
- Daily automatic backups (매일 자동)
- Point-in-Time Recovery (PITR) - 7일 이내 특정 시점 복구
- Retention: 7 days (기본), 30 days (Pro+)
```

**현재 상태**:
- [ ] Free tier: 수동 백업만 가능
- [ ] Pro tier로 업그레이드 시: 자동 백업 활성화

**액션 아이템**:
1. Supabase 대시보드 접속
2. Project Settings → Database → Backups 확인
3. 필요시 Pro plan으로 업그레이드 ($25/month)

---

### 2.2 수동 백업 (현재 사용)

**백업 주기**: 주 1회 (매주 일요일 오전)

**백업 명령어**:
```bash
# PostgreSQL 데이터베이스 덤프
npx supabase db dump -f backup_$(date +%Y%m%d).sql

# 특정 테이블만 백업
npx supabase db dump --data-only -t mandalarts -f mandalarts_backup.sql
npx supabase db dump --data-only -t check_history -f check_history_backup.sql
```

**백업 저장 위치**:
- 로컬: `backups/` 디렉토리 (Git 제외)
- 클라우드: Google Drive / AWS S3 / Dropbox
- 보관 기간: 30일

---

### 2.3 파일 스토리지 백업

**백업 방법**:
```bash
# Supabase Storage API로 모든 파일 다운로드
# 스크립트 예시: scripts/backup-storage.sh

#!/bin/bash
BUCKET_NAME="mandalart-images"
BACKUP_DIR="backups/storage/$(date +%Y%m%d)"

mkdir -p "$BACKUP_DIR"

# Supabase CLI로 파일 목록 가져오기
npx supabase storage list "$BUCKET_NAME" > files.txt

# 각 파일 다운로드 (API 사용)
# TODO: 구현 필요
```

**백업 주기**: 주 1회

---

## 3. 복구 전략

### 3.1 데이터베이스 복구

#### 시나리오 1: 최근 데이터 손실 (PITR 사용)
**조건**: Pro plan + PITR 활성화 + 7일 이내

**복구 절차**:
1. Supabase Dashboard → Database → Backups → Point-in-Time Recovery
2. 복구할 시점 선택 (예: 오늘 오전 8시)
3. "Restore" 버튼 클릭
4. 복구 완료까지 대기 (약 10-30분)
5. 애플리케이션에서 데이터 확인

**예상 소요 시간**: 10-30분
**데이터 손실**: 거의 없음 (선택한 시점까지 복구)

---

#### 시나리오 2: 수동 백업에서 복구
**조건**: 백업 파일 존재

**복구 절차**:
```bash
# 1. 백업 파일 확인
ls backups/

# 2. 데이터베이스 복구
npx supabase db reset
npx supabase db push --db-url "$DATABASE_URL" < backups/backup_20251125.sql

# 3. 마이그레이션 적용
npx supabase db push

# 4. 데이터 검증
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM mandalarts;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM check_history;"
```

**예상 소요 시간**: 30분 ~ 1시간
**데이터 손실**: 마지막 백업 이후 데이터 손실 가능

---

#### 시나리오 3: 특정 테이블만 손상
**조건**: 일부 테이블만 복구 필요

**복구 절차**:
```bash
# 1. 손상된 테이블 식별
psql "$DATABASE_URL" -c "SELECT * FROM mandalarts LIMIT 10;"

# 2. 해당 테이블만 복구
psql "$DATABASE_URL" < backups/mandalarts_backup.sql

# 3. 데이터 정합성 확인
npm run test
```

**예상 소요 시간**: 10-20분

---

### 3.2 파일 스토리지 복구

**복구 절차**:
```bash
# 1. 백업 파일 확인
ls backups/storage/

# 2. Supabase Storage에 파일 업로드
# TODO: 스크립트 구현 필요
# npx supabase storage upload mandalart-images backups/storage/20251125/*
```

---

### 3.3 RLS 정책 복구

**시나리오**: RLS 정책 실수로 삭제/변경

**복구 절차**:
```bash
# 1. Git에서 최신 마이그레이션 확인
git log --oneline supabase/migrations/

# 2. RLS 정책 재적용
npx supabase db push

# 3. 정책 검증
psql "$DATABASE_URL" -c "\d+ mandalarts" # RLS 정책 확인
```

---

## 4. 재해 복구 계획 (Disaster Recovery)

### 4.1 Supabase 서비스 장애

**시나리오**: Supabase 전체 서비스 다운

**대응 방안**:
1. **즉시**: Supabase 상태 페이지 확인 (https://status.supabase.com)
2. **30분 이내**: 사용자에게 공지 (Status Page)
3. **1시간 이내**: 최신 백업으로 임시 DB 구축 고려
4. **복구 후**: 데이터 정합성 검증

**비상 연락처**:
- Supabase Support: support@supabase.io
- Status Page: https://status.supabase.com

---

### 4.2 데이터 손상/삭제

**시나리오**: 버그로 인한 대량 데이터 삭제

**대응 방안**:
1. **즉시**: 서비스 긴급 중단 (배포 롤백)
2. **10분 이내**: 백업에서 복구 시작
3. **1시간 이내**: 데이터 복구 완료 및 검증
4. **복구 후**: 버그 수정 및 재배포

**예방 조치**:
- 프로덕션 DB에 직접 접근 금지
- 모든 데이터 변경은 마이그레이션으로 관리
- 중요 작업 전 수동 백업

---

### 4.3 계정 탈취/보안 침해

**시나리오**: 관리자 계정 탈취

**대응 방안**:
1. **즉시**: 모든 API 키 및 비밀번호 변경
2. **10분 이내**: 의심스러운 로그 확인
3. **30분 이내**: 영향 받은 사용자 파악
4. **1시간 이내**: 사용자 공지 및 비밀번호 리셋 유도
5. **복구 후**: 보안 감사 실시

**예방 조치**:
- 2FA (Two-Factor Authentication) 활성화
- API 키 정기 교체 (3개월마다)
- Sentry로 비정상 활동 모니터링

---

## 5. 백업 검증 (Backup Verification)

**검증 주기**: 월 1회

**검증 절차**:
1. 최신 백업 파일 다운로드
2. 로컬/스테이징 환경에 복구
3. 샘플 데이터 조회 테스트
4. 복구 시간 측정 및 기록

**검증 체크리스트**:
- [ ] 백업 파일 무결성 확인 (파일 크기, 체크섬)
- [ ] 복구 성공 여부
- [ ] 데이터 정합성 검증 (레코드 수 비교)
- [ ] RLS 정책 정상 작동
- [ ] 복구 소요 시간 기록

---

## 6. 자동화 스크립트

### 6.1 백업 자동화 스크립트

**파일**: `scripts/backup-database.sh`

```bash
#!/bin/bash
# 데이터베이스 자동 백업 스크립트

set -e

BACKUP_DIR="backups/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

# 백업 디렉토리 생성
mkdir -p "$BACKUP_DIR"

# 데이터베이스 덤프
echo "Starting database backup..."
npx supabase db dump -f "$BACKUP_FILE"

# 압축
gzip "$BACKUP_FILE"

# 30일 이상 된 백업 파일 삭제
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"

# 클라우드 업로드 (선택사항)
# aws s3 cp "$BACKUP_FILE.gz" s3://your-bucket/backups/
# gsutil cp "$BACKUP_FILE.gz" gs://your-bucket/backups/
```

**Cron 설정** (주 1회 일요일 오전 3시):
```bash
crontab -e

# 추가
0 3 * * 0 /path/to/mandaact/scripts/backup-database.sh >> /var/log/mandaact-backup.log 2>&1
```

---

### 6.2 복구 검증 스크립트

**파일**: `scripts/verify-backup.sh`

```bash
#!/bin/bash
# 백업 복구 검증 스크립트

set -e

BACKUP_FILE=$1
TEST_DB_URL="postgresql://test_user:test_pass@localhost:5432/test_mandaact"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  exit 1
fi

echo "Verifying backup: $BACKUP_FILE"

# 압축 해제
gunzip -c "$BACKUP_FILE" > /tmp/backup_verify.sql

# 테스트 DB 생성
psql "$TEST_DB_URL" -c "DROP DATABASE IF EXISTS test_mandaact;"
psql "$TEST_DB_URL" -c "CREATE DATABASE test_mandaact;"

# 복구
psql "$TEST_DB_URL" < /tmp/backup_verify.sql

# 데이터 검증
echo "Checking record counts..."
psql "$TEST_DB_URL" -c "SELECT 'mandalarts' AS table_name, COUNT(*) FROM mandalarts UNION ALL SELECT 'check_history', COUNT(*) FROM check_history;"

# 정리
rm /tmp/backup_verify.sql
psql "$TEST_DB_URL" -c "DROP DATABASE test_mandaact;"

echo "✅ Backup verification completed successfully!"
```

---

## 7. 문제 해결 (Troubleshooting)

### 7.1 백업 실패

**증상**: `npx supabase db dump` 실패

**원인**:
- 네트워크 연결 문제
- Supabase 인증 실패
- 디스크 공간 부족

**해결 방법**:
```bash
# 1. Supabase 연결 확인
npx supabase status

# 2. 디스크 공간 확인
df -h

# 3. 수동 재시도
npx supabase db dump -f backup_manual.sql
```

---

### 7.2 복구 실패

**증상**: 복구 중 에러 발생

**원인**:
- 스키마 버전 불일치
- 외래 키 제약 조건 위반
- 백업 파일 손상

**해결 방법**:
```bash
# 1. 스키마 버전 확인
psql "$DATABASE_URL" -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 5;"

# 2. 제약 조건 비활성화 후 복구
psql "$DATABASE_URL" -c "SET session_replication_role = 'replica';"
psql "$DATABASE_URL" < backup.sql
psql "$DATABASE_URL" -c "SET session_replication_role = 'origin';"

# 3. 데이터 정합성 검증
npm run test
```

---

## 8. 체크리스트

### 8.1 백업 설정 체크리스트

- [ ] Supabase 자동 백업 활성화 (Pro plan)
- [ ] 수동 백업 스크립트 작성 (`backup-database.sh`)
- [ ] Cron 작업 설정 (주 1회)
- [ ] 백업 파일 클라우드 저장소 연동 (AWS S3 / Google Drive)
- [ ] 스토리지 백업 스크립트 작성 (`backup-storage.sh`)
- [ ] `.env.local` 안전한 저장소에 백업

---

### 8.2 복구 절차 체크리스트

- [ ] 복구 스크립트 작성 및 테스트
- [ ] 복구 절차 문서화 (이 문서)
- [ ] 월 1회 백업 검증 수행
- [ ] 재해 복구 시나리오 훈련 (Disaster Recovery Drill)

---

### 8.3 모니터링 체크리스트

- [ ] Sentry 에러 추적 활성화
- [ ] PostHog 이벤트 추적 활성화
- [ ] Supabase 대시보드 정기 확인 (주 1회)
- [ ] 디스크 공간 모니터링 (백업 저장소)

---

## 9. 참고 자료

- [Supabase Backup & Restore Documentation](https://supabase.com/docs/guides/platform/backups)
- [PostgreSQL Backup Best Practices](https://www.postgresql.org/docs/current/backup.html)
- [Disaster Recovery Planning Guide](https://www.ready.gov/business/implementation/IT)

---

**최종 업데이트**: 2025-11-25
**다음 리뷰**: 2025-12-25 (월 1회)
**담당자**: Development Team
