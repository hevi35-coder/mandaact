-- Add 'coaching' option to input_method check constraint
ALTER TABLE mandalarts DROP CONSTRAINT IF EXISTS mandalarts_input_method_check;

ALTER TABLE mandalarts ADD CONSTRAINT mandalarts_input_method_check
  CHECK (input_method IN ('image', 'manual', 'text', 'coaching'));
