-- =====================================================
-- Rolling report period bounds (timezone-aware)
-- Created: 2025-12-14
-- Purpose: Define "last 7 days excluding today" consistently for Edge Functions
-- =====================================================

CREATE OR REPLACE FUNCTION get_rolling_report_period_bounds(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  user_timezone TEXT,
  period_start_date DATE,
  period_end_date DATE,
  period_start_ts TIMESTAMPTZ,
  period_end_ts_exclusive TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_tz TEXT;
  v_today DATE;
  v_end_date DATE;
  v_start_date DATE;
BEGIN
  v_tz := get_user_timezone(p_user_id);

  -- "today" in user timezone
  v_today := (NOW() AT TIME ZONE v_tz)::DATE;

  -- Exclude today: end_date is yesterday
  v_end_date := v_today - INTERVAL '1 day';
  v_start_date := v_end_date - (GREATEST(p_days, 1) - 1);

  user_timezone := v_tz;
  period_start_date := v_start_date;
  period_end_date := v_end_date;

  -- Convert local date boundaries to UTC timestamptz range
  period_start_ts := (v_start_date::TIMESTAMPTZ AT TIME ZONE v_tz);
  period_end_ts_exclusive := ((v_end_date + INTERVAL '1 day')::TIMESTAMPTZ AT TIME ZONE v_tz);

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION get_rolling_report_period_bounds IS
  'Returns timezone-aware rolling period bounds: last N days excluding today (yesterday is end date).';

GRANT EXECUTE ON FUNCTION get_rolling_report_period_bounds(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_rolling_report_period_bounds(UUID, INTEGER) TO service_role;

