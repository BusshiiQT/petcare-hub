-- Creation is authorized by /api/bookings/create using the server-only client.
-- Owners have no booking update UI. Providers use the status-only RPC below.
DROP POLICY "Owners can insert their own bookings" ON public.bookings;
DROP POLICY "Owners can update their own bookings" ON public.bookings;
DROP POLICY "Providers can update bookings for their profile" ON public.bookings;

-- Keep SELECT grants and both existing SELECT policies. Also remove privileged
-- table operations (notably TRUNCATE, which does not consult row policies).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON public.bookings FROM anon, authenticated;

CREATE FUNCTION public.transition_provider_booking(
  booking_id uuid,
  expected_status text,
  next_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT COALESCE(
    (expected_status = 'pending' AND next_status IN ('confirmed', 'cancelled'))
    OR (expected_status = 'confirmed' AND next_status IN ('completed', 'cancelled')),
    false
  ) THEN
    RAISE EXCEPTION 'Invalid booking status transition' USING ERRCODE = '22023';
  END IF;

  -- One conditional UPDATE serializes competing transitions and rejects stale
  -- requests. No caller-supplied identity or other booking fields are accepted.
  UPDATE public.bookings AS b
  SET status = next_status, updated_at = now()
  WHERE b.id = booking_id
    AND b.status = expected_status
    AND EXISTS (
      SELECT 1 FROM public.provider_profiles AS p
      WHERE p.id = b.provider_profile_id AND p.user_id = auth.uid()
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking unavailable or status has changed'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.transition_provider_booking(uuid, text, text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.transition_provider_booking(uuid, text, text)
  TO authenticated;

-- Existing foreign keys, status/time checks and overlap exclusion remain the
-- integrity protection for all writes, including service-role inserts.
