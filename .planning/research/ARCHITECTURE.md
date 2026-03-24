# Architecture: v1.1 Integration Patterns

**Domain:** Boutique hotel booking platform -- v1.1 feature integration
**Researched:** 2026-03-07
**Confidence:** HIGH -- based on actual codebase analysis of all existing files

---

## Existing Architecture Snapshot

```
Next.js 16 App Router
  (guest)/             Guest pages: browse properties, book, my bookings
  (owner)/dashboard/   Owner CRUD: properties, photos, add-ons, bookings
  api/webhooks/stripe/ Stripe webhook (checkout.session.completed + async_payment_succeeded)
  lib/actions/         Server Actions: properties, photos, bookings, add-ons, auth, contact
  lib/dal.ts           verifySession() + requireOwner() via React.cache()
  lib/stripe.ts        Lazy Stripe client
  lib/supabase/        Server + Browser client factories
  lib/validations/     Zod schemas: property, booking, add-on

Supabase Tables (current):
  profiles          (id, email, display_name, role, avatar_url)
  properties        (id, owner_id, name, location, address, bedrooms, bathrooms,
                     max_guests, nightly_rate, cleaning_fee, amenities[],
                     house_rules, check_in_time, check_out_time)
  property_photos   (id, property_id, storage_path, display_order)
  add_ons           (id, property_id, name, description, price, pricing_unit,
                     max_quantity, photo_url)
  bookings          (id, property_id, guest_id, check_in, check_out, guest_count,
                     subtotal, add_ons_total, processing_fee, total, status,
                     stripe_session_id, stripe_payment_intent_id)
  booking_add_ons   (id, booking_id, add_on_id, quantity, unit_price, total_price)

Supabase Storage: property-photos bucket (signed URL upload pattern)
```

---

## Feature Integration Architecture

### 1. Photo Sections and Ordering

**Schema: new `photo_sections` table + ALTER `property_photos`**

```sql
CREATE TABLE photo_sections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name          text NOT NULL,              -- "Rooms", "Pool", "Common Area"
  display_order int NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE property_photos
  ADD COLUMN section_id uuid REFERENCES photo_sections(id) ON DELETE SET NULL;
```

**Why a separate table instead of a text column on `property_photos`:**
- Owners can rename sections without updating every photo row
- Sections have independent display_order (section ordering vs photo-within-section ordering)
- `ON DELETE SET NULL` moves photos to "uncategorized" rather than deleting them
- Prevents typo-created duplicate sections

**RLS:** Ownership via EXISTS subquery on `properties.owner_id` -- same pattern as existing `property_photos` policies.

**Component boundaries:**

| Component | Type | Location | Responsibility |
|-----------|------|----------|---------------|
| `PhotoSectionManager` | Client | `components/dashboard/` | Top-level: list sections, drag-reorder sections, create section |
| `PhotoSection` | Client | `components/dashboard/` | Single section: header (rename/delete), photo grid, drag-reorder photos within |
| `PhotoUploader` | Client (modified) | `components/dashboard/` | Now accepts `sectionId` prop, uploads into section |
| `PhotoGallery` | Server (modified) | `components/property/` | Guest-facing: renders photos grouped by section tabs/headers |

**Server Actions (extend `actions/photos.ts`):**
- `createSection(propertyId, name)` -- new
- `renameSection(sectionId, name)` -- new
- `deleteSection(sectionId, propertyId)` -- new
- `updateSectionOrder(propertyId, sectionIds[])` -- batch reorder via RPC
- `updatePhotoOrder(sectionId, photoIds[])` -- batch reorder + cross-section move via RPC
- `savePhotoRecord(propertyId, storagePath, sectionId?)` -- modified signature

**Batch reorder pattern:** Use PostgreSQL functions for atomic batch updates instead of N individual UPDATE calls. Prevents race conditions and partial-failure inconsistency.

```sql
CREATE OR REPLACE FUNCTION reorder_photos(p_section_id uuid, p_photo_ids uuid[])
RETURNS void AS $$
BEGIN
  FOR i IN 1..array_length(p_photo_ids, 1) LOOP
    UPDATE property_photos
    SET display_order = i - 1, section_id = p_section_id
    WHERE id = p_photo_ids[i];
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Drag-and-drop:** Use `@dnd-kit/core` + `@dnd-kit/sortable`. Standard React DnD library, accessible, works with Server Component data-passing pattern (DnD is client-only, data fetched server-side passed as props).

### 2. Batch Photo Upload

**No schema changes.** Purely a UI enhancement to `PhotoUploader`.

Current `PhotoUploader` handles single files via hidden `<input type="file">`. Changes:
1. Add `multiple` attribute to file input
2. Queue files, upload sequentially (each needs its own signed URL -- no batch endpoint in Supabase Storage)
3. Show per-file progress indicators (uploading, success, error)

The sequential pattern is correct because `getSignedUploadUrl` is called once per file. Parallel uploads risk overwhelming the server action layer.

### 3. Bed Configuration

**Schema: new `bed_configurations` table**

```sql
CREATE TABLE bed_configurations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  bed_type    text NOT NULL CHECK (bed_type IN ('king', 'queen', 'double', 'twin', 'bunk')),
  count       int NOT NULL DEFAULT 1 CHECK (count > 0),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (property_id, bed_type)
);
```

The UNIQUE constraint on `(property_id, bed_type)` means one row per bed type per property ("3 Kings, 2 Queens"), not one row per individual bed. Simpler and matches the UI spec.

**RLS:** Ownership via EXISTS subquery on `properties.owner_id`.

**Component boundaries:**

| Component | Type | Location | Responsibility |
|-----------|------|----------|---------------|
| `BedConfigEditor` | Client | `components/dashboard/` | Inline in PropertyForm: +/- counters per bed type |
| `BedConfigDisplay` | Server | `components/property/` | Guest-facing: bed icons + counts |

**Server Action:** `saveBedConfig(propertyId, configs[])` in new `actions/beds.ts`. Uses delete-and-reinsert (simpler than diffing for max 5 bed types). Called alongside `updateProperty`.

### 4. Tiered Per-Person Pricing on Properties

**Schema: ALTER `properties`**

```sql
ALTER TABLE properties
  ADD COLUMN base_guest_count int,            -- guests included in nightly_rate
  ADD COLUMN extra_guest_rate numeric(10,2);  -- per-person per-night above base
```

Both nullable. When NULL, pricing works exactly as today (flat nightly_rate). Backward-compatible.

**Pricing logic change (CRITICAL -- affects booking total):**

Current in `createBookingAndCheckout`:
```typescript
const subtotal = nightly_rate * nights + cleaning_fee
```

New:
```typescript
const baseSubtotal = nightly_rate * nights + cleaning_fee
const extraGuests = Math.max(0, guestCount - (base_guest_count ?? maxGuests))
const extraGuestCharge = extraGuests * (extra_guest_rate ?? 0) * nights
const subtotal = baseSubtotal + extraGuestCharge
```

**Files that MUST change (with line-level precision):**

| File | What Changes |
|------|-------------|
| `lib/pricing.ts` (NEW) | Shared `calculateBookingTotal()` pure function |
| `components/property/PricingWidget.tsx` | Import shared pricing fn for display; add "Extra guest surcharge" line item |
| `lib/actions/bookings.ts` (lines 77-86) | Replace inline subtotal calc with shared pricing fn |
| `lib/validations/property.ts` | Add `base_guest_count`, `extra_guest_rate` to PropertySchema |
| `components/dashboard/PropertyForm.tsx` | Add base guest count + extra rate inputs |
| `types/database.ts` (Property interface) | Add `base_guest_count`, `extra_guest_rate` |

**This is the highest-risk change** because pricing logic currently exists in two places (PricingWidget client display + createBookingAndCheckout server calculation) and they MUST match. A mismatch means the displayed price differs from the charged price.

**Mitigation:** Extract `lib/pricing.ts` with a single `calculateBookingTotal()` pure function used by BOTH places. The server remains authoritative, but the client display uses the same logic.

```typescript
// lib/pricing.ts -- shared, pure function (no server/client dependency)
export interface PricingInput {
  nightlyRate: number
  cleaningFee: number
  nights: number
  guestCount: number
  maxGuests: number
  baseGuestCount: number | null
  extraGuestRate: number | null
  addOns: Array<{
    price: number
    pricingUnit: 'per_person' | 'per_booking'
    includedQuantity: number | null
    extraUnitRate: number | null
  }>
}

export function calculateBookingTotal(input: PricingInput) {
  const { nightlyRate, cleaningFee, nights, guestCount, maxGuests,
          baseGuestCount, extraGuestRate, addOns } = input

  const baseSubtotal = nightlyRate * nights + cleaningFee
  const extraGuests = Math.max(0, guestCount - (baseGuestCount ?? maxGuests))
  const extraGuestCharge = extraGuests * (extraGuestRate ?? 0) * nights

  const addOnsTotal = addOns.reduce((sum, a) => {
    return sum + calculateAddOnCost(a, guestCount)
  }, 0)

  const subtotal = baseSubtotal + extraGuestCharge
  const processingFee = parseFloat(((subtotal + addOnsTotal) * 0.029 + 0.30).toFixed(2))
  const total = subtotal + addOnsTotal + processingFee

  return { subtotal, extraGuestCharge, addOnsTotal, processingFee, total }
}
```

### 5. Tiered Experience (Add-On) Pricing

**Schema: ALTER `add_ons`**

```sql
ALTER TABLE add_ons
  ADD COLUMN included_quantity int,          -- "up to 10 people included"
  ADD COLUMN extra_unit_rate numeric(10,2);  -- "$50 per person above 10"
```

Both nullable. When NULL, pricing is flat (current behavior). Mirrors the property tiered pricing pattern.

**Pricing logic change:**

Current in `createBookingAndCheckout` (line 80-86):
```typescript
const cost = a.pricing_unit === 'per_person'
  ? Number(a.price) * input.guestCount
  : Number(a.price)
```

New (in shared `lib/pricing.ts`):
```typescript
export function calculateAddOnCost(
  addOn: { price: number; pricingUnit: string; includedQuantity: number | null; extraUnitRate: number | null },
  guestCount: number
): number {
  if (addOn.pricingUnit === 'per_booking') return addOn.price
  // per_person with optional tier
  if (addOn.includedQuantity != null && addOn.extraUnitRate != null) {
    const extraGuests = Math.max(0, guestCount - addOn.includedQuantity)
    return addOn.price + extraGuests * addOn.extraUnitRate
  }
  return addOn.price * guestCount
}
```

**Files that change:** Same downstream as property tiered pricing -- `PricingWidget`, `createBookingAndCheckout`, `AddOnSchema`, `AddOnForm`, `AddOn` interface, Stripe line items. All unified through `lib/pricing.ts`.

### 6. Experience (Add-On) Photos

**Schema: No changes needed.** `add_ons.photo_url` column already exists (nullable text). Currently unused in UI.

**Implementation:** Reuse the signed-URL upload pattern from property photos. Storage path: `{owner_id}/add-ons/{add_on_id}/{uuid}` in the same `property-photos` bucket (reusing bucket avoids new RLS policies).

**Component changes:**

| Component | Changes |
|-----------|---------|
| `AddOnForm.tsx` | Add inline single-photo upload (same pattern as PhotoUploader but for one image) |
| `AddOnCard.tsx` (guest) | Display photo if `photo_url` is present |
| `PricingWidget.tsx` | Optionally show thumbnail next to experience name |

**New Server Actions (extend `actions/add-ons.ts`):**
- `getAddOnPhotoUploadUrl(addOnId)` -- ownership verified, returns signed URL
- `saveAddOnPhotoUrl(addOnId, storagePath)` -- updates `add_ons.photo_url`
- `deleteAddOnPhoto(addOnId, storagePath)` -- removes from storage, nulls `photo_url`

### 7. Guest Invite System

**Schema: new `booking_guests` table**

```sql
CREATE TABLE booking_guests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  email        text NOT NULL,
  user_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status       text NOT NULL DEFAULT 'invited'
               CHECK (status IN ('invited', 'accepted', 'declined')),
  invite_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by   uuid NOT NULL REFERENCES profiles(id),
  invited_at   timestamptz DEFAULT now(),
  responded_at timestamptz,
  expires_at   timestamptz DEFAULT (now() + interval '30 days'),
  UNIQUE (booking_id, email)
);

CREATE INDEX idx_booking_guests_token ON booking_guests(invite_token);
```

**Key design decisions:**

1. **Invite by email, not user ID.** Guests may not have accounts yet. `email` is primary identifier; `user_id` populated when they sign up and accept.

2. **Booking creator is the "host."** They are `bookings.guest_id`. They do NOT appear in `booking_guests` -- only additional invitees.

3. **No payment splitting.** Per PROJECT.md, this is informational/social only ("who's coming").

4. **Token-based invite URLs.** `invite_token` is a 32-byte random hex string, not the row UUID. Has `expires_at` for security. Invite URL: `/bookings/invite?token={invite_token}`.

**Invite acceptance flow:**
```
Host enters email on booking detail page
  -> Server Action creates booking_guests row + sends invite email (Resend, already integrated)
  -> Email contains link: /bookings/invite?token={invite_token}
  -> Recipient clicks link
  -> If not logged in: redirect to /login with return URL
  -> If logged in: show booking summary, accept/decline buttons
  -> Accept: links user_id, updates status to 'accepted'
  -> Decline: updates status to 'declined'
```

**RLS policies:**
- SELECT: booking host (`bookings.guest_id` via join) + invited guests (`booking_guests.user_id`) can see rows
- INSERT: only the booking host
- UPDATE: invited guest can update own row (accept/decline)
- DELETE: booking host can remove invites

**Component boundaries:**

| Component | Type | Location | Responsibility |
|-----------|------|----------|---------------|
| `GuestInviteManager` | Client | `components/bookings/` | Email input, send invites, list invitees with status |
| `InviteAcceptPage` | Server | `app/(guest)/bookings/invite/` | Token lookup, booking summary, accept/decline |
| `BookingGuestList` | Server | `components/bookings/` | Avatar/name display of confirmed guests |

**New route:** `(guest)/bookings/invite/page.tsx` (query param `?token=`)

**New Server Actions (`actions/invites.ts`):**
- `sendBookingInvite(bookingId, email)` -- creates row, sends email via Resend
- `acceptInvite(token)` -- validates token + expiry, links user_id, updates status
- `declineInvite(token)` -- updates status
- `removeInvite(inviteId, bookingId)` -- host removes an invitee

### 8. Expandable Booking Detail View

**No schema changes.** UI enhancement to existing bookings display.

**Current state:** `BookingsTable` (owner dashboard) and guest bookings page show flat table rows with no expansion.

**Implementation:** Add collapsible detail panel to each booking row showing:
- Full price breakdown (subtotal, extra guest charges, add-ons with tiered info, processing fee, total)
- Add-on details with descriptions
- Guest list (from `booking_guests` join)
- Property photo thumbnail
- Check-in/check-out times and house rules

**Modified components:**
- `BookingsTable.tsx` (owner) -- add expandable row with Collapsible from shadcn/ui
- Guest bookings page -- booking cards with expandable detail + embedded `GuestInviteManager`

---

## Modified Data Flow: Booking Creation

Tiered pricing changes the core booking flow. Updated flow:

```
Guest: PricingWidget
  |-- calculateBookingTotal() from lib/pricing.ts   <-- NEW shared function
  |-- Display breakdown: base rate, extra guest surcharge, tiered add-ons
  |-- handleReserve()
      |
      v
Server: createBookingAndCheckout()
  |-- Fetch property (NOW includes base_guest_count, extra_guest_rate)
  |-- Fetch add_ons (NOW includes included_quantity, extra_unit_rate)
  |-- calculateBookingTotal() from lib/pricing.ts   <-- SAME shared function
  |-- Insert booking (subtotal NOW includes extra guest charges)
  |-- Insert booking_add_ons (total_price NOW reflects tiered pricing)
  |-- Build Stripe line items:
  |     - Property: $X x N nights
  |     - Extra guest surcharge: $Y x Z guests x N nights   <-- NEW line item
  |     - Cleaning fee: $C
  |     - [Experience]: $A (tiered description)              <-- MODIFIED
  |     - Processing fee: $P
  |-- Create Stripe Checkout Session
  |-- Redirect to Stripe
      |
      v
Stripe Webhook (flow unchanged, amounts differ):
  |-- checkout.session.completed / async_payment_succeeded
  |-- fulfillCheckout() updates booking status to 'confirmed'
  |-- Send confirmation email
```

---

## Complete Change Map

### New Database Tables

| Table | Purpose | FK to | RLS Pattern |
|-------|---------|-------|-------------|
| `photo_sections` | Named photo groups | `properties` | Ownership via properties.owner_id |
| `bed_configurations` | Bed type counts | `properties` | Ownership via properties.owner_id |
| `booking_guests` | Invited guests | `bookings`, `profiles` | Host + invitee access |

### Altered Tables

| Table | New Columns | Nullable | Backward Compatible |
|-------|-------------|----------|---------------------|
| `properties` | `base_guest_count`, `extra_guest_rate` | Yes | Yes -- null = current behavior |
| `property_photos` | `section_id` | Yes | Yes -- null = uncategorized |
| `add_ons` | `included_quantity`, `extra_unit_rate` | Yes | Yes -- null = flat pricing |

### New PostgreSQL Functions

| Function | Purpose |
|----------|---------|
| `reorder_photos(section_id, photo_ids[])` | Atomic batch photo reorder |
| `reorder_sections(property_id, section_ids[])` | Atomic batch section reorder |

### New Components

| Component | Location | Type |
|-----------|----------|------|
| `PhotoSectionManager` | `components/dashboard/` | Client |
| `PhotoSection` | `components/dashboard/` | Client |
| `BedConfigEditor` | `components/dashboard/` | Client |
| `BedConfigDisplay` | `components/property/` | Server |
| `GuestInviteManager` | `components/bookings/` | Client |
| `BookingGuestList` | `components/bookings/` | Server |

### Modified Components

| Component | What Changes |
|-----------|-------------|
| `PhotoUploader` | Accept `sectionId`, support `multiple` file input |
| `PhotoGallery` | Group photos by section with tabs/headers |
| `PropertyForm` | Add bed config, base guest count, extra guest rate fields |
| `PricingWidget` | Tiered pricing display for property + add-ons |
| `AddOnForm` | Photo upload, included_quantity, extra_unit_rate fields |
| `AddOnCard` | Display photo, tiered pricing info |
| `BookingsTable` | Expandable detail rows |

### New Server Action Files

| File | Actions |
|------|---------|
| `actions/beds.ts` | `saveBedConfig` |
| `actions/invites.ts` | `sendBookingInvite`, `acceptInvite`, `declineInvite`, `removeInvite` |

### Extended Server Action Files

| File | New/Modified Actions |
|------|---------------------|
| `actions/photos.ts` | `createSection`, `renameSection`, `deleteSection`, `updateSectionOrder`, `updatePhotoOrder`; modify `savePhotoRecord` signature |
| `actions/add-ons.ts` | `getAddOnPhotoUploadUrl`, `saveAddOnPhotoUrl`, `deleteAddOnPhoto` |
| `actions/bookings.ts` | Replace inline pricing with `calculateBookingTotal()` import |

### New Shared Utilities

| File | Purpose |
|------|---------|
| `lib/pricing.ts` | `calculateBookingTotal()` + `calculateAddOnCost()` -- shared between client and server |

### New/Extended Validation Schemas

| File | Changes |
|------|---------|
| `validations/property.ts` | Add `base_guest_count`, `extra_guest_rate` |
| `validations/add-on.ts` | Add `included_quantity`, `extra_unit_rate` |
| `validations/invite.ts` (new) | Email validation for invites |
| `validations/bed-config.ts` (new) | Bed type enum + count validation |

### New Route

| Route | Purpose |
|-------|---------|
| `(guest)/bookings/invite/page.tsx` | Invite acceptance page (token-based) |

### Updated TypeScript Types

| Interface | New Fields |
|-----------|-----------|
| `Property` | `base_guest_count`, `extra_guest_rate` |
| `PropertyPhoto` | `section_id` |
| `AddOn` | `included_quantity`, `extra_unit_rate` |
| New: `PhotoSection` | `id`, `property_id`, `name`, `display_order` |
| New: `BedConfiguration` | `id`, `property_id`, `bed_type`, `count` |
| New: `BookingGuest` | `id`, `booking_id`, `email`, `user_id`, `status`, `invite_token`, `invited_by`, `invited_at`, `responded_at`, `expires_at` |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Duplicated Pricing Logic
**What:** Calculating totals separately in PricingWidget and createBookingAndCheckout (currently happening in v1.0).
**Why bad:** Tiered pricing makes divergence more likely and more dangerous -- displayed price differs from charged price.
**Instead:** Extract `lib/pricing.ts` with single `calculateBookingTotal()` function imported by both.

### Anti-Pattern 2: Individual UPDATE Calls for Reordering
**What:** Sending N separate `UPDATE property_photos SET display_order = X WHERE id = Y` on drag-drop.
**Why bad:** N round trips, race conditions, partial failure leaves inconsistent ordering.
**Instead:** PostgreSQL function that accepts ordered array and updates atomically.

### Anti-Pattern 3: Invite URLs Using Raw Row UUIDs
**What:** `/bookings/invite/{booking_guest_id}` with the database UUID.
**Why bad:** UUIDs can be enumerated, no expiry, no revocation.
**Instead:** Random `invite_token` (32 bytes hex), `expires_at` column, index on token for fast lookup.

### Anti-Pattern 4: Photo Section as Text Column
**What:** Adding `section: text` to `property_photos` instead of a separate table.
**Why bad:** Renaming requires updating every photo row. No section ordering. Typos create duplicates.
**Instead:** Separate `photo_sections` table with FK relationship.

### Anti-Pattern 5: Parallel Batch Uploads
**What:** Uploading all files simultaneously when batch uploading photos.
**Why bad:** Each file needs a signed URL (server action call). Parallel calls overwhelm the action layer and signed URLs may expire before upload completes.
**Instead:** Sequential upload queue with progress indicator per file.

---

## Recommended Build Order

Based on dependency analysis:

```
Phase 1: Schema Foundation (all migrations, no code changes break existing)
  |- All ALTER TABLE migrations (additive, nullable columns)
  |- All CREATE TABLE migrations
  |- PostgreSQL reorder functions
  |- RLS policies for new tables
  |- Updated TypeScript types in database.ts
  |- lib/pricing.ts shared function

Phase 2: Bed Config + Property Tiered Pricing (standalone owner features)
  |- BedConfigEditor component + saveBedConfig action
  |- PropertyForm updates (new fields for beds + pricing tiers)
  |- BedConfigDisplay (guest-facing property detail)
  |- PricingWidget updated for tiered property pricing
  |- createBookingAndCheckout updated to use lib/pricing.ts

Phase 3: Photo Sections + Ordering + Batch Upload (standalone, medium complexity)
  |- PhotoSectionManager + PhotoSection components
  |- @dnd-kit integration for drag-and-drop
  |- Batch upload in PhotoUploader
  |- PhotoGallery grouped display (guest-facing)

Phase 4: Experience Enhancements (depends on Phase 1 schema)
  |- Add-on photo upload flow
  |- Tiered add-on pricing (form, display, booking calc)
  |- AddOnCard + PricingWidget updates

Phase 5: Guest Invites + Expandable Bookings (depends on Phase 1 schema)
  |- booking_guests table + RLS
  |- GuestInviteManager + invite Server Actions
  |- Invite acceptance route + flow
  |- Expandable booking detail cards (both owner + guest views)
  |- BookingGuestList display
```

**Parallelism:** Phase 2 and Phase 3 are independent and can run in parallel. Phase 4 and Phase 5 are independent and can run in parallel. Critical path: Phase 1 -> (2 || 3) -> (4 || 5).

**Why this order:**
- Phase 1 first: all code changes depend on schema + types existing
- Phase 2 before Phase 4: property tiered pricing establishes the `lib/pricing.ts` pattern that add-on tiered pricing reuses
- Phase 3 independent: photo management has zero overlap with pricing or invites
- Phase 5 last: guest invites depend on booking detail view being expandable, and are the most complex new user flow

---

## Sources

- Existing codebase analysis -- all files in `src/lib/actions/`, `src/components/`, `src/types/`, `src/app/` (PRIMARY source, HIGH confidence)
- Supabase documentation: RLS patterns, Storage signed URLs, RPC functions (HIGH confidence -- matches existing codebase patterns)
- @dnd-kit: standard React DnD library for sortable lists (HIGH confidence)

---
*Architecture research for: Whole-Tel v1.1 feature integration*
*Researched: 2026-03-07*

---
---

# Architecture: v1.2 Integration Patterns

**Domain:** Booking platform feature extension -- itinerary builder, split payments, partner application, amenities
**Researched:** 2026-03-23
**Confidence:** HIGH -- based on direct codebase inspection + verified Stripe/Supabase official documentation

---

## Current Architecture State (after v1.1)

As of v1.1, the codebase has:

```
lib/pricing.ts           Shared calculatePricing() -- pure function, client + server
lib/dal.ts               verifySession() + requireOwner() -- three-layer auth
lib/actions/bookings.ts  createBookingAndCheckout() -- Stripe Checkout Session
lib/actions/booking-invitations.ts  sendInvitation() / acceptInvitation() / declineInvitation()
api/webhooks/stripe/     fulfillCheckout() -- handles checkout.session.completed + async_payment_succeeded
types/database.ts        7 interfaces: Profile, Property, PropertyPhoto, AddOn,
                         Booking, BookingAddOn, BookingInvitation

Supabase Tables (v1.1 state):
  profiles, properties, property_photos, photo_sections, add_ons,
  bookings, booking_add_ons, booking_invitations, bed_configurations

properties.amenities:  JSONB -- currently stores string[] from comma-split input
```

---

## System Overview (v1.2 additions)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Next.js App Router                            │
├───────────────────────────┬─────────────────────┬───────────────────┤
│   (guest) routes          │   (owner) routes    │   public routes   │
│  /bookings/[id]/itinerary │  /dashboard         │  /partner-apply   │
│  /bookings (split panel)  │  /dashboard/        │                   │
│                           │    amenities        │                   │
└──────────┬────────────────┴──────────┬──────────┴───────────────────┘
           │ Server Actions             │ Server Components
           ▼                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     lib/actions/  (Server Actions)                   │
│  bookings.ts (unchanged)  ·  itinerary.ts (new)                     │
│  split-payments.ts (new)  ·  partner-applications.ts (new)          │
│  properties.ts (amenity shape change)  ·  amenities.ts (new)        │
└────────────┬────────────────────────────────────┬────────────────────┘
             │                                    │
             ▼                                    ▼
┌────────────────────────┐       ┌────────────────────────────────────┐
│   Stripe API           │       │           Supabase                  │
│  Checkout Sessions     │       │  Auth · Database · Storage          │
│  (existing, unchanged) │       │  Realtime: itinerary_items table    │
│  Payment Intents (new) │       │  RLS on every table                 │
│  Payment Links (new)   │       │                                     │
└────────────┬───────────┘       └──────────────────┬─────────────────┘
             │                                      │
             ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     api/webhooks/stripe/route.ts                     │
│  (existing) checkout.session.completed                               │
│  (new) payment_intent.succeeded  -- split payment fulfillment        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Feature Integration Architecture

### 1. Itinerary Builder

**What it is:** A calendar-based drag-and-drop UI where the booking organizer (and accepted invitees) can schedule activities across the booking days.

**Schema: new `itinerary_items` table**

```sql
CREATE TABLE itinerary_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  day_offset    integer NOT NULL,          -- 0 = check-in day, 1 = day 2, etc.
  start_time    time NOT NULL,             -- wall clock: '14:00'
  duration_mins integer NOT NULL DEFAULT 60,
  title         text NOT NULL,
  description   text,
  add_on_id     uuid REFERENCES add_ons(id) ON DELETE SET NULL,
  created_by    uuid NOT NULL REFERENCES profiles(id),
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Enable for realtime
ALTER PUBLICATION supabase_realtime ADD TABLE itinerary_items;

-- RLS policies
-- SELECT: booking organizer + accepted invitees
CREATE POLICY "Booking participants can view itinerary"
  ON itinerary_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = itinerary_items.booking_id
      AND bookings.guest_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM booking_invitations
      WHERE booking_invitations.booking_id = itinerary_items.booking_id
      AND booking_invitations.accepted_by = auth.uid()
      AND booking_invitations.status = 'accepted'
    )
  );
-- INSERT/UPDATE/DELETE: same check (organizer + accepted invitees can edit)
```

**Relationship to bookings:** `itinerary_items` links to `bookings` (not `properties`). Items are booking-specific. If a guest books the same property twice, they get two separate itineraries.

**Relationship to add-ons:** `add_on_id` is optional. Pre-booked add-ons (e.g., boat tour on day 3) can be pinned to a time slot visually. Deleting an itinerary item does NOT cancel the add-on -- it only removes the schedule entry.

**Component boundaries:**

| Component | Type | Purpose |
|-----------|------|---------|
| `ItineraryPage` (`app/(guest)/bookings/[id]/itinerary/page.tsx`) | Server Component | Fetches booking + initial itinerary_items, verifies session |
| `ItineraryBuilder` (`components/booking/itinerary/ItineraryBuilder.tsx`) | Client (`'use client'`) | DnD calendar, Realtime subscription, optimistic state |
| `DayColumn` | Client | Drop target per booking day |
| `ActivityCard` | Client | Draggable item; click to edit |
| `AddActivitySheet` | Client | shadcn Sheet for adding new items |

**DnD library:** `@dnd-kit` is already installed (`@dnd-kit/react` confirmed in PROJECT.md). Use `@dnd-kit/core` + `@dnd-kit/sortable` for the time slot grid. The itinerary builder uses the same library already in the codebase -- no new dependency.

**Real-time sync:**

Supabase Realtime Postgres Changes is the right tool here. Requirements:
1. Add `itinerary_items` to `supabase_realtime` publication (SQL above)
2. RLS policies on the table control who receives events
3. Realtime subscription must be in the Client Component (WebSocket is client-side only)
4. Server Component fetches initial state; Client Component subscribes to deltas

Performance note: Postgres Changes triggers one authorization check per subscriber per write. For groups of 2-15 people, this is ~15 checks per drag operation -- negligible at current scale.

**Server Actions (`lib/actions/itinerary.ts`):**
- `upsertItineraryItem(input)` -- create or update; scoped to confirmed bookings owned by user
- `deleteItineraryItem(itemId, bookingId)` -- verifies ownership before delete
- `reorderItineraryItems(bookingId, orderedIds[])` -- batch update display_order

**Data flow:**
```
Server: ItineraryPage fetches booking + itinerary_items
    ↓ props
Client: ItineraryBuilder renders DayColumn grid
    ↓ on mount
Client: supabase.channel('itinerary:bookingId').on('postgres_changes').subscribe()
    ↓ user drags card
Client: optimistic setItems() → upsertItineraryItem() Server Action
    ↓ on success
Supabase broadcasts change → other connected clients update
```

---

### 2. Split Payment System

**What it is:** After booking is confirmed, the organizer can register all attendees (name/email/phone) and optionally generate per-guest payment links so guests can pay their share directly. The platform tracks payment status per guest.

**This is NOT individual Stripe Checkout Sessions per guest.** The existing booking (and its full Stripe Checkout Session) remains the single source of truth. Split payments are a secondary administrative layer on top.

**Key decision -- Checkout Session vs Payment Intent:**

The existing booking flow uses Checkout Sessions (correct -- keeps full cart UX for initial booking). Split payments use Payment Intents directly because:
- Multiple contributors paying different amounts against the same booking
- Need a persistent payment object to track status across sessions
- Stripe Payment Links (built on Payment Intents) generate shareable URLs
- No need for full cart UX for a "pay your share" flow
- Authoritative: `payment_intent.succeeded` webhook confirms each share payment

**Schema: two new tables**

```sql
-- Guest registration (all attendees, not just auth users)
CREATE TABLE booking_guests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  name          text NOT NULL,
  email         text NOT NULL,
  phone         text,
  registered_by uuid NOT NULL REFERENCES profiles(id),
  created_at    timestamptz DEFAULT now(),
  UNIQUE(booking_id, email)
);

-- Split payment tracking (one row per guest payment share)
CREATE TABLE booking_payments (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id               uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  guest_email              text NOT NULL,
  amount_cents             integer NOT NULL,
  stripe_payment_intent_id text UNIQUE,
  stripe_payment_link_id   text,
  status                   text NOT NULL DEFAULT 'pending',
  -- pending | paid | failed | cancelled
  deadline_at              timestamptz,
  paid_at                  timestamptz,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

-- RLS: booking organizer (guest_id) can read/write both tables
-- Guests themselves have no direct DB access -- they pay via Stripe link
```

**Split payment data flow:**
```
1. Booking confirmed (existing Checkout Session flow, unchanged)
2. Organizer opens split payment panel in booking detail
3. Registers each guest: name, email, phone → booking_guests table
4. Optionally sets split amounts (must sum to booking total)
5. createSplitPaymentLink(bookingId, guestEmail, amountCents) Server Action:
   a. Verify amounts sum to booking.total (server-side)
   b. Create Stripe Payment Intent with metadata: { booking_id, guest_email }
   c. Create Stripe Payment Link from Payment Intent
   d. Insert booking_payments row with status='pending', stripe_payment_intent_id
   e. Return payment link URL to organizer
6. Organizer shares link with guest (copy URL or email)
7. Guest pays via Stripe Payment Link
8. Stripe fires payment_intent.succeeded webhook
9. fulfillSplitPayment() handler:
   a. Looks up booking_payments by stripe_payment_intent_id
   b. Updates status='paid', paid_at=now()
   c. Checks if all booking_payments are paid
   d. (Optional) send confirmation email to guest
```

**Webhook extension (api/webhooks/stripe/route.ts):**
```typescript
case 'payment_intent.succeeded': {
  const pi = event.data.object as Stripe.PaymentIntent
  await fulfillSplitPayment(pi)  // new handler
  break
}
```

**Payment deadline rule (36-hour first payment):**
This is application-level logic -- Stripe has no concept of booking deadlines. Implement as:
1. `deadline_at` column on `booking_payments` (set on creation)
2. Check-on-read: when booking detail loads, if `deadline_at < now()` and `status = 'pending'`, show "payment overdue" UI
3. Optional: Supabase Edge Function or external cron job to auto-cancel overdue payments
4. Do NOT rely on Stripe to enforce deadlines -- Stripe Payment Links don't expire automatically (unless explicitly set on creation with `expires_at`)

**Server Actions (`lib/actions/split-payments.ts`):**
- `registerBookingGuests(bookingId, guests[])` -- bulk upsert booking_guests
- `createSplitPaymentLink(bookingId, guestEmail, amountCents)` -- validates + creates Stripe Payment Intent + Link
- `cancelSplitPayment(paymentId)` -- cancels Payment Intent, updates status
- `getSplitPaymentStatus(bookingId)` -- summary: total paid, total pending, overdue

**Component boundaries:**

| Component | Type | Purpose |
|-----------|------|---------|
| `SplitPaymentPanel` | Client | Accordion section in booking detail; guest list + payment status |
| `GuestRegistrationForm` | Client | Bulk name/email/phone entry per attendee |
| `PaymentLinkCard` | Server-ish | Shows link URL, status badge, copy button |

---

### 3. Partner Application System

**What it is:** Replaces the open owner signup. Prospective property partners fill out an application form (with file uploads). Whole-Tel admin reviews and approves, then manually provisions the owner account.

**Schema: new `partner_applications` table**

```sql
CREATE TABLE partner_applications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_name  text NOT NULL,
  email           text NOT NULL,
  phone           text,
  property_name   text NOT NULL,
  location        text NOT NULL,
  website_url     text,
  description     text NOT NULL,
  document_paths  text[],
  -- Supabase Storage paths only, never full URLs (signed URLs expire)
  status          text NOT NULL DEFAULT 'pending',
  -- pending | reviewing | approved | rejected
  reviewed_by     uuid REFERENCES profiles(id),
  review_notes    text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- RLS: no user reads (anonymous submission)
-- Admin access via service_role client only
-- INSERT: allow anon (public application form)
CREATE POLICY "Anyone can submit a partner application"
  ON partner_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
-- SELECT/UPDATE: service_role only (no RLS policy = service_role bypass)
```

**File upload pattern:** Reuse the exact signed-URL pattern from property photos.
1. Client calls `requestPartnerDocUploadUrl(filename)` Server Action
2. Server generates signed URL for `partner-docs/` bucket
3. Client uploads directly to Supabase Storage (bypasses 1MB Server Action limit)
4. Client passes `storagePath` to final `submitPartnerApplication()` call

Storage path format: `partner-docs/{applicationId}/{filename}` -- generate a UUID client-side for the applicationId before submission to pre-scope the uploads.

**CRITICAL: Store storage paths, not signed URLs.** Signed URLs expire in ~1 hour. Store the path only and generate fresh signed URLs on demand when admin views the application.

**Server Actions (`lib/actions/partner-applications.ts`):**
- `requestPartnerDocUploadUrl(filename)` -- generates Supabase Storage signed upload URL (public route, no auth required)
- `submitPartnerApplication(input)` -- Zod validation, insert to DB, send notification email to adam@whole-tel.com
- `updateApplicationStatus(id, status, notes)` -- admin only, `requireOwner()` guard

**Route:** Public page at `/partner-apply` (no auth route group needed -- outside `(guest)` and `(owner)`). Or inside `(auth)` if wanting to keep unauthenticated users out, but the use case suggests public access.

**Notification email:** On submission, send admin notification via Resend to `adam@whole-tel.com`. Reuse the existing `getResend()` pattern from `lib/email.ts`.

---

### 4. Amenities System

**What it is:** Replace the free-text comma-separated amenities input with a categorized checkbox selector. Categories: Water, Social, Work/Event, Culinary, Wellness.

**Schema: NO new tables.** Migrate `properties.amenities` JSONB column shape only.

Current shape: `["Pool", "Hot Tub", "BBQ Grill"]` -- plain string array from comma-split

New shape:
```typescript
interface AmenityItem {
  id: string       // stable slug: "pool", "hot_tub", "bbq_grill"
  category: 'water' | 'social' | 'work_event' | 'culinary' | 'wellness'
  label: string    // display name: "Pool", "Hot Tub", "BBQ Grill"
}
// properties.amenities: AmenityItem[]
```

**Why JSONB and not a normalized table:**
- Same reasoning as `bed_config` (already JSONB) -- no complex queries needed on individual amenities
- Amenities don't have their own lifecycle (no adding/removing mid-stay)
- No foreign key relationships needed
- Simple array of objects matches the checkbox UI perfectly
- Consistent with the existing codebase pattern

**Canonical amenity list (defined in code, not DB):**

```typescript
// lib/amenities.ts -- new file
export const AMENITY_CATALOG: AmenityItem[] = [
  // Water
  { id: 'pool', category: 'water', label: 'Pool' },
  { id: 'hot_tub', category: 'water', label: 'Hot Tub' },
  { id: 'beach_access', category: 'water', label: 'Beach Access' },
  // Social
  { id: 'outdoor_bar', category: 'social', label: 'Outdoor Bar' },
  { id: 'game_room', category: 'social', label: 'Game Room' },
  // Work/Event
  { id: 'event_space', category: 'work_event', label: 'Event Space' },
  { id: 'av_equipment', category: 'work_event', label: 'AV Equipment' },
  // Culinary
  { id: 'full_kitchen', category: 'culinary', label: 'Full Kitchen' },
  { id: 'bbq_grill', category: 'culinary', label: 'BBQ Grill' },
  // Wellness
  { id: 'gym', category: 'wellness', label: 'Gym' },
  { id: 'yoga_studio', category: 'wellness', label: 'Yoga Studio' },
  // ... extend as needed
]
```

**Migration:** Existing properties have free-text amenity strings. The migration strategy:
1. Write a one-time migration script that maps known strings to catalog IDs (best-effort)
2. Unrecognized strings become custom items with `category: 'social'` as default
3. Owner will see existing selections pre-checked where mappable

**Component changes:**

| Component | Change |
|-----------|--------|
| `PropertyForm.tsx` | Replace text input with `AmenitiesSelector` component |
| `AmenitiesSelector.tsx` (new) | Grouped checkbox grid by category |
| `PropertyDetail` (guest-facing) | Render categorized amenity icons/badges |

**Server Action changes (`lib/actions/properties.ts`):**
Replace the `amenitiesRaw.split(',')` parsing block with direct acceptance of `AmenityItem[]`. The Zod schema for property will validate the array shape.

---

## New Files Summary

### New Tables

| Table | Purpose | FK to | Access |
|-------|---------|-------|--------|
| `itinerary_items` | Activity schedule per booking | `bookings`, `add_ons`, `profiles` | Booking organizer + accepted invitees |
| `booking_guests` | Registered attendees (name/email/phone) | `bookings`, `profiles` | Booking organizer only |
| `booking_payments` | Split payment tracking per guest | `bookings` | Booking organizer only |
| `partner_applications` | Partner onboarding applications | `profiles` (reviewer) | Submit: public; Read/Update: service_role |

### Modified Tables

| Table | Change | Migration Risk |
|-------|--------|---------------|
| `properties.amenities` | Shape change: string[] → AmenityItem[] | Low -- mapping script needed for existing data |

### New Server Action Files

| File | Actions |
|------|---------|
| `lib/actions/itinerary.ts` | `upsertItineraryItem`, `deleteItineraryItem`, `reorderItineraryItems` |
| `lib/actions/split-payments.ts` | `registerBookingGuests`, `createSplitPaymentLink`, `cancelSplitPayment`, `getSplitPaymentStatus` |
| `lib/actions/partner-applications.ts` | `requestPartnerDocUploadUrl`, `submitPartnerApplication`, `updateApplicationStatus` |
| `lib/amenities.ts` | `AMENITY_CATALOG` constant + `groupByCategory()` helper |

### New/Modified Components

| Component | Type | New or Modified |
|-----------|------|----------------|
| `ItineraryBuilder.tsx` | Client | New |
| `DayColumn.tsx` | Client | New |
| `ActivityCard.tsx` | Client | New |
| `AddActivitySheet.tsx` | Client | New |
| `SplitPaymentPanel.tsx` | Client | New |
| `GuestRegistrationForm.tsx` | Client | New |
| `PaymentLinkCard.tsx` | Client | New |
| `PartnerApplicationForm.tsx` | Client | New |
| `AmenitiesSelector.tsx` | Client | New |
| `PropertyForm.tsx` | Client | Modified (amenities field) |
| `api/webhooks/stripe/route.ts` | Server | Modified (add payment_intent.succeeded) |
| `lib/actions/properties.ts` | Server | Modified (amenity shape) |
| `types/database.ts` | Types | Extended (4 new interfaces + AmenityItem) |

### New Routes

| Route | Group | Auth |
|-------|-------|------|
| `/bookings/[id]/itinerary` | `(guest)` | Required (verifySession) |
| `/partner-apply` | public (no group) | None |

---

## Build Order (Dependencies)

```
Step 1: Amenities system
  Rationale: Purely additive, zero payment-flow risk. Modifies only
  PropertyForm + properties action. Validates the JSONB shape migration pattern.
  No dependencies.

Step 2: Partner application
  Rationale: Self-contained. Mirrors existing photo upload pattern.
  No dependencies on bookings or payment flow.
  New route + new table + no changes to existing paths.

Step 3: Itinerary builder
  Rationale: Requires confirmed bookings (existing) to test against.
  New table + Realtime subscription + @dnd-kit (already installed).
  No payment-flow changes.
  Dependency: bookings.status = 'confirmed' must exist (it does).

Step 4: Split payments
  Rationale: Touches payment infrastructure -- highest risk.
  Build last after simpler features are stable.
  Dependencies: confirmed bookings, booking_guests registration,
  Stripe webhook extension.
```

**Why this order:** The payment flow is the most critical path in the codebase. Changes to it (webhook handler extension) should happen last, after the team has delivered the lower-risk features and has confidence in the v1.2 build process.

---

## Integration Points -- Existing System Touchpoints

| Existing System | How v1.2 Touches It |
|-----------------|---------------------|
| `lib/actions/bookings.ts` | No changes -- initial booking flow unchanged |
| `api/webhooks/stripe/route.ts` | Add `payment_intent.succeeded` case (new handler, doesn't touch existing `checkout.session.completed` logic) |
| `lib/actions/properties.ts` | Amenity shape change in `createProperty` + `updateProperty` (replace split(',') parsing) |
| `types/database.ts` | Add `ItineraryItem`, `BookingGuest`, `BookingPayment`, `PartnerApplication`, `AmenityItem` |
| `lib/pricing.ts` | No changes -- split payments don't recalculate booking totals |
| `booking_invitations` table | `itinerary_items` RLS policy references `booking_invitations.accepted_by` for multi-editor access |
| Supabase Storage | New `partner-docs/` bucket (or prefix) for application documents |

---

## Anti-Patterns

### Anti-Pattern 1: Trusting Client-Submitted Split Payment Amounts

**What people do:** Accept `amount` from the frontend when creating a payment link.
**Why it's wrong:** Guest could manipulate their share. Same attack vector as the main booking price.
**Do this instead:** Validate on server that all shares sum to `booking.total` before creating any Payment Intent. If the organizer sets custom splits, recalculate the sum server-side.

### Anti-Pattern 2: Multiple Checkout Sessions for Split Payments

**What people do:** Create a new Stripe Checkout Session for each guest's share.
**Why it's wrong:** Checkout Sessions are designed for a single buyer. Multiple unrelated sessions have no shared booking reference, making webhook reconciliation brittle. Idempotency is impossible.
**Do this instead:** Payment Intents with `metadata: { booking_id, guest_email }`. One Payment Intent per share, all linked to the same booking in the DB.

### Anti-Pattern 3: Storing Signed URLs for Partner Documents

**What people do:** Store the full signed URL from Supabase Storage in `partner_applications.document_paths`.
**Why it's wrong:** Signed URLs expire (~1 hour). A stored URL becomes invalid the next day, breaking admin document access permanently.
**Do this instead:** Store the Storage path only (e.g., `partner-docs/uuid/passport.pdf`). Generate a fresh signed URL on demand when admin loads the application review page.

### Anti-Pattern 4: Realtime Subscriptions in Server Components

**What people do:** Try to subscribe to Supabase Realtime in a Server Component or Server Action.
**Why it's wrong:** Server Components render once. They have no persistent connection. Realtime requires a WebSocket held open on the client.
**Do this instead:** Server Component fetches initial `itinerary_items` synchronously. Pass as props to `ItineraryBuilder` Client Component. The client subscribes for delta updates via Postgres Changes.

### Anti-Pattern 5: Free-Text Amenity Strings (Existing Problem Being Fixed)

**What the current code does:** `amenities: ["Pool", "Hot Tub"]` -- plain strings from comma input.
**Why it's wrong:** No stable IDs (can't filter/search reliably), no categories, display name drift across properties.
**Do this instead:** `AmenityItem[]` with stable `id` slugs and explicit `category`. JSONB column stays, shape improves.

---

## Sources

- Codebase inspection (PRIMARY): `src/lib/actions/bookings.ts`, `src/lib/stripe.ts`, `src/lib/dal.ts`, `src/types/database.ts`, `src/app/api/webhooks/stripe/route.ts`, `src/lib/actions/booking-invitations.ts`, `src/lib/actions/properties.ts` -- HIGH confidence
- [Stripe Payment Intents API](https://docs.stripe.com/payments/payment-intents) -- HIGH confidence (official docs, directly fetched)
- [Supabase Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) -- HIGH confidence (official docs, directly fetched; confirmed RLS + publication requirements)
- [Supabase Realtime overview](https://supabase.com/docs/guides/realtime) -- HIGH confidence
- WebSearch: dnd-kit calendar patterns, JSONB vs normalized amenities schema -- MEDIUM confidence (consistent with official documentation)

---
*Architecture research for: Whole-Tel v1.2 feature extension*
*Researched: 2026-03-23*
