-- Merge property_activities into add_ons (experiences)
-- Activities and experiences are the same concept per client requirements (ITIN-01)

-- Step 1: Add scheduling columns to add_ons (nullable — not all experiences need time slots)
ALTER TABLE add_ons
  ADD COLUMN duration_min integer CHECK (duration_min >= 15 AND duration_min <= 1440),
  ADD COLUMN available_slots jsonb DEFAULT '[]'::jsonb;

-- Step 2: Re-point itinerary_events FK from property_activities to add_ons
ALTER TABLE itinerary_events
  DROP CONSTRAINT IF EXISTS itinerary_events_activity_id_fkey;

ALTER TABLE itinerary_events
  ADD CONSTRAINT itinerary_events_activity_id_fkey
  FOREIGN KEY (activity_id) REFERENCES add_ons(id) ON DELETE SET NULL;

-- Step 3: Drop property_activities table (no production data — just created in this milestone)
DROP TABLE IF EXISTS property_activities CASCADE;
