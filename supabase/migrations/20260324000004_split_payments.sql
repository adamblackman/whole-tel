-- Split payments: individual attendee payment shares for confirmed group bookings
-- Applied manually per project convention (Supabase MCP on wrong project)

CREATE TABLE booking_splits (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id             uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  invitation_id          uuid NOT NULL REFERENCES booking_invitations(id) ON DELETE CASCADE,
  amount                 numeric(10, 2) NOT NULL CHECK (amount > 0),
  stripe_payment_link_id text,
  stripe_payment_link_url text,
  payment_status         text NOT NULL DEFAULT 'unpaid'
                           CHECK (payment_status IN ('unpaid', 'paid')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  UNIQUE (booking_id, invitation_id)
);

ALTER TABLE booking_splits ENABLE ROW LEVEL SECURITY;

-- Booking owner can manage all splits for their bookings
CREATE POLICY "Booking owner can manage splits"
  ON booking_splits
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_splits.booking_id
        AND bookings.guest_id = auth.uid()
    )
  );

-- Invited attendee can view their own split (matched by email via profiles)
CREATE POLICY "Invited attendee can view their split"
  ON booking_splits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM booking_invitations bi
      JOIN profiles p ON p.email = bi.email
      WHERE bi.id = booking_splits.invitation_id
        AND p.id = auth.uid()
    )
  );
