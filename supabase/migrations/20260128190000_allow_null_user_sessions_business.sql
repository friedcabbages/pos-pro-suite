-- Allow user_sessions without business_id for single-session enforcement
ALTER TABLE public.user_sessions
  ALTER COLUMN business_id DROP NOT NULL;
