-- supabase/migrations/20260308000001_rebrand_seed_data.sql
-- Rebrand migration: Update existing seed data from "party villas" to Whole-Tel all-inclusive hotels.
-- Uses property UUIDs as stable identifiers for WHERE clauses.
-- Safe to run on databases that already have the seed data deployed.

-- ============================================================
-- CABO SAN LUCAS: Rename Villa Paraiso -> Cabo San Lucas Casa Paraiso
-- ============================================================
UPDATE properties
SET
  name = 'Cabo San Lucas Casa Paraiso',
  description = 'Your private paradise perched above the Sea of Cortez. Casa Paraiso is where the Baja sun hits different -- infinity pool views that stretch to the horizon, seven bathrooms for the whole crew, and a rooftop terrace made for golden hour. All-inclusive group travel the way it should be: everything handled, nothing to worry about.',
  house_rules = 'No smoking indoors. Pool hours: sunrise to midnight. All guests must be registered.'
WHERE id = 'a1000000-0000-0000-0000-000000000001';

-- Update Cabo add-on: Private Chef Dinner (villa -> property)
UPDATE add_ons
SET description = 'A professional Cabo chef comes to the property and prepares a four-course dinner with locally sourced ingredients. Think fresh-caught mahi-mahi, tableside guacamole, and churros with homemade cajeta. You just show up hungry.'
WHERE property_id = 'a1000000-0000-0000-0000-000000000001'
  AND name = 'Private Chef Dinner';

-- Update Cabo add-on: Airport Transfer (Villa Paraiso -> Casa Paraiso)
UPDATE add_ons
SET description = 'Door-to-door luxury SUV transfer between SJD airport and Casa Paraiso. Air-conditioned, punctual, no haggling with taxi drivers after a red-eye. Driver monitors your flight status.'
WHERE property_id = 'a1000000-0000-0000-0000-000000000001'
  AND name = 'Airport Transfer (Round Trip)';

-- ============================================================
-- PUERTO VALLARTA: Rename Casa del Sol -> Puerto Vallarta Casa del Sol
-- ============================================================
UPDATE properties
SET
  name = 'Puerto Vallarta Casa del Sol',
  description = 'Tucked into the lush hills of Zona Romantica, Casa del Sol is Puerto Vallarta''s best-kept secret for groups who want culture with their chill. Wake up to jungle birds, stumble downhill to cobblestone streets and the best tacos of your life, then come back to a private pool with nobody else in it. Five bedrooms, old-town soul, all-inclusive comfort.'
WHERE id = 'b2000000-0000-0000-0000-000000000002';

-- Update PV add-on: Mariachi Band (property-specific reference -> generic)
UPDATE add_ons
SET description = 'A five-piece mariachi band comes to your property and plays for two hours straight. They know all the classics and they''re genuinely excellent. This is the thing your group will talk about for years. Book early -- weekends fill fast.'
WHERE property_id = 'b2000000-0000-0000-0000-000000000002'
  AND name = 'Mariachi Band (2-Hour Set)';

-- ============================================================
-- MIAMI: Rename The Palms Estate -> Miami South Beach Azure
-- ============================================================
UPDATE properties
SET
  name = 'Miami South Beach Azure',
  description = 'Eight bedrooms. Nine bathrooms. A pool that glows at night. South Beach Azure is Miami at its most unapologetically stylish -- waterfront in Miami Beach, walking distance to the strip, with enough private space that you never have to leave if you don''t want to. All-inclusive group travel for the crew that wants Miami to come to them.',
  house_rules = 'No smoking indoors. Events welcome with advance notice. All guests on guest list required for insurance purposes. No outside catering without approval.'
WHERE id = 'c3000000-0000-0000-0000-000000000003';

-- Update Miami add-on: Private DJ (The Palms Estate -> South Beach Azure)
UPDATE add_ons
SET description = 'A professional Miami DJ sets up at South Beach Azure and plays a four-hour set tailored to your group. Full sound system included. They''ll read the room from deep house to hip-hop to whatever the group decides at 1 AM.'
WHERE property_id = 'c3000000-0000-0000-0000-000000000003'
  AND name = 'Private DJ (4-Hour Set)';

-- Update Miami add-on: Catered Pool Party (pool party -> catered event wording)
UPDATE add_ons
SET description = 'A full catering crew arrives with a setup: charcuterie boards, passed appetizers, a live grill station, and dessert. Serves up to 20 guests. You relax, they cook. They clean up too.'
WHERE property_id = 'c3000000-0000-0000-0000-000000000003'
  AND name = 'Catered Pool Party';

-- Update Miami add-on: Yacht Day Trip (The Palms Estate -> South Beach Azure)
UPDATE add_ons
SET description = 'A 65-foot luxury motor yacht for your entire group, all day. Captain and crew. Open bar. Water toys -- jet ski, paddleboards, snorkel gear. Departs from the private dock at South Beach Azure. This is the Miami day.'
WHERE property_id = 'c3000000-0000-0000-0000-000000000003'
  AND name = 'Yacht Day Trip (Full Day)';
