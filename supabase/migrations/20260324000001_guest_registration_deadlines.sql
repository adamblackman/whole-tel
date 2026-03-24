-- Migration: Guest Registration & Payment Deadlines
-- Phase 13: PAY-01, PAY-05, PAY-06, PAY-08
-- Date: 2026-03-24

-- ============================================================
-- 1. Widen bookings status CHECK constraint to include 'expired'
-- ============================================================
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired'));

-- ============================================================
-- 2. Add deadline columns to bookings
-- ============================================================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS activity_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_checkout_url text;

-- ============================================================
-- 3. Backfill existing pending bookings with computed deadlines
-- ============================================================
UPDATE bookings
SET
  payment_deadline = created_at + interval '36 hours',
  activity_deadline = LEAST(
    check_in::timestamptz - interval '30 days',
    created_at + interval '7 days'
  )
WHERE payment_deadline IS NULL;

-- ============================================================
-- 4. Add registration columns to booking_invitations
-- ============================================================
ALTER TABLE booking_invitations
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text;

-- ============================================================
-- 5. Atomic increment RPC function for guest_count
-- ============================================================
CREATE OR REPLACE FUNCTION increment_booking_guest_count(p_booking_id uuid)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE bookings
  SET
    guest_count = guest_count + 1,
    updated_at = now()
  WHERE
    id = p_booking_id
    AND status IN ('pending', 'confirmed')
    AND guest_count < (
      SELECT max_guests FROM properties WHERE id = bookings.property_id
    )
  RETURNING guest_count;
$$;
