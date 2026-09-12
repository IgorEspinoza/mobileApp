-- ============================================================
-- APLICAR ESTO EN SUPABASE -> SQL Editor -> New query -> Run
-- ============================================================
--
-- Script consolidado e IDEMPOTENTE: puedes ejecutarlo varias veces
-- sin romper nada. Agrega las columnas que la sincronizacion de
-- correos necesita para guardar monto, fecha y tipo de movimiento.
--
-- Sin esto, los correos se guardan pero SIN monto, y no se pueden
-- aprobar en bloque ni reflejar en el Dashboard.
--
-- Al final imprime una verificacion para confirmar que quedo OK.
-- ============================================================


-- ------------------------------------------------------------
-- 1. EMAIL_IMPORTS: metodo de conexion y estado de sync
-- ------------------------------------------------------------

ALTER TABLE public.email_imports
  ADD COLUMN IF NOT EXISTS auth_type VARCHAR(20) NOT NULL DEFAULT 'imap';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_imports_auth_type_check'
  ) THEN
    ALTER TABLE public.email_imports
      ADD CONSTRAINT email_imports_auth_type_check
      CHECK (auth_type IN ('imap', 'oauth', 'forward'));
  END IF;
END $$;

ALTER TABLE public.email_imports
  ADD COLUMN IF NOT EXISTS secret_encrypted TEXT NULL;

ALTER TABLE public.email_imports
  ADD COLUMN IF NOT EXISTS alias_tag VARCHAR(50) NULL;

ALTER TABLE public.email_imports
  ADD COLUMN IF NOT EXISTS imap_host VARCHAR(255) NULL DEFAULT 'imap.gmail.com';

ALTER TABLE public.email_imports
  ADD COLUMN IF NOT EXISTS imap_port INT NULL DEFAULT 993;

ALTER TABLE public.email_imports
  ADD COLUMN IF NOT EXISTS last_uid BIGINT NULL;

ALTER TABLE public.email_imports
  ADD COLUMN IF NOT EXISTS last_sync_status TEXT NULL;

ALTER TABLE public.email_imports
  ADD COLUMN IF NOT EXISTS last_error TEXT NULL;

ALTER TABLE public.email_imports
  ALTER COLUMN access_token DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_imports_alias
  ON public.email_imports(user_id, alias_tag)
  WHERE alias_tag IS NOT NULL;


-- ------------------------------------------------------------
-- 2. EXPENSE_CLASSIFICATIONS: datos extraidos del correo
--    (ESTAS son las columnas criticas que faltaban)
-- ------------------------------------------------------------

ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS message_id TEXT NULL;

ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS amount NUMERIC(15,2) NULL;

ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS transaction_date DATE NULL;

ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NULL DEFAULT 'CLP';

ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS detected_type VARCHAR(20) NOT NULL DEFAULT 'expense';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expense_classifications_detected_type_check'
  ) THEN
    ALTER TABLE public.expense_classifications
      ADD CONSTRAINT expense_classifications_detected_type_check
      CHECK (detected_type IN ('expense', 'income', 'installment'));
  END IF;
END $$;

ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS num_installments INT NULL;

ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS income_id UUID NULL REFERENCES public.incomes(id) ON DELETE SET NULL;

ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS installment_id UUID NULL REFERENCES public.installments(id) ON DELETE SET NULL;

ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) NULL;

ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS from_address TEXT NULL;

ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS classified_by VARCHAR(20) NULL;

ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE NULL;

ALTER TABLE public.expense_classifications
  ALTER COLUMN body_snippet DROP NOT NULL;

-- Estados permitidos (incluye approved y duplicate)
ALTER TABLE public.expense_classifications
  DROP CONSTRAINT IF EXISTS expense_classifications_status_check;
ALTER TABLE public.expense_classifications
  ADD CONSTRAINT expense_classifications_status_check
  CHECK (status IN ('pending', 'auto_classified', 'manual_classified', 'approved', 'rejected', 'duplicate'));

-- Anti-duplicados por Message-ID del correo
CREATE UNIQUE INDEX IF NOT EXISTS idx_classifications_message
  ON public.expense_classifications(email_import_id, message_id)
  WHERE message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_classifications_user_status
  ON public.expense_classifications(user_id, status);

CREATE INDEX IF NOT EXISTS idx_classifications_pending
  ON public.expense_classifications(status, created_at DESC);


-- ------------------------------------------------------------
-- 3. RLS por user_id
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Users see own classifications by user_id" ON public.expense_classifications;
CREATE POLICY "Users see own classifications by user_id" ON public.expense_classifications
  FOR SELECT USING (auth.uid()::uuid = user_id);

DROP POLICY IF EXISTS "Users update own classifications by user_id" ON public.expense_classifications;
CREATE POLICY "Users update own classifications by user_id" ON public.expense_classifications
  FOR UPDATE USING (auth.uid()::uuid = user_id);

DROP POLICY IF EXISTS "Users delete own classifications by user_id" ON public.expense_classifications;
CREATE POLICY "Users delete own classifications by user_id" ON public.expense_classifications
  FOR DELETE USING (auth.uid()::uuid = user_id);


-- ------------------------------------------------------------
-- 4. Backfill: asociar clasificaciones existentes a su usuario
-- ------------------------------------------------------------

UPDATE public.expense_classifications ec
   SET user_id = ei.user_id
  FROM public.email_imports ei
 WHERE ec.email_import_id = ei.id
   AND ec.user_id IS NULL;


-- ============================================================
-- 5. VERIFICACION
--    Debe devolver 9 filas. Si ves menos, algo fallo arriba.
-- ============================================================

SELECT
  column_name    AS "Columna",
  data_type      AS "Tipo",
  'OK'           AS "Estado"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'expense_classifications'
  AND column_name IN (
    'user_id',
    'message_id',
    'amount',
    'currency',
    'transaction_date',
    'detected_type',
    'num_installments',
    'source',
    'from_address'
  )
ORDER BY column_name;

