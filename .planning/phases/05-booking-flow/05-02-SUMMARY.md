---
phase: 05-booking-flow
plan: 02
subsystem: payments
tags: [stripe, server-action, next-js, supabase, booking, auth]

# Dependency graph
requires:
  - phase: 05-01
    provides: Stripe singleton, bookingInputSchema, PricingWidget with Reserve placeholder
  - phase: 04-04
    provides: PricingWidget component, property detail page structure
  - phase: 01-02
    provides: verifySession DAL function, createClient server factory

provides:
  - createBookingAndCheckout Server Action with full price re-validation server-side
  - Pending booking + booking_add_ons DB insert before Stripe Checkout session
  - Reserve button wired in PricingWidget via useTransition with error display
  - Auth-aware GuestNav showing My Bookings / Log out when authenticated

affects: [06-payments-webhook, booking-history, stripe-webhook-handler]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server Action redirect() called outside try/catch (Next.js requirement)
    - All prices fetched server-side — client-submitted prices never trusted
    - Add-ons scoped to property_id to prevent cross-property injection
    - Booking inserted as status=pending before Stripe session (webhook confirms)
    - getUser() (not verifySession) in GuestNav to avoid unauthenticated redirect
    - form action={serverAction} pattern for signOut in Server Component

key-files:
  created:
    - src/lib/actions/bookings.ts
  modified:
    - src/components/property/PricingWidget.tsx
    - src/components/GuestNav.tsx

key-decisions:
  - "redirect() must be placed outside try/catch in Server Actions — Next.js implements redirect via thrown error"
  - "All prices (nightly, cleaning, add-ons, processing fee) are recalculated server-side — PricingWidget prices are display-only"
  - "Add-ons fetched with .eq('property_id', propertyId) to prevent cross-property injection attack"
  - "Booking inserted with status=pending before Stripe session — Phase 6 webhook handler sets status=confirmed"
  - "GuestNav uses getUser() not verifySession() — verifySession redirects unauthenticated users, breaking browsing"
  - "signOut Server Action used as form action attribute — works in async Server Components without 'use client'"
  - "Zod v4 uses .issues not .errors on ZodError (auto-fixed during build)"

patterns-established:
  - "Booking Server Action pattern: verifySession → validate input → fetch authoritative prices → insert pending booking → create Stripe session → redirect outside try/catch"
  - "Client-side widget calls Server Action via useTransition; catches thrown errors and displays in error state"
  - "GuestNav async Server Component pattern: await supabase.auth.getUser(), conditional render based on null check"

requirements-completed: [BOOK-06]

# Metrics
duration: 35min
completed: 2026-03-05
---

# Phase 5 Plan 02: Booking Server Action + Auth-Aware Nav Summary

**createBookingAndCheckout Server Action with full server-side price re-validation, pending booking insert, Stripe Checkout session creation, and auth-aware GuestNav with conditional My Bookings / Log out links.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-03-05T04:54:35Z
- **Completed:** 2026-03-05T05:29:22Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- Implemented `createBookingAndCheckout` Server Action enforcing three-layer security: verifySession auth gate, server-side price recalculation from DB, add-on cross-property injection prevention
- Wired PricingWidget Reserve button via `useTransition` + error display state — button shows "Redirecting to checkout..." while pending
- Converted GuestNav to async Server Component with `getUser()` for auth-conditional rendering (Browse Villas always shown, My Bookings + Log out only when authenticated)

## Task Commits

Each task was committed atomically:

1. **Task 1: createBookingAndCheckout Server Action + Reserve button wired** - `b27be08` (feat)
2. **Task 2: GuestNav auth-aware with conditional My Bookings / Log out** - `609b4f7` (feat)

**Plan metadata:** TBD (docs commit)

## Files Created/Modified

- `src/lib/actions/bookings.ts` - Server Action: verifySession → validate → fetch authoritative prices → insert pending booking + booking_add_ons → create Stripe Checkout session → redirect
- `src/components/property/PricingWidget.tsx` - Added useTransition, handleReserve handler calling createBookingAndCheckout, error state display, and wired Reserve button
- `src/components/GuestNav.tsx` - Converted to async Server Component; shows My Bookings + signOut form when user present, Log in link when not

## Decisions Made

- redirect() must be declared outside try/catch: Next.js implements redirect() by throwing a special error internally; catching it inside try/catch would swallow it
- All prices recalculated server-side: client-submitted prices from PricingWidget are display-only; the Server Action fetches nightly_rate, cleaning_fee from DB and recalculates processing fee with the same formula
- Add-ons scoped by property_id: the .eq('property_id', input.propertyId) guard prevents a malicious client from submitting add-on IDs belonging to a different property
- Booking status is always 'pending': status='confirmed' is set exclusively by the Stripe webhook handler in Phase 6 — the success_url redirect is not authoritative
- GuestNav uses getUser() not verifySession(): verifySession() redirects unauthenticated users to /login which would break unauthenticated browsing of the properties page

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 uses .issues not .errors on ZodError**
- **Found during:** Task 1 (createBookingAndCheckout Server Action)
- **Issue:** Plan code used `parsed.error.errors[0]` — `errors` property does not exist in Zod v4; it is `issues`
- **Fix:** Changed to `parsed.error.issues[0]?.message` (auto-corrected by linter before build completed)
- **Files modified:** src/lib/actions/bookings.ts
- **Verification:** Build passed after correction
- **Committed in:** b27be08 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug — Zod v4 API difference)
**Impact on plan:** Trivial fix, no scope change. Pre-existing pattern from 03-01 (same Zod v4 issue documented in STATE.md decisions).

## Issues Encountered

The prior session had already committed `src/lib/actions/bookings.ts` as part of 05-03 execution (the 05-03 agent ran ahead without 05-02 being formally completed). The Task 1 commit in this plan confirms the PricingWidget wiring — the bookings.ts content was identical so no duplicate was needed. The build passed cleanly confirming correctness.

## Next Phase Readiness

- Reserve → Stripe Checkout flow is complete end-to-end (pending DB + Stripe session)
- GuestNav auth-awareness enables My Bookings navigation (05-03 already complete)
- Phase 6 (Stripe webhook handler) can now set bookings.status = 'confirmed' on `checkout.session.completed`
- The `client_reference_id` and `metadata.booking_id` fields in the Stripe session make the webhook handler straightforward

---
*Phase: 05-booking-flow*
*Completed: 2026-03-05*

## Self-Check: PASSED

- FOUND: src/lib/actions/bookings.ts
- FOUND: src/components/property/PricingWidget.tsx
- FOUND: src/components/GuestNav.tsx
- FOUND: .planning/phases/05-booking-flow/05-02-SUMMARY.md
- FOUND: b27be08 (Task 1 commit)
- FOUND: 609b4f7 (Task 2 commit)
