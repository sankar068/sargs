DROP VIEW IF EXISTS public.v_users_admin;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_primary_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_create_role(uuid, app_role) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_primary_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_role(uuid, app_role) TO authenticated;