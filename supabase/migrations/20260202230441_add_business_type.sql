-- Add business_type enum and column to businesses table
-- This migration adds support for different business types: retail, fnb, service, venue

-- Create enum type for business types
CREATE TYPE public.business_type AS ENUM ('retail', 'fnb', 'service', 'venue');

-- Add business_type column to businesses table with default 'retail'
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS business_type public.business_type NOT NULL DEFAULT 'retail';

-- Backfill existing businesses to 'retail' (in case default doesn't apply to existing rows)
UPDATE public.businesses 
SET business_type = 'retail' 
WHERE business_type IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_businesses_business_type ON public.businesses(business_type);

-- Add comment for documentation
COMMENT ON COLUMN public.businesses.business_type IS 'Type of business: retail (retail store), fnb (food & beverage), service (barbershop, etc), venue (badminton/futsal/rental)';
