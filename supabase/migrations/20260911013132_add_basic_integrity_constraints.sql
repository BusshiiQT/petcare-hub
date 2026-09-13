ALTER TABLE public.bookings
  ALTER COLUMN status SET NOT NULL,
  ADD CONSTRAINT bookings_end_time_after_start_time_check
    CHECK (end_time > start_time);

ALTER TABLE public.provider_profiles
  ALTER COLUMN is_active SET NOT NULL,
  ADD CONSTRAINT provider_profiles_hourly_rate_nonnegative_check
    CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
  ADD CONSTRAINT provider_profiles_user_id_unique
    UNIQUE (user_id);

ALTER TABLE public.pets
  ADD CONSTRAINT pets_age_nonnegative_check
    CHECK (age IS NULL OR age >= 0),
  ADD CONSTRAINT pets_name_not_blank_check
    CHECK (name ~ '[^[:space:]]');
