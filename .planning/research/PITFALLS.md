# Domain Pitfalls: v1.1 Whole-Tel Enhancements

**Domain:** Boutique hotel booking platform -- adding photo management, tiered pricing, guest invites, rebrand
**Researched:** 2026-03-07
**Confidence:** HIGH (pitfalls derived from actual codebase analysis + official docs + community patterns)

---

## Critical Pitfalls

### Pitfall 1: Photo Reorder Race Condition -- display_order Corruption

**What goes wrong:**
The existing `savePhotoRecord` action (line 56-60 of `photos.ts`) calculates `display_order` by counting existing photos: `count ?? 0`. When adding drag-to-reorder, developers typically UPDATE individual rows with new `display_order` values. If the user drags rapidly or the network is slow, multiple reorder requests fire concurrently. Two requests read the same current order, then both write conflicting orders. Result: duplicate `display_order` values, photos appear in wrong positions, or photos "jump back" to old positions after briefly showing the correct order.

**Why it happens:**
No database-level uniqueness constraint on `(property_id, display_order)`. The count-based ordering in `savePhotoRecord` already has this flaw for rapid sequential uploads, but it becomes catastrophic with drag-and-drop where every drag fires a reorder mutation.

**Consequences:**
- Photos display in wrong order on the guest-facing property page
- PhotoGallery hero image (index 0) becomes unpredictable
- Owner loses trust in the reorder feature, stops using it

**Prevention:**
1. Send the entire ordered array of photo IDs in a single server action call, not individual position updates. One atomic UPDATE per reorder operation.
2. Use a transaction or a single SQL statement: `UPDATE property_photos SET display_order = data.new_order FROM (VALUES ...) AS data(id, new_order) WHERE property_photos.id = data.id`
3. Add a UNIQUE constraint on `(property_id, display_order)` with DEFERRABLE INITIALLY DEFERRED so the batch update can temporarily violate it within the transaction.
4. Use `useOptimistic` on the client to show the new order immediately, but do NOT fire the server action until the user stops dragging (debounce 300ms).

**Detection:**
- Two photos sharing the same `display_order` for the same property
- Gallery hero image changes unexpectedly between page loads
- Photo order differs between owner dashboard and guest-facing page

**Phase to address:** Photo management phase (sections + ordering)

---

### Pitfall 2: Schema Migration Breaks Existing Photo Queries -- NULL section Column

**What goes wrong:**
Adding a `section` column to the existing `property_photos` table means all existing photos have `section = NULL`. The guest-facing `PhotoGallery` component and the owner `PhotoUploader` component both query photos without any section filter. If the new photo management UI groups by section, existing sectionless photos become invisible -- they don't appear in any section group. The property page looks like it has zero photos.

**Why it happens:**
Developer adds `ALTER TABLE property_photos ADD COLUMN section TEXT` and builds the new UI to `GROUP BY section` or filter by section. Existing rows have NULL section. `WHERE section = 'Rooms'` excludes them. Even `GROUP BY section` puts them in a NULL group that the UI doesn't render.

**Consequences:**
- All existing property photos disappear from the guest-facing gallery
- Owner dashboard photo management shows empty state for properties that had photos
- Data appears lost (it's not -- just invisible)

**Prevention:**
1. Migration must set a default: `ALTER TABLE property_photos ADD COLUMN section TEXT NOT NULL DEFAULT 'General'`
2. Backfill existing rows in the same migration: `UPDATE property_photos SET section = 'General' WHERE section IS NULL`
3. The guest-facing `PhotoGallery` must continue to work with a flat list -- section grouping is an enhancement for the detail page, not a requirement for the gallery grid
4. Test the migration against the existing property detail page BEFORE building any new section UI

**Detection:**
- Property detail page shows "No photos yet" for properties that previously had photos
- `SELECT COUNT(*) FROM property_photos WHERE section IS NULL` returns > 0 after migration

**Phase to address:** Photo management phase -- first migration, before any UI changes

---

### Pitfall 3: Tiered Per-Person Pricing Breaks Existing Booking Flow

**What goes wrong:**
The existing `createBookingAndCheckout` action (line 77-90 of `bookings.ts`) calculates pricing as `nightly_rate * nights + cleaning_fee`. Adding per-person pricing above a threshold (e.g., "$100/night/person above 25 guests") requires changing this calculation. But the change must be backward-compatible: properties WITHOUT tiered pricing (the current properties) must still calculate correctly. If the new fields (`extra_person_rate`, `included_guests`) are required or default to 0, existing properties either error or charge $0 for all guests.

**Why it happens:**
Developer adds `extra_person_rate` and `included_guests` columns to `properties`, makes them required, deploys. Existing properties have these set to 0 or NULL. The pricing formula becomes: `nightly_rate * nights + MAX(0, guest_count - included_guests) * extra_person_rate * nights`. If `included_guests = 0`, EVERY guest is "extra" and gets charged the extra rate. If `included_guests = NULL`, the subtraction produces NULL and the whole calculation breaks.

**Consequences:**
- Existing properties show wildly wrong prices on the guest-facing pricing widget
- Stripe Checkout receives incorrect amounts
- Guests are overcharged or undercharged for existing properties

**Prevention:**
1. Add columns with safe defaults: `included_guests INTEGER NOT NULL DEFAULT 0` and `extra_person_rate NUMERIC(10,2) NOT NULL DEFAULT 0`
2. When `extra_person_rate = 0`, the tiered pricing formula adds $0 -- backward compatible by math, not by conditional logic
3. Update the `PricingWidget` component AND the `createBookingAndCheckout` server action simultaneously -- they must use the exact same formula
4. The pricing formula should be extracted into a shared utility function used by both client display and server calculation to prevent drift
5. Write a test that verifies existing properties (extra_person_rate=0) produce the same total as the current formula

**Detection:**
- Price shown on property page differs from Stripe Checkout amount
- Existing property pricing changes after migration
- `PricingWidget` shows a per-person surcharge line for properties that shouldn't have one

**Phase to address:** Tiered pricing phase -- must include backward-compatibility test

---

### Pitfall 4: Guest Invite System Creates RLS Policy Nightmare

**What goes wrong:**
Currently, bookings have a single `guest_id` column and the RLS policy is simple: `auth.uid() = guest_id`. Adding a guest invite system (a `booking_guests` junction table) means invited guests need to read booking details too. The RLS policy must now check: "user is the booking creator OR user is in the booking_guests table for this booking." This requires a subquery in the RLS policy. If done wrong, it either (a) blocks invited guests from seeing the booking, or (b) opens up bookings to all authenticated users.

**Why it happens:**
Developer adds the junction table and updates the application query but forgets to update the RLS policy. Or they write a policy like `auth.uid() IN (SELECT user_id FROM booking_guests)` without scoping to the specific booking -- this returns true if the user is invited to ANY booking, granting access to ALL bookings.

**Consequences:**
- Invited guests see "No bookings" or get empty results (policy too restrictive)
- OR: Any user who has been invited to any booking can see all bookings in the system (policy too permissive)
- Data leak of personal information, payment amounts, and travel dates

**Prevention:**
1. The RLS policy for bookings SELECT must be:
```sql
CREATE POLICY "Guests can view their own bookings"
ON bookings FOR SELECT USING (
  auth.uid() = guest_id
  OR EXISTS (
    SELECT 1 FROM booking_guests bg
    WHERE bg.booking_id = bookings.id
    AND bg.user_id = auth.uid()
  )
);
```
2. The `booking_guests` table itself needs RLS: only the booking creator can INSERT (invite), and invited guests can only read their own rows
3. Use `(SELECT auth.uid())` (wrapped in subquery) for performance -- prevents per-row evaluation
4. Test with three users: booking creator, invited guest, random authenticated user. Verify creator and invited guest see booking, random user does not.

**Detection:**
- Invited guest clicks invite link but sees empty bookings page
- Security audit shows bookings accessible to unrelated users
- RLS policy on bookings table doesn't reference `booking_guests`

**Phase to address:** Guest invite phase -- RLS must be designed before building the invite UI

---

### Pitfall 5: Rebrand Find-and-Replace Corrupts Data and Metadata

**What goes wrong:**
The rebrand from "party villas" to "Whole-Tel boutique hotels" requires changing copy across 14 files (24 occurrences of "villa/Villa" found in the codebase). A naive find-and-replace changes things it shouldn't: database column names, URL slugs, Stripe metadata, CSS class names, or variable names that happen to contain "villa". Worse: if any user-generated content in the database contains "villa" (property descriptions written by owners), it gets corrupted.

**Why it happens:**
Developer runs a global find-and-replace across the codebase, or writes a database migration that updates text columns. The replace hits: Stripe `client_reference_id` metadata (breaks webhook reconciliation), `metadata.title` in `layout.tsx` (fine), but also catches property descriptions stored in the database that owners wrote themselves.

**Consequences:**
- Stripe webhook fails to reconcile because booking metadata changed
- Owner-authored property descriptions get silently modified
- Database values that happened to contain "villa" are corrupted
- SEO metadata inconsistencies if some pages are missed

**Prevention:**
1. The rebrand is a UI/copy-only change -- NEVER modify database values or Stripe metadata
2. Create a checklist of the 14 files identified by grep and review each change manually
3. Changes fall into categories: (a) user-facing copy in JSX, (b) metadata/SEO strings, (c) alt text. Only change these.
4. Do NOT change: database column names, variable names, Stripe metadata keys, storage bucket names, URL paths
5. The existing storage bucket `property-photos` and table names like `properties` are generic and don't need renaming
6. Run `git diff` after all changes and review every line -- flag any change outside of string literals

**Detection:**
- Stripe webhook returns errors after deploy
- Variable names or imports broken (TypeScript compiler catches this)
- Owner-authored descriptions changed without their consent
- Next.js build fails due to renamed imports

**Phase to address:** Rebrand phase -- should be isolated from all functional changes and done as its own PR

---

## Moderate Pitfalls

### Pitfall 6: Batch Photo Upload Overwhelms Signed URL Generation

**What goes wrong:**
The existing `getSignedUploadUrl` action generates one signed URL per call. For batch upload (selecting 10+ photos at once), the client fires 10+ concurrent server action calls. Each call creates a new Supabase client, verifies ownership, and generates a signed URL. This overwhelms the server action queue, causes timeouts, and may hit Supabase rate limits.

**Prevention:**
1. Create a new `getSignedUploadUrls` (plural) action that accepts a count parameter and returns multiple signed URLs in one call -- one ownership check, one Supabase client, multiple `createSignedUploadUrl` calls
2. Limit batch size client-side (max 10 photos per batch)
3. Upload files in parallel with a concurrency limit (3-4 simultaneous uploads, not all at once)
4. Show individual progress per photo, not just a single spinner
5. If any upload fails, don't abort the batch -- upload what you can and show which failed

**Phase to address:** Photo management phase (batch upload)

---

### Pitfall 7: Experience Tiered Pricing Inconsistent with Property Tiered Pricing

**What goes wrong:**
The add_ons table currently has a flat `price` column with `pricing_unit` (per_person or per_booking). Adding tiered pricing to experiences ("up to X people included, $Y per person above X") creates a second tiered pricing model that must be consistent with property tiered pricing but operates on different entities. If the schemas or formulas diverge, the booking total calculation becomes a maze of special cases.

**Prevention:**
1. Use the same column naming convention for both: `included_guests` + `extra_person_rate` on both `properties` and `add_ons` tables
2. Extract the tiered pricing calculation into a single shared function:
```typescript
function calculateTieredCost(baseRate: number, guestCount: number, includedGuests: number, extraPersonRate: number): number
```
3. Use this function in: PricingWidget (client display), createBookingAndCheckout (server calculation), and booking_add_ons insertion
4. When `pricing_unit = 'per_booking'`, the tiered pricing fields are ignored (per-booking add-ons don't scale with guests)

**Phase to address:** Experience pricing phase -- design schema alongside property tiered pricing, not after

---

### Pitfall 8: Experience Photos Stored Without Add-On Ownership Verification

**What goes wrong:**
Experience photos need the same signed-URL upload pattern as property photos, but the ownership chain is longer: user must own the property that owns the add-on. If the server action only checks add-on existence (not ownership chain), any authenticated owner could upload photos to another owner's experiences.

**Prevention:**
1. The signed URL action for experience photos must verify: `add_on.property.owner_id = auth.uid()`
2. Use a joined query: `supabase.from('add_ons').select('id, property_id, properties(owner_id)').eq('id', addOnId).single()`
3. Create a separate `add_on_photos` table (not reuse `property_photos`) to keep RLS policies clean
4. Storage path should include the property_id: `{owner_id}/{property_id}/add-ons/{add_on_id}/{uuid}`

**Phase to address:** Experience photos phase

---

### Pitfall 9: Bed Configuration Stored as Unstructured JSON

**What goes wrong:**
Developer stores bed configuration as a JSON blob in a single column: `beds: '{"king": 2, "queen": 1}'`. This works initially but prevents querying ("show me all properties with king beds"), prevents validation (negative bed counts, misspelled types), and makes the schema invisible to RLS and database constraints.

**Prevention:**
1. Use a structured approach: either a `bed_configurations` table with `(property_id, bed_type, count)` rows, or a JSONB column with a CHECK constraint
2. If using JSONB: add a CHECK constraint that validates the structure: `CHECK (beds IS NULL OR (beds ?& ARRAY['king','queen','double','twin','bunk']))`
3. If using a separate table: simpler to query but requires an extra join
4. Recommendation: JSONB column with validation -- it's simpler for this use case since bed config is read-heavy, write-rare, and doesn't need independent querying in v1.1
5. Define the bed types as an enum in both Zod validation and database constraint -- don't let owners invent types

**Phase to address:** Bed configuration phase

---

### Pitfall 10: Expandable Booking Detail View Exposes Data Without RLS Check

**What goes wrong:**
The expandable booking detail needs to fetch additional data (add-ons breakdown, guest list, property details) when the user clicks to expand. If this is implemented as a client-side fetch to a new API endpoint or server action that doesn't verify the requesting user owns that booking, it leaks booking details.

**Prevention:**
1. Fetch all expandable data in the initial server component query -- no additional client-side fetches needed for the detail view
2. The existing bookings query already joins `properties(id, name, location)` -- extend it to include `booking_add_ons(*, add_ons(*))` and `booking_guests(*, profiles(display_name, email))`
3. RLS on `booking_add_ons` and `booking_guests` must scope to the parent booking's guest_id or booking_guests membership
4. If lazy-loading is required for performance, use a server action that calls `verifySession()` and checks booking ownership before returning data

**Phase to address:** Expandable bookings phase

---

## Minor Pitfalls

### Pitfall 11: Photo Section Names Not Standardized

**What goes wrong:**
Owners type "Pool", "pool", "POOL", "Swimming Pool" -- all different sections in the UI. The guest-facing gallery shows 4 separate groups for what is conceptually the same area.

**Prevention:**
Use a predefined set of sections (Rooms, Common Areas, Pool, Exterior, Kitchen) as a dropdown/select, plus one "Custom" option with freetext. Store the canonical name, not user input.

**Phase to address:** Photo sections phase

---

### Pitfall 12: Guest Invite Email Delivery Not Tracked

**What goes wrong:**
The invite system sends emails to prospective guests, but there's no tracking of delivery status. The booking creator has no idea if their invites were received, bounced, or ignored.

**Prevention:**
Store invite status in `booking_guests`: `invited`, `email_sent`, `accepted`, `declined`. Update status via webhook from email provider (or at minimum, on acceptance). Show status to the booking creator.

**Phase to address:** Guest invite phase

---

### Pitfall 13: formatCurrency Bug in Existing Bookings Page

**What goes wrong:**
The existing `BookingCard` component (bookings/page.tsx line 63-64) divides by 100: `formatCurrency = (cents: number) => $(cents / 100)...`. But the `bookings` table stores amounts in DOLLARS (the `createBookingAndCheckout` action inserts `total` as a dollar amount, e.g., 5000.00, not 500000). This means the bookings page currently shows $50.00 instead of $5,000.00 for a $5,000 booking.

**Note:** This is an existing bug, not a v1.1 pitfall, but the expandable booking detail work will expose it further. Fix it when building the expandable detail view.

**Prevention:**
Verify the unit of `total` in the database schema before building any new display logic. The booking action stores dollars; the display should NOT divide by 100.

**Phase to address:** Expandable bookings phase -- fix alongside the detail view build

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Rebrand | Find-and-replace corrupts non-copy strings | Manual review of all 14 files; never touch database values |
| Rebrand | Metadata inconsistency (some pages say "villa", others say "hotel") | Create a constants file for brand copy; grep after completion |
| Photo sections | Existing photos disappear (NULL section) | DEFAULT 'General' in migration; backfill existing rows |
| Photo ordering | Race condition on concurrent reorder | Batch update with full array; debounce client-side |
| Photo batch upload | Server action queue overwhelmed | Plural signed URL action; concurrency limit on client |
| Bed configuration | Unstructured JSON prevents validation | JSONB with CHECK constraint or separate table |
| Property tiered pricing | Existing properties break (NULL/0 defaults) | Safe defaults that produce $0 extra charge |
| Property tiered pricing | Client/server price calculation drift | Shared pricing utility function |
| Experience tiered pricing | Inconsistent formula with property pricing | Same function, same column naming |
| Experience photos | Missing ownership chain verification | Join through add_on -> property -> owner |
| Guest invites | RLS too permissive or too restrictive | Scoped subquery; test with 3 user types |
| Guest invites | No invite delivery tracking | Status column in booking_guests table |
| Expandable bookings | Lazy fetch without auth check | Fetch in initial server query or verify ownership |
| Expandable bookings | Existing formatCurrency bug (divides by 100 when values are in dollars) | Verify storage unit before building display |

---

## Integration Gotchas Specific to v1.1

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Photo reorder + Supabase RLS | UPDATE policy only checks `auth.uid() = owner_id` on property_photos, but reorder updates multiple rows -- partial failure if one row fails RLS | Ensure all photos in the reorder batch belong to the same property owned by the current user; verify in server action before UPDATE |
| Tiered pricing + Stripe line items | Adding a "per-person surcharge" line item to Stripe that shows `$100 x 5 extra guests` but the actual charge is calculated differently | Build Stripe line items from the same shared pricing function; verify line item sum equals booking total |
| Guest invites + Supabase Auth | Inviting a user by email who doesn't have an account yet | Store invite by email in `booking_guests` with `user_id = NULL`; link on signup when email matches; don't require account creation before invite |
| Batch upload + Next.js revalidation | Each photo save calls `revalidatePath` -- 10 photos = 10 revalidations flooding the server | Revalidate once after the entire batch completes, not per-photo |
| Rebrand + Vercel preview deployments | Old brand cached in Vercel edge cache | Purge cache on deploy; verify preview deployment shows new brand |

---

## "Looks Done But Isn't" Checklist for v1.1

- [ ] **Photo sections:** Photos display grouped by section on property page -- verify existing photos (migrated with DEFAULT section) also appear
- [ ] **Photo ordering:** Drag-to-reorder works -- verify rapid dragging doesn't corrupt order; verify order persists on page reload
- [ ] **Batch upload:** 10 photos upload -- verify all 10 saved with correct display_order; verify only 1 revalidation fires
- [ ] **Tiered pricing:** Property shows per-person surcharge -- verify properties WITHOUT tiered pricing still show correct price (no surcharge line)
- [ ] **Tiered pricing:** Booking total matches Stripe total -- verify by comparing `booking.total` in database with Stripe session `amount_total`
- [ ] **Experience pricing:** Add-on with tiered pricing calculates correctly -- verify `booking_add_ons.total_price` accounts for included guests
- [ ] **Guest invites:** Invited guest can see booking -- verify by logging in as invited user and checking bookings page
- [ ] **Guest invites:** Random user cannot see others' bookings -- verify RLS blocks access
- [ ] **Rebrand:** No "villa" or "party" references remain -- run `grep -ri "villa\|party villa" src/` after all changes
- [ ] **Rebrand:** Stripe metadata unchanged -- verify webhook still processes correctly after rebrand deploy
- [ ] **Bed config:** Saved bed configuration displays on guest-facing property page -- verify edge case of 0 beds of a type (should not show)
- [ ] **Expandable bookings:** Booking detail shows correct total -- verify it doesn't divide by 100 (existing bug)

---

## Sources

- Codebase analysis: `src/lib/actions/photos.ts` -- existing photo upload pattern with count-based ordering (HIGH confidence)
- Codebase analysis: `src/lib/actions/bookings.ts` -- existing pricing calculation, single guest_id model (HIGH confidence)
- Codebase analysis: `src/app/(guest)/bookings/page.tsx` -- formatCurrency divides by 100, possible bug (HIGH confidence)
- Codebase analysis: grep for "villa" across 14 files, 24 occurrences (HIGH confidence)
- [dnd-kit Discussion #1522 -- optimistic update race condition with drag-and-drop](https://github.com/clauderic/dnd-kit/discussions/1522) (MEDIUM confidence)
- [Supabase Database Migrations Documentation](https://supabase.com/docs/guides/deployment/database-migrations) (HIGH confidence)
- [Supabase RLS Best Practices: Production Patterns for Secure Multi-Tenant Apps](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) (MEDIUM confidence)
- [SEO Rebrand Rankings Protection -- Search Engine Journal](https://www.searchenginejournal.com/seo-rebrand-rankings/433350/) (MEDIUM confidence)
- [Supabase Multi-Tenant RLS Deep Dive](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2) (MEDIUM confidence)

---

*Pitfalls research for: Whole-Tel v1.1 enhancements (photo management, tiered pricing, guest invites, rebrand)*
*Researched: 2026-03-07*
