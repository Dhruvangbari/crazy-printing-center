-- =================================================================
-- FIX: ADD 'upi_utr' COLUMN TO ORDERS TABLE & RELOAD SCHEMA CACHE
-- =================================================================
-- Run this in your Supabase Dashboard (https://supabase.com/dashboard)
-- Go to: SQL Editor > New Query > Paste & Run

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS upi_utr text;

-- Notify PostgREST to immediately refresh its schema cache
NOTIFY pgrst, 'reload schema';
