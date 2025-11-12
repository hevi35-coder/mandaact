-- Badge System v5.0 Renewal Migration
-- Purpose: Story & Emotion Driven Badge Renewal
-- Date: 2025-11-12

-- ====================================
-- STEP 0: Add new columns for v5.0
-- ====================================

-- Add English title column if not exists
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS title_en TEXT;

-- Add emotional message column if not exists
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS emotional_message TEXT;

-- ====================================
-- STEP 1: Update Streak Badges - "시간의 여정"
-- ====================================

-- streak_3: 3일의 시작
UPDATE achievements
SET
  title = '3일의 시작',
  title_en = 'The First Three',
  description = '모든 위대한 여정은 3일로부터 시작된다',
  xp_reward = 50
WHERE key = 'streak_3';

-- streak_7: 7일의 약속
UPDATE achievements
SET
  title = '7일의 약속',
  title_en = 'Week Promise',
  description = '나와의 첫 약속을 지켰다',
  xp_reward = 100
WHERE key = 'streak_7';

-- streak_14: 14일의 전환점
UPDATE achievements
SET
  title = '14일의 전환점',
  title_en = 'Turning Point',
  description = '의지가 습관으로 전환되는 마법의 순간',
  xp_reward = 250
WHERE key = 'streak_14';

-- streak_30: 30일의 리듬
UPDATE achievements
SET
  title = '30일의 리듬',
  title_en = 'Monthly Rhythm',
  description = '한 달의 리듬이 몸에 완전히 배었다',
  xp_reward = 600
WHERE key = 'streak_30';

-- streak_60: 60일의 관성
UPDATE achievements
SET
  title = '60일의 관성',
  title_en = 'Momentum',
  description = '노력 없이도 계속되는 관성의 힘',
  xp_reward = 1800
WHERE key = 'streak_60';

-- streak_100: 100일의 증명
UPDATE achievements
SET
  title = '100일의 증명',
  title_en = 'Hundred Proof',
  description = '백 일의 시간이 진정한 나를 증명한다',
  xp_reward = 3000
WHERE key = 'streak_100';

-- streak_150: 150일의 마스터
UPDATE achievements
SET
  title = '150일의 마스터',
  title_en = 'Streak Master',
  description = '습관을 넘어 삶의 일부가 되다',
  xp_reward = 5000
WHERE key = 'streak_150';

-- ====================================
-- STEP 2: Update Volume Badges - "반복의 미학"
-- ====================================

-- checks_50: 첫 50회
UPDATE achievements
SET
  title = '첫 50회',
  title_en = 'First Fifty',
  description = '반복의 힘을 처음 발견한 순간',
  xp_reward = 100
WHERE key = 'checks_50';

-- checks_100: 백 번의 실천 (Recurring)
UPDATE achievements
SET
  title = '백 번의 실천',
  title_en = 'Hundred Actions',
  description = '꾸준함이 만드는 작은 기적',
  xp_reward = 250
WHERE key = 'checks_100';

-- checks_250: 250회 달성
UPDATE achievements
SET
  title = '250회 달성',
  title_en = 'Quarter K',
  description = '습관이 완전한 일상이 되다',
  xp_reward = 500
WHERE key = 'checks_250';

-- checks_500: 500회의 여정
UPDATE achievements
SET
  title = '500회의 여정',
  title_en = 'Half Journey',
  description = '500번의 선택이 만든 새로운 나',
  xp_reward = 1200
WHERE key = 'checks_500';

-- checks_1000: 천 번의 통찰 (Recurring)
UPDATE achievements
SET
  title = '천 번의 통찰',
  title_en = 'Thousand Insights',
  description = '천 번의 실천이 주는 깊은 깨달음',
  xp_reward = 3500
WHERE key = 'checks_1000';

-- checks_2500: 2500회의 정상
UPDATE achievements
SET
  title = '2500회의 정상',
  title_en = 'Summit',
  description = '끈기의 정상에서 보는 풍경',
  xp_reward = 5000
WHERE key = 'checks_2500';

-- checks_5000: 5000회의 경지
UPDATE achievements
SET
  title = '5000회의 경지',
  title_en = 'Five K Master',
  description = '실천이 예술의 경지에 이르다',
  xp_reward = 8000
WHERE key = 'checks_5000';

-- ====================================
-- STEP 3: Update Monthly Challenge Badges - "매달의 도전"
-- ====================================

-- monthly_90_percent: 이달의 주인공
UPDATE achievements
SET
  title = '이달의 주인공',
  title_en = 'Monthly Star',
  description = '이번 달의 주인공은 바로 나',
  xp_reward = 1000
WHERE key = 'monthly_90_percent';

-- monthly_perfect_week: 완벽한 주
UPDATE achievements
SET
  title = '완벽한 주',
  title_en = 'Perfect Week',
  description = '일주일 내내 100% 달성한 완벽함',
  xp_reward = 600
WHERE key = 'monthly_perfect_week';

-- monthly_streak_30: 월간 마라톤
UPDATE achievements
SET
  title = '월간 마라톤',
  title_en = 'Monthly Marathon',
  description = '한 달 내내 멈추지 않은 마라톤',
  xp_reward = 800
WHERE key = 'monthly_streak_30';

-- monthly_champion: 월간 그랜드슬램
UPDATE achievements
SET
  title = '월간 그랜드슬램',
  title_en = 'Grand Slam',
  description = '한 달 100% 완료, 완벽의 정의',
  xp_reward = 1500
WHERE key = 'monthly_champion';

-- ====================================
-- STEP 4: Update Secret Badges - "숨겨진 이야기"
-- ====================================

-- midnight_warrior: 심야의 수행자
UPDATE achievements
SET
  unlocked_metadata = jsonb_build_object(
    'unlocked_title', '심야의 수행자',
    'unlocked_description', '달이 가장 높은 시간에도 멈추지 않았다'
  ),
  xp_reward = 600
WHERE key = 'midnight_warrior';

-- mandalart_rainbow: 일곱 빛깔 → 무지개 균형
UPDATE achievements
SET
  title = '일곱 빛깔',
  title_en = 'Seven Colors',
  description = '모든 색이 조화를 이룰 때...',
  unlocked_metadata = jsonb_build_object(
    'unlocked_title', '무지개 균형',
    'unlocked_description', '7일간 모든 영역을 고르게 실천한 균형의 달인'
  ),
  xp_reward = 800
WHERE key = 'mandalart_rainbow';

-- night_owl: 밤의 새 → 올빼미 집중
UPDATE achievements
SET
  title = '밤의 새',
  title_en = 'Night Bird',
  description = '고요한 밤의 집중...',
  unlocked_metadata = jsonb_build_object(
    'unlocked_title', '올빼미 집중',
    'unlocked_description', '밤의 고요 속에서 최고의 집중력을 발휘했다'
  ),
  xp_reward = 500
WHERE key = 'night_owl';

-- ====================================
-- STEP 5: Update Achievement Badges - "특별한 순간"
-- ====================================

-- perfect_day: 오늘의 완성
UPDATE achievements
SET
  title = '오늘의 완성',
  title_en = 'Perfect Today',
  description = '모든 목표를 달성한 완벽한 하루',
  xp_reward = 100
WHERE key = 'perfect_day';

-- level_10: 성장의 나무
UPDATE achievements
SET
  title = '성장의 나무',
  title_en = 'Growth Tree',
  description = '레벨 10, 뿌리 깊은 나무가 되다',
  xp_reward = 500
WHERE key = 'level_10';

-- ====================================
-- STEP 6: Update Milestone Badges - "시작의 용기"
-- ====================================

-- first_check: 첫 체크
UPDATE achievements
SET
  title = '첫 체크',
  title_en = 'First Step',
  description = '천 리 길도 한 걸음부터',
  xp_reward = 30
WHERE key = 'first_check';

-- first_mandalart: 첫 만다라트
UPDATE achievements
SET
  title = '첫 만다라트',
  title_en = 'First Canvas',
  description = '목표를 그린 자만이 도달할 수 있다',
  xp_reward = 150
WHERE key = 'first_mandalart';

-- ====================================
-- STEP 7: Update Emotional Messages for Key Milestones
-- ====================================

-- Update emotional messages for key milestones (column already added in STEP 0)
UPDATE achievements SET emotional_message = '이제 시작입니다. 3일의 기적이 당신을 기다립니다.' WHERE key = 'streak_3';
UPDATE achievements SET emotional_message = '100일 동안 포기하지 않은 당신이 진짜입니다.' WHERE key = 'streak_100';
UPDATE achievements SET emotional_message = '천 번의 선택이 만든 변화, 당신은 이미 다른 사람입니다.' WHERE key = 'checks_1000';
UPDATE achievements SET emotional_message = '완벽한 한 달. 당신이 바로 이달의 챔피언입니다!' WHERE key = 'monthly_champion';

-- ====================================
-- STEP 8: Update Display Order for Better UX
-- ====================================

-- Reorder badges by emotional progression
UPDATE achievements SET display_order =
  CASE
    -- Milestones first (immediate rewards)
    WHEN key = 'first_check' THEN 1
    WHEN key = 'first_mandalart' THEN 2

    -- Early streaks (quick wins)
    WHEN key = 'streak_3' THEN 10
    WHEN key = 'streak_7' THEN 11
    WHEN key = 'streak_14' THEN 12

    -- Early volume (parallel progress)
    WHEN key = 'checks_50' THEN 20
    WHEN key = 'checks_100' THEN 21

    -- Mid-game streaks
    WHEN key = 'streak_30' THEN 30
    WHEN key = 'streak_60' THEN 31

    -- Mid-game volume
    WHEN key = 'checks_250' THEN 40
    WHEN key = 'checks_500' THEN 41

    -- Monthly challenges (recurring motivation)
    WHEN key = 'monthly_90_percent' THEN 50
    WHEN key = 'monthly_perfect_week' THEN 51
    WHEN key = 'monthly_streak_30' THEN 52
    WHEN key = 'monthly_champion' THEN 53

    -- Late game streaks
    WHEN key = 'streak_100' THEN 60
    WHEN key = 'streak_150' THEN 61

    -- Late game volume
    WHEN key = 'checks_1000' THEN 70
    WHEN key = 'checks_2500' THEN 71
    WHEN key = 'checks_5000' THEN 72

    -- Secret badges (discovery)
    WHEN key = 'midnight_warrior' THEN 80
    WHEN key = 'mandalart_rainbow' THEN 81
    WHEN key = 'night_owl' THEN 82

    -- Achievement badges
    WHEN key = 'perfect_day' THEN 90
    WHEN key = 'level_10' THEN 91

    ELSE display_order
  END;

-- ====================================
-- STEP 9: Create Renewal Log
-- ====================================

CREATE TABLE IF NOT EXISTS badge_renewal_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version VARCHAR(10) NOT NULL,
  changes_summary TEXT,
  badges_updated INTEGER,
  notes TEXT
);

INSERT INTO badge_renewal_log (version, changes_summary, badges_updated, notes)
VALUES (
  'v5.0',
  'Story & Emotion Driven Renewal - Complete badge naming and description overhaul',
  25,
  'Focus on emotional journey, removed duplicate keywords, added progressive narrative structure, adjusted XP curve'
);

-- ====================================
-- STEP 10: Add Comments for Documentation
-- ====================================

COMMENT ON COLUMN achievements.emotional_message IS 'Special message shown on badge unlock for emotional impact';
COMMENT ON TABLE badge_renewal_log IS 'History of badge system renewals and updates';

-- ====================================
-- FINAL: Verification
-- ====================================

DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_updated_count
  FROM achievements
  WHERE is_active = TRUE OR is_active IS NULL;

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Badge System v5.0 Renewal Complete';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Active badges updated: %', v_updated_count;
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Key Changes:';
  RAISE NOTICE '  ✅ Story-driven naming system';
  RAISE NOTICE '  ✅ Emotional journey progression';
  RAISE NOTICE '  ✅ Adjusted XP curve (30-8000)';
  RAISE NOTICE '  ✅ Added emotional messages';
  RAISE NOTICE '  ✅ Improved display ordering';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Categories:';
  RAISE NOTICE '  🔥 Streak: 시간의 여정 (7 badges)';
  RAISE NOTICE '  💯 Volume: 반복의 미학 (7 badges)';
  RAISE NOTICE '  🏆 Monthly: 매달의 도전 (4 badges)';
  RAISE NOTICE '  🌙 Secret: 숨겨진 이야기 (3 badges)';
  RAISE NOTICE '  ⭐ Achievement: 특별한 순간 (2 badges)';
  RAISE NOTICE '  🌱 Milestone: 시작의 용기 (2 badges)';
  RAISE NOTICE '==============================================';
END $$;