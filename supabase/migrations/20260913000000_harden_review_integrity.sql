-- Preserve unlinked legacy reviews; only the RPC creates new application reviews.
ALTER TABLE public.reviews
  ADD COLUMN booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  ADD CONSTRAINT reviews_booking_id_key UNIQUE (booking_id);

DROP POLICY "Owners can insert their own reviews" ON public.reviews;
DROP POLICY "Owners manage their own reviews" ON public.reviews;

-- There are no service-role review writers. Keep existing SELECT access and policy.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON public.reviews FROM anon, authenticated, service_role;

CREATE FUNCTION public.create_review_for_booking(
  booking_id uuid,
  rating integer,
  comment text
)
RETURNS SETOF public.reviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  completed_booking public.bookings%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF rating IS NULL OR rating < 1 OR rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5' USING ERRCODE = '22023';
  END IF;

  SELECT b.* INTO completed_booking
  FROM public.bookings AS b
  WHERE b.id = create_review_for_booking.booking_id
    AND b.owner_id = auth.uid()
    AND b.status = 'completed'
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Completed booking unavailable' USING ERRCODE = '42501';
  END IF;

  -- The row lock keeps eligibility stable; uniqueness arbitrates duplicate calls.
  RETURN QUERY
  INSERT INTO public.reviews AS r (booking_id, owner_id, provider_profile_id, rating, comment)
  VALUES (completed_booking.id, completed_booking.owner_id,
          completed_booking.provider_profile_id,
          create_review_for_booking.rating, NULLIF(create_review_for_booking.comment, ''))
  RETURNING r.*;
END;
$$;

REVOKE ALL ON FUNCTION public.create_review_for_booking(uuid, integer, text)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_review_for_booking(uuid, integer, text)
  TO authenticated;
