-- Add timezone column to properties
ALTER TABLE properties ADD COLUMN timezone text NOT NULL DEFAULT 'America/New_York';

-- Create property_activities table
CREATE TABLE property_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_min int NOT NULL CHECK (duration_min > 0),
  available_slots jsonb NOT NULL DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create itinerary_events table
CREATE TABLE itinerary_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES property_activities(id) ON DELETE SET NULL,
  title text NOT NULL,
  event_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_event_times CHECK (end_time > start_time)
);

-- Indexes
CREATE INDEX idx_property_activities_property ON property_activities(property_id);
CREATE INDEX idx_itinerary_events_booking ON itinerary_events(booking_id);

-- RLS for property_activities
ALTER TABLE property_activities ENABLE ROW LEVEL SECURITY;

-- Public read (anon + authenticated)
CREATE POLICY "property_activities_public_read"
  ON property_activities
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Owner write (ALL) — uses EXISTS subquery matching property_amenities RLS pattern
CREATE POLICY "property_activities_owner_all"
  ON property_activities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_activities.property_id
        AND properties.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_activities.property_id
        AND properties.owner_id = auth.uid()
    )
  );

-- RLS for itinerary_events
ALTER TABLE itinerary_events ENABLE ROW LEVEL SECURITY;

-- Guest ALL — can read and write their own booking's events
CREATE POLICY "itinerary_events_guest_all"
  ON itinerary_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = itinerary_events.booking_id
        AND bookings.guest_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = itinerary_events.booking_id
        AND bookings.guest_id = auth.uid()
    )
  );

-- Owner SELECT — can read events for bookings on their properties
CREATE POLICY "itinerary_events_owner_select"
  ON itinerary_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN properties ON properties.id = bookings.property_id
      WHERE bookings.id = itinerary_events.booking_id
        AND properties.owner_id = auth.uid()
    )
  );
