-- Single-session per user account enforcement

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  session_label TEXT,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ NULL,
  UNIQUE (user_id)
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_sessions' AND policyname='Users can view own session'
  ) THEN
    CREATE POLICY "Users can view own session"
    ON public.user_sessions
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_sessions_business ON public.user_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen ON public.user_sessions(last_seen DESC);

CREATE OR REPLACE FUNCTION public.list_user_sessions(p_business_id uuid, p_window_minutes integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  user_email text,
  user_full_name text,
  session_label text,
  last_seen timestamptz,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    us.user_id,
    u.email,
    p.full_name,
    us.session_label,
    us.last_seen,
    us.created_at
  FROM public.user_sessions us
  LEFT JOIN public.profiles p ON p.id = us.user_id
  LEFT JOIN auth.users u ON u.id = us.user_id
  WHERE us.business_id = p_business_id
    AND us.revoked_at IS NULL
    AND us.last_seen > (now() - (p_window_minutes || ' minutes')::interval)
  ORDER BY us.last_seen DESC;
$$;

CREATE OR REPLACE FUNCTION public.revoke_user_session(p_business_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.user_sessions
  SET revoked_at = now()
  WHERE business_id = p_business_id
    AND user_id = p_user_id
    AND revoked_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.revoke_other_user_sessions(p_business_id uuid, p_keep_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.user_sessions
  SET revoked_at = now()
  WHERE business_id = p_business_id
    AND user_id <> p_keep_user_id
    AND revoked_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.revoke_all_user_sessions(p_business_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.user_sessions
  SET revoked_at = now()
  WHERE business_id = p_business_id
    AND revoked_at IS NULL;
$$;
