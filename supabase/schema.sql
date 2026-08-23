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

-- 5. RLS Policies on Tables
alter table public.profiles enable row level security; 
alter table public.orders enable row level security; 
alter table public.order_files enable row level security; 
alter table public.status_history enable row level security;

-- Profiles: allow users to read profiles, update own
drop policy if exists "profiles_all" on public.profiles;
drop policy if exists "profile own" on public.profiles;
create policy "profiles_all" on public.profiles for all using (true) with check (auth.uid() = id);

-- Orders: allow authenticated users to create & view, public tracking
drop policy if exists "orders_select" on public.orders;
drop policy if exists "orders_insert" on public.orders;
drop policy if exists "orders_update" on public.orders;
drop policy if exists "orders own" on public.orders;
drop policy if exists "orders create" on public.orders;
drop policy if exists "orders payment" on public.orders;
drop policy if exists "public track orders" on public.orders;
drop policy if exists "orders all for auth" on public.orders;

create policy "orders_select" on public.orders for select using (true);
create policy "orders_insert" on public.orders for insert with check (auth.uid() = user_id);
create policy "orders_update" on public.orders for update using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and role = 'ADMIN'));

-- Order files: allow access
drop policy if exists "files_all" on public.order_files;
drop policy if exists "files own" on public.order_files;
create policy "files_all" on public.order_files for all using (true) with check (true);

-- Status history: allow access
drop policy if exists "history_all" on public.status_history;
drop policy if exists "history own" on public.status_history;
create policy "history_all" on public.status_history for all using (true) with check (true);

-- 6. Storage Buckets & Storage RLS Policies
insert into storage.buckets (id, name, public)
values 
  ('documents', 'documents', true),
  ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

drop policy if exists "documents_insert" on storage.objects;
drop policy if exists "documents_select" on storage.objects;
drop policy if exists "payment_proofs_insert" on storage.objects;
drop policy if exists "payment_proofs_select" on storage.objects;
drop policy if exists "authenticated upload documents" on storage.objects;
drop policy if exists "authenticated read documents" on storage.objects;
drop policy if exists "authenticated upload payment proofs" on storage.objects;
drop policy if exists "authenticated read payment proofs" on storage.objects;

create policy "documents_insert" on storage.objects for insert with check (bucket_id = 'documents');
create policy "documents_select" on storage.objects for select using (bucket_id = 'documents');
create policy "payment_proofs_insert" on storage.objects for insert with check (bucket_id = 'payment-proofs');
create policy "payment_proofs_select" on storage.objects for select using (bucket_id = 'payment-proofs');
