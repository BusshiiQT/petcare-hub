-- Run with psql -X -v ON_ERROR_STOP=1 -f. All fixtures roll back.
BEGIN;

CREATE FUNCTION pg_temp.check_true(ok boolean, description text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Failed: %', description; END IF;
END;
$$;

INSERT INTO auth.users (id) VALUES
  ('12000000-0000-0000-0000-000000000001'),
  ('12000000-0000-0000-0000-000000000002');
INSERT INTO public.pets (id, owner_id, name) VALUES
  ('22000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'Own pet'),
  ('22000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', 'Unrelated pet');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"12000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

WITH deleted AS (
  DELETE FROM public.pets WHERE id = '22000000-0000-0000-0000-000000000002' RETURNING id
)
SELECT pg_temp.check_true(count(*) = 0, 'unrelated pet cannot be deleted or returned') FROM deleted;

-- Deliberately omit the client owner filter: RLS must protect every matching row.
WITH deleted AS (
  DELETE FROM public.pets WHERE id IN (
    '22000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000002'
  ) RETURNING id
)
SELECT pg_temp.check_true(count(*) = 1 AND bool_and(id = '22000000-0000-0000-0000-000000000001'::uuid),
  'only own pet is deleted and returned') FROM deleted;

WITH deleted AS (
  DELETE FROM public.pets WHERE id = '22000000-0000-0000-0000-000000000001' RETURNING id
)
SELECT pg_temp.check_true(count(*) = 0, 'repeat deletion returns no identifier') FROM deleted;

RESET ROLE;
SELECT pg_temp.check_true(NOT EXISTS (
  SELECT 1 FROM public.pets WHERE id = '22000000-0000-0000-0000-000000000001'
), 'own pet actually removed');
SELECT pg_temp.check_true((SELECT name = 'Unrelated pet' AND owner_id = '12000000-0000-0000-0000-000000000002'::uuid
  FROM public.pets WHERE id = '22000000-0000-0000-0000-000000000002'), 'unrelated row remains unchanged');

ROLLBACK;
\echo Pet ownership checks passed; all fixtures rolled back.
