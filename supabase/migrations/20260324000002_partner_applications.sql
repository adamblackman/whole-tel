-- Partner Applications: ENUM type, table, and RLS policies
-- Enables curated partner onboarding with admin review workflow

CREATE TYPE application_status AS ENUM (
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'onboarded'
);

CREATE TABLE partner_applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  status application_status NOT NULL DEFAULT 'submitted',
  applicant_name text NOT NULL,
  applicant_email text NOT NULL,
  applicant_phone text,
  property_basics jsonb NOT NULL DEFAULT '{}',
  capacity jsonb NOT NULL DEFAULT '{}',
  common_areas jsonb NOT NULL DEFAULT '{}',
  group_hosting jsonb NOT NULL DEFAULT '{}',
  logistics jsonb NOT NULL DEFAULT '{}',
  admin_notes text,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz
);

ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;

-- Public can submit applications (no auth required — applicants don't have accounts)
CREATE POLICY "Anyone can submit an application"
  ON partner_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Owner-role users can view all applications for admin review
CREATE POLICY "Owners can view all applications"
  ON partner_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'owner'
    )
  );

-- Owner-role users can update applications (status changes, admin notes)
CREATE POLICY "Owners can update applications"
  ON partner_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'owner'
    )
  );
