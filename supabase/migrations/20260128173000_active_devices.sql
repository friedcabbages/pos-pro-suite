-- Active devices registry and management

CREATE TABLE IF NOT EXISTS public.active_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ NULL,
  UNIQUE (business_id, device_id)
);

ALTER TABLE public.active_devices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='active_devices' AND policyname='Users can view active devices'
  ) THEN
    CREATE POLICY "Users can view active devices"
    ON public.active_devices
    FOR SELECT
    USING (public.has_business_access(auth.uid(), business_id));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_active_devices_business ON public.active_devices(business_id);
CREATE INDEX IF NOT EXISTS idx_active_devices_last_seen ON public.active_devices(last_seen DESC);

-- Active device counters now use active_devices
CREATE OR REPLACE FUNCTION public.count_active_devices(p_business_id uuid, p_window_minutes integer DEFAULT 10)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.active_devices s
  WHERE s.business_id = p_business_id
    AND s.revoked_at IS NULL
    AND s.last_seen > (now() - (p_window_minutes || ' minutes')::interval);
$$;

-- List active devices with user context
CREATE OR REPLACE FUNCTION public.list_active_devices(p_business_id uuid, p_window_minutes integer DEFAULT 10)
RETURNS TABLE (
  device_id text,
  device_name text,
  user_id uuid,
  user_email text,
  user_full_name text,
  last_seen timestamptz,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ad.device_id,
    ad.device_name,
    ad.user_id,
    u.email,
    p.full_name,
    ad.last_seen,
    ad.created_at
  FROM public.active_devices ad
  LEFT JOIN public.profiles p ON p.id = ad.user_id
  LEFT JOIN auth.users u ON u.id = ad.user_id
  WHERE ad.business_id = p_business_id
    AND ad.revoked_at IS NULL
    AND ad.last_seen > (now() - (p_window_minutes || ' minutes')::interval)
  ORDER BY ad.last_seen DESC;
$$;

CREATE OR REPLACE FUNCTION public.revoke_device(p_business_id uuid, p_device_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.active_devices
  SET revoked_at = now()
  WHERE business_id = p_business_id
    AND device_id = p_device_id
    AND revoked_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.revoke_other_devices(p_business_id uuid, p_keep_device_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.active_devices
  SET revoked_at = now()
  WHERE business_id = p_business_id
    AND device_id <> p_keep_device_id
    AND revoked_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.revoke_all_devices(p_business_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.active_devices
  SET revoked_at = now()
  WHERE business_id = p_business_id
    AND revoked_at IS NULL;
$$;
