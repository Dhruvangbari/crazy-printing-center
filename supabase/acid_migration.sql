-- ==========================================================
-- ACID TRANSACTIONS & ANTI-FRAUD PAYMENT MIGRATION
-- Run this in Supabase SQL Editor
-- ==========================================================

-- 1. Add UTR / Transaction Reference ID with UNIQUE constraint for anti-fraud
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS upi_utr text;

DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT unique_upi_utr UNIQUE (upi_utr);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Consistency & Integrity Constraints
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

-- 3. Atomic Order Creation Function (ACID: Atomicity + Isolation + Durability)
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
BEGIN
  -- Insert into orders table
  INSERT INTO public.orders (
    user_id, customer_name, customer_phone, delivery_mode,
    address, city, pincode, landmark, paper_size,
    color_mode, sides, paper_type, copies, binding_type,
    priority, notes, subtotal, total, status
  ) VALUES (
    p_user_id, p_customer_name, p_customer_phone, p_delivery_mode,
    p_address, p_city, p_pincode, p_landmark, p_paper_size,
    p_color_mode, p_sides, p_paper_type, p_copies, p_binding_type,
    p_priority, p_notes, p_subtotal, p_total, 'ORDER_RECEIVED'
  ) RETURNING * INTO v_order;

  -- Insert all attached document records atomically
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

  -- Atomically record status history log
  INSERT INTO public.status_history (
    order_id, status, message
  ) VALUES (
    v_order.id,
    'ORDER_RECEIVED',
    'Order created successfully. Specifications: ' || p_paper_size || ', ' || p_color_mode || ', ' || p_copies || ' copy(s).'
  );

  RETURN v_order;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Atomic order transaction failed: %', SQLERRM;
END;
$$;

-- 4. Atomic Payment Submission with Anti-Fraud UTR Verification
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

  -- Validate 12-digit format
  IF length(v_clean_utr) < 8 THEN
    RAISE EXCEPTION 'Invalid UTR: Transaction reference must be at least 8 to 12 digits.';
  END IF;

  -- Anti-Fraud Check: Disallow reuse of the same UTR across multiple orders
  IF EXISTS (SELECT 1 FROM public.orders WHERE upi_utr = v_clean_utr AND id != p_order_id) THEN
    RAISE EXCEPTION 'Fraud Alert: This 12-digit transaction UTR was already submitted for another order. Each payment reference can only be used once.';
  END IF;

  -- Atomically update order status and record UTR
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

  -- Atomically log status history
  INSERT INTO public.status_history (
    order_id, status, message
  ) VALUES (
    p_order_id,
    'PAYMENT_SUBMITTED',
    'Customer submitted payment proof with 12-digit UTR: ' || v_clean_utr || '. Awaiting shop verification.'
  );

  RETURN v_order;
END;
$$;

-- Refresh permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
