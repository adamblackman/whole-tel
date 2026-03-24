# Phase 17: Split Payments - Research

**Researched:** 2026-03-24
**Domain:** Stripe Payment Links API, split payment data model, server-side total validation
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAY-03 | Group lead can divide payment and adjust split amounts per person | SplitPaymentEditor component reads attendees from booking_invitations (accepted), renders per-person amount inputs with running "remaining unallocated" display; amounts stored in booking_splits table |
| PAY-04 | Each guest receives individual Stripe payment link for their share | stripe.paymentLinks.create() with price_data.unit_amount (share in cents), metadata: { booking_id, invitation_id }, after_completion redirect; link URL stored on booking_splits row |
</phase_requirements>

---

## Summary

Phase 17 adds the ability for the group lead to divide a booking's canonical total among confirmed attendees, generate a Stripe Payment Link for each person's share, and surface those links to attendees. The core challenge has two parts: (1) a server-side validation gate that refuses link generation unless the sum of all splits equals `calculatePricing().total` exactly, and (2) using Stripe Payment Links (not Checkout Sessions) so each guest gets a stable, reusable URL they can pay at their convenience.

The attendee roster already exists in `booking_invitations` (Phase 13). The canonical pricing total already lives in `bookings.total` and is produced by `calculatePricing()`. The Stripe client is already initialised in `src/lib/stripe.ts` with API version `2026-02-25.clover`. The existing webhook handler at `/api/webhooks/stripe` handles `checkout.session.completed` — Payment Links fire the same event, so individual split payments can be tracked by the same handler once metadata routing is added.

**Primary recommendation:** Store splits in a new `booking_splits` table (one row per invitation), generate payment links on demand via a Server Action, and track payment status by listening for `checkout.session.completed` events whose metadata contains an `invitation_id` field.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe (server) | already installed (`2026-02-25.clover`) | stripe.paymentLinks.create() | Project already uses; Payment Links is a first-class Stripe API |
| Zod | already installed (v4) | Input validation for split amounts | Consistent with all other Server Actions |
| shadcn/ui | already installed | Input, Button, Table components | Project standard |

### No New Dependencies Required

The entire feature can be built on the existing stack.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── actions/
│   │   └── split-payments.ts        # Server Actions: saveSplits, generatePaymentLink
│   └── validations/
│       └── split-payment.ts         # Zod schemas for split amounts
├── components/
│   └── booking/
│       └── SplitPaymentEditor.tsx   # 'use client' — input per attendee, running balance
└── app/
    └── api/
        └── webhooks/
            └── stripe/
                └── route.ts         # Extend to handle split payment fulfilled events
supabase/
└── migrations/
    └── 20260324000004_split_payments.sql
```

### Pattern 1: booking_splits Table

**What:** A new table `booking_splits` with one row per attendee per booking, storing the assigned amount, Stripe Payment Link URL, and payment status.

**When to use:** Any time a booking total needs distributing across multiple payers. This isolates split state cleanly from `booking_invitations` (which tracks roster membership, not financial obligation).

**Schema:**

```sql
-- Source: derived from bookings + booking_invitations schema patterns in the codebase
CREATE TABLE booking_splits (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  invitation_id  uuid NOT NULL REFERENCES booking_invitations(id) ON DELETE CASCADE,
  amount         numeric(10,2) NOT NULL CHECK (amount > 0),
  stripe_payment_link_id text,
  stripe_payment_link_url text,
  payment_status text NOT NULL DEFAULT 'unpaid'
                   CHECK (payment_status IN ('unpaid', 'paid')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id, invitation_id)
);
```

**RLS:**
- Group lead (booking.guest_id = auth.uid()) can SELECT/INSERT/UPDATE
- Invited attendee can SELECT their own row via invitation_id join

### Pattern 2: Server-Side Total Validation Gate

**What:** Before any Stripe Payment Link is generated, a Server Action re-fetches `bookings.total` and verifies that the sum of all proposed split amounts equals it exactly.

**Why this matters:** The client UI shows a running balance, but currency arithmetic in JavaScript is lossy. The server uses `numeric(10,2)` from Postgres and rounds to cents before comparison.

```typescript
// Source: src/lib/pricing.ts and bookings table schema
// Round to cents for comparison
function centsEqual(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100)
}

// In Server Action — saveSplits():
const { data: booking } = await admin.from('bookings')
  .select('total, guest_id')
  .eq('id', bookingId)
  .single()

const splitSum = splits.reduce((acc, s) => acc + s.amount, 0)
if (!centsEqual(splitSum, Number(booking.total))) {
  return { success: false, error: 'Split amounts must equal the booking total exactly.' }
}
```

### Pattern 3: Stripe Payment Link Creation

**What:** After splits are saved and validated, a separate Server Action `generatePaymentLink(bookingId, invitationId)` calls `stripe.paymentLinks.create()` for one attendee at a time.

**API details (HIGH confidence — from official Stripe docs):**

```typescript
// Source: https://docs.stripe.com/api/payment_links/payment_links/create?lang=node
const link = await getStripe().paymentLinks.create({
  line_items: [
    {
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(splitAmount * 100), // cents
        product_data: {
          name: `${propertyName} — Your share`,
        },
      },
      quantity: 1,
    },
  ],
  metadata: {
    booking_id: bookingId,
    invitation_id: invitationId,   // used in webhook for attribution
    split_type: 'group_booking',
  },
  after_completion: {
    type: 'redirect',
    redirect: {
      url: `${appUrl}/bookings?split_paid=true`,
    },
  },
})
// link.url is the stable payment URL, e.g. https://buy.stripe.com/test_abc123
// link.id is stored for potential deactivation
```

### Pattern 4: Webhook Attribution for Splits

**What:** The existing `checkout.session.completed` webhook handler is extended to detect sessions that originated from a Payment Link (they carry `metadata.invitation_id`).

**Key distinction:** The existing handler uses `metadata.booking_id` to update `bookings.status`. A split payment does NOT confirm the entire booking — it only marks one split row as paid. The webhook must NOT modify `bookings.status` for split payments.

**Detection logic:**

```typescript
// In fulfillCheckout() — src/app/api/webhooks/stripe/route.ts
const invitationId = session.metadata?.invitation_id
const bookingId = session.metadata?.booking_id

if (invitationId) {
  // This is a split payment — mark the split row paid
  await admin.from('booking_splits')
    .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
    .eq('invitation_id', invitationId)
    .eq('booking_id', bookingId)
  return  // Do NOT update bookings.status
}

// Existing: full-booking checkout session (no invitation_id)
// ... existing logic to confirm the booking
```

**Idempotency:** The existing handler already only acts on `status='pending'` for bookings. For splits, the `.update()` on `payment_status='unpaid'` is naturally idempotent.

### Anti-Patterns to Avoid

- **Do not store splits inside booking_invitations:** The invitations table tracks roster membership; mixing financial state into it violates single responsibility and makes RLS harder.
- **Do not generate all links at once on "Save splits":** Generate links lazily per attendee on demand, or in a single batch only after the validation gate passes. Generating links before validation is confirmed wastes Stripe API calls.
- **Do not trust client-submitted amounts:** The split amounts must be validated server-side against `bookings.total`. A malicious client could submit amounts that don't sum to the booking total.
- **Do not use Stripe Checkout Sessions for splits:** The REQUIREMENTS.md Out of Scope section explicitly states "Per-guest individual Stripe Checkout sessions — Group lead sets splits, guests pay via payment links." Use `stripe.paymentLinks.create()`, not `stripe.checkout.sessions.create()`.
- **Do not allow splits on pending bookings:** Splits only make sense after the booking is confirmed (the group lead paid the initial booking total). Guard the Server Action with `.eq('status', 'confirmed')`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Currency rounding | Custom float arithmetic | `Math.round(x * 100) / 100` + integer cents comparison | Floating point errors at .005 boundary cause off-by-one cent failures |
| Per-link payment tracking | Custom UUID tokens + DB poll | Stripe metadata (`invitation_id`) + existing webhook | Already have webhook infrastructure; metadata is the Stripe-native way |
| Payment link deactivation | Custom expiry logic | `stripe.paymentLinks.update(id, { active: false })` | Stripe handles link invalidation |

---

## Common Pitfalls

### Pitfall 1: Float Arithmetic for Sum Validation

**What goes wrong:** `0.1 + 0.2 !== 0.3` in JavaScript. If three guests split $1,500.00 as $500.00 each, `500 + 500 + 500 = 1500` is fine, but splits like $333.33 + $333.33 + $333.34 = 1000.00 can accumulate floating point drift.

**Why it happens:** JavaScript numbers are IEEE 754 doubles.

**How to avoid:** Convert all amounts to integer cents before summing: `splits.reduce((acc, s) => acc + Math.round(s.amount * 100), 0)` then compare to `Math.round(booking.total * 100)`.

**Warning signs:** Validation errors on seemingly correct splits.

### Pitfall 2: Webhook Misidentification

**What goes wrong:** The existing webhook handler will try to confirm a booking when it receives a `checkout.session.completed` from a Payment Link (because `metadata.booking_id` is present on both). This would re-confirm an already-confirmed booking — harmless due to idempotency, but incorrect semantics and it skips updating the split row.

**Why it happens:** Both booking checkouts and payment link completions fire `checkout.session.completed` with `metadata.booking_id`.

**How to avoid:** Check for `metadata.invitation_id` first. If present, route to split fulfillment. If absent, route to the existing booking confirmation path.

### Pitfall 3: Generating Links Before Attendees Are Confirmed

**What goes wrong:** The group lead tries to assign splits to invitees who have not yet accepted. Their name may not be in `booking_invitations.full_name`, and generating a link for them is premature.

**Why it happens:** The group lead may start splitting before all invitations are accepted.

**How to avoid:** Only allow splits for `booking_invitations` rows with `status = 'accepted'`. Show a clear UI message that unaccepted attendees cannot be assigned a split yet.

### Pitfall 4: Payment Link Amounts Don't Match property Name Context

**What goes wrong:** The Stripe payment link shows a generic product name with no context about the booking. The guest has no way to know what they are paying for.

**How to avoid:** Use a descriptive `product_data.name` like `"Villa Casa Esperanza — Your share (3 nights)"` and set `after_completion.redirect.url` back to the bookings page.

### Pitfall 5: Allowing Re-generation of Paid Links

**What goes wrong:** Group lead clicks "Generate link" again for an attendee who has already paid — this creates a second active link for the same split, potentially causing double-payment.

**How to avoid:** Disable the "Generate link" button (or show a "Paid" badge) when `booking_splits.payment_status = 'paid'`. On the server, guard against regeneration for paid splits.

---

## Code Examples

### saveSplits Server Action skeleton

```typescript
// Source: patterns from src/lib/actions/booking-invitations.ts
'use server'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function saveSplits(input: {
  bookingId: string
  splits: { invitationId: string; amount: number }[]
}): Promise<{ success: boolean; error?: string }> {
  const user = await verifySession()
  const supabase = await createClient()

  // Gate: only the booking owner can set splits; booking must be confirmed
  const { data: booking } = await supabase
    .from('bookings')
    .select('total, status')
    .eq('id', input.bookingId)
    .eq('guest_id', user.id)
    .eq('status', 'confirmed')
    .single()

  if (!booking) return { success: false, error: 'Booking not found' }

  // Validate: sum of splits (in cents) must equal booking total (in cents)
  const totalCents = Math.round(Number(booking.total) * 100)
  const splitSumCents = input.splits.reduce(
    (acc, s) => acc + Math.round(s.amount * 100),
    0
  )
  if (splitSumCents !== totalCents) {
    return { success: false, error: 'Split amounts must equal the booking total exactly.' }
  }

  // Upsert splits
  const admin = createAdminClient()
  const rows = input.splits.map((s) => ({
    booking_id: input.bookingId,
    invitation_id: s.invitationId,
    amount: s.amount,
    payment_status: 'unpaid' as const,
  }))

  const { error } = await admin
    .from('booking_splits')
    .upsert(rows, { onConflict: 'booking_id,invitation_id', ignoreDuplicates: false })

  if (error) return { success: false, error: 'Failed to save splits' }
  return { success: true }
}
```

### generatePaymentLink Server Action skeleton

```typescript
// Source: https://docs.stripe.com/api/payment_links/payment_links/create?lang=node
// + src/lib/stripe.ts pattern
export async function generatePaymentLink(input: {
  bookingId: string
  invitationId: string
}): Promise<{ success: boolean; url?: string; error?: string }> {
  const user = await verifySession()
  const supabase = await createClient()

  // Gate: booking must belong to current user and be confirmed
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, total, status, properties(name)')
    .eq('id', input.bookingId)
    .eq('guest_id', user.id)
    .eq('status', 'confirmed')
    .single()

  if (!booking) return { success: false, error: 'Booking not found' }

  const admin = createAdminClient()

  // Fetch the specific split row (must be unpaid, must belong to this booking)
  const { data: split } = await admin
    .from('booking_splits')
    .select('id, amount, payment_status')
    .eq('booking_id', input.bookingId)
    .eq('invitation_id', input.invitationId)
    .single()

  if (!split) return { success: false, error: 'Split not found' }
  if (split.payment_status === 'paid') return { success: false, error: 'This share has already been paid' }

  const propertyName = (booking.properties as { name: string } | null)?.name ?? 'Your Whole-Tel'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Create Stripe Payment Link
  const link = await getStripe().paymentLinks.create({
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(Number(split.amount) * 100),
          product_data: {
            name: `${propertyName} — Your share`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      booking_id: input.bookingId,
      invitation_id: input.invitationId,
      split_type: 'group_booking',
    },
    after_completion: {
      type: 'redirect',
      redirect: { url: `${appUrl}/bookings?split_paid=true` },
    },
  })

  // Store link on split row
  await admin
    .from('booking_splits')
    .update({
      stripe_payment_link_id: link.id,
      stripe_payment_link_url: link.url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', split.id)

  return { success: true, url: link.url }
}
```

### Webhook extension

```typescript
// Extend fulfillCheckout() in src/app/api/webhooks/stripe/route.ts
// Source: existing webhook pattern + Stripe Payment Link metadata convention

async function fulfillCheckout(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.booking_id
  const invitationId = session.metadata?.invitation_id

  if (!bookingId) {
    console.error('Webhook: missing booking_id in session metadata')
    return
  }

  if (session.payment_status === 'unpaid') return

  // Branch: split payment vs full booking checkout
  if (invitationId) {
    const supabase = createAdminClient()
    await supabase
      .from('booking_splits')
      .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
      .eq('invitation_id', invitationId)
      .eq('booking_id', bookingId)
      .eq('payment_status', 'unpaid')   // idempotent guard
    return
  }

  // ... existing full booking confirmation logic unchanged
}
```

---

## Data Model

### booking_splits table (new migration)

```sql
-- supabase/migrations/20260324000004_split_payments.sql
CREATE TABLE booking_splits (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id             uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  invitation_id          uuid NOT NULL REFERENCES booking_invitations(id) ON DELETE CASCADE,
  amount                 numeric(10,2) NOT NULL CHECK (amount > 0),
  stripe_payment_link_id text,
  stripe_payment_link_url text,
  payment_status         text NOT NULL DEFAULT 'unpaid'
                           CHECK (payment_status IN ('unpaid', 'paid')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id, invitation_id)
);

ALTER TABLE booking_splits ENABLE ROW LEVEL SECURITY;

-- Group lead can manage splits for their bookings
CREATE POLICY "Booking owner can manage splits"
  ON booking_splits FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_splits.booking_id
        AND bookings.guest_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_splits.booking_id
        AND bookings.guest_id = (SELECT auth.uid())
    )
  );

-- Attendees can view their own split (to see payment link)
CREATE POLICY "Invited attendee can view their split"
  ON booking_splits FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM booking_invitations bi
      WHERE bi.id = booking_splits.invitation_id
        AND bi.email = (SELECT email FROM profiles WHERE id = (SELECT auth.uid()))
    )
  );
```

### Relationship to existing tables

```
bookings (confirmed)
  └── booking_invitations (accepted, full_name + phone)
        └── booking_splits (amount, stripe_payment_link_url, payment_status)
```

---

## UI Flow

1. Group lead opens their confirmed booking on `/bookings`
2. A new "Split Payments" section appears below the attendee list (only for confirmed bookings with at least one accepted attendee)
3. For each accepted attendee, an editable amount field is shown
4. A running "Remaining: $X.XX" balance shows how much is still unallocated
5. "Save splits" button is enabled when balance reaches $0.00 — triggers `saveSplits()` Server Action
6. After save, each attendee row shows a "Generate link" button — triggers `generatePaymentLink()` Server Action
7. Once a link is generated, it displays as a copyable URL and the row shows "Paid" or "Unpaid" badge

**Group lead view — the group lead is also an attendee.** They should be able to assign themselves a split too (or leave it at $0 if they are paying their own share via the original checkout).

**The group lead already paid the original booking total.** A key design question: does the group lead want to collect reimbursements from attendees (booking total already paid in full)? Or is the split a pre-payment split where the booking is confirmed before anyone else has paid? Given the existing flow (booking.status becomes 'confirmed' after the group lead pays via Stripe Checkout), this is a reimbursement scenario. The Stripe Payment Links collect each attendee's share back to the platform.

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Stripe Checkout Sessions per attendee | Stripe Payment Links | REQUIREMENTS.md explicitly bans Checkout Sessions for splits |
| Splits stored as JSONB in bookings | Normalized `booking_splits` table | Enables per-row RLS, payment status tracking, and idiomatic Supabase queries |

---

## Open Questions

1. **Group lead self-split: should the group lead get a payment link for their own share?**
   - What we know: The group lead already paid the full booking total. Splits are reimbursements.
   - What's unclear: The requirements say "each attendee receives a link for their share" — it's ambiguous whether the group lead's share is $0 or an allocated amount.
   - Recommendation: Allow the group lead to optionally assign themselves a share. If their amount is $0, no link is generated for them. If positive, a link is generated (they can use it to track they've already covered their portion).

2. **What happens when a split is regenerated after an old link is active?**
   - What we know: Stripe payment links remain active until explicitly deactivated.
   - What's unclear: The spec doesn't mention link regeneration.
   - Recommendation: When a new link is generated for a row that already has `stripe_payment_link_id`, deactivate the old link first via `stripe.paymentLinks.update(oldId, { active: false })`.

3. **Attendee email delivery of the payment link**
   - What we know: The existing Resend email infrastructure (booking-invitations.ts) can send emails. No email delivery for payment links is specified in PAY-04.
   - What's unclear: PAY-04 says "each guest receives individual Stripe payment link" — does "receives" imply email delivery or just UI display?
   - Recommendation: Show the link in the UI for the group lead to share. Adding email delivery is a nice enhancement but not required to satisfy PAY-04 as stated.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (inferred from pricing.test.ts and itinerary.test.ts in codebase) |
| Config file | Not confirmed — see Wave 0 |
| Quick run command | `npx vitest run src/lib/actions/split-payments.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAY-03 | saveSplits rejects if sum != booking total | unit | `npx vitest run src/lib/actions/split-payments.test.ts` | Wave 0 |
| PAY-03 | saveSplits rejects non-owner | unit | `npx vitest run src/lib/actions/split-payments.test.ts` | Wave 0 |
| PAY-03 | saveSplits rejects pending booking | unit | `npx vitest run src/lib/actions/split-payments.test.ts` | Wave 0 |
| PAY-03 | UI shows remaining balance ($0 enables save) | manual | manual review | N/A |
| PAY-04 | generatePaymentLink returns a stripe.com URL | unit | `npx vitest run src/lib/actions/split-payments.test.ts` | Wave 0 |
| PAY-04 | generatePaymentLink blocks re-generation on paid split | unit | `npx vitest run src/lib/actions/split-payments.test.ts` | Wave 0 |
| PAY-04 | Webhook marks split as paid when invitation_id in metadata | unit | `npx vitest run src/app/api/webhooks/stripe/route.test.ts` | Wave 0 |

### Wave 0 Gaps

- [ ] `src/lib/actions/split-payments.test.ts` — covers PAY-03 validation logic, PAY-04 link generation guards
- [ ] `src/lib/validations/split-payment.ts` — Zod schema for split input
- [ ] Migration `supabase/migrations/20260324000004_split_payments.sql` — booking_splits table

*(Vitest is confirmed present in the codebase via pricing.test.ts and itinerary.test.ts)*

---

## Sources

### Primary (HIGH confidence)

- [Stripe Payment Links Create API (Node.js)](https://docs.stripe.com/api/payment_links/payment_links/create?lang=node) — line_items, price_data, metadata, after_completion parameters
- [Stripe Payment Links URL Parameters](https://docs.stripe.com/payment-links/url-parameters) — client_reference_id and metadata attribution
- [Stripe Post-Payment Webhooks](https://docs.stripe.com/payment-links/post-payment) — checkout.session.completed fires for Payment Links
- Project source: `src/lib/stripe.ts` — confirmed Stripe client setup and API version `2026-02-25.clover`
- Project source: `src/lib/pricing.ts` — calculatePricing() is the canonical pricing function
- Project source: `src/app/api/webhooks/stripe/route.ts` — existing webhook uses metadata.booking_id pattern
- Project source: `supabase/migrations/20260308000004_booking_invitations.sql` — booking_invitations schema
- Project source: `supabase/migrations/20260324000001_guest_registration_deadlines.sql` — booking_invitations.full_name, phone columns confirmed

### Secondary (MEDIUM confidence)

- [Stripe Payment Links Create (general)](https://docs.stripe.com/payment-links/create) — price_data inline creation pattern
- Project source: `src/lib/actions/booking-invitations.ts` — Server Action patterns (verifySession, admin client, Zod)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Stripe Payment Links are a documented, stable API; all other libs already present
- Architecture: HIGH — data model closely follows existing patterns (booking_invitations, booking_add_ons)
- Webhook extension: HIGH — confirmed checkout.session.completed fires for Payment Links; metadata routing is a standard pattern
- Pitfalls: HIGH — float arithmetic and idempotency issues are well-known and confirmed by code inspection

**Research date:** 2026-03-24
**Valid until:** 2026-06-24 (Stripe APIs are very stable; pricing.ts and schema patterns are internal)
