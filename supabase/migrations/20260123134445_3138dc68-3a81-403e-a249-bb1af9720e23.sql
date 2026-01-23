-- 1) Add max_devices to subscription plans
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS max_devices integer;

-- 2) Ensure business_device_sessions table exists for active-device enforcement
CREATE TABLE IF NOT EXISTS public.business_device_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid NOT NULL,
  device_id text NOT NULL,
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (business_id, device_id)
);

ALTER TABLE public.business_device_sessions ENABLE ROW LEVEL SECURITY;

-- Only business members can see their business sessions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='business_device_sessions' AND policyname='Users can view device sessions'
  ) THEN
    CREATE POLICY "Users can view device sessions"
    ON public.business_device_sessions
    FOR SELECT
    USING (has_business_access(auth.uid(), business_id));
  END IF;
END $$;

-- Only system can upsert sessions (client will use edge function with service role);
-- keep INSERT/UPDATE blocked for regular users.

-- 3) Helper: update_updated_at_column already exists in many projects, but create defensively
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 4) Subscription helper functions
CREATE OR REPLACE FUNCTION public.get_business_plan_row(p_business_id uuid)
RETURNS public.subscription_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.subscription_plans;
BEGIN
  SELECT sp.* INTO v_plan
  FROM public.business_subscriptions bs
  JOIN public.subscription_plans sp ON sp.id = bs.plan_id
  WHERE bs.business_id = p_business_id
  LIMIT 1;

  -- Fallback to BASIC by name if no subscription row exists
  IF v_plan.id IS NULL THEN
    SELECT sp.* INTO v_plan
    FROM public.subscription_plans sp
    WHERE sp.name = 'basic'
    LIMIT 1;
  END IF;

  RETURN v_plan;
END;
$$;

CREATE OR REPLACE FUNCTION public.plan_limit_users(p_business_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_plan public.subscription_plans;
BEGIN
  v_plan := public.get_business_plan_row(p_business_id);
  RETURN v_plan.max_users;
END;
$$;

CREATE OR REPLACE FUNCTION public.plan_limit_products(p_business_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_plan public.subscription_plans;
BEGIN
  v_plan := public.get_business_plan_row(p_business_id);
  RETURN v_plan.max_products;
END;
$$;

CREATE OR REPLACE FUNCTION public.plan_limit_branches(p_business_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_plan public.subscription_plans;
BEGIN
  v_plan := public.get_business_plan_row(p_business_id);
  RETURN v_plan.max_branches;
END;
$$;

CREATE OR REPLACE FUNCTION public.plan_limit_devices(p_business_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_plan public.subscription_plans;
BEGIN
  v_plan := public.get_business_plan_row(p_business_id);
  RETURN v_plan.max_devices;
END;
$$;

CREATE OR REPLACE FUNCTION public.plan_features(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_plan public.subscription_plans;
BEGIN
  v_plan := public.get_business_plan_row(p_business_id);
  RETURN COALESCE(v_plan.features::jsonb, '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.has_plan_feature(p_business_id uuid, p_feature_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_features jsonb;
BEGIN
  v_features := public.plan_features(p_business_id);
  RETURN EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(v_features) AS f(val)
    WHERE f.val = p_feature_key
  );
END;
$$;

-- 5) Count helpers
CREATE OR REPLACE FUNCTION public.count_business_users(p_business_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.user_roles ur WHERE ur.business_id = p_business_id;
$$;

CREATE OR REPLACE FUNCTION public.count_business_products(p_business_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.products p WHERE p.business_id = p_business_id;
$$;

CREATE OR REPLACE FUNCTION public.count_business_branches(p_business_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.branches b WHERE b.business_id = p_business_id;
$$;

CREATE OR REPLACE FUNCTION public.count_business_warehouses(p_business_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.warehouses w
  JOIN public.branches b ON b.id = w.branch_id
  WHERE b.business_id = p_business_id;
$$;

CREATE OR REPLACE FUNCTION public.count_active_devices(p_business_id uuid, p_window_minutes integer DEFAULT 10)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.business_device_sessions s
  WHERE s.business_id = p_business_id
    AND s.revoked_at IS NULL
    AND s.last_seen > (now() - (p_window_minutes || ' minutes')::interval);
$$;

-- 6) Feature-gate Expenses + Purchase Orders at DB level (prevents API bypass)
-- Expenses
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='expenses' AND policyname='Plan must allow expenses'
  ) THEN
    CREATE POLICY "Plan must allow expenses"
    ON public.expenses
    FOR ALL
    USING (public.has_plan_feature(business_id, 'expenses') AND has_business_access(auth.uid(), business_id))
    WITH CHECK (public.has_plan_feature(business_id, 'expenses') AND has_business_access(auth.uid(), business_id));
  END IF;
END $$;

-- Purchase orders (gate by business_id on purchase_orders table)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='purchase_orders' AND policyname='Plan must allow purchase_orders'
  ) THEN
    CREATE POLICY "Plan must allow purchase_orders"
    ON public.purchase_orders
    FOR ALL
    USING (public.has_plan_feature(business_id, 'purchase_orders') AND has_business_access(auth.uid(), business_id))
    WITH CHECK (public.has_plan_feature(business_id, 'purchase_orders') AND has_business_access(auth.uid(), business_id));
  END IF;
END $$;

-- purchase_order_items gates via join to purchase_orders
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='purchase_order_items' AND policyname='Plan must allow purchase_order_items'
  ) THEN
    CREATE POLICY "Plan must allow purchase_order_items"
    ON public.purchase_order_items
    FOR ALL
    USING (
      EXISTS (
        SELECT 1
        FROM public.purchase_orders po
        WHERE po.id = purchase_order_items.purchase_order_id
          AND public.has_plan_feature(po.business_id, 'purchase_orders')
          AND has_business_access(auth.uid(), po.business_id)
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.purchase_orders po
        WHERE po.id = purchase_order_items.purchase_order_id
          AND public.has_plan_feature(po.business_id, 'purchase_orders')
          AND has_business_access(auth.uid(), po.business_id)
      )
    );
  END IF;
END $$;

-- 7) Limit enforcement policies
-- Products: must be under max_products unless unlimited (NULL)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='products' AND policyname='Plan max_products limit'
  ) THEN
    CREATE POLICY "Plan max_products limit"
    ON public.products
    FOR INSERT
    WITH CHECK (
      has_business_access(auth.uid(), business_id)
      AND (
        public.plan_limit_products(business_id) IS NULL
        OR public.count_business_products(business_id) < public.plan_limit_products(business_id)
      )
    );
  END IF;
END $$;

-- Branches: under max_branches unless unlimited
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='branches' AND policyname='Plan max_branches limit'
  ) THEN
    CREATE POLICY "Plan max_branches limit"
    ON public.branches
    FOR INSERT
    WITH CHECK (
      (
        EXISTS (
          SELECT 1
          FROM public.businesses b
          WHERE b.id = branches.business_id
            AND has_business_access(auth.uid(), branches.business_id)
        )
      )
      AND (
        public.plan_limit_branches(branches.business_id) IS NULL
        OR public.count_business_branches(branches.business_id) < public.plan_limit_branches(branches.business_id)
      )
    );
  END IF;
END $$;

-- user_roles: under max_users unless unlimited
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_roles' AND policyname='Plan max_users limit'
  ) THEN
    CREATE POLICY "Plan max_users limit"
    ON public.user_roles
    FOR INSERT
    WITH CHECK (
      (
        EXISTS (
          SELECT 1
          FROM public.businesses b
          WHERE b.id = user_roles.business_id
            AND b.owner_id = auth.uid()
        )
      )
      AND (
        public.plan_limit_users(user_roles.business_id) IS NULL
        OR public.count_business_users(user_roles.business_id) < public.plan_limit_users(user_roles.business_id)
      )
    );
  END IF;
END $$;

-- Warehouses: allow more than 1 only if feature multi_warehouse is enabled
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='warehouses' AND policyname='Plan multi_warehouse gate'
  ) THEN
    CREATE POLICY "Plan multi_warehouse gate"
    ON public.warehouses
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.branches br
        WHERE br.id = warehouses.branch_id
          AND has_business_access(auth.uid(), br.business_id)
          AND (
            public.has_plan_feature(br.business_id, 'multi_warehouse')
            OR public.count_business_warehouses(br.business_id) < 1
          )
      )
    );
  END IF;
END $$;

-- 8) Backfill plan definitions (BASIC/PRO/ENTERPRISE) with max_devices defaults
-- This assumes plan.name values are 'basic', 'pro', 'enterprise'
UPDATE public.subscription_plans
SET max_devices = CASE
  WHEN name = 'basic' THEN 1
  WHEN name = 'pro' THEN 3
  WHEN name = 'enterprise' THEN NULL
  ELSE max_devices
END
WHERE max_devices IS NULL;

-- Ensure features JSON includes our canonical keys (non-destructive merge)
-- NOTE: We do not overwrite existing arrays; admins can adjust via UI.
