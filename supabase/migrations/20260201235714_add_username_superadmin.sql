-- Add username for superadmin@velopos.com
-- This migration updates the username field in profiles table for the superadmin user

-- Create a SECURITY DEFINER function to update username by email
CREATE OR REPLACE FUNCTION public.update_username_by_email(
  user_email TEXT,
  new_username TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_user_id UUID;
  username_lower TEXT;
BEGIN
  -- Validate username format
  IF new_username !~ '^[a-zA-Z0-9_]{3,30}$' THEN
    RAISE EXCEPTION 'Username must be 3-30 characters and only contain letters, numbers, or underscores';
  END IF;
  
  username_lower := LOWER(new_username);
  
  -- Find user_id from auth.users
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Check if username already exists (excluding current user)
  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE LOWER(username) = username_lower
      AND id != target_user_id
  ) THEN
    RAISE EXCEPTION 'Username % already in use', new_username;
  END IF;
  
  -- Update username in profiles
  UPDATE public.profiles
  SET username = username_lower
  WHERE id = target_user_id;
  
  -- Also update user_metadata in auth.users
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{username}',
    to_jsonb(username_lower)
  )
  WHERE id = target_user_id;
  
  RAISE NOTICE 'Username updated successfully for user %', user_email;
END;
$$;

-- Execute the function to update superadmin username
SELECT public.update_username_by_email('superadmin@velopos.com', 'superadmin');

-- Optional: Keep the function for future use, or drop it if you prefer
-- DROP FUNCTION IF EXISTS public.update_username_by_email(TEXT, TEXT);
