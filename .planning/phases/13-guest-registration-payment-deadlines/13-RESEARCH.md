# Phase 13: Guest Registration & Payment Deadlines - Research

**Researched:** 2026-03-23
**Domain:** Booking attendee registration, deadline enforcement via Vercel Cron, UI countdown timers
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Attendee Registration (PAY-01)**
- Extend `booking_invitations` table with `full_name text` and `phone text` columns (decided in STATE.md — no new table)
- On invitation acceptance, require full_name and phone before completing acceptance
- Group lead sees attendee details in the guest list on booking detail page
- "18+" age requirement is honor-system — no date-of-birth collection

**Adding Attendees (PAY-02)**
- Group lead can add attendees two ways:
  1. By email — sends invitation email with token link (existing flow, extended with name/phone collection on accept)
  2. Manual entry — group lead fills in full_name, email, phone directly, creates invitation with status='accepted' (no email sent)
- No username lookup — current schema has `display_name` but no unique username field
- Manual entry is for situations where attendees won't have accounts (e.g., entering spouse/partner details)

**First Payment Deadline (PAY-05)**
- 36-hour deadline starts at `bookings.created_at` (when pending row is inserted)
- Add `payment_deadline timestamptz` column to bookings, computed as `created_at + interval '36 hours'` on insert
- Booking detail page shows countdown timer for pending bookings with "Complete Payment" CTA linking to Stripe Checkout
- Store Stripe Checkout session URL in bookings table for re-access (`stripe_checkout_url text`)

**Activity Booking Deadline (PAY-06)**
- Add `activity_deadline timestamptz` column to bookings, computed as `LEAST(check_in - interval '30 days', created_at + interval '7 days')`
- Display-only for now — enforcement comes with itinerary builder in Phase 16
- Show on booking detail page: "Activity booking deadline: {date}"

**Deadline Enforcement (PAY-08)**
- Use Vercel Cron (safest choice — no Supabase tier dependency, project already on Vercel)
- Cron route: `/api/cron/expire-bookings` runs every 15 minutes
- Logic: find all bookings where `status = 'pending'` AND `payment_deadline < now()`, set `status = 'expired'`
- Expired bookings release the date range (GiST exclusion only applies to non-expired bookings via partial index or status check)
- Secure cron route with `CRON_SECRET` env var (Vercel sends this header)

**Fix: Non-Atomic guest_count (from STATE.md)**
- Current `acceptInvitation` does a read-then-write on guest_count — race condition
- Fix with atomic SQL: `UPDATE bookings SET guest_count = guest_count + 1 WHERE id = $1`
- Recalculate pricing after atomic increment

### Claude's Discretion
- Exact countdown timer component design
- Cron frequency (suggested 15 min)
- Migration ordering and naming
- Error states for expired booking display
- Whether to add an "expired" badge variant or reuse existing patterns

### Deferred Ideas (OUT OF SCOPE)
- Payment splitting between attendees (Phase 17: PAY-03, PAY-04)
- Email notifications for approaching deadlines (Future: NOTF-02)
- Itinerary/activity booking enforcement against deadline (Phase 16)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAY-01 | Guest registration requires full name, email, and phone for all attendees 18+ | `booking_invitations` schema extension identified; acceptance flow in `acceptInvitation` already exists and must be extended with form-gating |
| PAY-02 | Group lead can add attendees via email or manual entry | `sendInvitation` action covers email path; new `addAttendeeManually` action needed with direct insert at status='accepted' |
| PAY-05 | First property payment due within 36 hours of booking | `payment_deadline` + `stripe_checkout_url` columns needed on `bookings`; countdown timer component in `BookingDetails` |
| PAY-06 | Activity/itinerary booking deadline: 30 days before check-in OR 7 days after booking | `activity_deadline` column computed by `LEAST()` function; display-only in `BookingDetails` |
| PAY-08 | Payment deadline enforcement (expired unpaid bookings auto-cancel) | Vercel Cron at `/api/cron/expire-bookings`; `status` CHECK constraint must be widened to include `'expired'`; GiST partial index must exclude `'expired'` |
</phase_requirements>

---

## Summary

Phase 13 extends three areas of an existing booking system: (1) attendee registration data, (2) deadline columns and their UI display, and (3) automated expiry of unpaid bookings. The work is primarily additive — new DB columns, a new cron route, and extended UI components — with no structural rewrites except the atomic guest_count fix and the `status` constraint migration.

The most critical migration detail is that the `bookings.status` CHECK constraint currently only allows `('pending', 'confirmed', 'cancelled')`. Adding `'expired'` requires altering that constraint in the same migration that adds the deadline columns. The GiST exclusion partial index already uses `WHERE (status = 'confirmed')`, so expired bookings will automatically be excluded from date-range blocking with no index change needed.

The invitation acceptance flow (`acceptInvitation` in `booking-invitations.ts`) requires two changes: it must gate completion behind a name+phone form, and the final `UPDATE bookings SET guest_count = guest_count + 1` must become atomic. The current code reads `booking.guest_count + 1` in application code then writes — this is a race condition that must be fixed with a SQL-level increment.

**Primary recommendation:** Run all schema changes in a single migration (`20260323000002_guest_registration_deadlines.sql`), extend the invitation flows in-place, add a `PaymentDeadlineCountdown` client component, create the Vercel Cron route, and add the `vercel.json` crons entry.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16 | API route handler for cron endpoint | Already in use; `route.ts` pattern established |
| Supabase admin client | existing | Cross-user updates in cron job | Already pattern: `createAdminClient()` for service-role ops |
| Vercel Cron | built-in | 15-min schedule for expiry check | Free on all Vercel plans; no Supabase pg_cron tier required |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Badge | existing | "Expired" status badge | Add `expired` case to existing `StatusBadge` function |
| shadcn/ui Input | existing | Manual attendee entry form | Full name, email, phone fields inline in GuestList |
| Lucide icons | existing | Clock icon for deadline display | `Clock` for countdown; `AlertCircle` for expired state |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel Cron | Supabase pg_cron | pg_cron requires Pro plan ($25/mo); Vercel Cron is free and already available |
| Vercel Cron | Inngest / Trigger.dev | Additional service dependency not warranted for a simple 15-min batch |
| Column-computed deadlines | DB triggers | Triggers add hidden logic; explicit column values set on insert are transparent and queryable |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/cron/
│   └── expire-bookings/route.ts    # Vercel Cron handler
├── components/booking/
│   ├── BookingDetails.tsx           # Extended with deadlines section
│   ├── GuestList.tsx                # Extended with full_name, phone display
│   ├── InviteGuestForm.tsx          # Unchanged (email path)
│   ├── ManualAttendeeForm.tsx       # NEW: inline manual entry
│   └── PaymentDeadlineCountdown.tsx # NEW: client countdown timer
├── lib/actions/
│   └── booking-invitations.ts       # Extended: name+phone gating, addAttendeeManually
supabase/migrations/
└── 20260323000002_guest_registration_deadlines.sql
vercel.json                          # NEW: crons configuration
```

### Pattern 1: Vercel Cron Route with CRON_SECRET
**What:** Route handler that only responds to Vercel-signed requests
**When to use:** Any scheduled background task on Vercel

```typescript
// src/app/api/cron/expire-bookings/route.ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('status', 'pending')
    .lt('payment_deadline', new Date().toISOString())
    .select('id')

  if (error) {
    console.error('expire-bookings cron error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ expired: data?.length ?? 0 })
}
```

**vercel.json entry:**
```json
{
  "crons": [
    {
      "path": "/api/cron/expire-bookings",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

### Pattern 2: Atomic guest_count increment via Supabase RPC
**What:** SQL-level increment to prevent read-then-write race condition
**When to use:** Any counter increment in multi-user context

The current `acceptInvitation` code does:
```typescript
// BROKEN — race condition
const newGuestCount = booking.guest_count + 1
await admin.from('bookings').update({ guest_count: newGuestCount, ... })
```

Fix using Supabase's `.rpc()` or a raw update with SQL expression. Since Supabase JS v2 does not support `SET guest_count = guest_count + 1` directly via `.update()`, use an RPC function:

```sql
-- Migration: add helper RPC
CREATE OR REPLACE FUNCTION increment_booking_guest_count(booking_id uuid)
RETURNS TABLE(new_count int, new_subtotal numeric, ...) AS $$
  UPDATE bookings
  SET guest_count = guest_count + 1, updated_at = now()
  WHERE id = booking_id AND status IN ('pending', 'confirmed')
  RETURNING guest_count, ...
$$ LANGUAGE sql SECURITY DEFINER;
```

Alternatively, since `createAdminClient()` has full access, use a PostgreSQL function via `.rpc('increment_guest_count', { booking_id })` and then recalculate pricing in the Server Action. This is simpler than trying to do it in one SQL statement because pricing recalculation requires application-level logic.

**Simplest safe approach:** Use the admin client to do the increment in two steps but with an optimistic lock check:
```typescript
// Atomic increment using .rpc() or raw SQL
const { data: updated } = await admin
  .from('bookings')
  .update({ guest_count: supabase.rpc('...') })  // not directly possible
```

The actual implementation should use a PostgreSQL function or a Supabase database function that atomically increments and returns the new count. See Code Examples section.

### Pattern 3: Gated Invitation Acceptance Form
**What:** Show name+phone form before calling `acceptInvitation`; only call action once both are filled
**When to use:** Anywhere data must be collected before a one-shot action completes

The `InvitationActions` component currently calls `acceptInvitation(token)` directly. The extended flow needs an intermediate state:

```
[Accept button] → [Name/Phone form shown] → [Submit with name+phone] → acceptInvitation(token, { fullName, phone })
```

The `acceptInvitation` Server Action signature must be extended to accept `fullName` and `phone`, then include them in the `UPDATE booking_invitations SET full_name=..., phone=...` call.

### Pattern 4: Client-side Countdown Timer
**What:** `useEffect`-based interval that recalculates remaining time every second
**When to use:** Deadline countdown UI

```typescript
'use client'
// PaymentDeadlineCountdown.tsx
import { useState, useEffect } from 'react'

export function PaymentDeadlineCountdown({ deadline }: { deadline: string }) {
  const [remaining, setRemaining] = useState(() => getRemaining(deadline))

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getRemaining(deadline))
    }, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  if (remaining <= 0) {
    return <span className="text-destructive text-sm">Payment window expired</span>
  }

  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = remaining % 60

  return (
    <span className="text-amber-600 text-sm font-medium tabular-nums">
      {hours}h {minutes}m {seconds}s remaining
    </span>
  )
}

function getRemaining(deadline: string): number {
  return Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000))
}
```

**Important:** This is a 'use client' component. The parent `BookingDetails.tsx` is already a client component so no RSC boundary issues arise.

### Anti-Patterns to Avoid
- **Reading guest_count then writing incremented value:** Race condition — use atomic DB increment
- **Setting `payment_deadline` in application code on insert:** Set it as `created_at + interval '36 hours'` in the DB migration via a trigger or set it in the Server Action immediately after insert using the returned `created_at` value — be consistent
- **Trusting client-submitted `full_name`/`phone` without Zod validation:** Validate in Server Action before writing to DB
- **Storing Stripe checkout URL on the client:** `stripe_checkout_url` must be set in the `createBookingAndCheckout` Server Action, not derived from the frontend

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scheduled job execution | Custom polling loop | Vercel Cron (`vercel.json`) | Free, no ops overhead, integrated with deployment |
| Atomic counter increment | Read+write in application | PostgreSQL `UPDATE ... SET col = col + 1` via RPC | Application-level increments have TOCTOU races |
| Phone number formatting | Custom regex | Accept raw input, validate format server-side with Zod `z.string().min(7)` | Phone formats vary internationally; honor-system collection, simple validation sufficient |
| Countdown timer from scratch | Custom time calculation | ~15 lines of `useEffect` + `setInterval` (see Code Examples) | No library needed for this simplicity |

**Key insight:** The cron pattern is intentionally simple — a batch update query every 15 minutes is sufficient. Real-time expiry to the exact second is not needed for a 36-hour window.

## Common Pitfalls

### Pitfall 1: `status` CHECK Constraint Blocks 'expired'
**What goes wrong:** Migration adds `payment_deadline` column and cron sets `status = 'expired'`, but the PostgreSQL CHECK constraint `CHECK (status IN ('pending', 'confirmed', 'cancelled'))` causes the cron update to fail silently or with a constraint violation.
**Why it happens:** The original schema only defined three statuses. Adding a fourth requires explicitly widening the constraint.
**How to avoid:** The migration must `ALTER TABLE bookings DROP CONSTRAINT bookings_status_check` and re-add it with `'expired'` included. Also update `BookingStatus` type in `src/types/database.ts` and the `StatusBadge` switch statement.
**Warning signs:** Cron returns 0 expired bookings even when pending deadlines have passed.

### Pitfall 2: GiST Exclusion Index and 'expired' Status
**What goes wrong:** If expired bookings were counted as blocking dates, a user could never rebook a date that had an expired pending booking.
**Why it happens:** The GiST EXCLUDE constraint uses `WHERE (status = 'confirmed')` — only confirmed bookings block dates. Expired bookings are already excluded by the partial index condition, same as pending and cancelled.
**How to avoid:** No change needed to the GiST constraint — `'expired'` will automatically be excluded. Just verify the constraint clause when writing the migration.

### Pitfall 3: Non-Atomic Pricing Recalculation After Guest Count Increment
**What goes wrong:** If two users accept invitations at the same time, both read `guest_count = 5`, both compute `newCount = 6`, and one write overwrites the other — booking ends up with wrong guest count and wrong pricing.
**Why it happens:** `acceptInvitation` currently reads booking, computes `+ 1`, and writes. Two concurrent executions are not serialized.
**How to avoid:** Use a PostgreSQL function to atomically increment `guest_count` and return the new value, then recalculate pricing in the Server Action using the returned new count.

### Pitfall 4: `payment_deadline` Requires `stripe_checkout_url` for Re-access
**What goes wrong:** Showing a countdown timer with "Complete Payment" CTA but having no URL to link to — the Stripe Checkout session URL is only returned once at session creation.
**Why it happens:** The current `createBookingAndCheckout` action immediately redirects and never stores the session URL.
**How to avoid:** Before redirecting, update the booking row with `stripe_checkout_url = session.url`. The CTA on the booking detail page then links to this stored URL.

### Pitfall 5: Countdown Timer Hydration Mismatch
**What goes wrong:** Server-rendered countdown shows a different time than client-rendered, causing React hydration errors.
**Why it happens:** The countdown depends on `Date.now()` which differs between server and client render.
**How to avoid:** Render the countdown as a client-only component (already `'use client'`) with initial state computed in `useState(() => getRemaining(deadline))` — this only runs on the client. Do not render it inside a Server Component.

### Pitfall 6: Manual Attendee Entry Bypasses Email Validation
**What goes wrong:** Group lead enters a manual attendee with any email — this creates an accepted invitation for an email that may belong to a real account (or nobody).
**Why it happens:** Manual flow skips the token-based acceptance path.
**How to avoid:** Manual entry creates `booking_invitations` with `status='accepted'` and no `accepted_by` (UUID null) since there is no Supabase user. The `full_name`, `email`, and `phone` columns are populated directly. The `accepted_by` column is already nullable. Document this clearly in the Server Action.

## Code Examples

### Migration: Deadline Columns + Status Constraint Update
```sql
-- supabase/migrations/20260323000002_guest_registration_deadlines.sql

-- 1. Widen status CHECK constraint to include 'expired'
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired'));

-- 2. Add deadline columns
ALTER TABLE bookings
  ADD COLUMN payment_deadline  timestamptz,
  ADD COLUMN activity_deadline timestamptz,
  ADD COLUMN stripe_checkout_url text;

-- Backfill existing pending bookings (treat as created_at + 36h)
UPDATE bookings
SET
  payment_deadline  = created_at + interval '36 hours',
  activity_deadline = LEAST(check_in::timestamptz - interval '30 days',
                            created_at + interval '7 days')
WHERE payment_deadline IS NULL;

-- 3. Extend booking_invitations with registration fields
ALTER TABLE booking_invitations
  ADD COLUMN full_name text,
  ADD COLUMN phone     text;

-- 4. RPC for atomic guest count increment (returns new count)
CREATE OR REPLACE FUNCTION increment_booking_guest_count(p_booking_id uuid)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE bookings
  SET guest_count = guest_count + 1,
      updated_at  = now()
  WHERE id = p_booking_id
    AND status IN ('pending', 'confirmed')
    AND guest_count < (
      SELECT max_guests FROM properties
      WHERE properties.id = bookings.property_id
    )
  RETURNING guest_count;
$$;
```

### Extended `acceptInvitation` Action (key changes only)
```typescript
// Signature extended with registration data
export async function acceptInvitation(
  token: string,
  registration: { fullName: string; phone: string }
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  // ... existing auth + invitation fetch ...

  // Use atomic increment RPC instead of read-then-write
  const { data: newCount, error: incrementError } = await admin
    .rpc('increment_booking_guest_count', { p_booking_id: invitation.booking_id })

  if (incrementError || newCount == null) {
    return { success: false, error: 'Failed to increment guest count or booking is full' }
  }

  // Update invitation with name + phone + accepted_by
  await admin
    .from('booking_invitations')
    .update({
      status: 'accepted',
      accepted_by: user.id,
      full_name: registration.fullName.trim(),
      phone: registration.phone.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', invitation.id)

  // Recalculate pricing using newCount (atomic value)
  // ... rest of pricing recalculation using newCount ...
}
```

### `addAttendeeManually` Server Action
```typescript
export async function addAttendeeManually(input: {
  bookingId: string
  fullName: string
  email: string
  phone: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await verifySession()
  // Validate input with Zod
  // Verify booking belongs to user and is confirmed
  // Check guest_count < max_guests
  // Insert booking_invitation with status='accepted', accepted_by=null
  // Atomically increment guest_count via RPC
  // Recalculate + update pricing
  // revalidatePath('/bookings')
}
```

### `createBookingAndCheckout` — Store Stripe URL
```typescript
// Before redirect(), store the session URL
await supabase
  .from('bookings')
  .update({
    stripe_checkout_url: session.url,
    payment_deadline: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
    activity_deadline: computeActivityDeadline(input.checkIn, new Date()),
  })
  .eq('id', booking.id)

// Then redirect
redirect(stripeUrl)
```

### Deadline display in `BookingDetails`
```typescript
// Inside BookingDetails (already 'use client')
{status === 'pending' && booking.payment_deadline && (
  <div className="flex items-center gap-2 text-sm">
    <Clock className="h-3.5 w-3.5 text-amber-500" />
    <span className="text-muted-foreground">Payment due: </span>
    <PaymentDeadlineCountdown deadline={booking.payment_deadline} />
    {booking.stripe_checkout_url && (
      <a href={booking.stripe_checkout_url} className="...">
        Complete Payment
      </a>
    )}
  </div>
)}

{booking.activity_deadline && (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Calendar className="h-3.5 w-3.5" />
    <span>Activity booking deadline: {formatDate(booking.activity_deadline)}</span>
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `guest_count + 1` read-write | Atomic SQL increment via RPC | Phase 13 | Eliminates race condition on concurrent acceptances |
| 3-value status ('pending','confirmed','cancelled') | 4-value status adds 'expired' | Phase 13 | Expired bookings distinguishable from cancelled; CHECK constraint must be updated |
| No registration data on invitations | `full_name` + `phone` columns | Phase 13 | Enables per-attendee records without a new table |

**Deprecated/outdated:**
- `createBookingAndCheckout` redirect-without-storing: must be updated to store `stripe_checkout_url` and `payment_deadline` before redirect

## Open Questions

1. **`payment_deadline` set in Server Action vs DB trigger**
   - What we know: CONTEXT.md says "computed as `created_at + interval '36 hours'` on insert" — this implies DB-level computation
   - What's unclear: A DB trigger on INSERT would auto-set it; alternatively, the Server Action can compute it explicitly
   - Recommendation: Set it explicitly in the `createBookingAndCheckout` Server Action (same pattern as other fields) rather than adding a trigger. More transparent, easier to test.

2. **`activity_deadline` for bookings where check_in is less than 37 days away**
   - What we know: `LEAST(check_in - 30 days, created_at + 7 days)` — if check_in is 10 days away, this computes to `created_at + 7 days`
   - What's unclear: If check_in is 5 days away, the deadline would be in the past on creation (`check_in - 30 days` = 25 days ago)
   - Recommendation: The planner should add a floor: `GREATEST(now(), LEAST(...))` so activity_deadline is never in the past at time of booking creation. Or just accept it as "deadline already passed" for very near-term bookings — the field is display-only in Phase 13.

3. **Cron behavior during Vercel cold starts or deployment**
   - What we know: Vercel Cron sends GET to the route on schedule; route must be stateless
   - What's unclear: If a deployment is in progress, Vercel may miss a cron tick
   - Recommendation: The expiry logic is idempotent (only updates `status='pending'` rows past deadline), so missed ticks are self-healing on the next run.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (^4.0.18, devDependency — no test script in package.json yet) |
| Config file | None — uses Vitest defaults (looks for `*.test.ts` in src/) |
| Quick run command | `npx vitest run src/lib/pricing.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAY-01 | `acceptInvitation` rejects if `full_name` or `phone` missing | unit | `npx vitest run src/lib/actions/booking-invitations.test.ts` | ❌ Wave 0 |
| PAY-02 | `addAttendeeManually` inserts with `status='accepted'` and null `accepted_by` | unit | `npx vitest run src/lib/actions/booking-invitations.test.ts` | ❌ Wave 0 |
| PAY-05 | `payment_deadline` is `created_at + 36h`; `stripe_checkout_url` stored | unit | `npx vitest run src/lib/actions/bookings.test.ts` | ❌ Wave 0 |
| PAY-06 | `activity_deadline` = `LEAST(check_in - 30d, created_at + 7d)` | unit | `npx vitest run src/lib/utils.test.ts` (deadline helper) | ❌ Wave 0 |
| PAY-08 | Cron handler rejects non-`CRON_SECRET` requests; updates only `status='pending'` past deadline | unit | `npx vitest run src/app/api/cron/expire-bookings/route.test.ts` | ❌ Wave 0 |

Note: Server Actions that depend on Supabase are best tested via integration tests. Unit tests for pure logic (deadline computation, validation) are feasible. The existing `pricing.test.ts` pattern (pure function) is the model to follow.

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/pricing.test.ts` (existing baseline)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/actions/booking-invitations.test.ts` — covers PAY-01, PAY-02 (pure validation logic only; mock Supabase)
- [ ] `src/app/api/cron/expire-bookings/route.test.ts` — covers PAY-08 (auth check + update logic with mocked admin client)
- [ ] Add `"test": "vitest run"` script to `package.json` (currently missing — vitest is installed but not runnable via `npm test`)

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection — `src/lib/actions/booking-invitations.ts`, `src/lib/actions/bookings.ts`, `src/components/booking/*.tsx`
- `supabase/migrations/20260308000004_booking_invitations.sql` — confirmed `booking_invitations` schema
- `supabase/migrations/20260302000001_schema_rls.sql` — confirmed `bookings` schema, GiST constraint, status CHECK
- `src/types/database.ts` — confirmed `BookingStatus`, `BookingInvitation` types
- `.planning/phases/13-guest-registration-payment-deadlines/13-CONTEXT.md` — locked decisions
- Vercel documentation (verified pattern): Cron Jobs use `vercel.json` `crons` array + `authorization: Bearer CRON_SECRET` header

### Secondary (MEDIUM confidence)
- Vercel Cron pricing: confirmed free on all plans including Hobby as of 2024 (schedule limitations apply: minimum 1-minute intervals on paid plans, daily on Hobby — 15-min requires Pro)
- Supabase JS v2 does not support `SET col = col + 1` syntax in `.update()` — workaround via `.rpc()` with a SECURITY DEFINER function is the documented pattern

### Tertiary (LOW confidence)
- Supabase pg_cron availability on free tier: STATE.md flagged this as uncertain; Vercel Cron decision is already locked so this is moot

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use; no new dependencies
- Architecture: HIGH — all patterns derived from existing codebase inspection
- Pitfalls: HIGH — status constraint and race condition identified via direct code review; countdown hydration is a well-known Next.js pattern

**Research date:** 2026-03-23
**Valid until:** 2026-06-23 (stable domain; Vercel Cron API is mature)

---

### Critical Note on Vercel Cron Hobby Plan

**LOW confidence caveat:** Vercel Hobby plan restricts Cron Jobs to daily execution (once per day). A 15-minute schedule requires the Pro plan. If this project is on Hobby, the cron approach needs adjustment — either upgrade to Pro, or accept daily expiry runs (expired bookings would not be purged until once a day). The CONTEXT.md decision to use Vercel Cron is correct regardless; the frequency needs confirming against the account tier.
