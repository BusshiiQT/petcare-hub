-- Run through local psql with ON_ERROR_STOP=1. All fixtures roll back.
BEGIN;

CREATE FUNCTION pg_temp.expect_error(statement text, expected_state text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = expected_state THEN RETURN; END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'Expected SQLSTATE % for %', expected_state, statement;
END;
$$;

CREATE FUNCTION pg_temp.check_true(ok boolean, description text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Failed: %', description; END IF;
END;
$$;

INSERT INTO auth.users (id) VALUES
  ('10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000003');
INSERT INTO public.profiles (id, role) VALUES
  ('10000000-0000-0000-0000-000000000001', 'owner'),
  ('10000000-0000-0000-0000-000000000002', 'owner'),
  ('10000000-0000-0000-0000-000000000003', 'provider');
INSERT INTO public.provider_profiles (id, user_id, display_name) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Review test provider');
INSERT INTO public.bookings (id, owner_id, provider_profile_id, status, start_time, end_time)
SELECT ('30000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  CASE WHEN n = 6 THEN '10000000-0000-0000-0000-000000000002'::uuid
       ELSE '10000000-0000-0000-0000-000000000001'::uuid END,
  '20000000-0000-0000-0000-000000000001'::uuid,
  CASE n WHEN 3 THEN 'pending' WHEN 4 THEN 'confirmed' WHEN 5 THEN 'cancelled' ELSE 'completed' END,
  '2020-01-01'::timestamptz + n * interval '1 day',
  '2020-01-01'::timestamptz + n * interval '1 day' + interval '1 hour'
FROM generate_series(1, 6) AS n;

-- Multiple legacy NULL links are valid and remain readable.
INSERT INTO public.reviews (owner_id, provider_profile_id, rating)
SELECT '10000000-0000-0000-0000-000000000001'::uuid,
  '20000000-0000-0000-0000-000000000001'::uuid, 4 FROM generate_series(1, 2);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT pg_temp.check_true((SELECT count(*) = 1 FROM public.create_review_for_booking(
  '30000000-0000-0000-0000-000000000001', 5, NULL)), 'own completed booking succeeds');
SELECT pg_temp.check_true((SELECT count(*) = 1 FROM public.create_review_for_booking(
  '30000000-0000-0000-0000-000000000002', 4, '')), 'second service with same provider succeeds');
SELECT pg_temp.check_true((SELECT comment IS NULL FROM public.reviews
  WHERE booking_id = '30000000-0000-0000-0000-000000000002'), 'blank comment stored as NULL');
SELECT pg_temp.expect_error($q$SELECT public.create_review_for_booking('30000000-0000-0000-0000-000000000001', 5, NULL)$q$, '23505');
SELECT pg_temp.expect_error($q$SELECT public.create_review_for_booking('30000000-0000-0000-0000-000000000003', 5, NULL)$q$, '42501');
SELECT pg_temp.expect_error($q$SELECT public.create_review_for_booking('30000000-0000-0000-0000-000000000004', 5, NULL)$q$, '42501');
SELECT pg_temp.expect_error($q$SELECT public.create_review_for_booking('30000000-0000-0000-0000-000000000005', 5, NULL)$q$, '42501');
SELECT pg_temp.expect_error($q$SELECT public.create_review_for_booking('30000000-0000-0000-0000-000000000006', 5, NULL)$q$, '42501');
SELECT pg_temp.expect_error($q$SELECT public.create_review_for_booking('30000000-0000-0000-0000-000000000099', 5, NULL)$q$, '42501');
SELECT pg_temp.expect_error($q$SELECT public.create_review_for_booking('30000000-0000-0000-0000-000000000001', 0, NULL)$q$, '22023');
SELECT pg_temp.expect_error($q$SELECT public.create_review_for_booking('30000000-0000-0000-0000-000000000001', 6, NULL)$q$, '22023');
SELECT pg_temp.expect_error($q$SELECT public.create_review_for_booking('30000000-0000-0000-0000-000000000001', NULL, NULL)$q$, '22023');
SELECT pg_temp.expect_error($q$INSERT INTO public.reviews(owner_id, provider_profile_id, rating) VALUES ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',5)$q$, '42501');
SELECT pg_temp.expect_error('UPDATE public.reviews SET rating = 1', '42501');
SELECT pg_temp.expect_error('DELETE FROM public.reviews', '42501');
SELECT pg_temp.expect_error('TRUNCATE public.reviews', '42501');
SELECT pg_temp.check_true((SELECT count(*) = 2 FROM public.reviews WHERE booking_id IS NULL
  AND provider_profile_id = '20000000-0000-0000-0000-000000000001'), 'legacy reviews still readable');
SELECT pg_temp.check_true((SELECT count(*) = 2 FROM public.reviews r JOIN public.bookings b ON b.id = r.booking_id
  WHERE r.owner_id = b.owner_id AND r.provider_profile_id = b.provider_profile_id
    AND b.provider_profile_id = '20000000-0000-0000-0000-000000000001'), 'identities derived from booking');

-- Exercise the internal authentication check as well as anonymous EXECUTE denial.
SELECT set_config('request.jwt.claims', '{}', true);
SELECT pg_temp.expect_error($q$SELECT public.create_review_for_booking('30000000-0000-0000-0000-000000000001', 5, NULL)$q$, '42501');
SET LOCAL ROLE anon;
SELECT pg_temp.expect_error($q$SELECT public.create_review_for_booking('30000000-0000-0000-0000-000000000001', 5, NULL)$q$, '42501');
RESET ROLE;
SELECT pg_temp.check_true(NOT EXISTS (
  SELECT 1 FROM unnest(ARRAY['anon','authenticated','service_role']) AS r(role_name)
  CROSS JOIN unnest(ARRAY['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) AS p(privilege_name)
  WHERE has_table_privilege(r.role_name, 'public.reviews', p.privilege_name)
), 'unnecessary table privileges revoked');
SELECT pg_temp.check_true(NOT has_function_privilege('anon', 'public.create_review_for_booking(uuid,integer,text)', 'EXECUTE')
  AND NOT has_function_privilege('service_role', 'public.create_review_for_booking(uuid,integer,text)', 'EXECUTE'), 'RPC execution restricted');

ROLLBACK;
\echo Review integrity checks passed; all fixtures rolled back.
