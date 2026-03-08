-- supabase/migrations/20260302000002_seed_data.sql
-- Phase 1: Seed placeholder properties for Cabo, Puerto Vallarta, and Miami

-- ============================================================
-- SYSTEM OWNER (placeholder — will be replaced by real owner in Phase 3)
-- ============================================================
-- profiles.id is a FK to auth.users(id), so we must insert into auth.users first.
-- This placeholder user has no password and cannot log in — it exists solely to
-- satisfy the FK constraint for the seed properties' owner_id.
-- It will be linked to a real Supabase Auth user in Phase 3 when owner onboarding is built.
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  role,
  aud
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'system@whole-tel.com',
  '',
  now(),
  now(),
  now(),
  '{"role": "owner"}'::jsonb,
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- Now insert the matching profile row
INSERT INTO profiles (id, email, display_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'adam@whole-tel.com',
  'Whole-Tel',
  'owner'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- CABO SAN LUCAS: Cabo San Lucas Casa Paraiso
-- ============================================================
INSERT INTO properties (
  id, owner_id, name, description, location, address,
  bedrooms, bathrooms, max_guests, nightly_rate, cleaning_fee,
  amenities, house_rules, check_in_time, check_out_time
) VALUES (
  'a1000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Cabo San Lucas Casa Paraiso',
  'Your private paradise perched above the Sea of Cortez. Casa Paraiso is where the Baja sun hits different -- infinity pool views that stretch to the horizon, seven bathrooms for the whole crew, and a rooftop terrace made for golden hour. All-inclusive group travel the way it should be: everything handled, nothing to worry about.',
  'Cabo San Lucas',
  'Pedregal de Cabo San Lucas, Cabo San Lucas, BCS, Mexico',
  6, 7, 16, 1200.00, 350.00,
  '["Infinity pool", "Hot tub", "Rooftop terrace", "Ocean view", "Full kitchen", "BBQ grill", "WiFi", "Air conditioning", "Parking (4 cars)", "Outdoor dining area", "Fire pit", "Smart TV", "Washer/dryer", "Beach towels & gear"]'::jsonb,
  'No smoking indoors. Pool hours: sunrise to midnight. All guests must be registered.',
  '3:00 PM',
  '11:00 AM'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO add_ons (property_id, name, description, price, pricing_unit) VALUES
(
  'a1000000-0000-0000-0000-000000000001',
  'Private Yacht Tour',
  'Spend the day on a luxury 45-foot yacht with your crew. Captain and first mate included. Stops at Lover''s Beach, the famous Arch of Cabo, and hidden snorkel spots you''ll never find on a tourist boat. Open bar package available as an upgrade.',
  150.00,
  'per_person'
),
(
  'a1000000-0000-0000-0000-000000000001',
  'Private Chef Dinner',
  'A professional Cabo chef comes to the property and prepares a four-course dinner with locally sourced ingredients. Think fresh-caught mahi-mahi, tableside guacamole, and churros with homemade cajeta. You just show up hungry.',
  80.00,
  'per_person'
),
(
  'a1000000-0000-0000-0000-000000000001',
  'Agave & Tequila Tasting',
  'A tequila educator brings six premium Baja agave spirits — blancos, reposados, añejos — and walks your group through the story from plant to glass. Paired with artisanal botanas. This is the happiest you''ll ever be learning something.',
  45.00,
  'per_person'
),
(
  'a1000000-0000-0000-0000-000000000001',
  'Airport Transfer (Round Trip)',
  'Door-to-door luxury SUV transfer between SJD airport and Casa Paraiso. Air-conditioned, punctual, no haggling with taxi drivers after a red-eye. Driver monitors your flight status.',
  200.00,
  'per_booking'
);

-- ============================================================
-- PUERTO VALLARTA: Puerto Vallarta Casa del Sol
-- ============================================================
INSERT INTO properties (
  id, owner_id, name, description, location, address,
  bedrooms, bathrooms, max_guests, nightly_rate, cleaning_fee,
  amenities, house_rules, check_in_time, check_out_time
) VALUES (
  'b2000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Puerto Vallarta Casa del Sol',
  'Tucked into the lush hills of Zona Romantica, Casa del Sol is Puerto Vallarta''s best-kept secret for groups who want culture with their chill. Wake up to jungle birds, stumble downhill to cobblestone streets and the best tacos of your life, then come back to a private pool with nobody else in it. Five bedrooms, old-town soul, all-inclusive comfort.',
  'Puerto Vallarta',
  'Zona Romántica, Puerto Vallarta, Jalisco, Mexico',
  5, 5, 12, 800.00, 250.00,
  '["Private pool", "Jungle view", "Rooftop palapa", "Full kitchen", "WiFi", "Air conditioning", "Parking (2 cars)", "Outdoor dining", "BBQ grill", "Hammocks", "Smart TV", "Washer/dryer", "Snorkel gear", "Beach chairs & umbrella"]'::jsonb,
  'No smoking indoors. Quiet hours after 1:00 AM — neighbors are lovely people. Pool is yours all day. Please recycle.',
  '3:00 PM',
  '11:00 AM'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO add_ons (property_id, name, description, price, pricing_unit) VALUES
(
  'b2000000-0000-0000-0000-000000000002',
  'Snorkeling Excursion',
  'Head out on a small boat to Los Arcos National Marine Park, one of Mexico''s best snorkel spots. Three hours in the water with gear included, a local guide who knows where the manta rays hang out, and fresh fruit on the way back.',
  65.00,
  'per_person'
),
(
  'b2000000-0000-0000-0000-000000000002',
  'Mariachi Band (2-Hour Set)',
  'A five-piece mariachi band comes to your property and plays for two hours straight. They know all the classics and they''re genuinely excellent. This is the thing your group will talk about for years. Book early -- weekends fill fast.',
  400.00,
  'per_booking'
),
(
  'b2000000-0000-0000-0000-000000000002',
  'Surf Lessons (Beginner to Intermediate)',
  'Two-hour session at Playa de los Muertos with a certified instructor. Board and wetsuit included. Whether nobody in your group has surfed or someone''s itching to actually catch waves, the instructor meets you where you are.',
  90.00,
  'per_person'
),
(
  'b2000000-0000-0000-0000-000000000002',
  'Grocery & Provisioning Delivery',
  'Send us your list before you arrive. Cold beer, fresh produce, breakfast foods, snacks, coffee — everything stocked in the fridge and pantry when you walk in. No first-night grocery run required.',
  150.00,
  'per_booking'
);

-- ============================================================
-- MIAMI: Miami South Beach Azure
-- ============================================================
INSERT INTO properties (
  id, owner_id, name, description, location, address,
  bedrooms, bathrooms, max_guests, nightly_rate, cleaning_fee,
  amenities, house_rules, check_in_time, check_out_time
) VALUES (
  'c3000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Miami South Beach Azure',
  'Eight bedrooms. Nine bathrooms. A pool that glows at night. South Beach Azure is Miami at its most unapologetically stylish -- waterfront in Miami Beach, walking distance to the strip, with enough private space that you never have to leave if you don''t want to. All-inclusive group travel for the crew that wants Miami to come to them.',
  'Miami',
  'Miami Beach, Miami, FL 33139',
  8, 9, 20, 2500.00, 600.00,
  '["Waterfront pool", "Hot tub", "Private dock", "Outdoor kitchen", "Fire pit", "Home theater", "Game room", "WiFi", "Air conditioning", "Parking (6 cars)", "BBQ grill", "Smart TVs (all rooms)", "Washer/dryer", "Gym", "Towels & beach chairs"]'::jsonb,
  'No smoking indoors. Events welcome with advance notice. All guests on guest list required for insurance purposes. No outside catering without approval.',
  '4:00 PM',
  '11:00 AM'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO add_ons (property_id, name, description, price, pricing_unit) VALUES
(
  'c3000000-0000-0000-0000-000000000003',
  'Nightclub VIP Table',
  'Skip the line, skip the velvet rope. VIP table for your group at one of Miami Beach''s top clubs — bottle service, dedicated waitress, prime location on the floor. We handle the reservation, you handle the vibe.',
  250.00,
  'per_person'
),
(
  'c3000000-0000-0000-0000-000000000003',
  'Private DJ (4-Hour Set)',
  'A professional Miami DJ sets up at South Beach Azure and plays a four-hour set tailored to your group. Full sound system included. They''ll read the room from deep house to hip-hop to whatever the group decides at 1 AM.',
  800.00,
  'per_booking'
),
(
  'c3000000-0000-0000-0000-000000000003',
  'Catered Pool Party',
  'A full catering crew arrives with a setup: charcuterie boards, passed appetizers, a live grill station, and dessert. Serves up to 20 guests. You relax, they cook. They clean up too.',
  120.00,
  'per_person'
),
(
  'c3000000-0000-0000-0000-000000000003',
  'Yacht Day Trip (Full Day)',
  'A 65-foot luxury motor yacht for your entire group, all day. Captain and crew. Open bar. Water toys -- jet ski, paddleboards, snorkel gear. Departs from the private dock at South Beach Azure. This is the Miami day.',
  200.00,
  'per_person'
);

-- ============================================================
-- VERIFY (run manually to confirm success)
-- ============================================================
-- SELECT p.name, p.location, COUNT(a.id) AS addon_count
-- FROM properties p
-- LEFT JOIN add_ons a ON a.property_id = p.id
-- GROUP BY p.id, p.name, p.location
-- ORDER BY p.nightly_rate;
-- Expected: Puerto Vallarta Casa del Sol/4, Cabo San Lucas Casa Paraiso/4, Miami South Beach Azure/4
