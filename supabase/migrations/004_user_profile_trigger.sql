-- MiDinero AI - Auto-creacion de perfil de usuario (004_user_profile_trigger.sql)
--
-- Problema que resuelve:
-- El perfil en public.users se insertaba desde /api/auth/register usando el
-- cliente con sesion del usuario. Cuando Supabase exige confirmacion de email,
-- en ese momento todavia NO hay sesion, por lo que la politica RLS
-- ("Enable insert for new users" -> auth.uid() = id) rechaza el INSERT y el
-- usuario queda autenticado pero sin perfil (la UI muestra "Sin email").
--
-- Solucion: un trigger SECURITY DEFINER sobre auth.users que crea el perfil
-- automaticamente, sin depender de RLS ni de la sesion.

-- 1. Funcion que crea el perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, currency, timezone, dark_mode)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
      split_part(COALESCE(NEW.email, 'usuario@local'), '@', 1)
    ),
    'CLP',
    'America/Santiago',
    false
  )
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        full_name  = COALESCE(NULLIF(public.users.full_name, ''), EXCLUDED.full_name),
        updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Nunca bloquear el alta en auth.users por un fallo al crear el perfil.
    RAISE WARNING 'handle_new_user fallo para %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 2. Trigger al crear el usuario en auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Mantener el email sincronizado si el usuario lo cambia
CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.users
       SET email = NEW.email, updated_at = NOW()
     WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_email_update();

-- 4. Backfill: crear el perfil de los usuarios que ya existen en auth
--    pero que no tienen fila en public.users (tu caso actual).
INSERT INTO public.users (id, email, full_name, currency, timezone, dark_mode)
SELECT
  au.id,
  au.email,
  COALESCE(
    NULLIF(au.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(au.raw_user_meta_data ->> 'name', ''),
    split_part(au.email, '@', 1)
  ),
  'CLP',
  'America/Santiago',
  false
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
  AND au.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 5. Reparar perfiles existentes cuyo email quedo vacio o desincronizado
UPDATE public.users pu
   SET email = au.email, updated_at = NOW()
  FROM auth.users au
 WHERE pu.id = au.id
   AND au.email IS NOT NULL
   AND pu.email IS DISTINCT FROM au.email;

