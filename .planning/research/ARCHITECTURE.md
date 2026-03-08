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
