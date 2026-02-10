-- Fix Basic device limit and align device limit fallback with plan users

-- Ensure plan_limit_devices uses max_devices, falling back to max_users (no silent default to 1)
CREATE OR REPLACE FUNCTION public.plan_limit_devices(p_business_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_plan public.subscription_plans;
BEGIN
  v_plan := public.get_business_plan_row(p_business_id);
  RETURN COALESCE(v_plan.max_devices, v_plan.max_users);
END;
$$;

-- Basic plan should allow up to 3 devices
UPDATE public.subscription_plans
SET max_devices = 3
WHERE name = 'basic';

-- If max_devices is missing, default to max_users (keeps NULL for unlimited)
UPDATE public.subscription_plans
SET max_devices = max_users
WHERE max_devices IS NULL;
