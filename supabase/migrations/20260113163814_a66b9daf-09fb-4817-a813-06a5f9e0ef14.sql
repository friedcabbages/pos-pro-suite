-- Create subscription_history table to track all subscription/billing changes
CREATE TABLE public.subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'plan_upgrade', 'plan_downgrade', 'trial_extended', 'manual_payment', 'status_change'
    from_status TEXT,
    to_status TEXT,
    from_plan TEXT,
    to_plan TEXT,
    trial_days_added INTEGER,
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create system_settings table for global settings (maintenance mode, etc.)
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create broadcasts table for system announcements
CREATE TABLE public.broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
    is_active BOOLEAN NOT NULL DEFAULT true,
    target_businesses UUID[] DEFAULT NULL, -- NULL means all businesses
    created_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feature_flags table for per-business feature toggling
CREATE TABLE public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(business_id, feature_key)
);

-- Create global_audit_logs table for super admin actions
CREATE TABLE public.global_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id),
    actor_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'business', 'user', 'subscription', 'system', 'broadcast'
    entity_id TEXT,
    target_business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add suspend_reason to businesses table
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS suspend_reason TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id);

-- Enable RLS on new tables
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_history (super admin only)
CREATE POLICY "Super admins can manage subscription_history"
ON public.subscription_history
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- RLS Policies for system_settings (super admin only)
CREATE POLICY "Super admins can manage system_settings"
ON public.system_settings
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Anyone can read active system settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (key IN ('maintenance_mode', 'announcement'));

-- RLS Policies for broadcasts
CREATE POLICY "Super admins can manage broadcasts"
ON public.broadcasts
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view active broadcasts"
ON public.broadcasts
FOR SELECT
TO authenticated
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- RLS Policies for feature_flags
CREATE POLICY "Super admins can manage feature_flags"
ON public.feature_flags
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view own business feature flags"
ON public.feature_flags
FOR SELECT
TO authenticated
USING (public.has_business_access(auth.uid(), business_id));

-- RLS Policies for global_audit_logs (super admin only)
CREATE POLICY "Super admins can read global_audit_logs"
ON public.global_audit_logs
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert global_audit_logs"
ON public.global_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_subscription_history_business_id ON public.subscription_history(business_id);
CREATE INDEX idx_subscription_history_created_at ON public.subscription_history(created_at DESC);
CREATE INDEX idx_broadcasts_active ON public.broadcasts(is_active, expires_at);
CREATE INDEX idx_feature_flags_business ON public.feature_flags(business_id);
CREATE INDEX idx_global_audit_logs_created ON public.global_audit_logs(created_at DESC);
CREATE INDEX idx_global_audit_logs_business ON public.global_audit_logs(target_business_id);
CREATE INDEX idx_global_audit_logs_action ON public.global_audit_logs(action);