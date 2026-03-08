# Phase 11: Booking Enhancements - Research

**Researched:** 2026-03-08
**Domain:** Booking details UI, guest count editing, invitation system (Supabase + Resend + Next.js)
**Confidence:** HIGH

## Summary

Phase 11 adds four capabilities to the existing booking system: expandable booking details with full price breakdown, editable guest count with price recalculation, email-based booking invitations, and invitation accept/decline flow. The existing codebase already has all the foundational pieces -- `calculatePricing()` for server/client price calculation, `booking_add_ons` join table for add-on details, Resend + @react-email for transactional emails, and `createAdminClient()` for service-role operations.

The main new work is: (1) a new `booking_invitations` database table with RLS policies, (2) a Server Action for sending invitations via Resend, (3) invitation accept/decline UI with auth state edge cases (invited user may not have an account), and (4) expanding the BookingCard to show full breakdown using data already available in the bookings query.

**Primary recommendation:** Use accordion/collapsible pattern on existing BookingCard for details expansion, a new `booking_invitations` table with status enum, and Resend for invitation emails with magic-link-style accept URLs. Guest count editing should use a Server Action that recalculates via `calculatePricing()` and updates the booking row (no Stripe re-charge for v1.1 -- price display only).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BOOK-08 | Guest can click a booking to expand and see full details (price breakdown, add-ons, dates) | Existing `bookings` table has `subtotal`, `add_ons_total`, `processing_fee`, `total`. `booking_add_ons` joined with `add_ons` provides add-on names/prices. `calculatePricing()` not needed for display -- raw stored values suffice. |
| BOOK-09 | Booking displays correct guest count and guest can edit it | `bookings.guest_count` exists. Need UPDATE RLS policy on bookings (currently none for guests). Recalculation uses `calculatePricing()`. Price updates stored back to bookings row. No Stripe re-charge in v1.1 scope. |
| BOOK-10 | Guest can invite other users to a booking via email | New `booking_invitations` table. Resend already configured (`src/lib/email.ts`). @react-email for invitation template. Server Action to insert invitation + send email. |
| BOOK-11 | Invited users can accept or decline a booking invitation | Accept/decline Server Actions. Invitation page at `/bookings/invitations/[token]`. Auth edge case: invited user may need to sign up first (flagged in STATE.md blockers). |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 16 | 16.x | App Router, Server Components, Server Actions | Project framework |
| Supabase | latest | Database, Auth, RLS | Project database |
| Resend | ^6.9.3 | Transactional email delivery | Already used for booking confirmation |
| @react-email/components | ^1.0.8 | Email templates | Already used for BookingConfirmedEmail |
| Zod | latest | Input validation | Already used throughout |
| shadcn/ui | latest | UI components (Collapsible, Dialog, Input) | Project UI library |
| Lucide React | latest | Icons | Already used |

### Supporting (May Need to Add shadcn Components)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Collapsible | -- | Expandable booking details | BOOK-08 accordion pattern |
| shadcn/ui Dialog | -- | Guest count edit modal | BOOK-09 edit flow |
| shadcn/ui Separator | -- | Price breakdown dividers | Already installed |

### No New Dependencies Needed
All required libraries are already installed. Only shadcn/ui component generation (`npx shadcn@latest add collapsible`) may be needed if the Collapsible component isn't already generated.

## Architecture Patterns

### Recommended Structure
```
src/
├── app/(guest)/bookings/
│   ├── page.tsx                    # Enhanced with expandable cards
│   └── invitations/[token]/
│       └── page.tsx                # Invitation accept/decline page
├── components/booking/
│   ├── BookingDetails.tsx          # Expandable details (client component)
│   ├── GuestCountEditor.tsx        # Inline guest count edit (client component)
│   └── InviteGuestForm.tsx         # Email input + send invite (client component)
├── emails/
│   ├── booking-confirmed.tsx       # Existing
│   └── booking-invitation.tsx      # New: invitation email template
├── lib/actions/
│   ├── bookings.ts                 # Existing: createBookingAndCheckout
│   └── booking-invitations.ts      # New: sendInvitation, acceptInvitation, declineInvitation
└── lib/validations/
    ├── booking.ts                  # Existing
    └── booking-invitation.ts       # New: invitation input schemas
```

### Pattern 1: Expandable Booking Card (BOOK-08)
**What:** Transform existing `BookingCard` into collapsible card. Summary row shows property name, dates, total. Expanded view shows full breakdown.
**When to use:** Booking list page
**Key decision:** The bookings query already fetches `subtotal`, `add_ons_total`, `processing_fee`, `total`. For add-on names, join `booking_add_ons` with `add_ons` in the page query. No need to call `calculatePricing()` -- display stored values.

```typescript
// Enhanced query for bookings page
const { data: bookings } = await supabase
  .from('bookings')
  .select(`
    id, check_in, check_out, guest_count, subtotal, add_ons_total,
    processing_fee, total, status, created_at,
    properties(id, name, location, nightly_rate, cleaning_fee, guest_threshold, per_person_rate),
    booking_add_ons(id, quantity, unit_price, total_price, add_ons(name, pricing_unit))
  `)
  .eq('guest_id', user.id)
  .order('check_in', { ascending: false })
```

### Pattern 2: Guest Count Update with Price Recalculation (BOOK-09)
**What:** Server Action that validates new guest count, recalculates pricing using `calculatePricing()`, and updates the booking row.
**Key decision:** No Stripe re-charge in v1.1 (PAY-07 is explicitly deferred to v2). This is display/record-keeping only. The guest count change updates stored totals but doesn't trigger a new payment.

```typescript
// Server Action pattern
export async function updateBookingGuestCount(bookingId: string, newGuestCount: number) {
  const user = await verifySession()
  // Fetch booking + property + add-ons
  // Validate ownership (booking.guest_id === user.id)
  // Validate guest count (1..max_guests)
  // Recalculate via calculatePricing()
  // Update bookings row with new totals
  // Update booking_add_ons with recalculated per-person costs
}
```

### Pattern 3: Invitation System (BOOK-10, BOOK-11)
**What:** New `booking_invitations` table, email via Resend, token-based accept/decline.
**Key decision from STATE.md:** "Guest invite system (not just guest count update)" -- this is a full invitation feature, not just incrementing a counter.

**Database design:**
```sql
CREATE TABLE booking_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  email       text NOT NULL,
  token       uuid NOT NULL DEFAULT gen_random_uuid(),
  status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_by  uuid NOT NULL REFERENCES profiles(id),
  accepted_by uuid REFERENCES profiles(id),  -- filled on accept
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id, email)  -- prevent duplicate invites
);
```

**Accept flow state machine (flagged in STATE.md as needing careful design):**
1. User clicks link in email -> `/bookings/invitations/[token]`
2. If logged in as matching email -> show accept/decline buttons
3. If logged in as different email -> show "wrong account" message
4. If not logged in but has account -> redirect to login, return after
5. If not logged in and no account -> redirect to signup with `redirectTo` param, return after

### Anti-Patterns to Avoid
- **Don't recalculate pricing client-side for display:** The bookings table already stores `subtotal`, `add_ons_total`, `processing_fee`, `total`. Use stored values for the breakdown display. Only use `calculatePricing()` when guest count changes (server-side).
- **Don't use Supabase realtime for invitations:** Overkill for this feature. Simple page refresh or `revalidatePath` after accept/decline is sufficient.
- **Don't store invitation token in URL query params:** Use path params (`/invitations/[token]`) for cleaner URLs and easier routing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery | SMTP integration | Resend (already configured) | Deliverability, bounce handling, rate limits |
| Email templates | Raw HTML strings | @react-email/components (already configured) | Type-safe, preview-able, consistent |
| Price calculation | Inline math | `calculatePricing()` from `src/lib/pricing.ts` | Single source of truth, tested with Vitest |
| Unique tokens | Custom random strings | `gen_random_uuid()` in PostgreSQL | Cryptographically secure, no collisions |
| Collapsible UI | Custom show/hide logic | shadcn/ui Collapsible or Radix Accordion | Accessible, animated, keyboard-navigable |

## Common Pitfalls

### Pitfall 1: Missing UPDATE RLS Policy on Bookings
**What goes wrong:** Guest count edit Server Action will fail silently because there is NO UPDATE policy on the `bookings` table for guests. The existing comment in the schema says: "No guest UPDATE policy -- status changes happen only via service_role (Stripe webhook)."
**Why it happens:** Original design assumed bookings are immutable after creation.
**How to avoid:** Add a scoped UPDATE policy that allows guests to update ONLY `guest_count`, `subtotal`, `add_ons_total`, `processing_fee`, `total`, and `updated_at` on their own bookings. Alternatively, use `createAdminClient()` for the update (but this bypasses RLS -- less safe).
**Recommendation:** Use a Server Action with `createAdminClient()` for the update, since the action already validates ownership via `verifySession()`. This keeps the RLS simple and avoids partial column update policies (which Postgres RLS doesn't natively support per-column).

### Pitfall 2: Auth State Edge Cases for Invitation Accept
**What goes wrong:** Invited user might not have a Whole-Tel account. Flow needs to handle signup-during-accept without losing the invitation context.
**Why it happens:** Email invitations go to arbitrary email addresses.
**How to avoid:** Store the invitation token in a cookie or URL param before redirecting to signup. After signup completes, redirect back to the invitation page. The invitation page should handle all states gracefully.
**Warning signs:** Test with: existing user logged in, existing user logged out, brand new user.

### Pitfall 3: Numeric Precision in Price Display
**What goes wrong:** `subtotal` and other monetary fields are `numeric(10,2)` in Postgres but come through Supabase JS as strings or imprecise floats.
**Why it happens:** Supabase returns `numeric` columns as strings to preserve precision.
**How to avoid:** Always `Number()` cast when reading, and use `.toFixed(2)` or `toLocaleString` with `minimumFractionDigits: 2` for display. The existing `BookingCard` already handles this correctly -- follow the same pattern.

### Pitfall 4: Duplicate Invitation Emails
**What goes wrong:** User clicks "Send Invite" multiple times, sending duplicate emails.
**Why it happens:** No deduplication.
**How to avoid:** UNIQUE constraint on `(booking_id, email)` prevents duplicate DB rows. Server Action should check for existing invitation before sending and either resend (if pending) or return "already invited" message.

### Pitfall 5: Guest Count Edit on Confirmed vs Pending Bookings
**What goes wrong:** Guest edits count on a pending booking that hasn't been paid yet -- the Stripe checkout amount is now wrong.
**Why it happens:** Pending bookings have an active Stripe session with the original amount.
**How to avoid:** Only allow guest count editing on CONFIRMED bookings. For pending bookings, the user should cancel and rebook. This avoids Stripe amount mismatch issues.

## Code Examples

### Booking Details Expansion (BOOK-08)
```typescript
// Server Component: Enhanced bookings page query
const { data: bookings } = await supabase
  .from('bookings')
  .select(`
    id, check_in, check_out, guest_count, subtotal, add_ons_total,
    processing_fee, total, status, created_at,
    properties(id, name, location, nightly_rate, cleaning_fee),
    booking_add_ons(id, quantity, unit_price, total_price, add_ons(name))
  `)
  .eq('guest_id', user.id)
  .order('check_in', { ascending: false })
```

### Invitation Email Template (BOOK-10)
```typescript
// src/emails/booking-invitation.tsx
import { Html, Head, Body, Container, Heading, Text, Button, Hr } from '@react-email/components'

export interface BookingInvitationEmailProps {
  inviterName: string
  propertyName: string
  checkIn: string
  checkOut: string
  acceptUrl: string
}

export function BookingInvitationEmail({
  inviterName, propertyName, checkIn, checkOut, acceptUrl,
}: BookingInvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Heading>You're Invited!</Heading>
          <Text>{inviterName} invited you to join their stay at {propertyName}.</Text>
          <Text>Dates: {checkIn} - {checkOut}</Text>
          <Button href={acceptUrl}>View Invitation</Button>
        </Container>
      </Body>
    </Html>
  )
}
```

### Guest Count Update Server Action (BOOK-09)
```typescript
// Pattern: validate ownership, recalculate, update
export async function updateGuestCount(bookingId: string, newGuestCount: number) {
  const user = await verifySession()
  const supabase = await createClient()

  // Fetch booking with property data for recalculation
  const { data: booking } = await supabase
    .from('bookings')
    .select(`*, properties(nightly_rate, cleaning_fee, max_guests, guest_threshold, per_person_rate),
             booking_add_ons(*, add_ons(price, pricing_unit, included_guests, per_person_above, name))`)
    .eq('id', bookingId)
    .eq('guest_id', user.id)
    .eq('status', 'confirmed')
    .single()

  if (!booking) throw new Error('Booking not found')

  // Recalculate using shared pricing module
  const breakdown = calculatePricing({ /* ... from booking + property data */ })

  // Update via admin client (no guest UPDATE RLS policy)
  const admin = createAdminClient()
  await admin.from('bookings').update({
    guest_count: newGuestCount,
    subtotal: breakdown.accommodationSubtotal + breakdown.perPersonSurcharge,
    add_ons_total: breakdown.addOnsTotal,
    processing_fee: breakdown.processingFee,
    total: breakdown.total,
    updated_at: new Date().toISOString(),
  }).eq('id', bookingId)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static booking cards | Expandable/collapsible details | Current standard | Better UX, less page navigation |
| Separate detail pages | Inline expansion on list | Current standard | Fewer route transitions |
| Link-sharing for groups | Email invitation with tokens | Current standard | Trackable, actionable invitations |

## Open Questions

1. **Should guest count changes require re-payment?**
   - What we know: PAY-07 (price adjustment post-payment) is deferred to v2. BOOK-09 says "price recalculates if tiered pricing applies."
   - What's unclear: Does "recalculates" mean display-only or actual payment adjustment?
   - Recommendation: Update stored totals for record-keeping but do NOT trigger Stripe re-charge. This matches v2 deferral of PAY-07. The updated total serves as a record of what the booking is now "worth."

2. **What happens when an invited user accepts -- does guest count auto-increment?**
   - What we know: BOOK-11 says "accepted guests appear in the booking's guest list visible to the booking creator."
   - What's unclear: Should accepting an invitation automatically increase `bookings.guest_count`?
   - Recommendation: YES -- accepting should increment guest_count and recalculate pricing. This ties BOOK-09 and BOOK-11 together naturally.

3. **Can invited guests see booking details?**
   - What we know: Current RLS only allows `guest_id` (the booker) to see their bookings.
   - What's unclear: Should accepted invitees also see the booking?
   - Recommendation: Yes, but via the `booking_invitations` table -- query invitations where `accepted_by = auth.uid()`, then join to bookings. This avoids modifying the core bookings RLS.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/lib/actions/bookings.ts`, `src/lib/pricing.ts`, `src/app/(guest)/bookings/page.tsx`
- Database schema: `supabase/migrations/20260302000001_schema_rls.sql` (bookings, booking_add_ons tables + RLS)
- Database schema: `supabase/migrations/20260308000002_owner_property_tools.sql` (tiered pricing columns)
- Email infrastructure: `src/lib/email.ts` (Resend), `src/emails/booking-confirmed.tsx` (@react-email)
- Types: `src/types/database.ts` (Booking, BookingAddOn interfaces)
- Project state: `.planning/STATE.md` (decisions, blockers re: invite auth edge cases)

### Secondary (MEDIUM confidence)
- Invitation auth flow state machine -- derived from project patterns and STATE.md blocker note

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use, no new dependencies
- Architecture: HIGH - follows existing patterns (Server Actions, RLS, Resend emails)
- Pitfalls: HIGH - identified from direct codebase analysis (missing UPDATE RLS, auth edge cases documented in STATE.md)
- Invitation system: MEDIUM - new feature requiring new table, but follows established patterns

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable domain, no fast-moving dependencies)
