-- 1. Disable RLS on all your custom tables (completely bypasses all RLS checks)
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Grant permissions on public schema
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 3. Make storage buckets public
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('documents', 'documents', true),
  ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 4. Storage Policies on storage.objects (for uploads & viewing)
DROP POLICY IF EXISTS "Allow all uploads to documents" ON storage.objects;
CREATE POLICY "Allow all uploads to documents" ON storage.objects
FOR ALL TO public USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Allow all uploads to payment-proofs" ON storage.objects;
CREATE POLICY "Allow all uploads to payment-proofs" ON storage.objects
FOR ALL TO public USING (bucket_id = 'payment-proofs') WITH CHECK (bucket_id = 'payment-proofs');

-- 5. Sync auth users into profiles
INSERT INTO public.profiles (id, name, phone, role)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'name', 'Customer'), 
  raw_user_meta_data->>'phone',
  'CUSTOMER'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
