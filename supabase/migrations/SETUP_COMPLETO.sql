-- =============================================
-- MIDINERO AI - SETUP COMPLETO DE BASE DE DATOS
-- Ejecutar TODO este archivo en Supabase SQL Editor
-- =============================================


-- ############ 001_initial_schema.sql ############

-- MiDinero AI - Initial Schema (001_initial_schema.sql)
-- This migration creates all base tables for MiDinero AI

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  avatar_url TEXT NULL,
  currency VARCHAR(3) DEFAULT 'CLP',
  timezone VARCHAR(50) DEFAULT 'America/Santiago',
  dark_mode BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Homes Table
CREATE TABLE IF NOT EXISTS public.homes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  currency VARCHAR(3) DEFAULT 'CLP',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Home Members Table
CREATE TABLE IF NOT EXISTS public.home_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(home_id, user_id)
);

-- Incomes Table
CREATE TABLE IF NOT EXISTS public.incomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  source VARCHAR(50) NOT NULL DEFAULT 'other' CHECK (source IN ('salary', 'bonus', 'other')),
  description TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  merchant VARCHAR(255) NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  category VARCHAR(50) NOT NULL DEFAULT 'Otros',
  description TEXT NULL,
  is_shared BOOLEAN DEFAULT false,
  shared_with UUID[] NULL,
  receipt_image TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shared Expenses Table
CREATE TABLE IF NOT EXISTS public.shared_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_id UUID NOT NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  date DATE NOT NULL,
  merchant VARCHAR(255) NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  category VARCHAR(50) NOT NULL DEFAULT 'Otros',
  split_type VARCHAR(20) NOT NULL CHECK (split_type IN ('50/50', 'percentage', 'fixed')),
  splits JSONB NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fixed Expenses Table
CREATE TABLE IF NOT EXISTS public.fixed_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  home_id UUID NULL REFERENCES public.homes(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('monthly', 'weekly')),
  start_date DATE NOT NULL,
  end_date DATE NULL,
  is_active BOOLEAN DEFAULT true,
  description TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Installments Table
CREATE TABLE IF NOT EXISTS public.installments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_amount > 0),
  num_installments INT NOT NULL CHECK (num_installments > 0),
  start_date DATE NOT NULL,
  current_installment INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goals Table
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (target_amount > 0),
  current_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  category VARCHAR(100) NULL,
  target_date DATE NULL,
  emoji VARCHAR(10) DEFAULT 'ðŸŽ¯',
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scenarios Table
CREATE TABLE IF NOT EXISTS public.scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('solo', 'shared', 'custom')),
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Predictions Table
CREATE TABLE IF NOT EXISTS public.predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  predicted_expenses NUMERIC(15,2) NOT NULL DEFAULT 0,
  predicted_income NUMERIC(15,2) NOT NULL DEFAULT 0,
  predicted_savings NUMERIC(15,2) NOT NULL DEFAULT 0,
  confidence FLOAT NOT NULL DEFAULT 0.5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Imports Table
CREATE TABLE IF NOT EXISTS public.email_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email_address VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('gmail', 'outlook')),
  access_token TEXT NOT NULL,
  refresh_token TEXT NULL,
  last_sync TIMESTAMP WITH TIME ZONE NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email_address)
);

-- Expense Classifications Table
CREATE TABLE IF NOT EXISTS public.expense_classifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_import_id UUID NOT NULL REFERENCES public.email_imports(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body_snippet TEXT NOT NULL,
  merchant VARCHAR(255) NOT NULL,
  predicted_category VARCHAR(50) NOT NULL,
  confidence FLOAT NOT NULL,
  manual_category VARCHAR(50) NULL,
  expense_id UUID NULL REFERENCES public.expenses(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'auto_classified', 'manual_classified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID NULL,
  changes JSONB NULL,
  ip_address INET NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Indices for Performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_homes_creator_id ON public.homes(creator_id);
CREATE INDEX IF NOT EXISTS idx_home_members_home_id ON public.home_members(home_id);
CREATE INDEX IF NOT EXISTS idx_home_members_user_id ON public.home_members(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON public.incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_date ON public.incomes(date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_shared_expenses_home_id ON public.shared_expenses(home_id);
CREATE INDEX IF NOT EXISTS idx_shared_expenses_date ON public.shared_expenses(date);
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_user_id ON public.fixed_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_home_id ON public.fixed_expenses(home_id);
CREATE INDEX IF NOT EXISTS idx_installments_user_id ON public.installments(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_user_id ON public.scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_month ON public.predictions(month);
CREATE INDEX IF NOT EXISTS idx_email_imports_user_id ON public.email_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_classifications_email_import_id ON public.expense_classifications(email_import_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);


-- ############ 002_rls_policies.sql ############

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


-- ############ 003_installment_autogeneration.sql ############

-- Installment auto-generation support
-- Adds a ledger table to avoid duplicate monthly charges and keep audit history.

CREATE TABLE IF NOT EXISTS public.installment_charges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  installment_id UUID NOT NULL REFERENCES public.installments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  installment_number INT NOT NULL CHECK (installment_number > 0),
  charge_date DATE NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  expense_id UUID NULL REFERENCES public.expenses(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(installment_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_installment_charges_user_id
  ON public.installment_charges(user_id);
CREATE INDEX IF NOT EXISTS idx_installment_charges_charge_date
  ON public.installment_charges(charge_date);
CREATE INDEX IF NOT EXISTS idx_installment_charges_installment_id
  ON public.installment_charges(installment_id);

ALTER TABLE public.installment_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own installment charges" ON public.installment_charges
  FOR SELECT USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can create own installment charges" ON public.installment_charges
  FOR INSERT WITH CHECK (auth.uid()::uuid = user_id);

CREATE POLICY "Users can update own installment charges" ON public.installment_charges
  FOR UPDATE USING (auth.uid()::uuid = user_id);

CREATE POLICY "Users can delete own installment charges" ON public.installment_charges
  FOR DELETE USING (auth.uid()::uuid = user_id);

