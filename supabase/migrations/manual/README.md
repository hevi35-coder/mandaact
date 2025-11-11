# 수동 마이그레이션 가이드

Supabase CLI 연결 문제로 인해 Dashboard를 통한 수동 마이그레이션이 필요합니다.

## 실행 순서

### 1. Supabase Dashboard 접속
https://supabase.com/dashboard/project/gxnvovnwlqjstpcsprqr/sql/new

### 2. SQL 파일 순서대로 실행

#### Step 1: 배지 컬럼 추가
파일: `01_add_badge_columns.sql`
- achievements 테이블에 category, tier 등 추가
- user_achievements 테이블에 count, authenticity_score 추가
- 제약 조건 추가

#### Step 2: 검증 로그 테이블 생성
파일: `02_create_validation_table.sql`
- badge_validation_logs 테이블 생성
- 인덱스 및 RLS 정책 설정

#### Step 3: 기존 배지 업데이트
파일: `03_update_existing_badges.sql`
- 기존 배지에 category/tier 설정
- Phase 1 신규 배지 3개 추가

#### Step 4: 검증 함수 생성
파일: `04_create_validation_functions.sql`
- validate_badge_eligibility() 함수
- check_first_mandalart_badge() 트리거
- check_level_badges() 트리거
- check_monthly_champion() 함수

## 실행 방법

각 SQL 파일을 열어서:
1. 전체 내용 복사 (Cmd+A, Cmd+C)
2. Dashboard SQL Editor에 붙여넣기 (Cmd+V)
3. Run 버튼 클릭
4. 성공 메시지 확인
5. 다음 파일로 진행

## 문제 발생 시

### "column already exists" 에러
- 정상입니다. `IF NOT EXISTS` 구문으로 안전하게 처리됩니다.

### "constraint already exists" 에러
- `DROP CONSTRAINT IF EXISTS` 후 재생성하므로 정상입니다.

### 기타 에러
- SQL 에러 메시지를 확인하고 해당 부분만 수정하여 재실행

## 검증

모든 마이그레이션 완료 후 다음 쿼리로 검증:

```sql
-- 컬럼 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'achievements'
AND column_name IN ('category', 'tier', 'is_hidden');

-- 배지 확인
SELECT key, title, category, tier FROM achievements;

-- 테이블 확인
SELECT table_name FROM information_schema.tables
WHERE table_name = 'badge_validation_logs';
```