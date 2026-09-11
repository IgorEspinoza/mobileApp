-- DIAGNOSTICO v2: todo en UNA sola consulta
-- (el SQL Editor de Supabase solo muestra el resultado de la ultima sentencia)

SELECT
  '1-USUARIO'::text                                          AS bloque,
  au.email::text                                             AS dato_1,
  CASE WHEN pu.id IS NULL THEN 'SIN PERFIL EN public.users'
       ELSE 'perfil ok' END::text                            AS dato_2,
  COALESCE(pu.full_name, '-')::text                          AS dato_3,
  COALESCE(pu.email, '-')::text                              AS dato_4
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id

UNION ALL

SELECT
  '2-TRIGGER'::text,
  tgname::text,
  CASE tgenabled WHEN 'O' THEN 'habilitado' ELSE tgenabled::text END,
  '-'::text,
  '-'::text
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
  AND NOT tgisinternal

UNION ALL

SELECT
  '3-FUNCION'::text,
  proname::text,
  CASE WHEN prosecdef THEN 'SECURITY DEFINER ok' ELSE 'SIN security definer' END,
  '-'::text,
  '-'::text
FROM pg_proc
WHERE proname IN ('handle_new_user', 'handle_user_email_update')

ORDER BY 1, 2;

