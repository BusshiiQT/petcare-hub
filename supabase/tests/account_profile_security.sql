-- Run with psql -X -v ON_ERROR_STOP=1 -f; migration include is relative to this file.
BEGIN;
CREATE FUNCTION pg_temp.check_true(ok boolean, description text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Failed: %', description; END IF;
END;
$$;
CREATE FUNCTION pg_temp.expect_error(statement text, expected_state text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = expected_state THEN RETURN; END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'Expected SQLSTATE % for %', expected_state, statement;
END;
$$;

INSERT INTO auth.users (id, raw_user_meta_data) VALUES
 ('11000000-0000-0000-0000-000000000001', '{"role":"both","full_name":"  Safe Name  ","phone":"  123  "}'),
 ('11000000-0000-0000-0000-000000000002', '{"role":"provider","full_name":42,"phone":{}}'),
 ('11000000-0000-0000-0000-000000000003', '{"role":"admin","full_name":"  ","phone":false}');
SELECT pg_temp.check_true((SELECT count(*) = 3 AND bool_and(role = 'owner') FROM public.profiles
 WHERE id IN ('11000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000003')), 'exactly one owner profile per signup; metadata roles ignored');
SELECT pg_temp.check_true((SELECT full_name = 'Safe Name' AND phone = '123' FROM public.profiles
 WHERE id = '11000000-0000-0000-0000-000000000001'), 'safe strings trimmed');
SELECT pg_temp.check_true((SELECT bool_and(full_name IS NULL AND phone IS NULL) FROM public.profiles
 WHERE id IN ('11000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000003')), 'nonstring and blank metadata ignored');

-- Represent legacy missing profiles and conflicting authoritative fields, then run
-- the actual forward migration inside this rollback-only transaction.
INSERT INTO auth.users (id, raw_user_meta_data) VALUES
 ('11000000-0000-0000-0000-000000000004', '{"role":"both","full_name":" Backfilled ","phone":" 456 "}');
DELETE FROM public.profiles WHERE id = '11000000-0000-0000-0000-000000000004';
UPDATE public.profiles SET full_name = 'Authoritative Name', phone = 'Authoritative Phone'
 WHERE id = '11000000-0000-0000-0000-000000000001';
INSERT INTO public.provider_profiles (id, user_id, display_name) VALUES
 ('21000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', 'Legacy provider');
UPDATE public.profiles SET role = 'provider' WHERE id = '11000000-0000-0000-0000-000000000002';
DROP TRIGGER prevent_provider_ownership_transfer ON public.provider_profiles;
DROP TRIGGER sync_provider_account_role ON public.provider_profiles;
DROP TRIGGER set_profiles_updated_at ON public.profiles;
DROP FUNCTION public.sync_provider_account_role();
DROP FUNCTION public.get_provider_booking_owner_identity(uuid[]);
DROP POLICY "Users can read their own profile" ON public.profiles;
CREATE POLICY "Profiles are readable by authenticated users" ON public.profiles
 FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert their own profile" ON public.profiles
 FOR INSERT WITH CHECK (auth.uid() = id);
\ir ../migrations/20260914000000_harden_account_profiles.sql
SELECT pg_temp.check_true((SELECT role = 'owner' AND full_name = 'Backfilled' AND phone = '456'
 FROM public.profiles WHERE id = '11000000-0000-0000-0000-000000000004'), 'actual migration backfills missing profile safely');
SELECT pg_temp.check_true((SELECT full_name = 'Authoritative Name' AND phone = 'Authoritative Phone'
 FROM public.profiles WHERE id = '11000000-0000-0000-0000-000000000001'), 'migration preserves conflicting public values');
SELECT pg_temp.check_true((SELECT role = 'both' FROM public.profiles
 WHERE id = '11000000-0000-0000-0000-000000000002'), 'legacy provider normalized to both');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"11000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT pg_temp.check_true((SELECT count(*) = 1 FROM public.profiles), 'only own profile readable');
UPDATE public.profiles SET full_name = 'Edited Name', phone = 'Edited Phone'
 WHERE id = '11000000-0000-0000-0000-000000000001';
SELECT pg_temp.check_true((SELECT full_name = 'Edited Name' AND phone = 'Edited Phone' FROM public.profiles), 'own editable fields saved');
WITH changed AS (UPDATE public.profiles SET full_name = 'Attack'
 WHERE id = '11000000-0000-0000-0000-000000000002' RETURNING id)
SELECT pg_temp.check_true(count(*) = 0, 'cross-account update blocked') FROM changed;
SELECT pg_temp.expect_error('UPDATE public.profiles SET role = ''both''', '42501');
SELECT pg_temp.expect_error('UPDATE public.profiles SET avatar_url = ''attack''', '42501');
SELECT pg_temp.expect_error($q$INSERT INTO public.profiles(id) VALUES ('11000000-0000-0000-0000-000000000001')$q$, '42501');
SELECT pg_temp.expect_error('DELETE FROM public.profiles', '42501');
INSERT INTO public.provider_profiles (id, user_id, display_name) VALUES
 ('21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'New provider');
SELECT pg_temp.check_true((SELECT role = 'both' FROM public.profiles), 'browser onboarding synchronizes role');
UPDATE public.provider_profiles SET display_name = 'Updated provider', user_id = '11000000-0000-0000-0000-000000000001'
 WHERE id = '21000000-0000-0000-0000-000000000001';
SELECT pg_temp.check_true((SELECT display_name = 'Updated provider' FROM public.provider_profiles
 WHERE id = '21000000-0000-0000-0000-000000000001'), 'current provider update payload works');
SELECT pg_temp.expect_error($q$UPDATE public.provider_profiles SET user_id = '11000000-0000-0000-0000-000000000003'
 WHERE id = '21000000-0000-0000-0000-000000000001'$q$, '42501');
SELECT pg_temp.expect_error($q$INSERT INTO public.provider_profiles(user_id,display_name)
 VALUES ('11000000-0000-0000-0000-000000000003','Attack')$q$, '42501');
SELECT pg_temp.expect_error($q$INSERT INTO public.provider_profiles(user_id,display_name)
 VALUES ('11000000-0000-0000-0000-000000000001','Duplicate')$q$, '23505');
WITH changed AS (UPDATE public.provider_profiles SET display_name = 'Attack'
 WHERE id = '21000000-0000-0000-0000-000000000002' RETURNING id)
SELECT pg_temp.check_true(count(*) = 0, 'other provider cannot be edited') FROM changed;
SELECT pg_temp.expect_error('DELETE FROM public.provider_profiles', '42501');
RESET ROLE;
UPDATE public.profiles SET full_name = 'Booking Owner', phone = 'Private phone'
 WHERE id = '11000000-0000-0000-0000-000000000003';
INSERT INTO public.bookings(id, owner_id, provider_profile_id, start_time, end_time) VALUES
 ('31000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000003',
 '21000000-0000-0000-0000-000000000001','2020-01-01 10:00Z','2020-01-01 11:00Z');
SET LOCAL ROLE authenticated;
SELECT pg_temp.check_true((SELECT count(*) = 1 AND bool_and(full_name = 'Booking Owner'
 AND owner_id = '11000000-0000-0000-0000-000000000003')
 FROM public.get_provider_booking_owner_identity(ARRAY['31000000-0000-0000-0000-000000000001'::uuid])), 'provider gets actual booking owner name');
SELECT pg_temp.check_true((SELECT array_agg(k ORDER BY k) = ARRAY['booking_id','full_name','owner_id']
 FROM public.get_provider_booking_owner_identity(ARRAY['31000000-0000-0000-0000-000000000001'::uuid]) r,
 LATERAL jsonb_object_keys(to_jsonb(r)) k), 'RPC exposes only booking ID, owner ID, name');
SELECT set_config('request.jwt.claims', '{"sub":"11000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT pg_temp.check_true((SELECT count(*) = 0 FROM public.get_provider_booking_owner_identity(
 ARRAY['31000000-0000-0000-0000-000000000001'::uuid])), 'unrelated provider gets no identity');
SELECT set_config('request.jwt.claims', '{"sub":"11000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT pg_temp.check_true((SELECT count(*) = 0 FROM public.get_provider_booking_owner_identity(
 ARRAY['31000000-0000-0000-0000-000000000001'::uuid])), 'booking owner cannot use provider RPC');
SELECT set_config('request.jwt.claims', '{}', true);
SELECT pg_temp.expect_error('SELECT public.get_provider_booking_owner_identity(ARRAY[]::uuid[])', '42501');
SET LOCAL ROLE anon;
SELECT pg_temp.expect_error('SELECT * FROM public.profiles', '42501');
SELECT pg_temp.expect_error('SELECT * FROM public.provider_profiles', '42501');
SELECT pg_temp.expect_error('SELECT public.get_provider_booking_owner_identity(ARRAY[]::uuid[])', '42501');
RESET ROLE;
SELECT pg_temp.check_true(NOT EXISTS (
 SELECT 1 FROM unnest(ARRAY['profiles','provider_profiles']) t(table_name)
 CROSS JOIN unnest(ARRAY['DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege_name)
 WHERE has_table_privilege('authenticated', 'public.' || t.table_name, p.privilege_name)
), 'unused authenticated privileges revoked');
SELECT pg_temp.check_true(NOT EXISTS (
 SELECT 1 FROM unnest(ARRAY['profiles','provider_profiles']) t(table_name)
 CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) p(privilege_name)
 WHERE has_table_privilege('anon', 'public.' || t.table_name, p.privilege_name)
), 'all anon table privileges revoked');
SELECT pg_temp.check_true(NOT has_table_privilege('authenticated','public.profiles','INSERT')
 AND NOT has_table_privilege('authenticated','public.profiles','UPDATE')
 AND has_column_privilege('authenticated','public.profiles','full_name','UPDATE')
 AND has_column_privilege('authenticated','public.profiles','phone','UPDATE')
 AND NOT has_column_privilege('authenticated','public.profiles','role','UPDATE'), 'profile updates are column limited');
SELECT pg_temp.check_true(NOT has_function_privilege('service_role','public.get_provider_booking_owner_identity(uuid[])','EXECUTE')
 AND NOT has_function_privilege('anon','public.get_provider_booking_owner_identity(uuid[])','EXECUTE'), 'RPC execution restricted');
DELETE FROM public.provider_profiles WHERE id = '21000000-0000-0000-0000-000000000002';
SELECT pg_temp.check_true((SELECT role = 'owner' FROM public.profiles
 WHERE id = '11000000-0000-0000-0000-000000000002'), 'database deletion restores owner role');
ROLLBACK;
\echo Account profile security checks passed; all fixtures and migration replay rolled back.
