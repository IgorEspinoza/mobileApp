-- DIAGNOSTICO: estado de los perfiles de usuario
-- Ejecutar en Supabase -> SQL Editor. Devuelve 3 bloques de informacion.

-- 1) Comparar auth.users contra public.users
SELECT
  au.id,
  au.email                                   AS auth_email,
  au.raw_user_meta_data ->> 'full_name'      AS metadata_full_name,
  au.email_confirmed_at IS NOT NULL          AS email_confirmado,
  (pu.id IS NOT NULL)                        AS tiene_perfil,
  pu.email                                   AS perfil_email,
  pu.full_name                               AS perfil_nombre
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
ORDER BY au.created_at DESC;

-- 2) Verificar que el trigger quedo instalado
SELECT tgname AS trigger_name, tgenabled AS habilitado
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
  AND NOT tgisinternal;

-- 3) Verificar las politicas RLS de public.users
SELECT policyname, cmd, qual::text AS condicion
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users';

