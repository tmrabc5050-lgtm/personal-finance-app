-- ============================================================================
-- Personal Finance Super App — Hardening Migration (Indexes, Constraints & Functions)
-- Migration: 20261017000001_security_and_constraints.sql
-- ============================================================================

-- 1. Missing user_id indexes for high-speed RLS scanning (M2)
CREATE INDEX IF NOT EXISTS idx_goal_contributions_user ON public.goal_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_reconciliations_user ON public.account_reconciliations(user_id);

-- 2. Transaction shape check constraints (H3)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_shape_chk'
  ) THEN
    ALTER TABLE public.transactions ADD CONSTRAINT transactions_shape_chk CHECK (
      (type = 'transfer'
         AND destination_account_id IS NOT NULL
         AND destination_account_id <> account_id)
      OR
      (type <> 'transfer'
         AND destination_account_id IS NULL
         AND COALESCE(transfer_fee_paisa, 0) = 0)
    );
  END IF;
END $$;

-- 3. Pin search_path on auth trigger functions to prevent search_path hijacking (M1)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, preferred_currency)
  VALUES (
    NEW.id,
    NEW.email,
    SUBSTRING(COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)) FROM 1 FOR 100),
    'BDT'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 4. Server-Side Atomic Ledger Functions with Row-Level Locking (C2, H1)
-- Guarantees balance and transaction integrity without concurrency race conditions

-- A. Atomic Transfer Function
CREATE OR REPLACE FUNCTION public.transfer_funds(
  p_src text,
  p_dst text,
  p_amount bigint,
  p_fee bigint,
  p_category text,
  p_note text,
  p_date date
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid := (SELECT auth.uid());
  src_bal bigint;
  tx public.transactions;
BEGIN
  IF uid IS NULL OR p_amount <= 0 OR p_fee < 0 OR p_src = p_dst THEN
    RAISE EXCEPTION 'Invalid transfer arguments' USING ERRCODE = '22023';
  END IF;

  -- Lock both rows in a fixed order (lexicographically by id) to prevent deadlocks
  PERFORM 1 FROM public.accounts
   WHERE user_id = uid AND id IN (p_src, p_dst)
   ORDER BY id FOR UPDATE;

  SELECT balance_paisa INTO src_bal FROM public.accounts WHERE id = p_src AND user_id = uid;
  IF src_bal IS NULL OR NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = p_dst AND user_id = uid) THEN
    RAISE EXCEPTION 'One or more accounts not found' USING ERRCODE = 'P0002';
  END IF;

  IF src_bal < (p_amount + p_fee) THEN
    RAISE EXCEPTION 'Insufficient balance in source account' USING ERRCODE = 'P0001';
  END IF;

  -- Update source account
  UPDATE public.accounts
     SET balance_paisa = balance_paisa - (p_amount + p_fee),
         updated_at = NOW()
   WHERE id = p_src AND user_id = uid;

  -- Update destination account
  UPDATE public.accounts
     SET balance_paisa = balance_paisa + p_amount,
         updated_at = NOW()
   WHERE id = p_dst AND user_id = uid;

  -- Insert ledger transaction record
  INSERT INTO public.transactions (
    user_id, account_id, destination_account_id, type,
    amount_paisa, transfer_fee_paisa, category, note, date
  )
  VALUES (
    uid, p_src, p_dst, 'transfer',
    p_amount, p_fee, p_category, p_note, p_date
  )
  RETURNING * INTO tx;

  RETURN tx;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_funds FROM public;
GRANT EXECUTE ON FUNCTION public.transfer_funds TO authenticated;

-- B. Atomic Income / Expense Function
CREATE OR REPLACE FUNCTION public.record_income_or_expense(
  p_account_id text,
  p_type text,
  p_amount bigint,
  p_category text,
  p_note text,
  p_date date
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid := (SELECT auth.uid());
  cur_bal bigint;
  tx public.transactions;
BEGIN
  IF uid IS NULL OR p_amount <= 0 OR p_type NOT IN ('income', 'expense') THEN
    RAISE EXCEPTION 'Invalid transaction arguments' USING ERRCODE = '22023';
  END IF;

  -- Lock account row
  SELECT balance_paisa INTO cur_bal FROM public.accounts
   WHERE id = p_account_id AND user_id = uid
     FOR UPDATE;

  IF cur_bal IS NULL THEN
    RAISE EXCEPTION 'Account not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_type = 'expense' AND cur_bal < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance' USING ERRCODE = 'P0001';
  END IF;

  -- Update account balance
  IF p_type = 'income' THEN
    UPDATE public.accounts
       SET balance_paisa = balance_paisa + p_amount,
           updated_at = NOW()
     WHERE id = p_account_id AND user_id = uid;
  ELSE
    UPDATE public.accounts
       SET balance_paisa = balance_paisa - p_amount,
           updated_at = NOW()
     WHERE id = p_account_id AND user_id = uid;
  END IF;

  -- Insert ledger transaction
  INSERT INTO public.transactions (
    user_id, account_id, type, amount_paisa, transfer_fee_paisa, category, note, date
  )
  VALUES (
    uid, p_account_id, p_type, p_amount, 0, p_category, p_note, p_date
  )
  RETURNING * INTO tx;

  RETURN tx;
END;
$$;

REVOKE ALL ON FUNCTION public.record_income_or_expense FROM public;
GRANT EXECUTE ON FUNCTION public.record_income_or_expense TO authenticated;
