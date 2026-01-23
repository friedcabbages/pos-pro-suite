-- Update plan definitions to match VeloPOS pricing + limits + features
-- Assumes subscription_plans.name uses: 'basic', 'pro', 'enterprise'

UPDATE public.subscription_plans
SET
  display_name = CASE
    WHEN name = 'basic' THEN 'Basic'
    WHEN name = 'pro' THEN 'Pro'
    WHEN name = 'enterprise' THEN 'Enterprise'
    ELSE display_name
  END,
  price_monthly = CASE
    WHEN name = 'basic' THEN 29
    WHEN name = 'pro' THEN 79
    WHEN name = 'enterprise' THEN 199
    ELSE price_monthly
  END,
  -- yearly left as-is (can be configured later)
  max_users = CASE
    WHEN name = 'basic' THEN 3
    WHEN name = 'pro' THEN 10
    WHEN name = 'enterprise' THEN NULL
    ELSE max_users
  END,
  max_products = CASE
    WHEN name = 'basic' THEN 100
    WHEN name = 'pro' THEN 1000
    WHEN name = 'enterprise' THEN NULL
    ELSE max_products
  END,
  max_branches = CASE
    WHEN name = 'basic' THEN 1
    WHEN name = 'pro' THEN 3
    WHEN name = 'enterprise' THEN NULL
    ELSE max_branches
  END,
  max_devices = CASE
    WHEN name = 'basic' THEN 1
    WHEN name = 'pro' THEN 3
    WHEN name = 'enterprise' THEN NULL
    ELSE max_devices
  END,
  features = CASE
    WHEN name = 'basic' THEN (
      '["pos","products","categories","inventory","transactions","reports_basic","users_roles","activity"]'::jsonb
    )
    WHEN name = 'pro' THEN (
      '["pos","products","categories","inventory","transactions","reports_basic","reports_advanced","users_roles","activity","expenses","purchase_orders","multi_warehouse"]'::jsonb
    )
    WHEN name = 'enterprise' THEN (
      '["pos","products","categories","inventory","transactions","reports_basic","reports_advanced","users_roles","activity","expenses","purchase_orders","multi_warehouse","api_access","custom_branding","audit_logs_full","compliance_mode"]'::jsonb
    )
    ELSE features
  END
WHERE name IN ('basic','pro','enterprise');
