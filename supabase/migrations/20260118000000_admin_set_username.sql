-- ═══════════════════════════════════════════════════════════════════
-- Migration 20260118 : changer l'identifiant admin sans service_role
-- ═══════════════════════════════════════════════════════════════════
-- L'admin se connecte par identifiant → email synthétique <username>@admin.yelha.net.
-- Cette fonction SECURITY DEFINER permet à l'admin connecté de changer son
-- identifiant (met à jour auth.users.email + auth.identities + profiles.username)
-- depuis /admin/parametres, sans dépendre du service_role_key côté app.

CREATE OR REPLACE FUNCTION public.admin_set_username(p_new_username text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_username text := lower(trim(p_new_username));
  v_new_email text;
BEGIN
  IF v_uid IS NULL OR NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  IF v_username !~ '^[a-z0-9_]{3,32}$' THEN
    RAISE EXCEPTION 'Identifiant invalide';
  END IF;

  v_new_email := v_username || '@admin.yelha.net';

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username AND id <> v_uid) THEN
    RAISE EXCEPTION 'Identifiant déjà utilisé';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_new_email AND id <> v_uid) THEN
    RAISE EXCEPTION 'Identifiant déjà utilisé';
  END IF;

  UPDATE auth.users
     SET email = v_new_email, updated_at = now()
   WHERE id = v_uid;

  UPDATE auth.identities
     SET identity_data = jsonb_set(coalesce(identity_data, '{}'::jsonb), '{email}', to_jsonb(v_new_email)),
         updated_at = now()
   WHERE user_id = v_uid AND provider = 'email';

  UPDATE public.profiles
     SET username = v_username
   WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_username(text) TO authenticated;
