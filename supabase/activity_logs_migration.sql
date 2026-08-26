-- ====================================================================
-- CRAZY PRINTING CENTER: REAL-TIME USER ACTIVITY LOGS & TELEMETRY
-- Run this in Supabase SQL Editor
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  user_name text DEFAULT 'Guest Visitor',
  user_phone text,
  user_email text,
  action_type text NOT NULL, -- 'PAGE_VIEW', 'DOC_UPLOAD', 'SPEC_SELECT', 'ORDER_PLACED', 'PAYMENT_SUBMIT', 'INVOICE_VIEW', 'SUPPORT_CLICK', etc.
  action_title text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  page_url text,
  device_info text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Index for real-time fast querying by admin
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_session_id ON public.activity_logs (session_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs (user_id);

-- Enable RLS and setup permissive policies for logging & admin read
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow public inserts to activity_logs" ON public.activity_logs;
  CREATE POLICY "Allow public inserts to activity_logs" ON public.activity_logs
    FOR INSERT WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow select for authenticated and anon" ON public.activity_logs;
  CREATE POLICY "Allow select for authenticated and anon" ON public.activity_logs
    FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enable Realtime replication for activity_logs table
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

GRANT ALL ON public.activity_logs TO postgres, anon, authenticated, service_role;
