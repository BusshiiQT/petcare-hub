SET local check_function_bodies = off;

REVOKE ALL ON SCHEMA "public" FROM PUBLIC;

CREATE EXTENSION "btree_gist" SCHEMA "extensions";

CREATE TABLE "public"."bookings" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "owner_id"            uuid                     NOT NULL,
  "provider_profile_id" uuid                     NOT NULL,
  "pet_id"              uuid,
  "service_type"        text                     DEFAULT 'walk'::text,
  "start_time"          timestamp with time zone NOT NULL,
  "end_time"            timestamp with time zone NOT NULL,
  "status"              text                     DEFAULT 'pending'::text,
  "total_price"         numeric(10,2),
  "notes"               text,
  "created_at"          timestamp with time zone DEFAULT now(),
  "updated_at"          timestamp with time zone DEFAULT now(),
  CONSTRAINT "bookings_pkey" PRIMARY KEY (id),
  CONSTRAINT "bookings_service_type_check" CHECK ((service_type = ANY (ARRAY['walk'::text, 'sitting'::text, 'training'::text, 'other'::text]))),
  CONSTRAINT "bookings_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text])))
);

ALTER TABLE "public"."bookings"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."pets" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "owner_id"   uuid                     NOT NULL,
  "name"       text                     NOT NULL,
  "type"       text                     DEFAULT 'dog'::text,
  "breed"      text,
  "age"        integer,
  "notes"      text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "pets_pkey" PRIMARY KEY (id),
  CONSTRAINT "pets_type_check" CHECK ((type = ANY (ARRAY['dog'::text, 'cat'::text, 'other'::text])))
);

ALTER TABLE "public"."pets"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"         uuid                     NOT NULL,
  "full_name"  text,
  "role"       text                     DEFAULT 'owner'::text,
  "phone"      text,
  "avatar_url" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id),
  CONSTRAINT "profiles_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'provider'::text, 'both'::text])))
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."provider_availability" (
  "id"                  uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "provider_profile_id" uuid                     NOT NULL,
  "weekday"             smallint                 NOT NULL,
  "start_time"          time without time zone   NOT NULL,
  "end_time"            time without time zone   NOT NULL,
  "is_active"           boolean                  NOT NULL DEFAULT true,
  "created_at"          timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT "provider_availability_pkey" PRIMARY KEY (id),
  CONSTRAINT "provider_availability_time_check" CHECK ((end_time > start_time)),
  CONSTRAINT "provider_availability_weekday_check" CHECK (((weekday >= 0) AND (weekday <= 6)))
);

ALTER TABLE "public"."provider_availability"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."provider_profiles" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"      uuid                     NOT NULL,
  "display_name" text                     NOT NULL,
  "bio"          text,
  "city"         text,
  "state"        text,
  "country"      text,
  "services"     text[]                   DEFAULT '{}'::text[],
  "hourly_rate"  numeric(10,2),
  "is_active"    boolean                  DEFAULT true,
  "created_at"   timestamp with time zone DEFAULT now(),
  "updated_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "provider_profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."provider_profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."reviews" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "provider_profile_id" uuid                     NOT NULL,
  "owner_id"            uuid                     NOT NULL,
  "rating"              integer                  NOT NULL,
  "comment"             text,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "reviews_pkey" PRIMARY KEY (id),
  CONSTRAINT "reviews_rating_check" CHECK (((rating >= 1) AND (rating <= 5)))
);

ALTER TABLE "public"."reviews"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
BEGIN
  -- function body
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
  AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

ALTER TABLE "public"."bookings"
  ADD CONSTRAINT "bookings_no_overlap_provider_pending_confirmed" EXCLUDE USING gist (provider_profile_id WITH =, tstzrange(start_time, end_time, '[)'::text) WITH &&)
    WHERE ((status = ANY (ARRAY['pending'::text, 'confirmed'::text])));

ALTER TABLE "public"."bookings"
  ADD CONSTRAINT "bookings_pet_id_fkey" FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE SET NULL;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."bookings"
  ADD CONSTRAINT "bookings_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."pets"
  ADD CONSTRAINT "pets_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."bookings"
  ADD CONSTRAINT "bookings_provider_profile_id_fkey" FOREIGN KEY (provider_profile_id) REFERENCES public.provider_profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."provider_availability"
  ADD CONSTRAINT "provider_availability_provider_profile_id_fkey" FOREIGN KEY (provider_profile_id) REFERENCES public.provider_profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."provider_profiles"
  ADD CONSTRAINT "provider_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_provider_profile_id_fkey" FOREIGN KEY (provider_profile_id) REFERENCES public.provider_profiles(id) ON DELETE CASCADE;

CREATE INDEX idx_provider_availability_provider_weekday ON public.provider_availability USING btree (provider_profile_id, weekday);

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER set_provider_availability_updated_at
  BEFORE UPDATE ON public.provider_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Owners can insert their own bookings" ON "public"."bookings"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((owner_id = auth.uid()));

CREATE POLICY "Owners can read their own bookings" ON "public"."bookings"
  FOR SELECT
  TO PUBLIC
  USING ((owner_id = auth.uid()));

CREATE POLICY "Owners can update their own bookings" ON "public"."bookings"
  FOR UPDATE
  TO PUBLIC
  USING ((owner_id = auth.uid()))
  WITH CHECK ((owner_id = auth.uid()));

CREATE POLICY "Providers can read bookings for their profile" ON "public"."bookings"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.provider_profiles p
  WHERE ((p.id = bookings.provider_profile_id) AND (p.user_id = auth.uid())))));

CREATE POLICY "Providers can update bookings for their profile" ON "public"."bookings"
  FOR UPDATE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.provider_profiles p
  WHERE ((p.id = bookings.provider_profile_id) AND (p.user_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.provider_profiles p
  WHERE ((p.id = bookings.provider_profile_id) AND (p.user_id = auth.uid())))));

CREATE POLICY "Owners can insert their own pets" ON "public"."pets"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((owner_id = auth.uid()));

CREATE POLICY "Owners can read their own pets" ON "public"."pets"
  FOR SELECT
  TO PUBLIC
  USING ((owner_id = auth.uid()));

CREATE POLICY "Owners can update their own pets" ON "public"."pets"
  FOR UPDATE
  TO PUBLIC
  USING ((owner_id = auth.uid()))
  WITH CHECK ((owner_id = auth.uid()));

CREATE POLICY "Profiles are readable by authenticated users" ON "public"."profiles"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

CREATE POLICY "Users can insert their own profile" ON "public"."profiles"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = id));

CREATE POLICY "Users can update their own profile" ON "public"."profiles"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = id))
  WITH CHECK ((auth.uid() = id));

CREATE POLICY "auth users can read active provider availability" ON "public"."provider_availability"
  FOR SELECT
  TO "authenticated"
  USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.provider_profiles p
  WHERE ((p.id = provider_availability.provider_profile_id) AND (p.is_active = true))))));

CREATE POLICY "providers can manage own availability" ON "public"."provider_availability"
  FOR ALL
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.provider_profiles p
  WHERE ((p.id = provider_availability.provider_profile_id) AND (p.user_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.provider_profiles p
  WHERE ((p.id = provider_availability.provider_profile_id) AND (p.user_id = auth.uid())))));

CREATE POLICY "Active providers readable by authenticated users" ON "public"."provider_profiles"
  FOR SELECT
  TO PUBLIC
  USING (((auth.role() = 'authenticated'::text) AND (is_active = true)));

CREATE POLICY "Providers can read their own profile" ON "public"."provider_profiles"
  FOR SELECT
  TO PUBLIC
  USING (((auth.role() = 'authenticated'::text) AND (user_id = auth.uid())));

CREATE POLICY "Users can insert their own provider profile" ON "public"."provider_profiles"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Users can update their own provider profile" ON "public"."provider_profiles"
  FOR UPDATE
  TO PUBLIC
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Owners can insert their own reviews" ON "public"."reviews"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = owner_id));

CREATE POLICY "Owners manage their own reviews" ON "public"."reviews"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = owner_id));

CREATE POLICY "Reviews readable by authenticated users" ON "public"."reviews"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

COMMENT ON EXTENSION "btree_gist" IS 'support for indexing common datatypes in GiST';

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."bookings" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."pets" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."provider_availability" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."provider_profiles" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reviews" TO "anon", "authenticated", "postgres", "service_role";

