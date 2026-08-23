create extension if not exists pgcrypto;

-- 1. Order status enum
do $$ begin
  create type public.order_status as enum (
    'ORDER_RECEIVED',
    'PAYMENT_SUBMITTED',
    'PAYMENT_VERIFIED',
    'PRINTING',
    'QUALITY_CHECK',
    'READY',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED'
  );
exception
  when duplicate_object then null;
end $$;

-- 2. Tables
create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  role text not null default 'CUSTOMER' check(role in('CUSTOMER','ADMIN')),
  created_at timestamptz default now()
);

create table if not exists public.orders(
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null default('CPC-'||to_char(now(),'YYYYMMDD')||'-'||floor(1000+random()*9000)::int),
  user_id uuid not null references public.profiles(id),
  customer_name text,
  customer_phone text,
  city text,
  pincode text,
  landmark text,
  binding_type text default 'NONE',
  priority text default 'STANDARD',
  page_count int default 1,
  status public.order_status default 'ORDER_RECEIVED',
  paper_size text not null,
  color_mode text not null,
  sides text not null,
  paper_type text not null,
  copies int not null default 1,
  delivery_mode text not null,
  address text,
  notes text,
  subtotal numeric(12,2) not null,
  total numeric(12,2) not null,
  payment_proof_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.order_files(
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  original_name text not null,
  storage_path text not null,
  mime_type text,
  size bigint,
  created_at timestamptz default now()
);

create table if not exists public.status_history(
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  status public.order_status not null,
  message text,
  created_at timestamptz default now()
);

-- 3. Automatic user profile creation trigger
create or replace function public.handle_new_user() returns trigger language plpgsql security definer as $$
begin 
  insert into public.profiles(id, name, phone) 
  values(new.id, coalesce(new.raw_user_meta_data->>'name', 'Customer'), new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created 
  after insert on auth.users 
  for each row execute procedure public.handle_new_user();

-- 4. Sync existing auth users into profiles
insert into public.profiles (id, name, phone, role)
select 
  id, 
  coalesce(raw_user_meta_data->>'name', 'Customer'), 
  raw_user_meta_data->>'phone',
  'CUSTOMER'
from auth.users
on conflict (id) do nothing;

-- 5. Open Database Permissions (bypasses RLS blocks)
alter table public.profiles disable row level security; 
alter table public.orders disable row level security; 
alter table public.order_files disable row level security; 
alter table public.status_history disable row level security;

grant all on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;

-- 6. Storage Buckets & Storage RLS Policies
insert into storage.buckets (id, name, public)
values 
  ('documents', 'documents', true),
  ('payment-proofs', 'payment-proofs', true)
on conflict (id) do update set public = true;

drop policy if exists "Allow all uploads to documents" on storage.objects;
create policy "Allow all uploads to documents" on storage.objects
for all to public using (bucket_id = 'documents') with check (bucket_id = 'documents');

drop policy if exists "Allow all uploads to payment-proofs" on storage.objects;
create policy "Allow all uploads to payment-proofs" on storage.objects
for all to public using (bucket_id = 'payment-proofs') with check (bucket_id = 'payment-proofs');
