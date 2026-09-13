CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, phone)
  VALUES (
    NEW.id, 'owner',
    CASE WHEN jsonb_typeof(NEW.raw_user_meta_data -> 'full_name') = 'string'
      THEN NULLIF(btrim(NEW.raw_user_meta_data ->> 'full_name'), '') END,
    CASE WHEN jsonb_typeof(NEW.raw_user_meta_data -> 'phone') = 'string'
      THEN NULLIF(btrim(NEW.raw_user_meta_data ->> 'phone'), '') END
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated, service_role;

-- Existing public profile fields are authoritative, even when metadata differs.
-- Only missing rows are provisioned; no existing name or phone is updated.
INSERT INTO public.profiles (id, role, full_name, phone)
SELECT u.id,
  CASE WHEN EXISTS (SELECT 1 FROM public.provider_profiles pp WHERE pp.user_id = u.id)
    THEN 'both' ELSE 'owner' END,
  CASE WHEN jsonb_typeof(u.raw_user_meta_data -> 'full_name') = 'string'
    THEN NULLIF(btrim(u.raw_user_meta_data ->> 'full_name'), '') END,
  CASE WHEN jsonb_typeof(u.raw_user_meta_data -> 'phone') = 'string'
    THEN NULLIF(btrim(u.raw_user_meta_data ->> 'phone'), '') END
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles p
SET role = CASE WHEN EXISTS (
  SELECT 1 FROM public.provider_profiles pp WHERE pp.user_id = p.id
) THEN 'both' ELSE 'owner' END;

ALTER TABLE public.profiles ALTER COLUMN role SET NOT NULL;

CREATE FUNCTION public.sync_provider_account_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Provider ownership cannot be transferred' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET role = 'owner' WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  UPDATE public.profiles SET role = 'both' WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_provider_account_role() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER prevent_provider_ownership_transfer
  BEFORE UPDATE OF user_id ON public.provider_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_provider_account_role();
CREATE TRIGGER sync_provider_account_role
  AFTER INSERT OR DELETE ON public.provider_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_provider_account_role();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY "Profiles are readable by authenticated users" ON public.profiles;
DROP POLICY "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can read their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));

REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name, phone) ON public.profiles TO authenticated;

REVOKE ALL ON public.provider_profiles FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.provider_profiles TO authenticated;

CREATE FUNCTION public.get_provider_booking_owner_identity(booking_ids uuid[])
RETURNS TABLE (booking_id uuid, owner_id uuid, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  -- Empty names retain the page's existing "Unknown owner" fallback and match
  -- the non-null text return shape emitted by the Supabase type generator.
  SELECT b.id, b.owner_id, COALESCE(p.full_name, '')
  FROM public.bookings b
  JOIN public.provider_profiles pp ON pp.id = b.provider_profile_id
  JOIN public.profiles p ON p.id = b.owner_id
  WHERE pp.user_id = auth.uid() AND b.id = ANY(booking_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.get_provider_booking_owner_identity(uuid[])
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_provider_booking_owner_identity(uuid[]) TO authenticated;
