-- Allow business owners/admins to view profiles of users in their business
CREATE POLICY "Business members can view profiles of same business"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur1
    JOIN public.user_roles ur2 ON ur1.business_id = ur2.business_id
    WHERE ur1.user_id = auth.uid()
    AND ur2.user_id = profiles.id
  )
);