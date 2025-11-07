-- Remove coaching and chat related tables and functions
-- This migration removes all traces of the AI coaching and chat features

-- Drop triggers first (must be done before dropping functions)
DROP TRIGGER IF EXISTS update_coaching_session_on_new_message ON coaching_messages;
DROP TRIGGER IF EXISTS update_coaching_session_updated_at ON coaching_sessions;
DROP TRIGGER IF EXISTS update_chat_session_timestamp ON chat_messages;

-- Drop functions
DROP FUNCTION IF EXISTS update_coaching_session_on_message();
DROP FUNCTION IF EXISTS update_coaching_session_timestamp();
DROP FUNCTION IF EXISTS update_session_last_message();

-- Drop tables (CASCADE will remove related constraints and data)
DROP TABLE IF EXISTS coaching_messages CASCADE;
DROP TABLE IF EXISTS coaching_sessions CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;

-- Note: This migration removes all coaching and chat data permanently
-- If you need to rollback, restore from the previous migration files:
-- - 20251107000001_add_coaching_tables.sql
-- - 20251101000001_add_chat_tables.sql
