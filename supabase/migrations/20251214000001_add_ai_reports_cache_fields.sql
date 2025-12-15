-- =====================================================
-- AI Reports: Cache + Model Metadata Fields
-- Created: 2025-12-14
-- Purpose: Reduce AI costs by enabling safe, hash-based reuse
-- =====================================================

ALTER TABLE ai_reports
  ADD COLUMN IF NOT EXISTS cache_key TEXT,
  ADD COLUMN IF NOT EXISTS input_hash TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT;

-- Fast lookup for safe cache hits
CREATE INDEX IF NOT EXISTS idx_ai_reports_cache_lookup
  ON ai_reports (user_id, report_type, cache_key, input_hash);

CREATE INDEX IF NOT EXISTS idx_ai_reports_language
  ON ai_reports (language);

