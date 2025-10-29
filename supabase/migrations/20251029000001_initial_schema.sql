  -- Enable UUID extension
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  -- Mandalarts table
  CREATE TABLE mandalarts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    center_goal TEXT NOT NULL,
    input_method TEXT CHECK (input_method IN ('image', 'manual')) NOT NULL,
    image_url TEXT,
    raw_ocr_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  );

  -- Sub Goals table
  CREATE TABLE sub_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mandalart_id UUID REFERENCES mandalarts(id) ON DELETE CASCADE NOT NULL,
    position INT NOT NULL CHECK (position >= 1 AND position <= 8),
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  );

  -- Actions (실천 항목) table
  CREATE TABLE actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sub_goal_id UUID REFERENCES sub_goals(id) ON DELETE CASCADE NOT NULL,
    position INT NOT NULL CHECK (position >= 1 AND position <= 8),
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  );

  -- Check History table
  CREATE TABLE check_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_id UUID REFERENCES actions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    checked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    note TEXT
  );

  -- Indexes for performance
  CREATE INDEX idx_mandalarts_user_id ON mandalarts(user_id);
  CREATE INDEX idx_sub_goals_mandalart_id ON sub_goals(mandalart_id);
  CREATE INDEX idx_actions_sub_goal_id ON actions(sub_goal_id);
  CREATE INDEX idx_check_history_action_id ON check_history(action_id);
  CREATE INDEX idx_check_history_user_id ON check_history(user_id);
  CREATE INDEX idx_check_history_checked_at ON check_history(checked_at);

  -- Unique constraint: one check per action per day
  CREATE UNIQUE INDEX idx_check_history_unique_action_date
    ON check_history (action_id, DATE(checked_at AT TIME ZONE 'UTC'));

  -- Row Level Security (RLS) policies
  ALTER TABLE mandalarts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sub_goals ENABLE ROW LEVEL SECURITY;
  ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE check_history ENABLE ROW LEVEL SECURITY;

  -- Mandalarts policies
  CREATE POLICY "Users can view their own mandalarts"
    ON mandalarts FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can create their own mandalarts"
    ON mandalarts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update their own mandalarts"
    ON mandalarts FOR UPDATE
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can delete their own mandalarts"
    ON mandalarts FOR DELETE
    USING (auth.uid() = user_id);

  -- Sub goals policies
  CREATE POLICY "Users can view sub goals of their mandalarts"
    ON sub_goals FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM mandalarts
        WHERE mandalarts.id = sub_goals.mandalart_id
        AND mandalarts.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can create sub goals for their mandalarts"
    ON sub_goals FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM mandalarts
        WHERE mandalarts.id = sub_goals.mandalart_id
        AND mandalarts.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can update sub goals of their mandalarts"
    ON sub_goals FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM mandalarts
        WHERE mandalarts.id = sub_goals.mandalart_id
        AND mandalarts.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can delete sub goals of their mandalarts"
    ON sub_goals FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM mandalarts
        WHERE mandalarts.id = sub_goals.mandalart_id
        AND mandalarts.user_id = auth.uid()
      )
    );

  -- Actions policies
  CREATE POLICY "Users can view actions of their mandalarts"
    ON actions FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM sub_goals
        JOIN mandalarts ON mandalarts.id = sub_goals.mandalart_id
        WHERE sub_goals.id = actions.sub_goal_id
        AND mandalarts.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can create actions for their mandalarts"
    ON actions FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM sub_goals
        JOIN mandalarts ON mandalarts.id = sub_goals.mandalart_id
        WHERE sub_goals.id = actions.sub_goal_id
        AND mandalarts.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can update actions of their mandalarts"
    ON actions FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM sub_goals
        JOIN mandalarts ON mandalarts.id = sub_goals.mandalart_id
        WHERE sub_goals.id = actions.sub_goal_id
        AND mandalarts.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can delete actions of their mandalarts"
    ON actions FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM sub_goals
        JOIN mandalarts ON mandalarts.id = sub_goals.mandalart_id
        WHERE sub_goals.id = actions.sub_goal_id
        AND mandalarts.user_id = auth.uid()
      )
    );

  -- Check history policies
  CREATE POLICY "Users can view their own check history"
    ON check_history FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can create their own check history"
    ON check_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can delete their own check history"
    ON check_history FOR DELETE
    USING (auth.uid() = user_id);

  -- Function to update updated_at timestamp
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- Trigger for mandalarts updated_at
  CREATE TRIGGER update_mandalarts_updated_at
    BEFORE UPDATE ON mandalarts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();