# Feature Landscape: Whole-Tel v1.1 Enhancements

**Domain:** Boutique hotel booking platform -- owner management tools, photo management, pricing tiers, guest invites
**Researched:** 2026-03-07
**Focus:** NEW features only (v1.0 property listing, booking flow, auth, Stripe payment already built)

---

## Table Stakes

Features users expect from a property booking platform at this maturity level. Missing = product feels incomplete or amateurish.

| Feature | Why Expected | Complexity | Dependencies on Existing | Notes |
|---------|--------------|------------|--------------------------|-------|
| **Multi-photo upload (batch)** | Single-photo upload feels broken -- every competitor supports batch. Owners won't tolerate uploading 30 photos one at a time. | Low | Extends existing `PhotoUploader` component and `getSignedUploadUrl` action. Same signed-URL pattern, just loop over files. | Parallel uploads with progress indicators per file. Limit to ~5 concurrent uploads to avoid browser memory issues. |
| **Photo ordering (drag-to-reorder)** | Without ordering, hero image is random. First photo is the listing's "cover" -- owners must control it. | Medium | Extends `property_photos.display_order` column (already exists). New `updatePhotoOrder` server action needed. | Use `@dnd-kit/sortable` -- modern, maintained, lightweight (10kB). `react-beautiful-dnd` is officially deprecated by Atlassian. |
| **Bed configuration** | "5 bedrooms" tells guests nothing. They need to know bed types to plan sleeping arrangements for groups. Standard on Airbnb, Booking.com, VRBO. | Low | New JSONB column on `properties` or new `bed_configurations` table. PropertyForm gets a new section. | Simple repeatable row UI: bed type dropdown (King, Queen, Double, Twin, Bunk) + count stepper. No drag-and-drop needed. |
| **Expandable booking detail view** | Current booking cards show summary only. Guests need to see add-ons selected, price breakdown, dates, and property details without navigating away. | Low | Extends existing `BookingCard` in bookings page. Needs `booking_add_ons` join query (already typed as `BookingWithDetails`). | Accordion/collapsible pattern with shadcn `Collapsible` or simple state toggle. |
| **Correct guest count display/editing** | If guest count is wrong on a booking, the per-person cost calculator is meaningless. | Low | Updates `bookings` table `guest_count` field. New server action `updateGuestCount`. | Must recalculate per-person add-on costs when count changes. If booking is already paid, this is display-only (no price change post-payment). |

## Differentiators

Features that set Whole-Tel apart. Not strictly expected at this stage, but add significant value for the group booking use case.

| Feature | Value Proposition | Complexity | Dependencies on Existing | Notes |
|---------|-------------------|------------|--------------------------|-------|
| **Photo sections (Rooms, Common Area, Pool, custom)** | Organized photo tours help guests visualize the property. Airbnb uses AI to auto-categorize into 19 room types. For Whole-Tel, owner-managed sections are simpler and sufficient. Groups care about common areas and sleeping arrangements -- sections let them find what matters. | Medium | New `photo_sections` table (id, property_id, name, display_order). `property_photos` gets `section_id` FK (nullable for uncategorized). | Preset sections: "Rooms", "Common Areas", "Pool & Outdoor", "Kitchen & Dining". Plus custom sections. Owner assigns photos to sections during upload or via management view. Guest-facing gallery groups by section with tabs or scrollable anchors. |
| **Tiered per-person pricing (property)** | Core to the Whole-Tel model: "$X/night base, +$Y/person/night above N guests." This is how large group properties actually price -- Booking.com calls it "occupancy-based pricing." Without it, pricing is either too expensive for small groups or unprofitable for large ones. | Medium | Extends `properties` table with `extra_guest_rate` (decimal), `extra_guest_threshold` (int). `PricingWidget` calculation logic changes. `createBookingAndCheckout` server-side pricing must match. | Formula: `base_rate + max(0, guest_count - threshold) * extra_guest_rate * nights`. Display in PricingWidget as: "$2,500/night (up to 25 guests) + $100/person/night above 25". Must be calculated server-side in booking action -- never trust client math. |
| **Tiered experience pricing** | Experiences like "private chef dinner" have a base price for up to X people, then $Y per person above. Current flat per_person/per_booking model can't express this. | Medium | Extends `add_ons` table with `included_guests` (int, nullable) and `extra_person_rate` (decimal, nullable). AddOnForm gets conditional fields. PricingWidget add-on cost calculation changes. | Formula: `base_price + max(0, guest_count - included_guests) * extra_person_rate`. When `included_guests` is null, falls back to current flat pricing. Backward compatible. |
| **Experience photos** | Experiences with photos convert better. A "sunset yacht cruise" with a photo is far more compelling than text alone. | Low | `add_ons.photo_url` column already exists in the schema but isn't populated via UI. AddOnForm needs photo upload field. Guest-facing `AddOnCard` already handles `photo_url`. | Same signed-URL upload pattern as property photos. Single photo per experience is sufficient (not a gallery). Can reuse `PhotoUploader` pattern but simplified to single-file. |
| **Guest invite system** | The killer feature for group bookings. Booking organizer invites friends, they can view booking details and potentially see what's planned. Turns a solo booking into a group coordination tool. | High | New `booking_invites` table (id, booking_id, invited_email, invited_user_id nullable, status, token_hash, expires_at, created_at). Email sending (already have Resend integration via `src/lib/email.ts`). | Two invite methods: (1) email invite with secure token link, (2) shareable booking link. Invited user sees booking details (property, dates, guest list) but cannot modify the booking itself. Status flow: pending -> accepted / declined. Security: hashed tokens in DB, expiration. |

## Anti-Features

Features to explicitly NOT build in v1.1. Each has been considered and rejected for good reason.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **AI-powered photo categorization** | Airbnb built this with a massive ML pipeline across millions of listings. Whole-Tel has a handful of properties. Owner-managed sections are simpler, more accurate for small scale, and zero infrastructure cost. | Owner manually assigns photos to sections during upload. Preset section names cover 90% of cases. |
| **Individual payment splitting** | PROJECT.md explicitly defers this. Stripe Connect complexity, per-person checkout flows, partial refund handling -- massive scope. | Per-person cost calculator (already built) shows "your share." Venmo/Zelle between friends handles the rest. |
| **Guest add-on customization per invitee** | Each invited guest choosing their own add-ons creates order amendment complexity, partial payment flows, and Stripe session management headaches. | Booking organizer selects add-ons for the whole group. Invited guests can view but not modify. |
| **Drag-and-drop photo sections** | Reordering photos within sections is valuable. Reordering the sections themselves adds complexity for minimal value -- section order is predictable (Rooms first, then common areas). | Fixed section display order based on preset priority. Custom sections appear at the end. |
| **Real-time collaborative booking editing** | WebSocket infrastructure, conflict resolution, operational transforms -- way out of scope. | Single organizer edits. Invited guests are read-only viewers of booking details. |
| **Photo cropping/editing in browser** | Canvas manipulation, aspect ratio management, quality loss -- complex client-side work for marginal value. | Accept photos as-is. Use `object-cover` CSS for consistent display. Recommend photo guidelines to owners. |
| **Guest count changes post-payment** | Changing guest count after Stripe payment means recalculating per-person add-ons, potentially issuing partial refunds or collecting additional payment. Enormous complexity. | Guest count is locked after payment. Display per-person cost as informational. If group size changes, contact support. |

## Feature Dependencies

```
Batch Photo Upload -----> Photo Ordering (reorder needs multiple photos)
                    \
                     +--> Photo Sections (assign to section needs photos)

Photo Sections ---------> Section-grouped Gallery (guest-facing display)

Tiered Property Pricing -> PricingWidget Update -> Booking Action Update
                                                    (server-side calc must match)

Tiered Experience Pricing -> AddOnForm Update -> PricingWidget Add-on Calc Update
                                                  -> Booking Action Update

Experience Photos -------> AddOnForm Photo Upload (independent of other photo work)

Guest Invite System -----> Email Integration (already exists via Resend)
                     \---> Booking Detail View (invitees need to see details)
                      \--> Auth Flow (invited user may not have account yet)

Bed Configuration -------> PropertyForm Update (independent, no dependencies)

Expandable Booking Detail -> Booking Query Update (join booking_add_ons)

Rebrand -----------------> All UI copy changes (independent, can be done in parallel)
```

## MVP Recommendation

### Phase 1: Foundation (do first -- unblocks everything else)

1. **Rebrand** -- Copy/UI changes across site. Independent work, can parallelize with everything.
2. **Bed configuration** -- Simple schema + form addition. Low risk, immediate value, no dependencies.
3. **Batch photo upload** -- Unblocks photo ordering and sections. Core owner workflow improvement.
4. **Experience photos** -- Quick win, `photo_url` column already exists in schema.

### Phase 2: Photo Management + Pricing

5. **Photo ordering (drag-to-reorder)** -- Requires batch upload to be useful. Use `@dnd-kit/sortable`.
6. **Photo sections** -- Requires photos to exist. Owner assigns, guest gallery groups by section.
7. **Tiered property pricing** -- Schema change + PricingWidget + booking action update. Medium complexity but high business value.
8. **Tiered experience pricing** -- Same pattern as property pricing tiers. Do together to share the pricing logic patterns.

### Phase 3: Booking Enhancements

9. **Expandable booking detail view** -- Low complexity, improves guest experience.
10. **Guest count display/editing** -- Quick fix alongside detail view.
11. **Guest invite system** -- Highest complexity feature. Needs email tokens, new tables, invite acceptance flow, possibly signup-during-accept flow. Do last because it has the most unknowns.

**Defer to v1.2:** Guest invite system polish (notifications, reminders, decline handling, RSVP tracking) -- get basic invite/accept working first, iterate later.

## Implementation Notes

### Batch Photo Upload

The existing signed-URL pattern (`getSignedUploadUrl` -> browser upload -> `savePhotoRecord`) is correct and should be preserved. For batch:
- Accept `multiple` attribute on file input
- Generate signed URLs in parallel (one per file via `Promise.all`)
- Upload files concurrently with a limit of 3-5 simultaneous uploads
- Show per-file progress with status indicators (pending/uploading/done/error)
- Call `savePhotoRecord` for each successful upload with incrementing `display_order`
- Supabase Storage does not support batch upload -- must loop. This is confirmed by Supabase community discussions.

### Photo Ordering with dnd-kit

Use `@dnd-kit/core` + `@dnd-kit/sortable` packages. Key pieces:
- `SortableContext` wraps the photo grid
- `useSortable` hook on each photo item
- `arrayMove` utility for reordering the array on drag end
- On drag end, compute new `display_order` values and batch update via a single server action `reorderPhotos(propertyId, orderedIds[])`
- Touch support built in (important for mobile owner management)

### Tiered Pricing Calculation

Server-side formula (in `createBookingAndCheckout`):
```
nightlyCost = property.nightly_rate * nights
extraGuestCost = max(0, guestCount - property.extra_guest_threshold) * property.extra_guest_rate * nights
subtotal = nightlyCost + extraGuestCost + cleaningFee
```
Client-side mirror in `PricingWidget` for preview only (never authoritative). Both must produce identical results -- extract shared calculation logic into a pure function in `src/lib/pricing.ts`.

### Guest Invite System

Database design:
- `booking_invites` table: `id`, `booking_id`, `inviter_id`, `invited_email`, `invited_user_id` (nullable, set on accept), `status` (pending/accepted/declined), `token_hash` (SHA-256 of raw token), `expires_at`, `created_at`
- Raw token sent in email link, hashed token stored in DB (same pattern as password reset tokens)
- Accept flow: `/bookings/invite/[token]` -> verify hash -> if logged in, link user to booking; if not logged in, redirect to signup with return URL
- RLS: booking owner can INSERT invites; invited user (matched by email) can UPDATE their own invite status
- Invitees are read-only viewers -- they see property details, dates, guest list, and add-ons but cannot modify anything

### Bed Configuration Schema

JSONB column on `properties` is simplest (avoids a separate table for a small, property-scoped dataset):
```json
{
  "beds": [
    { "type": "King", "count": 4 },
    { "type": "Queen", "count": 2 },
    { "type": "Bunk", "count": 3 }
  ]
}
```
Standard bed types: King, Queen, Double, Twin, Bunk. UI is a repeatable row with type dropdown + count stepper + remove button. Total sleeping capacity should display alongside `max_guests`.

### Photo Sections Schema

```sql
-- New table
CREATE TABLE photo_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add nullable FK to existing property_photos
ALTER TABLE property_photos ADD COLUMN section_id UUID REFERENCES photo_sections(id) ON DELETE SET NULL;
```

Preset sections seeded on property creation: "Rooms", "Common Areas", "Pool & Outdoor", "Kitchen & Dining". Photos without a section appear in an "Other" group. Guest-facing gallery renders sections as labeled groups with the hero image (display_order = 0) always prominent regardless of section.

## Complexity Budget

| Feature | Schema Changes | New Components | Server Actions | Estimated Effort |
|---------|---------------|----------------|----------------|-----------------|
| Rebrand | None | All (copy changes only) | None | 1-2 days |
| Bed configuration | 1 JSONB column | 1 form section | 1 (in existing property action) | 0.5 day |
| Batch photo upload | None | 1 (extend PhotoUploader) | None (reuse existing) | 0.5 day |
| Photo ordering | None | 1 (SortablePhotoGrid) | 1 (reorderPhotos) | 1 day |
| Photo sections | 1 table + 1 FK column | 2 (SectionManager, SectionGallery) | 2 (assignSection, createSection) | 1.5 days |
| Tiered property pricing | 2 columns on properties | 1 (extend PricingWidget) | 1 (update booking calc) | 1 day |
| Tiered experience pricing | 2 columns on add_ons | 1 (extend AddOnForm) | 1 (update booking calc) | 1 day |
| Experience photos | None (column exists) | 1 (extend AddOnForm) | 1 (experience photo upload) | 0.5 day |
| Expandable booking detail | None | 1 (BookingDetail accordion) | 1 (fetch booking with add-ons) | 0.5 day |
| Guest count display/editing | None | 1 (GuestCountEditor) | 1 (updateGuestCount) | 0.5 day |
| Guest invite system | 1 table (booking_invites) | 3+ (InviteForm, InviteList, AcceptPage) | 3+ (sendInvite, acceptInvite, declineInvite) | 2-3 days |

**Total estimated effort: 10-12 days**

## Sources

- [Airbnb Photo Categorization Engineering Blog](https://medium.com/airbnb-engineering/categorizing-listing-photos-at-airbnb-f9483f3ab7e3) -- HIGH confidence
- [Airbnb Photo Tour Setup](https://airbnb.com/resources/hosting-homes/a/how-to-organize-listing-photos-into-a-home-tour-456) -- HIGH confidence
- [dnd-kit Sortable Documentation](https://docs.dndkit.com/presets/sortable) -- HIGH confidence
- [dnd-kit Sortable Image Grid Example](https://codesandbox.io/s/dndkit-sortable-image-grid-py6ve) -- HIGH confidence
- [Booking.com Per-Guest Pricing Models](https://partner.booking.com/en-us/help/channel-manager/availability/understanding-pricing-guest-models) -- HIGH confidence
- [Cloudbeds Extra Person Fees](https://myfrontdesk.cloudbeds.com/hc/en-us/articles/231646927-Base-Rates-and-Availability-Matrix-How-to-Add-Extra-Person-Fees) -- MEDIUM confidence
- [Supabase Signed Upload URLs](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl) -- HIGH confidence
- [Supabase Batch Upload Discussion](https://github.com/orgs/supabase/discussions/6101) -- MEDIUM confidence
- [Invite Friends UI Pattern](https://ui-patterns.com/patterns/invite-friends) -- MEDIUM confidence
- [System Design: Inviting Users to a Group](https://medium.com/@itayeylon/system-design-inviting-users-to-a-group-98b1e0967b06) -- MEDIUM confidence
- [Vacasa Bed Configuration Guide](https://www.vacasa.com/homeowner-guides/best-bed-configuration-for-vacation-rental) -- MEDIUM confidence
- [Top Drag-and-Drop Libraries for React 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) -- MEDIUM confidence
- [react-beautiful-dnd Deprecated (GitHub)](https://github.com/atlassian/react-beautiful-dnd) -- HIGH confidence

---

*Feature research for: Whole-Tel v1.1 Enhancements*
*Researched: 2026-03-07*
