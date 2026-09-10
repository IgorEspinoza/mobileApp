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
  emoji VARCHAR(10) DEFAULT '🎯',
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

