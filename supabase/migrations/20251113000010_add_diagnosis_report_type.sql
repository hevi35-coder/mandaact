-- Add 'diagnosis' to ai_reports report_type check constraint
-- Date: 2025-11-13
-- Purpose: Enable goal diagnosis reports alongside practice reports

-- Drop the existing constraint
ALTER TABLE ai_reports DROP CONSTRAINT IF EXISTS ai_reports_report_type_check;

-- Add the new constraint with 'diagnosis' included
ALTER TABLE ai_reports ADD CONSTRAINT ai_reports_report_type_check
  CHECK (report_type IN ('weekly', 'monthly', 'diagnosis', 'insight', 'prediction', 'struggling'));

-- Add comment
COMMENT ON CONSTRAINT ai_reports_report_type_check ON ai_reports IS
  'Allowed report types: weekly (practice report), monthly, diagnosis (goal quality), insight, prediction, struggling';
