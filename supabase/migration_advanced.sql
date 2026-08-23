-- Run this script in Supabase SQL Editor to add the advanced delivery & order options:

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pincode text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS landmark text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS binding_type text DEFAULT 'NONE';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS priority text DEFAULT 'STANDARD';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS page_count int DEFAULT 1;

-- Refresh permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
