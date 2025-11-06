-- Add 'text' option to input_method check constraint

-- Drop the existing constraint
ALTER TABLE mandalarts DROP CONSTRAINT IF EXISTS mandalarts_input_method_check;

-- Add new constraint with 'text' option
ALTER TABLE mandalarts ADD CONSTRAINT mandalarts_input_method_check
  CHECK (input_method IN ('image', 'manual', 'text'));
