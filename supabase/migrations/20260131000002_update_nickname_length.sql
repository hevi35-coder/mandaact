-- Migration to update nickname length limit and improve random generation with English support
-- 1. Update constraint from 12 to 20 characters
-- 2. Update trigger to support English nicknames based on user locale

-- 1. Update Constraint
ALTER TABLE user_levels DROP CONSTRAINT IF EXISTS nickname_length_check;
ALTER TABLE user_levels ADD CONSTRAINT nickname_length_check
  CHECK (LENGTH(nickname) >= 2 AND LENGTH(nickname) <= 20);

-- 2. Update Function with English Support
CREATE OR REPLACE FUNCTION create_user_level_if_not_exists()
RETURNS TRIGGER AS $$
DECLARE
  random_nickname TEXT;
  user_locale TEXT;
  is_korean BOOLEAN;
  
  -- Korean Word lists
  adjectives_ko TEXT[] := ARRAY[
    '열정적인', '꾸준한', '용감한', '성장하는', '빛나는', 
    '도전적인', '지혜로운', '긍정적인', '단단한', '유쾌한',
    '성실한', '창의적인', '탁월한', '활기찬', '끈기있는'
  ];
  
  nouns_ko TEXT[] := ARRAY[
    '탐험가', '실천가', '드리머', '챌린저', '메이커', 
    '개척자', '리더', '철학자', '모험가', '혁신가',
    '크리에이터', '전략가', '예술가', '항해사', '러너'
  ];

  -- English Word lists
  adjectives_en TEXT[] := ARRAY[
    'Passionate', 'Steady', 'Brave', 'Growing', 'Shining',
    'Ambitious', 'Wise', 'Positive', 'Strong', 'Cheerful',
    'Sincere', 'Creative', 'Excellent', 'Energetic', 'Resilient'
  ];

  nouns_en TEXT[] := ARRAY[
    'Explorer', 'Doer', 'Dreamer', 'Challenger', 'Maker',
    'Pioneer', 'Leader', 'Thinker', 'Adventurer', 'Innovator',
    'Creator', 'Strategist', 'Artist', 'Navigator', 'Runner'
  ];
  
  adj_index INT;
  noun_index INT;
BEGIN
  -- Check if user_level already exists
  IF EXISTS (SELECT 1 FROM user_levels WHERE user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  -- Determine language from metadata (default to Korean if null or 'ko')
  -- Check for 'locale' or 'language' in raw_user_meta_data
  user_locale := COALESCE(NEW.raw_user_meta_data->>'locale', NEW.raw_user_meta_data->>'language', 'ko');
  
  -- Simple check: if locale starts with 'en', use English. Otherwise default to Korean.
  IF user_locale ILIKE 'en%' THEN
    is_korean := false;
  ELSE
    is_korean := true;
  END IF;

  -- Generate random nickname
  IF is_korean THEN
    adj_index := floor(random() * array_length(adjectives_ko, 1) + 1);
    noun_index := floor(random() * array_length(nouns_ko, 1) + 1);
    random_nickname := adjectives_ko[adj_index] || ' ' || nouns_ko[noun_index];
  ELSE
    adj_index := floor(random() * array_length(adjectives_en, 1) + 1);
    noun_index := floor(random() * array_length(nouns_en, 1) + 1);
    random_nickname := adjectives_en[adj_index] || ' ' || nouns_en[noun_index];
  END IF;

  -- Use 'User' + random if somehow generated name is too long (safeguard, though 20 chars should cover these words)
  -- Most English combos are < 20. "Passionate Challenger" is 20. "Passionate Adventurer" is 20.
  IF LENGTH(random_nickname) > 20 THEN
     random_nickname := LEFT(random_nickname, 20);
  END IF;

  -- Insert new user level with random nickname
  INSERT INTO user_levels (user_id, level, total_xp, nickname)
  VALUES (NEW.user_id, 1, 0, random_nickname);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
