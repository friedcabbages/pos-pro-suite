-- Add business status enum
CREATE TYPE public.business_status AS ENUM ('trial', 'active', 'expired', 'suspended');

-- Add status and trial_end_at columns to businesses table
ALTER TABLE public.businesses 
ADD COLUMN status public.business_status NOT NULL DEFAULT 'trial',
ADD COLUMN trial_end_at timestamp with time zone DEFAULT (now() + interval '7 days');

-- Update existing businesses to 'active' status
UPDATE public.businesses SET status = 'active' WHERE status = 'trial';

-- Create index for faster status filtering
CREATE INDEX idx_businesses_status ON public.businesses(status);