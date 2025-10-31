-- Add action type system to support Routine/Mission/Reference classification

-- Add type columns to actions table
ALTER TABLE actions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'routine'
  CHECK (type IN ('routine', 'mission', 'reference'));

-- Routine settings
ALTER TABLE actions ADD COLUMN IF NOT EXISTS routine_frequency TEXT
  CHECK (routine_frequency IN ('daily', 'weekly', 'monthly'));
ALTER TABLE actions ADD COLUMN IF NOT EXISTS routine_weekdays INTEGER[]; -- [0,1,2,3,4] = Sun-Thu
ALTER TABLE actions ADD COLUMN IF NOT EXISTS routine_count_per_period INTEGER; -- Weekly: 3 times, Monthly: 2 times

-- Mission settings
ALTER TABLE actions ADD COLUMN IF NOT EXISTS mission_completion_type TEXT
  CHECK (mission_completion_type IN ('once', 'periodic'));
ALTER TABLE actions ADD COLUMN IF NOT EXISTS mission_period_cycle TEXT
  CHECK (mission_period_cycle IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly'));
ALTER TABLE actions ADD COLUMN IF NOT EXISTS mission_current_period_start TIMESTAMPTZ;
ALTER TABLE actions ADD COLUMN IF NOT EXISTS mission_current_period_end TIMESTAMPTZ;
ALTER TABLE actions ADD COLUMN IF NOT EXISTS mission_status TEXT DEFAULT 'active'
  CHECK (mission_status IN ('active', 'completed', 'failed'));

-- AI suggestion record
ALTER TABLE actions ADD COLUMN IF NOT EXISTS ai_suggestion JSONB;

-- Create mission history table
CREATE TABLE IF NOT EXISTS mission_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_id UUID REFERENCES actions(id) ON DELETE CASCADE NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_actions_type ON actions(type);
CREATE INDEX IF NOT EXISTS idx_actions_mission_period_end ON actions(mission_current_period_end)
  WHERE type = 'mission' AND mission_completion_type = 'periodic';
CREATE INDEX IF NOT EXISTS idx_mission_history_action_id ON mission_history(action_id);
CREATE INDEX IF NOT EXISTS idx_mission_history_period ON mission_history(period_start, period_end);

-- RLS policies for mission_history
ALTER TABLE mission_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mission history of their actions"
  ON mission_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM actions
      JOIN sub_goals ON sub_goals.id = actions.sub_goal_id
      JOIN mandalarts ON mandalarts.id = sub_goals.mandalart_id
      WHERE actions.id = mission_history.action_id
      AND mandalarts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create mission history for their actions"
  ON mission_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM actions
      JOIN sub_goals ON sub_goals.id = actions.sub_goal_id
      JOIN mandalarts ON mandalarts.id = sub_goals.mandalart_id
      WHERE actions.id = mission_history.action_id
      AND mandalarts.user_id = auth.uid()
    )
  );

COMMENT ON TABLE mission_history IS 'Stores historical records of periodic mission completion/failure';
COMMENT ON COLUMN actions.type IS 'Action type: routine (반복실천), mission (완료목표), reference (마음가짐)';
COMMENT ON COLUMN actions.routine_frequency IS 'How often routine is repeated: daily, weekly, monthly';
COMMENT ON COLUMN actions.mission_completion_type IS 'once: one-time completion, periodic: repeating goal';
