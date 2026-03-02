# Phase 1: Foundation - Research

**Researched:** 2026-03-02
**Domain:** Supabase database schema, RLS policies, PostgreSQL exclusion constraints, Supabase Storage, Next.js SSR client factories
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Database Schema**
- Tables: profiles, properties, property_photos, add_ons, bookings, booking_add_ons
- Properties table: name, description, location (city), address, bedrooms, bathrooms, max_guests, nightly_rate, cleaning_fee, amenities (JSONB), house_rules (text), check_in_time, check_out_time, owner_id (FK to profiles)
- Add-ons linked to specific properties, not a global catalog
- Add-ons have: name, description, price, pricing_unit (per_person | per_booking), max_quantity (nullable), photo_url (nullable), property_id (FK)
- Bookings: property_id, guest_id, check_in (date), check_out (date), guest_count, subtotal, add_ons_total, processing_fee, total, status (pending | confirmed | cancelled), stripe_session_id, stripe_payment_intent_id
- booking_add_ons: booking_id, add_on_id, quantity, unit_price, total_price
- Use date type (not timestamp) for check-in/check-out — villa bookings are day-level

**RLS Policies**
- Properties: public read, owner-only write (owner_id = auth.uid())
- Add-ons: public read, owner-only write (via property ownership check)
- Bookings: guest sees own bookings, owner sees bookings for their properties, service_role for webhook writes
- Profiles: user sees own profile, public read for display names
- Property photos: public read, owner-only write
- Enable RLS on ALL tables in the same migration as table creation — never leave a gap

**Double-Booking Prevention**
- PostgreSQL exclusion constraint using GiST index on bookings table
- Constraint on (property_id, daterange(check_in, check_out)) — prevents overlapping confirmed bookings
- Only apply to status = 'confirmed' bookings (pending bookings don't block dates)

**Supabase Clients**
- `lib/supabase/server.ts` — createServerClient using cookies, for Server Components/Actions
- `lib/supabase/browser.ts` — createBrowserClient using NEXT_PUBLIC keys only
- Service role key NEVER in browser code, NEVER prefixed with NEXT_PUBLIC_
- DAL file `lib/dal.ts` with verifySession() and requireOwner() wrapped in React.cache()

**Storage**
- Bucket: "property-photos" — public read, authenticated write
- Signed URL upload pattern for photos (bypasses 1MB Server Action limit)
- File naming: {property_id}/{uuid}.{ext}

**Seed Data (Placeholder Properties)**
- **Cabo San Lucas**: "Villa Paraiso" — 6 bedrooms, 7 bathrooms, 16 max guests, $1,200/night. Add-ons: Private yacht tour ($150/person), Private chef dinner ($80/person), Tequila tasting ($45/person), Airport transfer ($200/booking)
- **Puerto Vallarta**: "Casa del Sol" — 5 bedrooms, 5 bathrooms, 12 max guests, $800/night. Add-ons: Snorkeling excursion ($65/person), Mariachi band ($400/booking), Surfing lessons ($90/person), Grocery delivery ($150/booking)
- **Miami**: "The Palms Estate" — 8 bedrooms, 9 bathrooms, 20 max guests, $2,500/night. Add-ons: Nightclub VIP table ($250/person), Private DJ ($800/booking), Catered pool party ($120/person), Yacht day trip ($200/person)
- All seeded with placeholder amenities (pool, hot tub, WiFi, AC, parking, BBQ grill, etc.)
- Use realistic descriptions with tropical chill party brand voice

### Claude's Discretion
- Exact column types and constraints beyond what's specified
- Index strategy beyond the GiST exclusion constraint
- Migration naming conventions
- Seed data descriptions and amenity lists
- Profile table fields beyond id, email, role, display_name

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | Supabase database schema with RLS policies for all tables | Schema design, RLS SQL syntax, migration patterns, btree_gist extension |
| DATA-02 | PostgreSQL exclusion constraint preventing double-booking (overlapping dates) | btree_gist + EXCLUDE USING GIST + daterange() + WHERE status = 'confirmed' |
| DATA-03 | Placeholder properties seeded for Cabo, Puerto Vallarta, and Miami | Seed SQL INSERT patterns, add_ons per property, Supabase MCP execute_sql |
| DATA-04 | Supabase Storage bucket for property photos with signed URL uploads | storage.buckets INSERT SQL, RLS on storage.objects, createSignedUploadUrl API |
</phase_requirements>

## Summary

Phase 1 establishes the entire data layer for the whole-tel platform. The scope is pure infrastructure: Supabase database schema, RLS policies, a PostgreSQL exclusion constraint, a Storage bucket, and seed data. No application pages or UI are in scope.

The most technically nuanced piece is the double-booking exclusion constraint. It requires the `btree_gist` extension (to mix scalar types like UUID with range types in a GiST index), uses `daterange()` on date columns (not tsrange on timestamps), and is scoped to `status = 'confirmed'` via a partial constraint. This must be written correctly in the initial migration — it cannot be retrofitted once conflicting data exists.

The second critical piece is the two Supabase client factories (`server.ts` and `browser.ts`). The CLAUDE.md mandates this as a security non-negotiable: service role key never reaches the browser, never has a NEXT_PUBLIC_ prefix. The server client uses `@supabase/ssr`'s `createServerClient` with cookie adapters; the browser client uses `createBrowserClient` with only NEXT_PUBLIC_ env vars. The Supabase MCP (project jxbafovfobsmqxjfjrqp) can apply migrations directly via `apply_migration`, which tracks DDL in the database's migration history.

**Primary recommendation:** Write the entire foundation as two SQL migration files — (1) schema + RLS, (2) seed data — applied via Supabase MCP `apply_migration`, then create the two TypeScript client factories and DAL. Verify RLS gaps by querying as anon role.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.98.0 | Supabase JS client (auth, db, storage) | Official SDK |
| @supabase/ssr | 0.9.0 | Cookie-based SSR client factories for Next.js | Replaces deprecated @supabase/auth-helpers-nextjs |
| next | 16.1.6 | App Router framework | Project stack (CLAUDE.md) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| btree_gist (PostgreSQL extension) | built-in | Enables mixed B-tree + GiST indexes for exclusion constraints | Required for the daterange exclusion constraint on bookings |
| uuid-ossp (PostgreSQL extension) | built-in | gen_random_uuid() for primary keys | Use if not defaulting to gen_random_uuid() in Postgres 13+ |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/ssr | @supabase/auth-helpers-nextjs | auth-helpers is deprecated — do not use |
| date columns + daterange() | timestamp + tsrange() | Date is correct for day-level villa bookings; timestamp creates timezone ambiguity |
| Partial exclusion constraint | Application-level check | Application checks have race conditions under concurrent requests; constraint is atomic |

**Installation:**
```bash
npm install @supabase/supabase-js @supabase/ssr
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── supabase/
│   │   ├── server.ts        # createServerClient() — Server Components, Actions, Route Handlers
│   │   └── browser.ts       # createBrowserClient() — Client Components only
│   └── dal.ts               # verifySession(), requireOwner() wrapped in React.cache()
├── types/
│   └── database.ts          # Generated or hand-written Supabase type definitions
supabase/
└── migrations/
    ├── 20260302000001_schema_rls.sql    # All tables + RLS in one migration
    └── 20260302000002_seed_data.sql     # Placeholder properties + add-ons
```

### Pattern 1: Server-Side Supabase Client (createServerClient)

**What:** Async factory that wires Supabase to Next.js HTTP-only cookies for SSR and token refresh.
**When to use:** In Server Components, Server Actions, and Route Handlers.

```typescript
// src/lib/supabase/server.ts
// Source: Supabase SSR docs + https://www.ryankatayi.com/blog/server-side-auth-in-next-js-with-supabase-my-setup
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — cookie writes ignored here.
            // Middleware will persist refreshed tokens.
          }
        },
      },
    }
  )
}
```

**CRITICAL:** `cookies()` must be awaited in Next.js 16. Failure to await returns a Promise, not the cookie store.

### Pattern 2: Browser-Side Supabase Client (createBrowserClient)

**What:** Singleton client for Client Components. Uses only NEXT_PUBLIC_ env vars.
**When to use:** In `'use client'` components only.

```typescript
// src/lib/supabase/browser.ts
// Source: Supabase SSR official docs
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**CRITICAL:** Never import `server.ts` from a Client Component. Never use service role key here.

### Pattern 3: PostgreSQL Exclusion Constraint for Double-Booking

**What:** Database-level race-condition prevention using GiST index with range overlap operator.
**When to use:** In the initial schema migration — cannot be added safely after data exists.

```sql
-- Source: PostgreSQL docs + https://atomiccoding.substack.com/p/explore-exclusion-constraints-in
-- Requires btree_gist extension to mix UUID (B-tree type) with daterange (GiST type)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- In the bookings table definition:
CONSTRAINT no_overlapping_confirmed_bookings
  EXCLUDE USING GIST (
    property_id WITH =,
    daterange(check_in, check_out, '[)') WITH &&
  )
  WHERE (status = 'confirmed')
```

**Key details:**
- `'[)'` bounds: inclusive start, exclusive end — standard for date ranges (check-in day included, check-out day excluded from overlap)
- `WITH =` on `property_id` requires btree_gist because UUID is a B-tree type, not natively GiST
- `WHERE (status = 'confirmed')` makes this a partial constraint — pending/cancelled bookings do not block dates
- `&&` is the range overlap operator

### Pattern 4: Storage Bucket Creation via SQL

**What:** Create a named bucket with public read access via SQL migration.

```sql
-- Source: Supabase Storage docs
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true);

-- Storage RLS: public read (public bucket handles select, but explicit policy is clearer)
CREATE POLICY "Public can view property photos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'property-photos');

-- Storage RLS: authenticated write (owner uploads via signed URL)
CREATE POLICY "Authenticated users can upload property photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'property-photos');

-- Storage RLS: authenticated delete
CREATE POLICY "Authenticated users can delete property photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'property-photos');
```

### Pattern 5: Signed URL Upload Flow

**What:** Server Action generates a signed upload URL; client uploads directly to Supabase Storage — bypasses the 1MB Server Action body limit.

```typescript
// Server Action (src/app/actions/storage.ts)
// Source: https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl
import { createClient } from '@/lib/supabase/server'

export async function getSignedUploadUrl(propertyId: string, fileName: string) {
  const supabase = await createClient()
  const path = `${propertyId}/${crypto.randomUUID()}.${fileName.split('.').pop()}`

  const { data, error } = await supabase.storage
    .from('property-photos')
    .createSignedUploadUrl(path)

  if (error) throw error
  return { signedUrl: data.signedUrl, token: data.token, path }
}
```

```typescript
// Client Component: upload using the signed URL token
// Source: Supabase Storage JS API
const { error } = await supabase.storage
  .from('property-photos')
  .uploadToSignedUrl(path, token, file)
```

### Pattern 6: RLS Policy SQL

**What:** Standard RLS policy shapes for this project.

```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security

-- Public read
CREATE POLICY "Properties are publicly readable"
  ON properties FOR SELECT
  TO anon, authenticated
  USING (true);

-- Owner-only write
CREATE POLICY "Owners can insert their properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = owner_id);

CREATE POLICY "Owners can update their properties"
  ON properties FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = owner_id)
  WITH CHECK ((SELECT auth.uid()) = owner_id);

-- Cross-table ownership check (add_ons owned via property)
CREATE POLICY "Owners can insert add-ons for their properties"
  ON add_ons FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = add_ons.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

-- service_role bypass: no explicit policy needed — service_role bypasses RLS entirely
-- Use service_role client only in server-side webhook handlers (Phase 6)
```

**CRITICAL syntax:** Use `(SELECT auth.uid())` not `auth.uid()` to avoid per-row re-evaluation (performance optimization verified in official RLS docs).

### Anti-Patterns to Avoid

- **Splitting table creation from RLS enablement:** Always `ALTER TABLE x ENABLE ROW LEVEL SECURITY` and create policies in the same migration as `CREATE TABLE`. Any gap leaves the table publicly writable.
- **Using `auth.uid()` without SELECT subquery:** Raw `auth.uid()` is re-evaluated per row. `(SELECT auth.uid())` is evaluated once per query — use the subquery form.
- **Using NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:** Never prefix the service role key. It would be exposed to the browser bundle. Correct name: `SUPABASE_SERVICE_ROLE_KEY`.
- **Using `getSession()` in Server Components:** `getSession()` does not verify the JWT signature server-side — it trusts the cookie. Use `getClaims()` instead for server-side auth verification.
- **Using tsrange instead of daterange:** For day-level bookings, timestamp ranges create timezone ambiguity. `daterange(check_in, check_out, '[)')` is correct.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Race-condition-proof double-booking prevention | Application-level date overlap check | PostgreSQL EXCLUDE USING GIST constraint | Application checks are not atomic — two concurrent requests can pass the check simultaneously before either commits |
| Cookie management for Next.js SSR auth | Custom cookie read/write in Server Components | @supabase/ssr createServerClient with cookie adapters | Middleware proxy handles token refresh correctly; custom implementations miss edge cases with simultaneous requests |
| Signed upload URLs | Proxying file uploads through Next.js Server Actions | supabase.storage.createSignedUploadUrl() | Server Actions have 1MB body limit; signed URLs let the client upload directly to Supabase Storage |
| UUID generation | Custom ID generation | `gen_random_uuid()` as column default in PostgreSQL | Built-in, cryptographically random, no application code needed |

**Key insight:** The double-booking constraint is the most deceptive — it feels like something you'd enforce with a query before inserting, but that pattern has an unavoidable race condition. The constraint is enforced transactionally by PostgreSQL itself.

## Common Pitfalls

### Pitfall 1: RLS Enabled But No Policies = Locked Out

**What goes wrong:** Enabling RLS without creating policies locks out ALL queries including authenticated ones, because RLS default-denies everything with no matching policy.
**Why it happens:** RLS enabled + no SELECT policy = zero rows returned for all users. Easy to miss in testing if you're using the service role key (which bypasses RLS).
**How to avoid:** Always create policies in the same migration as `ENABLE ROW LEVEL SECURITY`. Test queries using the anon role, not the service role.
**Warning signs:** Authenticated queries return empty arrays despite data existing in the table.

### Pitfall 2: Missing btree_gist Extension

**What goes wrong:** The exclusion constraint fails to create with error: `ERROR: data type uuid has no default operator class for access method "gist"`.
**Why it happens:** GiST natively handles range types but not scalar types like UUID. The btree_gist extension adds GiST operator classes for B-tree types.
**How to avoid:** Always `CREATE EXTENSION IF NOT EXISTS btree_gist;` before the exclusion constraint in the migration.
**Warning signs:** Migration fails with "no default operator class for access method gist".

### Pitfall 3: Service Role Key Leaking to Browser

**What goes wrong:** Service role key ends up in the browser bundle, bypassing all RLS policies for every client.
**Why it happens:** Naming it `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` or importing `server.ts` from a Client Component.
**How to avoid:** Name it `SUPABASE_SERVICE_ROLE_KEY` (no NEXT_PUBLIC_ prefix). Only import `server.ts` from server-side files. `browser.ts` uses only `NEXT_PUBLIC_` vars.
**Warning signs:** Browser DevTools Network tab shows requests authenticated as service_role; `process.env.SUPABASE_SERVICE_ROLE_KEY` appears in client bundle.

### Pitfall 4: cookies() Not Awaited in Next.js 16

**What goes wrong:** `const cookieStore = cookies()` (without await) returns a Promise in Next.js 16, not the cookie store. All cookie reads return undefined.
**Why it happens:** Next.js 16 made `cookies()` async. Code copied from older tutorials uses the synchronous form.
**How to avoid:** Always `const cookieStore = await cookies()` in `server.ts`.
**Warning signs:** Supabase client shows no session despite valid cookies; middleware-refreshed tokens not read by Server Components.

### Pitfall 5: daterange Bounds Causing Off-By-One in Overlap Check

**What goes wrong:** Bookings that share only a check-out/check-in boundary (e.g., one guest checks out March 5, next guest checks in March 5) are incorrectly blocked.
**Why it happens:** Using closed bounds `'[]'` (both ends inclusive) means March 5 overlaps with itself.
**How to avoid:** Use half-open bounds `'[)'` — inclusive start, exclusive end. This correctly allows back-to-back bookings on the same property.
**Warning signs:** Adjacent bookings fail with exclusion constraint violation.

### Pitfall 6: Applying Exclusion Constraint After Data Exists

**What goes wrong:** Adding the exclusion constraint to a table that already has overlapping bookings fails with a constraint violation error.
**Why it happens:** PostgreSQL validates the constraint against all existing rows when it's created.
**How to avoid:** The constraint MUST be in the initial schema migration, before any data is inserted. This is a Phase 1 requirement.
**Warning signs:** `ERROR: conflicting key value violates exclusion constraint` during migration.

### Pitfall 7: Storage RLS on storage.objects (Not the Bucket)

**What goes wrong:** Creating a public bucket without storage.objects RLS policies — or vice versa — results in 403 errors or unintended access.
**Why it happens:** The bucket's `public` flag controls URL-based file serving (no auth required to GET the URL). But `createSignedUploadUrl` requires an `INSERT` policy on `storage.objects`.
**How to avoid:** Even for a public bucket, explicitly create INSERT (and DELETE) policies on `storage.objects`. The `public` flag only affects GET requests.
**Warning signs:** `createSignedUploadUrl` returns 403 even for authenticated users.

## Code Examples

Verified patterns from official sources:

### Complete Schema Migration Structure

```sql
-- supabase/migrations/20260302000001_schema_rls.sql

-- Extensions
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email       text NOT NULL,
  display_name text,
  role        text NOT NULL DEFAULT 'guest' CHECK (role IN ('guest', 'owner')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are publicly readable"
  ON profiles FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================================
-- PROPERTIES
-- ============================================================
CREATE TABLE properties (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  location      text NOT NULL,  -- city name (e.g. "Cabo San Lucas")
  address       text,
  bedrooms      int NOT NULL,
  bathrooms     int NOT NULL,
  max_guests    int NOT NULL,
  nightly_rate  numeric(10,2) NOT NULL,
  cleaning_fee  numeric(10,2) NOT NULL DEFAULT 0,
  amenities     jsonb NOT NULL DEFAULT '[]',
  house_rules   text,
  check_in_time  text DEFAULT '3:00 PM',
  check_out_time text DEFAULT '11:00 AM',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Properties are publicly readable"
  ON properties FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Owners can insert their properties"
  ON properties FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = owner_id);

CREATE POLICY "Owners can update their properties"
  ON properties FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = owner_id)
  WITH CHECK ((SELECT auth.uid()) = owner_id);

CREATE POLICY "Owners can delete their properties"
  ON properties FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = owner_id);

-- ============================================================
-- PROPERTY_PHOTOS
-- ============================================================
CREATE TABLE property_photos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  storage_path text NOT NULL,  -- e.g. {property_id}/{uuid}.jpg
  display_order int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE property_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property photos are publicly readable"
  ON property_photos FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Owners can insert photos for their properties"
  ON property_photos FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_photos.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Owners can delete photos for their properties"
  ON property_photos FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_photos.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- ADD_ONS
-- ============================================================
CREATE TABLE add_ons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text,
  price        numeric(10,2) NOT NULL,
  pricing_unit text NOT NULL CHECK (pricing_unit IN ('per_person', 'per_booking')),
  max_quantity int,   -- NULL = unlimited
  photo_url    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE add_ons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Add-ons are publicly readable"
  ON add_ons FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Owners can insert add-ons for their properties"
  ON add_ons FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = add_ons.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Owners can update add-ons for their properties"
  ON add_ons FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = add_ons.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = add_ons.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Owners can delete add-ons for their properties"
  ON add_ons FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = add_ons.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE bookings (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id             uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  guest_id                uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  check_in                date NOT NULL,
  check_out               date NOT NULL,
  guest_count             int NOT NULL,
  subtotal                numeric(10,2) NOT NULL,
  add_ons_total           numeric(10,2) NOT NULL DEFAULT 0,
  processing_fee          numeric(10,2) NOT NULL DEFAULT 0,
  total                   numeric(10,2) NOT NULL,
  status                  text NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  stripe_session_id       text,
  stripe_payment_intent_id text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT check_dates CHECK (check_out > check_in),

  -- Double-booking prevention: confirmed bookings for same property cannot overlap dates
  -- '[)' = inclusive start, exclusive end (standard for date ranges)
  CONSTRAINT no_overlapping_confirmed_bookings
    EXCLUDE USING GIST (
      property_id WITH =,
      daterange(check_in, check_out, '[)') WITH &&
    )
    WHERE (status = 'confirmed')
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guests can view their own bookings"
  ON bookings FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = guest_id);

CREATE POLICY "Owners can view bookings for their properties"
  ON bookings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = bookings.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Guests can insert their own bookings"
  ON bookings FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = guest_id);

-- No UPDATE policy for guests — status changes happen via service_role (webhook)
-- service_role bypasses RLS entirely; no policy needed for it

-- ============================================================
-- BOOKING_ADD_ONS
-- ============================================================
CREATE TABLE booking_add_ons (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  add_on_id   uuid NOT NULL REFERENCES add_ons(id) ON DELETE RESTRICT,
  quantity    int NOT NULL DEFAULT 1,
  unit_price  numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE booking_add_ons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view booking add-ons for their own bookings"
  ON booking_add_ons FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_add_ons.booking_id
        AND bookings.guest_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Owners can view booking add-ons for their property bookings"
  ON booking_add_ons FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN properties ON properties.id = bookings.property_id
      WHERE bookings.id = booking_add_ons.booking_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can insert booking add-ons for their own bookings"
  ON booking_add_ons FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_add_ons.booking_id
        AND bookings.guest_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- STORAGE: property-photos bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Property photos are publicly readable"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'property-photos');

CREATE POLICY "Authenticated users can upload property photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'property-photos');

CREATE POLICY "Authenticated users can delete property photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'property-photos');
```

### DAL Pattern

```typescript
// src/lib/dal.ts
// Source: CLAUDE.md project guidelines
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const verifySession = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')
  return user
})

export const requireOwner = cache(async () => {
  const user = await verifySession()
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'owner') redirect('/')
  return user
})
```

### Environment Variables

```bash
# .env.local — NEVER commit this file
NEXT_PUBLIC_SUPABASE_URL=https://jxbafovfobsmqxjfjrqp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service role key — NO NEXT_PUBLIC_ prefix>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @supabase/auth-helpers-nextjs | @supabase/ssr 0.9.0 | 2023-2024 | auth-helpers is deprecated — do not use in new projects |
| `getSession()` in Server Components | `getClaims()` / `getUser()` | ~2024 | getSession() trusts cookie without verifying JWT signature; getUser() and getClaims() validate against Supabase auth server |
| Synchronous `cookies()` | `await cookies()` | Next.js 15+ | cookies() is now async; must be awaited |
| Manual uuid generation | `gen_random_uuid()` default | PostgreSQL 13+ | Built-in, no extension needed |
| Storing timestamps for bookings | date columns + daterange() | Design choice | Day-level granularity eliminates timezone bugs for villa rentals |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`. Do not use.
- `getSession()` in server code: Does not verify JWT. Use `getUser()` or `getClaims()`.
- Synchronous `cookies()` from next/headers: Async in Next.js 15+.

## Open Questions

1. **Supabase MCP availability**
   - What we know: CONTEXT.md mentions "Use the Supabase MCP connected to the project (jxbafovfobsmqxjfjrqp)" for direct database setup. The MCP provides `apply_migration` and `execute_sql` tools.
   - What's unclear: The MCP is not confirmed active in this Claude Code session (no mcp__ tools appear in the current tool set). It may need to be configured per session.
   - Recommendation: Plan tasks to work both with MCP (`apply_migration`) and without (fallback: `supabase db push` CLI). If MCP is available, use `apply_migration` for DDL (it tracks migration history). Use `execute_sql` for seed data inserts.

2. **Profile auto-creation trigger**
   - What we know: The profiles table has a FK to auth.users. When a user signs up via Supabase Auth, a profile row needs to exist before any auth-gated query works.
   - What's unclear: Whether to create a PostgreSQL trigger (`AFTER INSERT ON auth.users`) in Phase 1 or handle profile creation in Phase 2 (auth flow).
   - Recommendation: Include the trigger in Phase 1's schema migration since the profiles table is created here. This prevents a Phase 2 dependency gap.

3. **Property photos — owner-scoped storage paths**
   - What we know: File naming is `{property_id}/{uuid}.{ext}`. The storage RLS policy for INSERT is broad (any authenticated user).
   - What's unclear: Whether to add a stricter storage policy that verifies the authenticated user owns the property matching the path prefix.
   - Recommendation: For Phase 1, the broad authenticated INSERT policy is sufficient — the `property_photos` table has RLS enforcing ownership. A path-scoped storage policy can be added in Phase 3 when the owner upload UI is built.

## Sources

### Primary (HIGH confidence)
- `@supabase/ssr` npm registry — version 0.9.0 confirmed via `npm show @supabase/ssr version`
- `@supabase/supabase-js` npm registry — version 2.98.0 confirmed via `npm show @supabase/supabase-js version`
- https://supabase.com/docs/guides/database/postgres/row-level-security — RLS SQL syntax, auth.uid() patterns
- https://supabase.com/docs/guides/storage/security/access-control — storage.objects RLS patterns
- https://supabase.com/docs/guides/storage/buckets/fundamentals — public vs private buckets
- https://www.ryankatayi.com/blog/server-side-auth-in-next-js-with-supabase-my-setup — complete server.ts + middleware.ts code

### Secondary (MEDIUM confidence)
- https://atomiccoding.substack.com/p/explore-exclusion-constraints-in — exclusion constraint syntax with partial WHERE clause (verified against PostgreSQL docs structure)
- https://supabase.com/docs/guides/auth/server-side/nextjs — getClaims() vs getSession() distinction (verified from official Supabase docs)
- https://supabase.com/docs/guides/deployment/database-migrations — migration file naming convention YYYYMMDDHHmmss
- Storage bucket SQL: `INSERT INTO storage.buckets (id, name, public)` — verified from Supabase community discussions

### Tertiary (LOW confidence)
- daterange `'[)'` bounds for back-to-back booking behavior — inferred from PostgreSQL range type semantics; verify against test data in implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm versions verified live
- Architecture (schema, RLS, exclusion constraint): HIGH — SQL verified against official PostgreSQL + Supabase docs
- Pitfalls: HIGH — sourced from official docs + known Next.js 16 breaking changes
- Storage signed URL: MEDIUM — API verified from Supabase docs; full example from community source

**Research date:** 2026-03-02
**Valid until:** 2026-04-01 (Supabase SSR API is stable; check if @supabase/ssr minor version changes cookie API)
