-- MandaAct RLS 정책 검증 스크립트
-- 실행 방법: psql -h db.PROJECT_REF.supabase.co -U postgres -d postgres -f verify_rls_policies.sql

-- ============================================
-- 1. RLS 활성화 상태 확인
-- ============================================
SELECT
  tablename,
  CASE WHEN rowsecurity THEN '✅ 활성화' ELSE '❌ 비활성화' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'mandalarts', 'sub_goals', 'actions', 'check_history',
    'user_gamification', 'user_achievements', 'achievements',
    'achievement_unlock_history', 'xp_multipliers', 'daily_xp_log'
  )
ORDER BY tablename;

-- ============================================
-- 2. 모든 RLS 정책 목록
-- ============================================
SELECT
  tablename,
  policyname,
  cmd as operation,
  CASE WHEN permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END as type
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- ============================================
-- 3. 테이블별 정책 수 확인
-- ============================================
SELECT
  tablename,
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) >= 4 THEN '✅ 충분'
    WHEN COUNT(*) >= 1 THEN '⚠️ 부족할 수 있음'
    ELSE '❌ 정책 없음'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================
-- 4. 정책 상세 (USING 및 WITH CHECK)
-- ============================================
SELECT
  tablename,
  policyname,
  cmd,
  LEFT(qual::text, 100) as using_condition,
  LEFT(with_check::text, 100) as with_check_condition
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 5. CASCADE 관계 확인
-- ============================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================
-- 6. 예상 결과 요약
-- ============================================
/*
테이블별 예상 정책:
- mandalarts: SELECT, INSERT, UPDATE, DELETE (4개) - user_id = auth.uid()
- sub_goals: SELECT, INSERT, UPDATE, DELETE (4개) - via mandalarts.user_id
- actions: SELECT, INSERT, UPDATE, DELETE (4개) - via sub_goals→mandalarts
- check_history: SELECT, INSERT, UPDATE, DELETE (4개) - user_id = auth.uid()
- user_gamification: SELECT, INSERT, UPDATE (3개) - user_id = auth.uid()
- user_achievements: SELECT, INSERT, DELETE (3개) - user_id = auth.uid()
- achievements: SELECT (1개) - public read
- xp_multipliers: SELECT, INSERT, UPDATE, DELETE (4개) - user_id = auth.uid()
- daily_xp_log: SELECT, INSERT (2개) - user_id = auth.uid()

CASCADE 관계:
- mandalarts → auth.users (CASCADE)
- sub_goals → mandalarts (CASCADE)
- actions → sub_goals (CASCADE)
- check_history → actions (CASCADE), auth.users (CASCADE)
*/
