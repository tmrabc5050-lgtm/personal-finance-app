-- ============================================================================
-- Personal Finance Super App — Production Multi-User Schema & Security Migration
-- Migration: 20261017000000_multi_user_schema.sql
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Profiles Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  preferred_currency TEXT NOT NULL DEFAULT 'BDT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. Accounts Table
-- Uses TEXT primary keys to seamlessly support both UUIDs and legacy local IDs (e.g. acc_bank)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bkash', 'nagad', 'bank', 'other')),
  account_number_masked TEXT,
  balance_paisa BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BDT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);

-- ----------------------------------------------------------------------------
-- 3. Transactions Table (Includes Transfers & Fees)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  destination_account_id TEXT REFERENCES public.accounts(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa > 0),
  transfer_fee_paisa BIGINT DEFAULT 0 CHECK (transfer_fee_paisa >= 0),
  category TEXT NOT NULL,
  note TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_dest_account_id ON public.transactions(destination_account_id);

-- ----------------------------------------------------------------------------
-- 4. Budgets Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budgets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa > 0),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL CHECK (year >= 2020),
  warning_threshold_percent INT NOT NULL DEFAULT 80 CHECK (warning_threshold_percent BETWEEN 1 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_category_month_year UNIQUE(user_id, category, month, year)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON public.budgets(user_id, year, month);

-- ----------------------------------------------------------------------------
-- 5. Savings Goals Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount_paisa BIGINT NOT NULL CHECK (target_amount_paisa > 0),
  current_amount_paisa BIGINT NOT NULL DEFAULT 0 CHECK (current_amount_paisa >= 0),
  target_date DATE,
  description TEXT,
  category TEXT,
  icon TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'overdue')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON public.savings_goals(user_id);

-- ----------------------------------------------------------------------------
-- 6. Goal Contributions Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goal_contributions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id TEXT NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa > 0),
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  note TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal ON public.goal_contributions(goal_id);

-- ----------------------------------------------------------------------------
-- 7. Recurring Transactions Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa > 0),
  category TEXT NOT NULL,
  note TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  interval INT NOT NULL DEFAULT 1 CHECK (interval >= 1),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  next_due_date DATE NOT NULL,
  last_generated_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_user ON public.recurring_transactions(user_id, status);

-- ----------------------------------------------------------------------------
-- 8. Account Reconciliations Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_reconciliations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  statement_date DATE NOT NULL,
  statement_balance_paisa BIGINT NOT NULL,
  app_balance_paisa BIGINT NOT NULL,
  difference_paisa BIGINT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('matched', 'discrepancy', 'adjusted')),
  adjustment_transaction_id TEXT REFERENCES public.transactions(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliations_account ON public.account_reconciliations(account_id);

-- ----------------------------------------------------------------------------
-- 9. Dashboard Preferences Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dashboard_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  widgets JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. Accounts Policies
CREATE POLICY "accounts_select" ON public.accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "accounts_insert" ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_update" ON public.accounts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_delete" ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- 3. Transactions Policies (Guarantees user owns source and destination accounts)
CREATE POLICY "transactions_select" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert" ON public.transactions FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.accounts WHERE id = account_id AND user_id = auth.uid()) AND
  (destination_account_id IS NULL OR EXISTS (SELECT 1 FROM public.accounts WHERE id = destination_account_id AND user_id = auth.uid()))
);
CREATE POLICY "transactions_update" ON public.transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.accounts WHERE id = account_id AND user_id = auth.uid()) AND
  (destination_account_id IS NULL OR EXISTS (SELECT 1 FROM public.accounts WHERE id = destination_account_id AND user_id = auth.uid()))
);
CREATE POLICY "transactions_delete" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- 4. Budgets Policies
CREATE POLICY "budgets_select" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "budgets_insert" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets_update" ON public.budgets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets_delete" ON public.budgets FOR DELETE USING (auth.uid() = user_id);

-- 5. Savings Goals Policies
CREATE POLICY "goals_select" ON public.savings_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "goals_insert" ON public.savings_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_update" ON public.savings_goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_delete" ON public.savings_goals FOR DELETE USING (auth.uid() = user_id);

-- 6. Goal Contributions Policies (Guarantees goal belongs to user)
CREATE POLICY "contributions_select" ON public.goal_contributions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "contributions_insert" ON public.goal_contributions FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.savings_goals WHERE id = goal_id AND user_id = auth.uid())
);
CREATE POLICY "contributions_update" ON public.goal_contributions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.savings_goals WHERE id = goal_id AND user_id = auth.uid())
);
CREATE POLICY "contributions_delete" ON public.goal_contributions FOR DELETE USING (auth.uid() = user_id);

-- 7. Recurring Transactions Policies (Guarantees account belongs to user)
CREATE POLICY "recurring_select" ON public.recurring_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "recurring_insert" ON public.recurring_transactions FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.accounts WHERE id = account_id AND user_id = auth.uid())
);
CREATE POLICY "recurring_update" ON public.recurring_transactions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.accounts WHERE id = account_id AND user_id = auth.uid())
);
CREATE POLICY "recurring_delete" ON public.recurring_transactions FOR DELETE USING (auth.uid() = user_id);

-- 8. Account Reconciliations Policies (Guarantees account and adjustment tx belong to user)
CREATE POLICY "reconciliations_select" ON public.account_reconciliations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reconciliations_insert" ON public.account_reconciliations FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.accounts WHERE id = account_id AND user_id = auth.uid()) AND
  (adjustment_transaction_id IS NULL OR EXISTS (SELECT 1 FROM public.transactions WHERE id = adjustment_transaction_id AND user_id = auth.uid()))
);
CREATE POLICY "reconciliations_update" ON public.account_reconciliations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM public.accounts WHERE id = account_id AND user_id = auth.uid()) AND
  (adjustment_transaction_id IS NULL OR EXISTS (SELECT 1 FROM public.transactions WHERE id = adjustment_transaction_id AND user_id = auth.uid()))
);
CREATE POLICY "reconciliations_delete" ON public.account_reconciliations FOR DELETE USING (auth.uid() = user_id);

-- 9. Dashboard Preferences Policies
CREATE POLICY "dash_prefs_select" ON public.dashboard_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dash_prefs_insert" ON public.dashboard_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dash_prefs_update" ON public.dashboard_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dash_prefs_delete" ON public.dashboard_preferences FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Trigger: Automatically Create Profile On Auth Signup
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
