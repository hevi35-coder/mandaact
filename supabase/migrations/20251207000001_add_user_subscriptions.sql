-- User Subscriptions table for Premium features
-- Integrates with RevenueCat for subscription management

-- Create subscription status enum
CREATE TYPE subscription_status AS ENUM ('free', 'active', 'expired', 'cancelled', 'grace_period');

-- Create subscription plan enum
CREATE TYPE subscription_plan AS ENUM ('monthly', 'yearly', 'lifetime');

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Subscription status
    status subscription_status NOT NULL DEFAULT 'free',
    plan subscription_plan,

    -- RevenueCat integration
    revenuecat_customer_id TEXT,
    revenuecat_entitlement_id TEXT,

    -- Subscription dates
    started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure one subscription per user
    CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

-- Create index for faster lookups
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_expires_at ON user_subscriptions(expires_at);

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only read their own subscription
CREATE POLICY "Users can view own subscription"
    ON user_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Only server (service role) can insert/update subscriptions
-- This ensures subscriptions are only modified through verified webhook events
CREATE POLICY "Service role can manage subscriptions"
    ON user_subscriptions FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Function to check if user is premium
CREATE OR REPLACE FUNCTION is_user_premium(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status subscription_status;
    v_expires_at TIMESTAMPTZ;
BEGIN
    SELECT status, expires_at INTO v_status, v_expires_at
    FROM user_subscriptions
    WHERE user_id = p_user_id;

    -- No subscription record = free user
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Lifetime subscription
    IF v_status = 'active' AND v_expires_at IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Active subscription with valid expiry
    IF v_status IN ('active', 'grace_period') AND v_expires_at > NOW() THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's mandalart count
CREATE OR REPLACE FUNCTION get_user_mandalart_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM mandalarts
        WHERE user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create more mandalarts
-- Free users: max 3, Premium: unlimited
CREATE OR REPLACE FUNCTION can_create_mandalart(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
    v_is_premium BOOLEAN;
    v_free_limit INTEGER := 3;
BEGIN
    -- Check if premium
    v_is_premium := is_user_premium(p_user_id);

    IF v_is_premium THEN
        RETURN TRUE;
    END IF;

    -- Check mandalart count for free users
    v_count := get_user_mandalart_count(p_user_id);

    RETURN v_count < v_free_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_updated_at();

-- Initialize free subscription for existing users (optional)
-- This creates a 'free' record for all existing users
INSERT INTO user_subscriptions (user_id, status)
SELECT id, 'free'::subscription_status
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE user_subscriptions IS 'Stores user subscription status for Premium features. Managed via RevenueCat webhooks.';
COMMENT ON FUNCTION is_user_premium IS 'Returns TRUE if user has an active Premium subscription.';
COMMENT ON FUNCTION can_create_mandalart IS 'Returns TRUE if user can create more mandalarts (free: 3 max, premium: unlimited).';
