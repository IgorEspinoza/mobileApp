-- MiDinero AI - Row Level Security (RLS) Policies (002_rls_policies.sql)
-- This migration enables RLS and creates all security policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- USERS Table Policies
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid()::uuid = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid()::uuid = id);

CREATE POLICY "Enable insert for new users" ON public.users
  FOR INSERT WITH CHECK (auth.uid()::uuid = id);

-- HOMES Table Policies
CREATE POLICY "Home creator can view own homes" ON public.homes
  FOR SELECT USING (auth.uid()::uuid = creator_id);

CREATE POLICY "Home members can view home" ON public.homes
  FOR SELECT USING (id IN (
    SELECT home_id FROM public.home_members
    WHERE user_id = auth.uid()::uuid
  ));

CREATE POLICY "Users can create homes" ON public.homes
  FOR INSERT WITH CHECK (auth.uid()::uuid = creator_id);

CREATE POLICY "Creator can update home" ON public.homes
  FOR UPDATE USING (auth.uid()::uuid = creator_id);

CREATE POLICY "Owner can delete home" ON public.homes
  FOR DELETE USING (auth.uid()::uuid = creator_id);

-- HOME_MEMBERS Table Policies
CREATE POLICY "Home members can view members" ON public.home_members
  FOR SELECT USING (home_id IN (
    SELECT id FROM public.homes
    WHERE creator_id = auth.uid()::uuid
  ) OR user_id = auth.uid()::uuid OR home_id IN (
    SELECT home_id FROM public.home_members
    WHERE user_id = auth.uid()::uuid
  ));

CREATE POLICY "Owner can invite members" ON public.home_members
  FOR INSERT WITH CHECK (home_id IN (
    SELECT id FROM public.homes
    WHERE creator_id = auth.uid()::uuid
  ));

CREATE POLICY "Owner can remove members" ON public.home_members
  FOR DELETE USING (home_id IN (
    SELECT id FROM public.homes
    WHERE creator_id = auth.uid()::uuid
  ));

-- INCOMES Table Policies
CREATE POLICY "Users see own incomes" ON public.incomes
  FOR SELECT USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can create incomes" ON public.incomes
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update own incomes" ON public.incomes
  FOR UPDATE USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can delete own incomes" ON public.incomes
  FOR DELETE USING (auth.uid()::uuid = user_id);

-- EXPENSES Table Policies
CREATE POLICY "Users see own expenses" ON public.expenses
  FOR SELECT USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can create expenses" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update own expenses" ON public.expenses
  FOR UPDATE USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can delete own expenses" ON public.expenses
  FOR DELETE USING (auth.uid()::uuid = user_id);

-- SHARED_EXPENSES Table Policies
CREATE POLICY "Home members see shared expenses" ON public.shared_expenses
  FOR SELECT USING (home_id IN (
    SELECT id FROM public.homes
    WHERE creator_id = auth.uid()::uuid
  ) OR home_id IN (
    SELECT home_id FROM public.home_members
    WHERE user_id = auth.uid()::uuid
  ));

CREATE POLICY "Home members can create shared expenses" ON public.shared_expenses
  FOR INSERT WITH CHECK (home_id IN (
    SELECT home_id FROM public.home_members
    WHERE user_id = auth.uid()::uuid
  ));

CREATE POLICY "Creator can update shared expense" ON public.shared_expenses
  FOR UPDATE USING (auth.uid()::uuid = created_by);

CREATE POLICY "Creator can delete shared expense" ON public.shared_expenses
  FOR DELETE USING (auth.uid()::uuid = created_by);

-- FIXED_EXPENSES Table Policies
CREATE POLICY "Users see own fixed expenses" ON public.fixed_expenses
  FOR SELECT USING (auth.uid()::uuid = user_id);

CREATE POLICY "Home members see home fixed expenses" ON public.fixed_expenses
  FOR SELECT USING (home_id IN (
    SELECT home_id FROM public.home_members
    WHERE user_id = auth.uid()::uuid
  ));

CREATE POLICY "Users can create fixed expenses" ON public.fixed_expenses
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id OR home_id IN (
    SELECT home_id FROM public.home_members
    WHERE user_id = auth.uid()::uuid
  ));

CREATE POLICY "Creator can update fixed expense" ON public.fixed_expenses
  FOR UPDATE USING (auth.uid()::uuid = user_id);

CREATE POLICY "Creator can delete fixed expense" ON public.fixed_expenses
  FOR DELETE USING (auth.uid()::uuid = user_id);

-- INSTALLMENTS Table Policies
CREATE POLICY "Users see own installments" ON public.installments
  FOR SELECT USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can create installments" ON public.installments
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update own installments" ON public.installments
  FOR UPDATE USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can delete own installments" ON public.installments
  FOR DELETE USING (auth.uid()::uuid = user_id);

-- GOALS Table Policies
CREATE POLICY "Users see own goals" ON public.goals
  FOR SELECT USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can create goals" ON public.goals
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update own goals" ON public.goals
  FOR UPDATE USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can delete own goals" ON public.goals
  FOR DELETE USING (auth.uid()::uuid = user_id);

-- SCENARIOS Table Policies
CREATE POLICY "Users see own scenarios" ON public.scenarios
  FOR SELECT USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can create scenarios" ON public.scenarios
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can delete own scenarios" ON public.scenarios
  FOR DELETE USING (auth.uid()::uuid = user_id);

-- PREDICTIONS Table Policies
CREATE POLICY "Users see own predictions" ON public.predictions
  FOR SELECT USING (auth.uid()::uuid = user_id);

CREATE POLICY "Only service can create predictions" ON public.predictions
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

-- EMAIL_IMPORTS Table Policies
CREATE POLICY "Users see own email imports" ON public.email_imports
  FOR SELECT USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can create email imports" ON public.email_imports
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update own email imports" ON public.email_imports
  FOR UPDATE USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can delete own email imports" ON public.email_imports
  FOR DELETE USING (auth.uid()::uuid = user_id);

-- EXPENSE_CLASSIFICATIONS Table Policies
CREATE POLICY "Users see classifications from own email imports" ON public.expense_classifications
  FOR SELECT USING (email_import_id IN (
    SELECT id FROM public.email_imports
    WHERE user_id = auth.uid()::uuid
  ));

CREATE POLICY "Users can update classifications from own imports" ON public.expense_classifications
  FOR UPDATE USING (email_import_id IN (
    SELECT id FROM public.email_imports
    WHERE user_id = auth.uid()::uuid
  ));

-- AUDIT_LOGS Table Policies
CREATE POLICY "Users see own audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid()::uuid = user_id);

