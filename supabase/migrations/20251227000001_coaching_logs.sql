-- Migration: Coaching Sessions and Metrics
-- Created at: 2025-12-27

-- 1. Coaching Sessions table
CREATE TABLE IF NOT EXISTS coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  persona_type TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  current_step INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS for coaching_sessions
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own coaching sessions"
  ON coaching_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Coaching Answers table
CREATE TABLE IF NOT EXISTS coaching_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES coaching_sessions(id) ON DELETE CASCADE NOT NULL,
  step_key TEXT NOT NULL,
  answer_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(session_id, step_key)
);

-- RLS for coaching_answers
ALTER TABLE coaching_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own coaching answers"
  ON coaching_answers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coaching_sessions
      WHERE coaching_sessions.id = coaching_answers.session_id
      AND coaching_sessions.user_id = auth.uid()
    )
  );

-- 3. Coaching Costs table
CREATE TABLE IF NOT EXISTS coaching_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES coaching_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  cost_usd NUMERIC(10, 6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS for coaching_costs (Internal tracking, users can't see this)
ALTER TABLE coaching_costs ENABLE ROW LEVEL SECURITY;

-- 4. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_coaching_sessions_updated_at
    BEFORE UPDATE ON coaching_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
