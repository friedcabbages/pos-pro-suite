-- Add username column to profiles for username-based login support
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT;

-- Case-insensitive unique index for username
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND indexname = 'idx_profiles_username_lower'
  ) THEN
    CREATE UNIQUE INDEX idx_profiles_username_lower
      ON public.profiles(LOWER(username))
      WHERE username IS NOT NULL;
  END IF;
END
$$;

-- Update trigger to persist username from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    LOWER(NEW.raw_user_meta_data ->> 'username')
  );
  RETURN NEW;
END;
$$;
