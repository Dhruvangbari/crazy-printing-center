create extension if not exists pgcrypto;
create type public.order_status as enum ('ORDER_RECEIVED','PAYMENT_SUBMITTED','PAYMENT_VERIFIED','PRINTING','QUALITY_CHECK','READY','OUT_FOR_DELIVERY','DELIVERED','CANCELLED');
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,name text not null,phone text,role text not null default 'CUSTOMER' check(role in('CUSTOMER','ADMIN')),created_at timestamptz default now());
create table public.orders(id uuid primary key default gen_random_uuid(),order_number text unique not null default('CPC-'||to_char(now(),'YYYYMMDD')||'-'||floor(1000+random()*9000)::int),user_id uuid not null references public.profiles(id),status public.order_status default 'ORDER_RECEIVED',paper_size text not null,color_mode text not null,sides text not null,paper_type text not null,copies int not null default 1,delivery_mode text not null,address text,notes text,subtotal numeric(12,2) not null,total numeric(12,2) not null,payment_proof_path text,created_at timestamptz default now(),updated_at timestamptz default now());
create table public.order_files(id uuid primary key default gen_random_uuid(),order_id uuid references public.orders(id) on delete cascade,original_name text not null,storage_path text not null,mime_type text,size bigint,created_at timestamptz default now());
create table public.status_history(id uuid primary key default gen_random_uuid(),order_id uuid references public.orders(id) on delete cascade,status public.order_status not null,message text,created_at timestamptz default now());
create or replace function public.handle_new_user() returns trigger language plpgsql security definer as $$begin insert into public.profiles(id,name,phone) values(new.id,coalesce(new.raw_user_meta_data->>'name','Customer'),new.raw_user_meta_data->>'phone'); return new;end$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
alter table public.profiles enable row level security; alter table public.orders enable row level security; alter table public.order_files enable row level security; alter table public.status_history enable row level security;
create policy "profile own" on public.profiles for select using(auth.uid()=id);
create policy "orders own" on public.orders for select using(auth.uid()=user_id);
create policy "orders create" on public.orders for insert with check(auth.uid()=user_id);
create policy "orders payment" on public.orders for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "files own" on public.order_files for all using(exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid())) with check(exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid()));
create policy "history own" on public.status_history for select using(exists(select 1 from public.orders o where o.id=order_id and o.user_id=auth.uid()));
-- Create private Storage buckets named documents and payment-proofs in the Supabase dashboard.
-- Before production, add Storage RLS policies and server-side ADMIN authorization for host actions.
-- To make a host: update public.profiles set role='ADMIN' where id='AUTH-USER-UUID';
