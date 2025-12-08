-- Fix RLS policy for user_subscriptions to allow client-side upsert
-- Previously only service_role could insert/update, but the mobile app needs to sync subscription status

-- Drop the restrictive service_role only policy
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON user_subscriptions;

-- Allow users to insert their own subscription record
CREATE POLICY "Users can insert own subscription"
    ON user_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own subscription record
CREATE POLICY "Users can update own subscription"
    ON user_subscriptions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Keep service role access for webhooks (if needed in the future)
CREATE POLICY "Service role full access"
    ON user_subscriptions FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');
