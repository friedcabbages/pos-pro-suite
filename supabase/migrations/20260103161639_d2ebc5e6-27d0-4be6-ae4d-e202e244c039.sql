-- Drop existing insert policy and recreate with proper role targeting
DROP POLICY IF EXISTS "Allow authenticated user insert business" ON businesses;

-- Create insert policy explicitly for authenticated role
CREATE POLICY "Allow authenticated user insert business"
ON businesses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Also ensure the policy works by verifying user_roles will be created
-- The flow is: insert business → insert user_role with owner role
-- So we need to allow the initial insert without requiring existing role