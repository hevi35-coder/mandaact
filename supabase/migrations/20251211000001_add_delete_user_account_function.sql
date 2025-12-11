-- =====================================================
-- Delete User Account Function
-- Created: 2025-12-11
-- Purpose: Allow users to delete their own account and all associated data
-- =====================================================

-- Create function for users to delete their own account
-- This function is SECURITY DEFINER to allow deletion of auth.users record
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_deleted_count INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Log deletion attempt
  RAISE NOTICE 'User % requested account deletion', v_user_id;

  -- Delete from auth.users
  -- All related data will be cascaded automatically due to ON DELETE CASCADE
  DELETE FROM auth.users
  WHERE id = v_user_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Check if deletion was successful
  IF v_deleted_count > 0 THEN
    v_result := jsonb_build_object(
      'success', true,
      'message', 'Account deleted successfully'
    );
    RAISE NOTICE 'Account deletion successful for user %', v_user_id;
  ELSE
    v_result := jsonb_build_object(
      'success', false,
      'error', 'Failed to delete account'
    );
    RAISE WARNING 'Account deletion failed for user %', v_user_id;
  END IF;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error
    RAISE WARNING 'Error deleting account for user %: %', v_user_id, SQLERRM;

    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION delete_user_account IS 'Allows authenticated users to delete their own account and all associated data. All related records are cascaded automatically.';

-- Security note: This function uses SECURITY DEFINER to allow deletion from auth.users table
-- Users can only delete their OWN account (verified by auth.uid())
