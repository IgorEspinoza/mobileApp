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

