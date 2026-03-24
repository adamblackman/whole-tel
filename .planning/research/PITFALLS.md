# Domain Pitfalls: v1.2 Whole-Tel — Itinerary Builder, Split Payments, Partner Application, Amenities

**Domain:** Group hotel booking platform — adding calendar/itinerary builder, split payments with deadlines, partner application workflow, amenities system to an existing Stripe + Supabase booking flow
**Researched:** 2026-03-23
**Confidence:** HIGH (derived from codebase analysis of existing payment flow, webhook handler, pricing module, and invitation system + verified patterns)

---

## Critical Pitfalls

### Pitfall 1: Split Payment Breaks the "Single Stripe Checkout Session Per Booking" Model

**What goes wrong:**
The existing flow creates one Stripe Checkout Session for the full booking total and the webhook sets `status = 'confirmed'` when it fires. With a split payment system, the booking lead pays a deposit (e.g., 36hr deadline) and group members each pay their share by a later deadline. The naive approach is to create a new Stripe Checkout Session per payment installment and have the webhook confirm the booking. This creates multiple webhook events for the same booking UUID — the existing `fulfillCheckout` handler tries to `UPDATE ... WHERE status = 'pending'` every time, which is idempotent but means booking confirmation happens on the FIRST individual payment, not when all payments are collected.

**Why it happens:**
Developers extend the existing `createBookingAndCheckout` Server Action by adding a `paymentType: 'deposit' | 'split'` flag, fire multiple Stripe sessions, and assume the existing webhook handles it. It doesn't — the booking goes `confirmed` as soon as any single person pays, even if the total collected is far less than the booking value.

**Consequences:**
- Booking is marked `confirmed` with only 20% of the total collected
- Hotel gets a confirmation email for a booking with unpaid balance
- No mechanism to cancel if remaining installments aren't paid
- Financial reconciliation is impossible: `bookings.total` says $10,000 but Stripe shows $2,000 collected

**How to avoid:**
1. Add a `payment_schedule` table: one row per expected payment, with `(booking_id, amount_due, due_at, paid_at, stripe_session_id, status)`.
2. Booking status logic: `pending` → `deposit_paid` (after first payment) → `confirmed` (after all payments collected). Add the intermediate status to the `BookingStatus` type.
3. The webhook handler must check if all payment schedule rows are `paid` before transitioning to `confirmed`.
4. Never use the existing `fulfillCheckout` for installment sessions — write a separate `fulfillInstallment` path in the webhook switch.
5. For the v1.2 scope where Whole-Tel collects total and distributes a cost calculator (not individual Stripe charges per person), the payment schedule tracks WHO owes WHAT as a UI ledger, with the group lead still responsible for full Stripe payment. Clarify this scope before building.

**Warning signs:**
- Booking moves to `confirmed` before all split payments are recorded as received
- `bookings.total` does not match sum of completed `payment_schedule.amount_due` rows
- Webhook handler has a single path for all checkout events with no payment-type discrimination

**Phase to address:** Split payment system phase — design the payment schedule data model before writing any Stripe session creation code

---

### Pitfall 2: calculatePricing() State Drift When Split Amounts Are Computed Client-Side

**What goes wrong:**
The existing `calculatePricing()` module (confirmed in `src/lib/pricing.ts`) is a pure function used by both `PricingWidget` (client) and `createBookingAndCheckout` (server). For split payments, the group lead adjusts how costs are divided per person. Developers build the split calculator in the client and store only the per-person amounts in the database — not the canonical breakdown from `calculatePricing()`. Later, when reconciling or recalculating (e.g., a guest cancels), the server must reconstruct the split from the per-person rows. If the client rounded differently or applied a processing fee before splitting, the server recalculation produces a different total.

**Why it happens:**
The split UI is purely presentational ("divide $10,240 among 8 people"), so developers implement it in the client with simple arithmetic. The processing fee (2.9% + $0.30) is already baked into `calculatePricing()`'s `total`. If the client divides `total / guestCount` each person owes includes a fractional processing fee. But if one person drops out, the server recalculates the fee on a different guest count, producing a different per-person amount. The ledger never reconciles.

**Consequences:**
- Per-person amounts stored in the split ledger do not sum to the Stripe payment amount
- When a guest drops out, recalculated amounts differ from what everyone already agreed to
- Penny rounding errors compound over many adjustments

**How to avoid:**
1. The processing fee is the group lead's responsibility — it is not split among guests. The split calculator divides `(total - processingFee)` among guests, then adds the full `processingFee` back to the lead's share.
2. Store the split as absolute dollar amounts per person, not as fractions, to avoid rounding.
3. The server must validate that `sum(split_amounts) + processingFee == booking.total` before saving any split configuration.
4. Use `round2()` (the same internal function in `pricing.ts`) for all split arithmetic to ensure consistent rounding.
5. Re-export `round2` or create a `splitAmounts(total, processingFee, shares)` helper in `pricing.ts` so it stays in the shared module.

**Warning signs:**
- `SUM(split_amount) FROM payment_splits WHERE booking_id = X` does not equal `bookings.total`
- Different per-person amounts shown on refresh vs. initial calculation
- Processing fee appears in individual guest payment requests

**Phase to address:** Split payment system phase — extend `pricing.ts` with a `splitAmounts()` helper before building the split UI

---

### Pitfall 3: Payment Deadlines Without a Reliable Cron — Silent Booking Expiry

**What goes wrong:**
The spec requires: 36hr deadline for the lead's first payment, and activity booking due 30 days before check-in OR 7 days after booking (whichever comes first). Developers implement deadline enforcement in the UI ("your deadline is Feb 3rd"), but rely on the next page load or user action to actually expire bookings. There is no background process cancelling unpaid bookings when deadlines pass.

**Why it happens:**
Supabase has no built-in scheduler. Next.js has no built-in cron. The existing webhook handler only fires when Stripe events occur. Developers mark deadlines in the database and assume "we'll check on load." But: the group lead never returns, the booking never expires, and the property date remains blocked indefinitely.

**Consequences:**
- Properties show unavailable dates for bookings that will never convert
- Hosts hold dates for non-paying leads, rejecting other inquiries
- No automated deadline reminders sent because nothing triggers them

**How to avoid:**
1. Use Supabase's `pg_cron` extension (available on paid plans) for deadline enforcement. A daily job: `UPDATE bookings SET status = 'expired' WHERE status = 'pending' AND created_at < NOW() - INTERVAL '36 hours'`.
2. For deadline reminder emails, use Supabase Edge Functions triggered by `pg_cron` or a Vercel Cron Job (`/api/cron/deadline-reminders`).
3. If `pg_cron` is unavailable (free tier), implement a lazy expiry check: `createBookingAndCheckout` checks for expired pending bookings for the same dates before creating new ones, and date availability queries exclude bookings that are past deadline even if still `pending`.
4. The 30-day/7-day activity deadline logic belongs in a computed column or a view, not application code, so it is enforced consistently across all query paths.
5. Add a Vercel Cron job as a minimum viable solution (`vercel.json` cron, calls a protected `/api/cron/expire-bookings` route).

**Warning signs:**
- `SELECT COUNT(*) FROM bookings WHERE status = 'pending' AND created_at < NOW() - INTERVAL '48 hours'` keeps growing
- Property date picker shows blocked dates for 30+ day old pending bookings
- No cron job or scheduled function exists in the codebase

**Phase to address:** Split payment system phase — deadline enforcement must be designed before payment flow, not added after as an afterthought

---

### Pitfall 4: Calendar Itinerary Builder Stores Times in Local Browser Timezone

**What goes wrong:**
An interactive itinerary builder lets guests schedule activities by time slot (e.g., "boat tour at 10am on Day 2"). Developers store these times as naive datetime strings like `"2026-04-15T10:00"` in the database. The booking was made from a US browser (UTC-5). The property is in Cabo San Lucas (UTC-7). The activity operator sees `10:00` but doesn't know which timezone — their local time or the guest's booking time. The activity shows up 2 hours late or 2 hours early.

**Why it happens:**
The existing booking flow stores `check_in` and `check_out` as DATE strings (`"2026-04-15"`) — no time component, no timezone issue. Itinerary time slots are the first time-aware data in the system. Developers use JavaScript `new Date()` or `Date.toISOString()` without realizing these are UTC representations of the local time the user typed. The `shadcn/ui` calendar component (already in use at `src/components/ui/calendar.tsx`) passes `Date` objects that behave as local time but serialize as UTC.

**Consequences:**
- Activity scheduled at 10am shows as 8am or 3pm depending on who views it and from where
- Operators see different times than guests, causing no-shows
- The existing `react-calendar` library (known issue #511 on wojtekmaj/react-calendar) silently treats UTC midnight as the previous day in certain timezones

**How to avoid:**
1. Store all itinerary times as `TIME` (not `TIMESTAMPTZ`) in the database — just `HH:MM` without a date or timezone. The date comes from the booking's `check_in` + day offset. This avoids DST and timezone entirely for the display case.
2. The property's timezone should be a stored field on the `properties` table (e.g., `timezone: 'America/Mazatlan'`). All time display must use `Intl.DateTimeFormat` with `timeZone: property.timezone`, not the browser's default timezone.
3. Never pass `new Date(dateString)` to a date picker without explicitly specifying the timezone — always parse as UTC and format as property-local.
4. For the v1.2 scope where itinerary is a planning tool (not operator-facing scheduling), storing as wall clock time in the property's timezone is sufficient. Document this assumption explicitly.

**Warning signs:**
- Itinerary times shift by hours when viewed by users in different timezones
- `check_in` date appears as the day before in timezones behind UTC
- Database stores `TIMESTAMPTZ` for itinerary slots but displays them with `toLocaleTimeString()` (browser local)

**Phase to address:** Itinerary builder phase — define storage format in the schema before any UI work

---

### Pitfall 5: Guest Registration (Name/Email/Phone) Creates an Orphaned Identity Layer

**What goes wrong:**
The spec requires registering all attendees: name, email, phone. The existing system already has `booking_invitations` (by email) and `profiles` (authenticated users). Adding a third identity layer — "registered attendee" (not necessarily a Supabase Auth user) — creates three places where a guest can exist: as a Supabase Auth user, as a `booking_invitation`, and as an "attendee" registration. Developers build a new `booking_attendees` table with no link to `booking_invitations` or `profiles`. When an invited guest accepts their invitation AND is registered as an attendee, they exist in all three tables with no FK relationship. Deduplication becomes impossible.

**Why it happens:**
The attendee registration form is built independently of the invitation system because they serve different UX moments (registration at booking time vs. invites sent afterward). The developer doesn't realize these can represent the same physical person.

**Consequences:**
- Guest count on the booking is tracked in `bookings.guest_count` (incremented by acceptInvitation) AND separately in `booking_attendees` row count — these drift
- Emails sent to "all attendees" hit both tables, causing duplicate emails to anyone who is in both
- When a guest cancels, their record in one table is removed but not the other

**How to avoid:**
1. Use `booking_invitations` as the single source of truth for all attendees. The "guest registration" form creates `booking_invitation` rows with `status = 'registered'` (a new status), not a separate table.
2. The group lead fills in name/email/phone for each attendee upfront. This creates `booking_invitation` rows. The invitation email is sent from those rows. If a guest accepts, their row's `accepted_by` is populated.
3. Add `name` and `phone` columns to `booking_invitations` for the registration data. Do not create a separate `booking_attendees` table.
4. The existing `acceptInvitation` action already increments `guest_count` — this remains the canonical guest count source.

**Warning signs:**
- A `booking_attendees` table exists alongside `booking_invitations` with no FK between them
- Duplicate email sends reported by guests (two confirmation emails)
- `booking_attendees` row count differs from `bookings.guest_count`

**Phase to address:** Guest registration / split payment phase — unify the data model before building either the registration form or the split calculator

---

### Pitfall 6: Partner Application Workflow Has No State Machine — Status Field Becomes Inconsistent

**What goes wrong:**
Partner applications move through states: `submitted → under_review → approved → onboarded` (or `rejected`). Developers add a `status` TEXT column with no constraints and update it ad-hoc from multiple places: the admin dashboard, an approval email link, a Supabase trigger. Without a defined state machine, invalid transitions occur: an `approved` application gets moved back to `under_review` because an admin clicked the wrong button. Or: a `rejected` application is `approved` without re-review because the frontend doesn't prevent the transition.

**Why it happens:**
A status column is simple to add. A state machine feels like over-engineering for an MVP. But without it, every status update is unconstrained. Multiple code paths that update status don't check preconditions.

**Consequences:**
- Approved partners get rejection emails because an admin accidentally re-processed their application
- A rejected application leaks through to the property creation flow because the approval check is a string comparison (`status === 'approved'`) that passes if the string was updated inconsistently
- Audit trail is impossible — no history of who changed what when

**How to avoid:**
1. Use a PostgreSQL `ENUM` type for application status: `CREATE TYPE partner_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'onboarded')`. This prevents invalid values at the database level.
2. Add a CHECK constraint or trigger that enforces valid transitions: `submitted → under_review`, `under_review → approved | rejected`, `approved → onboarded`.
3. All status updates go through a single Server Action `updateApplicationStatus(id, newStatus)` that validates the current status before transitioning — never update status columns directly in ad-hoc queries.
4. Add an `application_status_history` table: `(application_id, from_status, to_status, changed_by, changed_at, notes)` for audit trail.
5. When an application is `approved`, automatically create the owner profile row in the same transaction — don't rely on a separate manual step.

**Warning signs:**
- Multiple code paths that call `.update({ status: '...' })` on the applications table without checking current status
- `status` column is TEXT with no enum or check constraint
- Approved partners can't access the owner dashboard because the profile creation step was missed

**Phase to address:** Partner application phase — define the state machine and enum in the schema before building any admin UI

---

## Moderate Pitfalls

### Pitfall 7: Amenities Stored as JSONB Conflicts with Categorized Display

**What goes wrong:**
The existing `properties` table already has an `amenities: Json` column (confirmed in `src/types/database.ts` line 52). The v1.2 spec wants amenities categorized: Water, Social, Work/Event, Culinary, Wellness. Developers assume they can just add sub-keys to the existing JSONB column: `{ "water": ["pool", "jacuzzi"], "social": ["bar", "game_room"] }`. But: (1) the existing `AmenityList` component at `src/components/property/AmenityList.tsx` already reads this column in some format — changing the schema breaks it. (2) The existing data in the column (if any properties have data) has a different shape and must be migrated. (3) No validation prevents typos in amenity names ("swimmingpool" vs "swimming_pool").

**Why it happens:**
JSONB is flexible — it's tempting to just add more keys. But the existing column was added before categorization was designed, so its structure was never validated.

**Consequences:**
- `AmenityList` component renders nothing or throws because the JSONB shape changed
- Existing property amenity data silently ignored (different key structure)
- Owner dashboard shows incorrect amenities for properties created before the schema change

**How to avoid:**
1. Read `src/components/property/AmenityList.tsx` before touching the schema — understand the current expected JSONB shape.
2. Define a fixed TypeScript type for the amenities object: `{ water: string[], social: string[], work_event: string[], culinary: string[], wellness: string[] }` and add a Zod schema to validate it.
3. Add a database migration that reshapes existing data to the new categorized format (likely all properties have empty `{}` amenities — verify before assuming).
4. The canonical list of amenity options per category should live in a constants file, not be freetext — prevents misspellings and enables icon mapping.
5. If any existing property has non-empty amenities in the old format, write a migration function with explicit before/after verification.

**Warning signs:**
- `AmenityList` component shows empty or throws after the amenities schema change
- Owner amenity form doesn't pre-populate existing amenities on edit
- `SELECT amenities FROM properties WHERE amenities != '{}'::jsonb` returns rows with old-format data

**Phase to address:** Amenities phase — first step is read AmenityList.tsx and understand current shape, then design migration

---

### Pitfall 8: Hotel Tax Gross Amount Breaks the Processing Fee Calculation

**What goes wrong:**
The current `calculatePricing()` computes the Stripe processing fee as 2.9% of (accommodation + surcharge + cleaning + add-ons) + $0.30. The spec says "hotel declares taxes, Whole-Tel sends gross amount" — meaning Whole-Tel charges the guest the tax-inclusive amount and remits the full gross to the hotel. If tax is added AFTER the processing fee calculation, the fee is understated (Stripe charges on the full amount including tax). If tax is added BEFORE, the fee is correctly calculated but `calculatePricing()` needs a `taxAmount` parameter it doesn't currently accept.

**Why it happens:**
Tax is an afterthought. The developer adds a "hotel tax" line item to the Stripe session using the booking total from `calculatePricing()`, but `calculatePricing()` doesn't know about tax. The Stripe session total includes tax, but `booking.total` in the database doesn't — they diverge.

**Consequences:**
- Stripe collects more than `booking.total` in the database
- Processing fee in `booking.processing_fee` is understated (calculated pre-tax)
- Financial reconciliation: `SUM(stripe.amount)` ≠ `SUM(bookings.total)`
- If Stripe fee dispute arises, the "processing fee" line item shown to the guest is wrong

**How to avoid:**
1. Add `taxAmount: number` to `PricingInput` in `pricing.ts`. Include it in the processing fee base: `processingFee = (accommodationSubtotal + perPersonSurcharge + cleaningFee + addOnsTotal + taxAmount) * 0.029 + 0.30`.
2. Add `taxAmount` and `taxTotal` to `PricingBreakdown` so the breakdown is transparent.
3. Add `hotel_tax_total` column to the `bookings` table to store the tax amount per booking.
4. The Stripe line items must include the tax line with the same `taxAmount` from the breakdown — the sum of all line items must equal `booking.total`.
5. Document clearly in code that `taxAmount` is provided by the hotel at booking time and is not a platform fee.

**Warning signs:**
- `SUM(price_data.unit_amount) / 100` across Stripe line items ≠ `bookings.total`
- `processing_fee` column value does not match 2.9% × (total - processing_fee) + $0.30
- A "hotel tax" Stripe line item exists but `calculatePricing()` was not updated to include it in the fee base

**Phase to address:** Split payment / pricing phase — update `pricing.ts` before creating any new Stripe sessions

---

### Pitfall 9: Itinerary State Management Loses Unsaved Changes on Navigation

**What goes wrong:**
The itinerary builder is a rich interactive component — guests add, reorder, and time-slot activities across multiple days. In a Next.js App Router application with Server Components, navigating away from the itinerary page (clicking the booking summary, property details, etc.) causes the client component state to be lost. The guest returns to find an empty itinerary. If the auto-save debounce (common pattern) fires but the Server Action is still in flight when they navigate, the save is cancelled.

**Why it happens:**
Next.js App Router's client components unmount on navigation. Without explicit persistence (Server Action save on each change, or explicit "Save" button), the state exists only in React memory. Developers build the builder as a `'use client'` component with local state and plan to save on submit — but the "submit" never happens because users navigate away.

**Consequences:**
- Hours of itinerary planning lost on accidental navigation
- Users blame the platform ("it deleted my plans")
- Auto-save that fires during navigation may create partial/corrupt itinerary saves

**How to avoid:**
1. Persist itinerary to the database as a draft after every meaningful change — use `useTransition` + Server Action, not `useEffect` + fetch. This makes saves non-blocking and works within App Router's paradigm.
2. Debounce saves to 2-3 seconds after the last change, not per-keystroke.
3. Store itinerary as a JSONB column on the `bookings` table: `itinerary: Json` — no separate table needed for v1.2.
4. On component mount, fetch the existing itinerary draft from the booking record. The Server Component page can pass it as a prop.
5. Add a `beforeunload` warning if there are unsaved changes (use a `ref` to track pending save state).

**Warning signs:**
- Itinerary builder component has `useState` with no persistence path to the database
- No debounced Server Action save exists in the component
- Users report losing itinerary data after clicking back or reloading

**Phase to address:** Itinerary builder phase — persistence must be designed before UX

---

### Pitfall 10: Multiple Group Members Racing to Accept Invitations Exceeds Max Guests

**What goes wrong:**
The existing `acceptInvitation` action (confirmed in `src/lib/actions/booking-invitations.ts` line 204-208) checks `if (newGuestCount > property.max_guests) return error`. But this check reads `booking.guest_count`, increments it, and then writes it back — a non-atomic read-modify-write. If two guests accept simultaneously (common when the group lead sends all invites at once), both read `guest_count = 14`, both check against `max_guests = 15`, both pass, and both write `guest_count = 15`. Actual count is 16 — over capacity.

**Why it happens:**
This was an existing limitation in v1.1's invite flow. In v1.2, split payment registration means the group lead registers ALL attendees upfront, and they might all accept simultaneously.

**Consequences:**
- Booking exceeds hotel max_guests silently
- Hotel capacity violated, creating operational problems for the host
- `bookings.guest_count` reflects one increment, but the actual number of accepted invitations in `booking_invitations` is higher

**How to avoid:**
1. Replace the read-modify-write pattern with a PostgreSQL atomic increment with a constraint check:
```sql
UPDATE bookings
SET guest_count = guest_count + 1
WHERE id = $1
  AND guest_count < (SELECT max_guests FROM properties WHERE id = bookings.property_id)
RETURNING guest_count
```
2. If the UPDATE returns no rows, the max was exceeded — return the error.
3. Alternatively, use a Supabase RPC function with `FOR UPDATE` row locking on the bookings row before reading `guest_count`.
4. Add a database-level CHECK constraint: `guest_count <= max_guests` (requires joining to properties, use a trigger instead).

**Warning signs:**
- `SELECT COUNT(*) FROM booking_invitations WHERE booking_id = X AND status = 'accepted'` exceeds `SELECT guest_count FROM bookings WHERE id = X`
- High concurrent acceptance test shows guest_count below actual accepted count
- No `FOR UPDATE` or atomic increment in `acceptInvitation`

**Phase to address:** Guest registration phase — fix the race condition when adding bulk registration

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing split amounts as fractions (1/8, 1/4) instead of absolute dollars | Simpler math | Rounding errors accumulate; fraction becomes wrong if guest count changes | Never — always store absolute dollar amounts |
| Single `status` TEXT column for partner applications (no enum) | Fast to add | Invalid transitions silently accepted; impossible to enforce state machine | Never for multi-state workflows |
| Using browser timezone for itinerary times | Correct for the user who booked | Wrong for everyone else; hotel staff see different times | Never — always store in property timezone |
| Adding hotel tax outside `calculatePricing()` | Avoids touching shared module | Stripe total diverges from database total; processing fee understated | Never — tax must be inside the shared module |
| Separate `booking_attendees` table instead of extending `booking_invitations` | Clean separation | Three identity layers; duplicate emails; guest_count drift | Never for v1.2 scope |
| No background job for deadline enforcement | Nothing to deploy | Expired pending bookings block property dates indefinitely | Only acceptable if deadline is purely informational (not enforced) |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stripe Checkout + installments | Reuse `createBookingAndCheckout` for deposit payments by passing a partial amount | Create a separate `createPaymentSession(bookingId, amount, purpose)` that references the existing booking, does NOT create a new booking row, and uses a different webhook path |
| Stripe webhook + payment schedule | Existing `fulfillCheckout` sets `status = 'confirmed'` on any payment | Add payment type to Stripe session `metadata` (`{ booking_id, payment_type: 'full' | 'deposit' | 'installment' }`); route to different fulfillment functions in the switch |
| Supabase RLS + partner applications | Application table accessible to the applicant but not other guests | RLS policy: `auth.uid() = applicant_user_id` for SELECT; INSERT open to authenticated guest-role users; UPDATE only via admin client (service role) |
| `calculatePricing()` + tax | Adding tax line to Stripe without updating the shared module | Tax must be a parameter to `calculatePricing()` — it affects the processing fee base and must appear in `PricingBreakdown` |
| Next.js Server Actions + itinerary saves | `revalidatePath('/bookings')` called on every character change | Debounce saves to 2-3s; revalidate once after the debounce fires; never revalidate in a `useEffect` |
| Existing `acceptInvitation` + bulk registration | Guest count incremented by non-atomic read-modify-write | Use PostgreSQL `UPDATE ... WHERE guest_count < max_guests RETURNING guest_count` atomic pattern |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading full itinerary JSON on every booking card render | Bookings list page slow when users have detailed itineraries | Don't select `itinerary` column in list queries; only load it on the detail view | At 50+ itinerary items per booking, or 20+ bookings on the list page |
| Querying `payment_splits` for every booking in the list | N+1 queries: one per booking to show split status | Join `payment_splits` in the initial bookings query with aggregation, not in a loop | At 10+ bookings in the list |
| Re-running `calculatePricing()` on every render in the itinerary builder | CPU spike on complex bookings with many add-ons | Memoize with `useMemo(()=> calculatePricing(input), [input])` | With 10+ add-ons and frequent re-renders |
| Fetching all partner applications for admin without pagination | Admin page times out | Add `.range(offset, offset+19)` pagination from the first commit; never load all rows | At 100+ applications |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Partner application status updated via public API without admin role check | Any authenticated user approves themselves as a partner | Status updates must use the Supabase admin client (service role) or a Server Action that checks `profile.role === 'admin'`; RLS policy on applications table must block UPDATE for non-admins |
| Split payment amounts submitted from client | Guest manipulates their own share to $0 | Split amounts must be calculated server-side from `calculatePricing()` output; client only sends adjustment intent (e.g., "guest X pays Y% of base"), server computes final amounts |
| Itinerary contains other guests' PII (name, phone) visible via shared URL | Privacy violation if itinerary page is publicly accessible | Itinerary page must be behind `verifySession()` + booking membership check; never render other guests' contact info unless the viewer is the booking lead |
| Partner application exposes other applicants' data | Privacy violation | RLS policy: `SELECT WHERE applicant_user_id = auth.uid()` — applicants can only see their own application; admin view uses service role via Server Action only |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing all split payment fields before guests have accepted | Confusing to plan splits for people who haven't confirmed attendance | Show split UI only after all invited guests have accepted or been registered; use a "tentative" split view for pending guests |
| Multi-step itinerary builder with no progress save indicator | Users don't know if their itinerary was saved; they duplicate saves | Show a "Saved" / "Saving..." indicator tied to the debounced Server Action transition state |
| Partner application form without save-and-resume | Complex applications (photos, property details) are abandoned mid-form | Save application as `draft` status on every field blur; allow resuming; only submit when explicit "Submit Application" button is clicked |
| Requiring all attendee details upfront during booking | Group lead doesn't know everyone's email/phone at booking time | Make attendee details optional at booking time, required before the activity deadline; show completion status on the booking dashboard |
| Activity deadline dates shown as absolute dates without relative context | "March 15" means nothing to a user who just booked | Show "by March 15 (21 days from now)" — always pair absolute dates with relative context |

---

## "Looks Done But Isn't" Checklist

- [ ] **Split payment ledger:** UI shows per-person amounts — verify `SUM(split_amounts) + processingFee == bookings.total` in the database
- [ ] **Payment deadlines:** 36hr deadline shown in UI — verify a cron job or lazy-expiry mechanism actually cancels unpaid bookings, not just shows a warning
- [ ] **Itinerary builder:** Activities save when navigating away — verify by adding an activity, clicking to a different page, and returning; items must still be there
- [ ] **Itinerary timezone:** Activity scheduled at 10am — verify it displays as 10am for a user in UTC-5 AND for a user in UTC+2 (it should show 10am both times, not shifted)
- [ ] **Partner application approval:** Admin approves an application — verify the applicant's `profiles.role` is set to `owner` in the same transaction; verify they can access `/dashboard` immediately
- [ ] **Partner application state machine:** Admin tries to approve an already-approved application — verify it rejects the transition gracefully, does not create a duplicate profile
- [ ] **Amenities display:** Property with amenities saved in new categorized format — verify `AmenityList` component renders all categories correctly and does not show empty categories
- [ ] **Amenities migration:** Existing properties with old-format amenities — verify they display correctly after migration, not empty
- [ ] **Guest registration + invite deduplication:** Group lead registers attendee by email, then separately invites same email — verify no duplicate `booking_invitations` rows are created
- [ ] **Max guest race condition:** Two guests accept invitations simultaneously when booking is at max_guests - 1 — verify only one succeeds, the other receives a clear error
- [ ] **Hotel tax in processing fee:** Tax amount added to booking — verify `processingFee` in `bookings` table is 2.9% × (all line items including tax) + $0.30, not 2.9% × (line items excluding tax)
- [ ] **Stripe session total:** All line items (accommodation + surcharge + add-ons + cleaning + tax + processing fee) sum to the same value as `bookings.total` — verify by comparing against Stripe dashboard

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Booking confirmed before all installments paid | HIGH | Requires manual audit of payment_schedule vs confirmed bookings; notify affected hosts; implement proper multi-payment status before re-enabling |
| Split amounts don't sum to booking total | MEDIUM | Recalculate splits server-side from canonical `calculatePricing()` output; update stored split rows; notify guests of corrected amounts |
| Itinerary data lost due to navigation | LOW | Itinerary is a planning aid, not a contract — losing it is annoying but not a financial issue; restore from database last-saved state |
| Partner approved without profile creation | MEDIUM | Write a one-time migration script: `INSERT INTO profiles WHERE applications.status = 'approved' AND NOT EXISTS (SELECT 1 FROM profiles WHERE role = 'owner' AND ...)` |
| Amenities migration broke existing display | LOW | Rollback migration; fix AmenityList component first; re-run migration with verified component |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Split payment breaks single Stripe session model | Phase: Split payment system | Confirm `payment_schedule` table exists; webhook has separate paths for deposit vs full payment |
| `calculatePricing()` drift on split amounts | Phase: Split payment system | `splitAmounts()` helper in `pricing.ts`; test that split sum + processingFee == total |
| Payment deadlines without cron | Phase: Split payment system | Cron job or Vercel Cron exists; test by manually setting deadline to 1 minute ago |
| Itinerary timezone storage | Phase: Itinerary builder | Schema uses `TIME` not `TIMESTAMPTZ` for slots; property has `timezone` field |
| Guest registration orphaned identity | Phase: Guest registration | No `booking_attendees` table; `booking_invitations` has `name` and `phone` columns |
| Partner application state machine | Phase: Partner application | `partner_status` enum in Postgres; single `updateApplicationStatus` Server Action |
| Amenities JSONB shape conflict | Phase: Amenities | Read `AmenityList.tsx` first; migration verified against existing data |
| Hotel tax outside `calculatePricing()` | Phase: Split payment / pricing | `taxAmount` parameter in `PricingInput`; Stripe line item sum == `bookings.total` |
| Itinerary unsaved state on navigation | Phase: Itinerary builder | Debounced Server Action save; itinerary persists after navigation test |
| Max guest race condition on bulk accept | Phase: Guest registration | Atomic UPDATE in `acceptInvitation`; concurrent acceptance test passes |

---

## Sources

- Codebase analysis: `src/lib/pricing.ts` — `calculatePricing()` does not include `taxAmount`; `processingFee` calculation base confirmed (HIGH confidence)
- Codebase analysis: `src/app/api/webhooks/stripe/route.ts` — single `fulfillCheckout` path, no payment-type discrimination (HIGH confidence)
- Codebase analysis: `src/lib/actions/booking-invitations.ts` line 204-208 — non-atomic read-modify-write guest_count increment (HIGH confidence)
- Codebase analysis: `src/types/database.ts` line 52 — `amenities: Json` column already exists on properties (HIGH confidence)
- [Stripe Idempotent Requests](https://docs.stripe.com/api/idempotent_requests) — idempotency key requirements for multiple payment sessions (HIGH confidence)
- [Stripe Partial Payments for Invoices](https://docs.stripe.com/invoicing/partial-payments) — partial payment tracking patterns (MEDIUM confidence)
- [Supabase Concurrent Writes Guide](https://bootstrapped.app/guide/how-to-handle-concurrent-writes-in-supabase) — atomic UPDATE patterns for race condition prevention (MEDIUM confidence)
- [react-calendar Issue #511 — UTC/local time ambiguity](https://github.com/wojtekmaj/react-calendar/issues/511) — confirms timezone bug in calendar component already in use (HIGH confidence)
- [How to Solve Race Conditions in a Booking System — HackerNoon](https://hackernoon.com/how-to-solve-race-conditions-in-a-booking-system) — atomic booking patterns (MEDIUM confidence)
- Booking UX Best Practices — form length, progress indicators, guest checkout friction (MEDIUM confidence)

---

*Pitfalls research for: Whole-Tel v1.2 — interactive itinerary builder, split payments, partner application, amenities*
*Researched: 2026-03-23*
