-- Create super_admins table for proper role-based access control
CREATE TABLE public.super_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    notes TEXT
);

-- Enable Row Level Security
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Only super admins can read the super_admins table (using security definer function)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.super_admins
    WHERE user_id = _user_id
  )
$$;

-- Create RLS policies using the function
CREATE POLICY "Super admins can read super_admins"
ON public.super_admins
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert super_admins"
ON public.super_admins
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete super_admins"
ON public.super_admins
FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_super_admins_user_id ON public.super_admins(user_id);