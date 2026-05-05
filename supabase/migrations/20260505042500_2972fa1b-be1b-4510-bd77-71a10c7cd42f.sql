-- 1. Seed site_settings singletons
INSERT INTO public.site_settings (key, value) VALUES
  ('indexing_enabled', 'false'::jsonb),
  ('noindex_reason',   to_jsonb('Pre-launch staging — flip at production cutover'::text)),
  ('admin_emails',     '["emoraru@5wpr.com"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Auto-grant admin trigger on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user_admin_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_list jsonb;
  email_lower text;
BEGIN
  email_lower := lower(coalesce(NEW.email, ''));
  IF email_lower = '' THEN
    RETURN NEW;
  END IF;

  SELECT value INTO admin_list FROM public.site_settings WHERE key = 'admin_emails';
  IF admin_list IS NULL OR jsonb_typeof(admin_list) <> 'array' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(admin_list) e
    WHERE lower(e) = email_lower
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_admin_grant ON auth.users;
CREATE TRIGGER on_auth_user_admin_grant
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_admin_grant();

-- 3. Bootstrap RPC: first authenticated caller becomes admin if zero admins exist
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  existing int;
BEGIN
  IF caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT count(*) INTO existing FROM public.user_roles WHERE role = 'admin';
  IF existing > 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_setup');
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (caller, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'user_id', caller);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_first_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;