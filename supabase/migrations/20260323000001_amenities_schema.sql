-- Amenities catalog table
CREATE TABLE amenities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  category      text NOT NULL CHECK (category IN ('Water', 'Social', 'Work/Event', 'Culinary', 'Wellness')),
  icon_name     text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Property-amenity join table
CREATE TABLE property_amenities (
  property_id   uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  amenity_id    uuid NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, amenity_id)
);

-- RLS: amenities catalog (public read, no write)
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Amenities are publicly readable"
  ON amenities FOR SELECT
  TO anon, authenticated
  USING (true);

-- RLS: property_amenities (public read, owner-scoped write)
ALTER TABLE property_amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property amenities are publicly readable"
  ON property_amenities FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Property owner can manage their amenities"
  ON property_amenities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

-- Hotel tax rate column on properties
-- numeric(5,4): values like 0.1200 (12%), max 9.9999. Nullable = no tax.
ALTER TABLE properties ADD COLUMN tax_rate numeric(5,4);

-- Seed: 30 amenities across 5 categories with Lucide icon names

-- Water (7)
INSERT INTO amenities (name, category, icon_name, display_order) VALUES
  ('Private Pool',        'Water', 'Waves',       10),
  ('Infinity Pool',       'Water', 'Waves',        20),
  ('Hot Tub',             'Water', 'Thermometer',  30),
  ('Private Beach',       'Water', 'Sunset',       40),
  ('Boat Dock',           'Water', 'Anchor',       50),
  ('Water Sports Gear',   'Water', 'Wind',         60),
  ('Jacuzzi',             'Water', 'Droplets',     70);

-- Social (7)
INSERT INTO amenities (name, category, icon_name, display_order) VALUES
  ('Rooftop Terrace',     'Social', 'Building2',   10),
  ('Game Room',           'Social', 'Gamepad2',    20),
  ('Home Theater',        'Social', 'Tv',          30),
  ('DJ Booth',            'Social', 'Music',       40),
  ('Outdoor Bar',         'Social', 'Wine',        50),
  ('Fire Pit',            'Social', 'Flame',       60),
  ('Ping Pong Table',     'Social', 'Circle',      70);

-- Work/Event (5)
INSERT INTO amenities (name, category, icon_name, display_order) VALUES
  ('High-Speed WiFi',     'Work/Event', 'Wifi',          10),
  ('Dedicated Office',    'Work/Event', 'Monitor',       20),
  ('Conference Room',     'Work/Event', 'Users',         30),
  ('Projector & Screen',  'Work/Event', 'Presentation2', 40),
  ('Catering Kitchen',    'Work/Event', 'UtensilsCrossed', 50);

-- Culinary (6)
INSERT INTO amenities (name, category, icon_name, display_order) VALUES
  ('Chef Kitchen',        'Culinary', 'ChefHat',     10),
  ('BBQ Grill',           'Culinary', 'Flame',       20),
  ('Outdoor Kitchen',     'Culinary', 'Utensils',    30),
  ('Wine Cellar',         'Culinary', 'Wine',        40),
  ('Pizza Oven',          'Culinary', 'Circle',      50),
  ('Smoothie Bar',        'Culinary', 'GlassWater',  60);

-- Wellness (6)
INSERT INTO amenities (name, category, icon_name, display_order) VALUES
  ('Private Gym',         'Wellness', 'Dumbbell',    10),
  ('Yoga Deck',           'Wellness', 'Leaf',        20),
  ('Sauna',               'Wellness', 'Thermometer', 30),
  ('Massage Room',        'Wellness', 'Heart',       40),
  ('Steam Room',          'Wellness', 'CloudFog',    50),
  ('Meditation Garden',   'Wellness', 'Flower2',     60);
