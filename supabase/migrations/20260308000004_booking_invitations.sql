-- Booking invitations table for group coordination
CREATE TABLE booking_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  email       text NOT NULL,
  token       uuid NOT NULL DEFAULT gen_random_uuid(),
  status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_by  uuid NOT NULL REFERENCES profiles(id),
  accepted_by uuid REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id, email)
);

-- RLS policies
ALTER TABLE booking_invitations ENABLE ROW LEVEL SECURITY;

-- Booking creator can see invitations for their bookings
CREATE POLICY "Booking owner can view invitations"
  ON booking_invitations FOR SELECT
  USING (invited_by = auth.uid());

-- Invited user can view their own invitations (by email match through profiles)
CREATE POLICY "Invited user can view their invitations"
  ON booking_invitations FOR SELECT
  USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- Booking creator can insert invitations
CREATE POLICY "Booking owner can create invitations"
  ON booking_invitations FOR INSERT
  WITH CHECK (invited_by = auth.uid());

-- Invited user can update their invitation (accept/decline)
CREATE POLICY "Invited user can update their invitation"
  ON booking_invitations FOR UPDATE
  USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- Index for token lookup (invitation accept page)
CREATE INDEX idx_booking_invitations_token ON booking_invitations(token);
