-- Action preferences for active/minimum selections (per sub-goal)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS action_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sub_goal_id UUID REFERENCES sub_goals(id) ON DELETE CASCADE NOT NULL,
  active_action_id UUID REFERENCES actions(id) ON DELETE SET NULL,
  minimum_action_id UUID REFERENCES actions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_action_preferences_user_sub_goal
  ON action_preferences (user_id, sub_goal_id);

CREATE INDEX IF NOT EXISTS idx_action_preferences_sub_goal
  ON action_preferences (sub_goal_id);

ALTER TABLE action_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their action preferences"
  ON action_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their action preferences"
  ON action_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their action preferences"
  ON action_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their action preferences"
  ON action_preferences FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_action_preferences_updated_at
  BEFORE UPDATE ON action_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
