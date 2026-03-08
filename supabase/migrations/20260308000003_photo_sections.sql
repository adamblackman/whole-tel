-- Migration: Add section column to property_photos for photo organization
ALTER TABLE property_photos
ADD COLUMN section text;

-- Index for efficient section-based queries (property + section + order)
CREATE INDEX idx_property_photos_section
ON property_photos (property_id, section, display_order);
