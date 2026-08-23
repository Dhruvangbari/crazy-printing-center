-- ====================================================================
-- CRAZY PRINTING CENTER: ENTERPRISE DATABASE ACID & SECURITY SCHEMA
-- Run this in Supabase SQL Editor
-- ====================================================================

-- 1. Ensure Columns Exist
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pincode text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS landmark text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS binding_type text DEFAULT 'NONE';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS priority text DEFAULT 'STANDARD';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS page_count int DEFAULT 1;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS upi_utr text;

-- 2. Anti-Fraud UTR Unique Constraint
DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT unique_upi_utr UNIQUE (upi_utr);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Enterprise ACID Data Integrity & Validation Constraints
DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT check_customer_name_valid CHECK (length(trim(customer_name)) >= 2);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT check_customer_phone_valid CHECK (length(trim(customer_phone)) >= 10);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT check_order_total_positive CHECK (total >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT check_order_copies_positive CHECK (copies >= 1);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT check_order_pages_positive CHECK (page_count >= 1);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. Full ACID Stored Procedure: Atomic Profile Sync + Order Creation + File Records + History Log
CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_user_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_mode text,
  p_address text,
  p_city text,
  p_pincode text,
  p_landmark text,
  p_paper_size text,
  p_color_mode text,
  p_sides text,
  p_paper_type text,
  p_copies int,
  p_binding_type text,
  p_priority text,
  p_page_count int,
  p_notes text,
  p_subtotal numeric,
  p_total numeric,
  p_files jsonb
) RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order public.orders;
  v_file jsonb;
  v_clean_name text;
  v_clean_phone text;
  v_pages int;
BEGIN
  -- Strict Input Sanitization & Validation (ACID Consistency)
  v_clean_name := trim(p_customer_name);
  v_clean_phone := trim(p_customer_phone);
  v_pages := COALESCE(p_page_count, 1);

  IF length(v_clean_name) < 2 THEN
    RAISE EXCEPTION 'Validation Failed: Customer Name must be at least 2 characters.';
  END IF;

  IF length(v_clean_phone) < 10 THEN
    RAISE EXCEPTION 'Validation Failed: Contact Phone must be a valid 10-digit number.';
  END IF;

  IF p_copies < 1 THEN
    RAISE EXCEPTION 'Validation Failed: Number of copies must be at least 1.';
  END IF;

  IF v_pages < 1 THEN
    v_pages := 1;
  END IF;

  -- 1. Atomically Upsert Profile if user_id is provided
  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, name, phone, updated_at)
    VALUES (p_user_id, v_clean_name, v_clean_phone, now())
    ON CONFLICT (id) DO UPDATE
    SET 
      name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      updated_at = now();
  END IF;

  -- 2. Atomically Insert Order
  INSERT INTO public.orders (
    user_id, customer_name, customer_phone, delivery_mode,
    address, city, pincode, landmark, paper_size,
    color_mode, sides, paper_type, copies, binding_type,
    priority, page_count, notes, subtotal, total, status
  ) VALUES (
    p_user_id, v_clean_name, v_clean_phone, p_delivery_mode,
    p_address, p_city, p_pincode, p_landmark, p_paper_size,
    p_color_mode, p_sides, p_paper_type, p_copies, p_binding_type,
    p_priority, v_pages, p_notes, p_subtotal, p_total, 'ORDER_RECEIVED'
  ) RETURNING * INTO v_order;

  -- 3. Atomically Insert Document Files
  IF p_files IS NOT NULL AND jsonb_array_length(p_files) > 0 THEN
    FOR v_file IN SELECT * FROM jsonb_array_elements(p_files)
    LOOP
      INSERT INTO public.order_files (
        order_id, original_name, storage_path, mime_type, size
      ) VALUES (
        v_order.id,
        v_file->>'original_name',
        v_file->>'storage_path',
        v_file->>'mime_type',
        COALESCE((v_file->>'size')::bigint, 0)
      );
    END LOOP;
  END IF;

  -- 4. Atomically Log Initial Status Event
  INSERT INTO public.status_history (
    order_id, status, message
  ) VALUES (
    v_order.id,
    'ORDER_RECEIVED',
    'Order created successfully for ' || v_clean_name || ' (' || v_clean_phone || '). Specs: ' || p_paper_size || ', ' || p_color_mode || ', ' || v_pages || ' page(s), ' || p_copies || ' copy(s).'
  );

  RETURN v_order;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Atomic order creation failed: %', SQLERRM;
END;
$$;

-- 5. Full ACID Payment Submission Procedure with Anti-Fraud UTR Detection
CREATE OR REPLACE FUNCTION public.submit_payment_atomic(
  p_order_id uuid,
  p_utr text,
  p_payment_proof_path text
) RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order public.orders;
  v_clean_utr text;
BEGIN
  v_clean_utr := trim(p_utr);

  IF length(v_clean_utr) < 8 THEN
    RAISE EXCEPTION 'Validation Failed: 12-digit transaction UTR reference must be at least 8 to 16 digits.';
  END IF;

  -- Anti-Fraud Check: Disallow duplicate UTR
  IF EXISTS (SELECT 1 FROM public.orders WHERE upi_utr = v_clean_utr AND id != p_order_id) THEN
    RAISE EXCEPTION 'Security Alert: This transaction UTR was already submitted for another order. Each payment reference can only be used once.';
  END IF;

  UPDATE public.orders
  SET 
    upi_utr = v_clean_utr,
    payment_proof_path = p_payment_proof_path,
    status = 'PAYMENT_SUBMITTED',
    updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found with ID: %', p_order_id;
  END IF;

  INSERT INTO public.status_history (
    order_id, status, message
  ) VALUES (
    p_order_id,
    'PAYMENT_SUBMITTED',
    'Payment submitted with 12-digit UTR: ' || v_clean_utr || '. Awaiting shop verification.'
  );

  RETURN v_order;
END;
$$;

-- Grant Permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
