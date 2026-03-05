---
phase: 05-booking-flow
plan: 01
subsystem: payments
tags: [stripe, react, zod, ui, booking]

# Dependency graph
requires:
  - phase: 04-guest-browsing
    provides: PricingWidget base component with date range calendar and property listing page with add-ons data

provides:
  - Stripe SDK singleton (stripe.ts) for server-side payment operations
  - Zod bookingInputSchema for Server Action validation in Plan 02
  - Extended PricingWidget with guest count stepper, add-on toggles, full price breakdown, and Reserve button
  - Property listing page updated to pass addOns and propertyId to PricingWidget

affects: [05-02, 05-03, payments, checkout]

# Tech tracking
tech-stack:
  added: [stripe@20.4.0]
  patterns:
    - Server-only Stripe singleton in src/lib/stripe.ts (never imported by 'use client' files)
    - Zod schema for Server Action input validation with UUID and date format enforcement
    - Add-on pricing toggle with Set<string> state for O(1) membership checks
    - Processing fee calculated as 2.9% + $0.30 (labeled "Processing fee (card payments)" not "surcharge")

key-files:
  created:
    - src/lib/stripe.ts
    - src/lib/validations/booking.ts
  modified:
    - src/components/property/PricingWidget.tsx
    - src/app/(guest)/properties/[propertyId]/page.tsx

key-decisions:
  - "Stripe apiVersion updated to 2026-02-25.clover to match installed SDK v20.4.0 (plan specified 2025-01-27.acacia which is invalid for this SDK)"
  - "PricingWidget propertyId prop stored but unused in Plan 01 — Plan 02 Server Action wiring will use it"
  - "Add-on cards use button elements (not checkboxes) for full custom styling with toggled border colors"
  - "Per-person line only shown when guestCount > 1 AND nights > 0 to avoid meaningless display"

patterns-established:
  - "Processing fee language: always 'Processing fee (card payments)', never 'surcharge' or 'credit card fee'"
  - "Add-on pricing: per_person multiplies by guestCount, per_booking is flat — both calculated client-side for display only (server re-validates in Plan 02)"

requirements-completed: [BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-05, ADDON-04, ADDON-05]

# Metrics
duration: 5min
completed: 2026-03-04
---

# Phase 5 Plan 01: Booking Flow — UI & Infrastructure Summary

**Stripe SDK singleton, Zod booking schema, and extended PricingWidget with guest count stepper, add-on toggles, full price breakdown (nightly + cleaning + add-ons + processing fee + total + per-person), and Reserve button placeholder**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-04T02:04:23Z
- **Completed:** 2026-03-04T02:09:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Stripe SDK v20.4.0 installed; server-only singleton created in `src/lib/stripe.ts` using `STRIPE_SECRET_KEY` (no NEXT_PUBLIC_ prefix)
- Zod `bookingInputSchema` validates propertyId (UUID), checkIn/checkOut (YYYY-MM-DD regex), guestCount (int ≥ 1), selectedAddOnIds (UUID array)
- PricingWidget extended with guest count stepper (1..maxGuests with clamping), toggleable add-on experience cards (Set<string> state), and complete price breakdown including processing fee and per-person split
- Property listing page updated to pass `addOns` and `propertyId` as new props; build passes cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Stripe SDK and create infrastructure files** - `b866eca` (feat)
2. **Task 2: Extend PricingWidget with guest count, add-ons, full price breakdown** - `6e1abba` (feat)

## Files Created/Modified
- `src/lib/stripe.ts` - Stripe server-only singleton (apiVersion 2026-02-25.clover)
- `src/lib/validations/booking.ts` - Zod bookingInputSchema and BookingInput type
- `src/components/property/PricingWidget.tsx` - Extended with guestCount, selectedAddOnIds, add-on toggles, full breakdown, Reserve button
- `src/app/(guest)/properties/[propertyId]/page.tsx` - Passes addOns and propertyId to PricingWidget

## Decisions Made
- **Stripe apiVersion:** Updated to `2026-02-25.clover` (plan specified 2025-01-27.acacia but SDK v20 doesn't support that version)
- **PropertyId prop:** Accepted and stored as `_propertyId` in PricingWidget but not yet used — Plan 02 Server Action wiring will consume it
- **Add-on UI:** Button elements with toggle border styling rather than checkboxes — allows full custom visual control with `border-brand-teal` selected state
- **Per-person display:** Only rendered when both `guestCount > 1` AND `nights > 0` to avoid showing meaningless values

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stripe apiVersion corrected from 2025-01-27.acacia to 2026-02-25.clover**
- **Found during:** Task 2 (build verification)
- **Issue:** Plan specified `apiVersion: '2025-01-27.acacia'` but installed Stripe SDK v20.4.0 requires `'2026-02-25.clover'` — TypeScript build failed with type error
- **Fix:** Updated `src/lib/stripe.ts` to use `apiVersion: '2026-02-25.clover'`
- **Files modified:** src/lib/stripe.ts
- **Verification:** `npx next build` completed successfully with zero errors
- **Committed in:** 6e1abba (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential fix for build correctness. API version pinned to installed SDK version. No scope creep.

## Issues Encountered
- Stripe SDK major version (v20) shipped with a newer API version constant than the plan anticipated — auto-fixed by updating the apiVersion string to match the SDK's type declaration.

## User Setup Required

**External services require manual configuration before booking flow is functional:**

Environment variables needed in `.env.local`:
- `STRIPE_SECRET_KEY` — Stripe Dashboard → Developers → API keys → Secret key (`sk_test_...`)
- `NEXT_PUBLIC_APP_URL` — Set to `http://localhost:3000` for dev, production URL for deploy (used in Plan 02 for checkout success/cancel URLs)

No Dashboard configuration steps required for Plan 01 (Stripe Checkout session creation is in Plan 02).

## Next Phase Readiness
- Plan 02 (Server Action + Stripe Checkout session creation) can proceed immediately
- `stripe` singleton and `bookingInputSchema` are exported and ready to import in Server Action
- `propertyId` and `selectedAddOnIds` are available in PricingWidget state for passing to Server Action
- Reserve button is wired to `disabled={nights < 1}` — Plan 02 will add `onClick` or form `action` binding

---
*Phase: 05-booking-flow*
*Completed: 2026-03-04*
