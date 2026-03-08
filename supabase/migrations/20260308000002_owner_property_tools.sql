-- 20260308000002_owner_property_tools.sql
-- Phase 9: Owner Property Tools - Schema Extensions
-- Adds bed configuration, per-person surcharge, and experience tiered pricing

-- Bed configuration (JSONB, defaults to empty config)
ALTER TABLE properties
  ADD COLUMN bed_config jsonb NOT NULL DEFAULT '{"king":0,"queen":0,"double":0,"twin":0,"bunk":0}';

-- Per-person surcharge (nullable pair)
ALTER TABLE properties
  ADD COLUMN guest_threshold integer,
  ADD COLUMN per_person_rate numeric(10,2);

ALTER TABLE properties
  ADD CONSTRAINT check_surcharge_pair
    CHECK (
      (guest_threshold IS NULL AND per_person_rate IS NULL)
      OR (guest_threshold IS NOT NULL AND per_person_rate IS NOT NULL)
    );

ALTER TABLE properties
  ADD CONSTRAINT check_guest_threshold_positive
    CHECK (guest_threshold IS NULL OR guest_threshold > 0);

ALTER TABLE properties
  ADD CONSTRAINT check_per_person_rate_positive
    CHECK (per_person_rate IS NULL OR per_person_rate > 0);

-- Experience tiered pricing (nullable pair)
ALTER TABLE add_ons
  ADD COLUMN included_guests integer,
  ADD COLUMN per_person_above numeric(10,2);

ALTER TABLE add_ons
  ADD CONSTRAINT check_tier_pair
    CHECK (
      (included_guests IS NULL AND per_person_above IS NULL)
      OR (included_guests IS NOT NULL AND per_person_above IS NOT NULL)
    );

ALTER TABLE add_ons
  ADD CONSTRAINT check_included_guests_positive
    CHECK (included_guests IS NULL OR included_guests > 0);

ALTER TABLE add_ons
  ADD CONSTRAINT check_per_person_above_positive
    CHECK (per_person_above IS NULL OR per_person_above >= 0);
