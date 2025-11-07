-- Coaching Sessions table (for AI-guided mandalart creation)
CREATE TABLE coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Phase tracking
  current_phase TEXT CHECK (current_phase IN ('center_goal', 'sub_goals', 'actions', 'immediate_action', 'completed')) NOT NULL DEFAULT 'center_goal',

  -- Progress tracking (JSONB structure)
  -- {
  --   center_goal_done: boolean,
  --   sub_goals_count: number (0-8),
  --   actions_count: number (0-64),
  --   current_sub_goal_index: number (0-7),
  --   current_action_counts: { [sub_goal_index]: number }
  -- }
  progress JSONB NOT NULL DEFAULT '{"center_goal_done": false, "sub_goals_count": 0, "actions_count": 0, "current_sub_goal_index": 0, "current_action_counts": {}}'::jsonb,

  -- Partial mandalart data (JSONB structure)
  -- {
  --   center_goal: string,
  --   sub_goals: [
  --     { title: string, actions: [string] }
  --   ]
  -- }
  partial_data JSONB NOT NULL DEFAULT '{"center_goal": "", "sub_goals": []}'::jsonb,

  -- User interaction pattern analysis (for adaptive logic)
  -- 'sequential' | 'collaborative' | 'undetermined'
  user_pattern TEXT CHECK (user_pattern IN ('sequential', 'collaborative', 'undetermined')) DEFAULT 'undetermined',

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- Coaching Messages table
CREATE TABLE coaching_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES coaching_sessions(id) ON DELETE CASCADE NOT NULL,

  -- Message content
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,

  -- Phase context (which phase this message belongs to)
  phase TEXT CHECK (phase IN ('center_goal', 'sub_goals', 'actions', 'immediate_action', 'completed')) NOT NULL,

  -- Additional metadata
  -- For assistant messages: which sub_goal or action index being discussed
  -- For user messages: response analysis (abstraction_score, has_verb, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_coaching_sessions_user_id ON coaching_sessions(user_id);
CREATE INDEX idx_coaching_sessions_current_phase ON coaching_sessions(current_phase);
CREATE INDEX idx_coaching_sessions_is_active ON coaching_sessions(is_active);
CREATE INDEX idx_coaching_sessions_updated_at ON coaching_sessions(updated_at);
CREATE INDEX idx_coaching_messages_session_id ON coaching_messages(session_id);
CREATE INDEX idx_coaching_messages_phase ON coaching_messages(phase);
CREATE INDEX idx_coaching_messages_created_at ON coaching_messages(created_at);

-- Row Level Security (RLS) policies
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_messages ENABLE ROW LEVEL SECURITY;

-- Coaching Sessions policies
CREATE POLICY "Users can view their own coaching sessions"
  ON coaching_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own coaching sessions"
  ON coaching_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coaching sessions"
  ON coaching_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own coaching sessions"
  ON coaching_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Coaching Messages policies
CREATE POLICY "Users can view messages of their coaching sessions"
  ON coaching_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coaching_sessions
      WHERE coaching_sessions.id = coaching_messages.session_id
      AND coaching_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their coaching sessions"
  ON coaching_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coaching_sessions
      WHERE coaching_sessions.id = coaching_messages.session_id
      AND coaching_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in their coaching sessions"
  ON coaching_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM coaching_sessions
      WHERE coaching_sessions.id = coaching_messages.session_id
      AND coaching_sessions.user_id = auth.uid()
    )
  );

-- Function to update updated_at on session update
CREATE OR REPLACE FUNCTION update_coaching_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating session timestamp on any update
CREATE TRIGGER update_coaching_session_updated_at
  BEFORE UPDATE ON coaching_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_coaching_session_timestamp();

-- Function to update session updated_at on new message
CREATE OR REPLACE FUNCTION update_coaching_session_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE coaching_sessions
  SET updated_at = NEW.created_at
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating session timestamp on new message
CREATE TRIGGER update_coaching_session_on_new_message
  AFTER INSERT ON coaching_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_coaching_session_on_message();
