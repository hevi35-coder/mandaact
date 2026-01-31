-- Migration to update nickname generation policy
-- Replaces "사용자0001" pattern with invalid random combinations (e.g. "열정적인 탐험가")
-- Depends on 20260123000001_remove_nickname_uniqueness.sql having removed the unique constraint.

CREATE OR REPLACE FUNCTION create_user_level_if_not_exists()
RETURNS TRIGGER AS $$
DECLARE
  random_nickname TEXT;
  
  -- Word lists for random generation
  adjectives TEXT[] := ARRAY[
    '열정적인', '꾸준한', '용감한', '성장하는', '빛나는', 
    '도전적인', '지혜로운', '긍정적인', '단단한', '유쾌한',
    '성실한', '창의적인', '탁월한', '활기찬', '끈기있는'
  ];
  
  nouns TEXT[] := ARRAY[
    '탐험가', '실천가', '드리머', '챌린저', '메이커', 
    '개척자', '리더', '철학자', '모험가', '혁신가',
    '크리에이터', '전략가', '예술가', '항해사', '러너'
  ];
  
  adj_index INT;
  noun_index INT;
BEGIN
  -- Check if user_level already exists
  IF EXISTS (SELECT 1 FROM user_levels WHERE user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  -- Generate random nickname
  -- floor(random() * (high - low + 1) + low)
  -- Arrays are 1-based in SQL
  adj_index := floor(random() * array_length(adjectives, 1) + 1);
  noun_index := floor(random() * array_length(nouns, 1) + 1);
  
  random_nickname := adjectives[adj_index] || ' ' || nouns[noun_index];

  -- Insert new user level with random nickname
  -- No loop/retry needed as uniqueness is not required
  INSERT INTO user_levels (user_id, level, total_xp, nickname)
  VALUES (NEW.user_id, 1, 0, random_nickname);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify replacement
-- (The trigger itself 'auto_create_user_level' calls this function, so updating the function code is sufficient)
