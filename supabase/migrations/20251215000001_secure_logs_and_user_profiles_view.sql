-- Supabase security remediation
-- Addresses: security_definer_view (user_profiles) and RLS-disabled tables flagged by security advisor

-- Ensure the user_profiles view runs with invoker privileges so caller RLS applies
ALTER VIEW public.user_profiles
  SET (security_invoker = true);

COMMENT ON VIEW public.user_profiles IS 'View for user profile data (timezone, language) - wraps user_levels table (security_invoker=true to respect caller RLS)';

-- Enable RLS on migration and log tables that were previously public without policies
ALTER TABLE public.level_curve_migration_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.level_curve_migration_log FORCE ROW LEVEL SECURITY;

ALTER TABLE public.badge_renewal_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_renewal_log FORCE ROW LEVEL SECURITY;

ALTER TABLE public.user_levels_backup_20251112 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_levels_backup_20251112 FORCE ROW LEVEL SECURITY;

ALTER TABLE public.badge_migration_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_migration_log FORCE ROW LEVEL SECURITY;

-- Allow only the service role to manage these internal tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'level_curve_migration_log'
      AND policyname = 'Service role can manage level curve migration logs'
  ) THEN
    CREATE POLICY "Service role can manage level curve migration logs"
    ON public.level_curve_migration_log
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'badge_renewal_log'
      AND policyname = 'Service role can manage badge renewal logs'
  ) THEN
    CREATE POLICY "Service role can manage badge renewal logs"
    ON public.badge_renewal_log
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_levels_backup_20251112'
      AND policyname = 'Service role can manage user level backups'
  ) THEN
    CREATE POLICY "Service role can manage user level backups"
    ON public.user_levels_backup_20251112
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'badge_migration_log'
      AND policyname = 'Service role can manage badge migration logs'
  ) THEN
    CREATE POLICY "Service role can manage badge migration logs"
    ON public.badge_migration_log
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;
