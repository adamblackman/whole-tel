-- supabase/migrations/20260302000001_schema_rls.sql
-- Phase 1: Foundation — complete schema, RLS policies, and storage bucket

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email        text NOT NULL,
  display_name text,
  role         text NOT NULL DEFAULT 'guest' CHECK (role IN ('guest', 'owner')),
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are publicly readable"
  ON profiles FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'guest')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- PROPERTIES
-- ============================================================
CREATE TABLE properties (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name           text NOT NULL,
  description    text,
  location       text NOT NULL,
  address        text,
  bedrooms       int NOT NULL CHECK (bedrooms > 0),
  bathrooms      int NOT NULL CHECK (bathrooms > 0),
  max_guests     int NOT NULL CHECK (max_guests > 0),
  nightly_rate   numeric(10,2) NOT NULL CHECK (nightly_rate > 0),
  cleaning_fee   numeric(10,2) NOT NULL DEFAULT 0 CHECK (cleaning_fee >= 0),
  amenities      jsonb NOT NULL DEFAULT '[]',
  house_rules    text,
  check_in_time  text NOT NULL DEFAULT '3:00 PM',
  check_out_time text NOT NULL DEFAULT '11:00 AM',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Properties are publicly readable"
  ON properties FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Owners can insert their properties"
  ON properties FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = owner_id);

CREATE POLICY "Owners can update their properties"
  ON properties FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = owner_id)
  WITH CHECK ((SELECT auth.uid()) = owner_id);

CREATE POLICY "Owners can delete their properties"
  ON properties FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

-- ============================================================
-- PROPERTY_PHOTOS
-- ============================================================
CREATE TABLE property_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  storage_path  text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE property_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property photos are publicly readable"
  ON property_photos FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Owners can insert photos for their properties"
  ON property_photos FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_photos.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Owners can update photos for their properties"
  ON property_photos FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_photos.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Owners can delete photos for their properties"
  ON property_photos FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_photos.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- ADD_ONS
-- ============================================================
CREATE TABLE add_ons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text,
  price        numeric(10,2) NOT NULL CHECK (price >= 0),
  pricing_unit text NOT NULL CHECK (pricing_unit IN ('per_person', 'per_booking')),
  max_quantity int CHECK (max_quantity > 0),
  photo_url    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE add_ons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Add-ons are publicly readable"
  ON add_ons FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Owners can insert add-ons for their properties"
  ON add_ons FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = add_ons.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Owners can update add-ons for their properties"
  ON add_ons FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = add_ons.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = add_ons.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Owners can delete add-ons for their properties"
  ON add_ons FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = add_ons.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE bookings (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id              uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  guest_id                 uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  check_in                 date NOT NULL,
  check_out                date NOT NULL,
  guest_count              int NOT NULL CHECK (guest_count > 0),
  subtotal                 numeric(10,2) NOT NULL CHECK (subtotal >= 0),
  add_ons_total            numeric(10,2) NOT NULL DEFAULT 0 CHECK (add_ons_total >= 0),
  processing_fee           numeric(10,2) NOT NULL DEFAULT 0 CHECK (processing_fee >= 0),
  total                    numeric(10,2) NOT NULL CHECK (total >= 0),
  status                   text NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  stripe_session_id        text,
  stripe_payment_intent_id text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT check_dates CHECK (check_out > check_in),

  -- Race-condition-proof double-booking prevention.
  -- btree_gist extension (above) enables mixing UUID (B-tree) with daterange (GiST).
  -- '[)' = inclusive start, exclusive end — allows back-to-back bookings.
  -- Partial constraint: pending/cancelled bookings do NOT block dates.
  CONSTRAINT no_overlapping_confirmed_bookings
    EXCLUDE USING GIST (
      property_id WITH =,
      daterange(check_in, check_out, '[)') WITH &&
    )
    WHERE (status = 'confirmed')
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guests can view their own bookings"
  ON bookings FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = guest_id);

CREATE POLICY "Owners can view bookings for their properties"
  ON bookings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = bookings.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Guests can insert their own bookings"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = guest_id);

-- No guest UPDATE policy — status changes happen only via service_role (Stripe webhook, Phase 6)

-- ============================================================
-- BOOKING_ADD_ONS
-- ============================================================
CREATE TABLE booking_add_ons (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  add_on_id   uuid NOT NULL REFERENCES add_ons(id) ON DELETE RESTRICT,
  quantity    int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price  numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price numeric(10,2) NOT NULL CHECK (total_price >= 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE booking_add_ons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view booking add-ons for their own bookings"
  ON booking_add_ons FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_add_ons.booking_id
        AND bookings.guest_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Owners can view booking add-ons for their property bookings"
  ON booking_add_ons FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN properties ON properties.id = bookings.property_id
      WHERE bookings.id = booking_add_ons.booking_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can insert booking add-ons for their own bookings"
  ON booking_add_ons FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_add_ons.booking_id
        AND bookings.guest_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- STORAGE: property-photos bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Property photos are publicly readable"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'property-photos');

CREATE POLICY "Authenticated users can upload property photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'property-photos');

CREATE POLICY "Authenticated users can delete property photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'property-photos');
