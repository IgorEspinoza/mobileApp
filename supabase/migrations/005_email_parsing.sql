-- MiDinero AI - Importacion de correos y clasificacion (005_email_parsing.sql)
--
-- Extiende `email_imports` y `expense_classifications` (creadas en 001) para
-- soportar:
--   * Varios metodos de conexion: IMAP (app password), OAuth o reenvio.
--   * Multiusuario mediante alias "+" (correo+ana@gmail.com).
--   * Anti-duplicados por Message-ID del correo.
--   * Deteccion de gasto / ingreso / cuota con monto y fecha.

-- ============================================================
-- 1. EMAIL_IMPORTS: metodo de conexion y estado de sincronizacion
-- ============================================================

-- 'imap' (app password), 'oauth' (Gmail API), 'forward' (reenvio a webhook)
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

-- Credencial cifrada (AES-256-GCM). Sustituye el uso en claro de access_token.
ALTER TABLE public.email_imports
  ADD COLUMN IF NOT EXISTS secret_encrypted TEXT NULL;

-- Sufijo del alias: para "igor+ana@gmail.com" guardamos 'ana'.
-- Permite atribuir cada correo reenviado al usuario correcto.
ALTER TABLE public.email_imports
  ADD COLUMN IF NOT EXISTS alias_tag VARCHAR(50) NULL;

-- Servidor IMAP (por defecto Gmail)
ALTER TABLE public.email_imports
  ADD COLUMN IF NOT EXISTS imap_host VARCHAR(255) NULL DEFAULT 'imap.gmail.com';
ALTER TABLE public.email_imports
  ADD COLUMN IF NOT EXISTS imap_port INT NULL DEFAULT 993;

-- Sincronizacion incremental: ultimo UID procesado y resultado del ultimo sync
ALTER TABLE public.email_imports
  ADD COLUMN IF NOT EXISTS last_uid BIGINT NULL;
ALTER TABLE public.email_imports
  ADD COLUMN IF NOT EXISTS last_sync_status TEXT NULL;
ALTER TABLE public.email_imports
  ADD COLUMN IF NOT EXISTS last_error TEXT NULL;

-- access_token pasa a ser opcional (IMAP y forward no lo usan)
ALTER TABLE public.email_imports
  ALTER COLUMN access_token DROP NOT NULL;

-- El alias debe ser unico por usuario propietario del buzon
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_imports_alias
  ON public.email_imports(user_id, alias_tag)
  WHERE alias_tag IS NOT NULL;

-- ============================================================
-- 2. EXPENSE_CLASSIFICATIONS: datos extraidos del correo
-- ============================================================

-- Dueño del movimiento. Con alias, puede no ser el dueño del buzon.
ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES public.users(id) ON DELETE CASCADE;

-- Identificador unico del correo (cabecera Message-ID) -> evita duplicados
ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS message_id TEXT NULL;

-- Datos extraidos por el parser
ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS amount NUMERIC(15,2) NULL;
ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS transaction_date DATE NULL;
ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NULL DEFAULT 'CLP';

-- Que tipo de movimiento se detecto
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

-- Compras en cuotas
ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS num_installments INT NULL;

-- Referencias a los registros creados al aprobar
ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS income_id UUID NULL REFERENCES public.incomes(id) ON DELETE SET NULL;
ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS installment_id UUID NULL REFERENCES public.installments(id) ON DELETE SET NULL;

-- Trazabilidad del origen
ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) NULL;   -- ej: 'banco_chile', 'mercado_pago'
ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS from_address TEXT NULL;
ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS classified_by VARCHAR(20) NULL; -- 'rules' | 'ai' | 'manual'
ALTER TABLE public.expense_classifications
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE NULL;

-- body_snippet deja de ser obligatorio (algunos correos solo traen asunto)
ALTER TABLE public.expense_classifications
  ALTER COLUMN body_snippet DROP NOT NULL;

-- Ampliar estados permitidos (aprobado / duplicado)
ALTER TABLE public.expense_classifications
  DROP CONSTRAINT IF EXISTS expense_classifications_status_check;
ALTER TABLE public.expense_classifications
  ADD CONSTRAINT expense_classifications_status_check
  CHECK (status IN ('pending', 'auto_classified', 'manual_classified', 'approved', 'rejected', 'duplicate'));

-- ANTI-DUPLICADOS: un mismo correo no puede procesarse dos veces
CREATE UNIQUE INDEX IF NOT EXISTS idx_classifications_message
  ON public.expense_classifications(email_import_id, message_id)
  WHERE message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_classifications_user_status
  ON public.expense_classifications(user_id, status);

CREATE INDEX IF NOT EXISTS idx_classifications_pending
  ON public.expense_classifications(status, created_at DESC);

-- ============================================================
-- 3. RLS para las nuevas columnas/consultas por user_id
-- ============================================================

-- Las politicas de 002 filtran por email_import_id -> email_imports.user_id.
-- Con alias, el dueño del movimiento puede ser otro usuario, asi que añadimos
-- politicas basadas en user_id directamente.

DROP POLICY IF EXISTS "Users see own classifications by user_id" ON public.expense_classifications;
CREATE POLICY "Users see own classifications by user_id" ON public.expense_classifications
  FOR SELECT USING (auth.uid()::uuid = user_id);

DROP POLICY IF EXISTS "Users update own classifications by user_id" ON public.expense_classifications;
CREATE POLICY "Users update own classifications by user_id" ON public.expense_classifications
  FOR UPDATE USING (auth.uid()::uuid = user_id);

DROP POLICY IF EXISTS "Users delete own classifications by user_id" ON public.expense_classifications;
CREATE POLICY "Users delete own classifications by user_id" ON public.expense_classifications
  FOR DELETE USING (auth.uid()::uuid = user_id);

-- ============================================================
-- 4. Backfill: asociar clasificaciones existentes a su usuario
-- ============================================================
UPDATE public.expense_classifications ec
   SET user_id = ei.user_id
  FROM public.email_imports ei
 WHERE ec.email_import_id = ei.id
   AND ec.user_id IS NULL;

