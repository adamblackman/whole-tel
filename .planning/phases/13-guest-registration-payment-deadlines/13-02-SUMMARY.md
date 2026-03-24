---
phase: 13-guest-registration-payment-deadlines
plan: 02
subsystem: server-actions
tags: [typescript, supabase, stripe, booking-invitations, deadlines, rpc]

# Dependency graph
requires:
  - phase: 13-01
    provides: increment_booking_guest_count RPC, booking deadline columns, invitation registration columns

provides:
  - acceptInvitation gated on fullName + phone registration data
  - acceptInvitation uses atomic RPC for guest_count (race condition fixed)
  - addAttendeeManually action for group lead to add attendees without invitation flow
  - createBookingAndCheckout stores stripe_checkout_url, payment_deadline, activity_deadline

affects:
  - 13-03-attendee-registration (UI for invitation acceptance form)
  - 13-04-booking-detail-deadlines (reads deadline columns from booking)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Atomic RPC call for counter increment — remove manual read-then-write in acceptInvitation"
    - "computeActivityDeadline helper: earlier of (checkIn - 30d) vs (createdAt + 7d)"
    - "Deadline columns written before redirect() to ensure persistence"
    - "addAttendeeManually upserts invitation — handles pending/declined resend case cleanly"

key-files:
  created: []
  modified:
    - src/lib/validations/booking-invitation.ts
    - src/lib/actions/booking-invitations.ts
    - src/lib/actions/bookings.ts
    - src/app/(guest)/bookings/invitations/[token]/InvitationActions.tsx

key-decisions:
  - "acceptInvitation signature changed to require registration parameter — InvitationActions.tsx updated inline with simple name+phone form (Plan 13-03 will replace with polished registration UI)"
  - "Removed manual max_guests check from acceptInvitation — RPC returns null when booking is full, eliminating duplicate guard logic"
  - "booking.created_at used for deadline computation (from DB) rather than new Date() — more accurate, avoids clock drift between insert and Stripe session creation"

patterns-established:
  - "Always use atomic RPC for shared counters — never read-then-write in concurrent contexts"
  - "Store Stripe session URL immediately after creation, before redirect — survives abandoned checkouts"

requirements-completed: [PAY-01, PAY-02, PAY-05]

# Metrics
duration: ~2min
completed: 2026-03-24
---

# Phase 13 Plan 02: Server Action Extensions for Registration Gating and Deadline Storage Summary

**Extended booking-invitations actions with registration gating (fullName + phone), atomic RPC guest count increment, manual attendee addition, and Stripe URL + deadline column persistence in createBookingAndCheckout.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-24T04:15:14Z
- **Completed:** 2026-03-24T04:17:37Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `acceptInvitation` now requires `registration: { fullName, phone }` — enforces PAY-01 registration gate
- Non-atomic `booking.guest_count + 1` replaced with `increment_booking_guest_count` RPC — eliminates race condition flagged in STATE.md
- `addAttendeeManually` exported — group lead can add attendees by name/email/phone without requiring invitation flow (PAY-02)
- `createBookingAndCheckout` persists `stripe_checkout_url`, `payment_deadline` (+36h), and `activity_deadline` (earlier of checkIn-30d vs createdAt+7d) before redirecting to Stripe (PAY-05)
- TypeScript compiles with zero errors across all changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend acceptInvitation with registration gating and addAttendeeManually** - `968e53a` (feat)
2. **Task 2: Update createBookingAndCheckout to store Stripe URL and deadlines** - `cd90166` (feat)

## Files Created/Modified

- `src/lib/validations/booking-invitation.ts` - Added `acceptInvitationSchema` (fullName + phone) and `addAttendeeManuallySchema` (bookingId, fullName, email, phone)
- `src/lib/actions/booking-invitations.ts` - Updated `acceptInvitation` with registration gating + atomic RPC; added `addAttendeeManually` export
- `src/lib/actions/bookings.ts` - Added `computeActivityDeadline` helper; expanded booking select to include `created_at`; deadline + URL update after Stripe session creation
- `src/app/(guest)/bookings/invitations/[token]/InvitationActions.tsx` - Updated to collect fullName + phone inline (temporary; Plan 13-03 replaces with polished form)

## Decisions Made

- `acceptInvitation` signature change required updating `InvitationActions.tsx` inline with a minimal name+phone form — Plan 13-03 will replace with polished registration UI; this keeps TypeScript compiling without blocking downstream plans
- Removed duplicate `max_guests` check from `acceptInvitation` — the RPC function already guards this atomically via subquery; two guards would add complexity without benefit
- Used `booking.created_at` (from DB) rather than `new Date()` for deadline computation — avoids clock drift between booking insert and Stripe session creation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated InvitationActions.tsx to pass registration data to acceptInvitation**
- **Found during:** Task 1
- **Issue:** `acceptInvitation` signature change from `(token)` to `(token, registration)` would cause TypeScript compile failure in existing UI component
- **Fix:** Added minimal fullName + phone inputs to `InvitationActions.tsx` with client-side validation (disabled Accept button until both fields filled)
- **Files modified:** `src/app/(guest)/bookings/invitations/[token]/InvitationActions.tsx`
- **Commit:** `968e53a`

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Registration gating live in `acceptInvitation` — Plan 13-03 can wire up polished registration form UI
- `addAttendeeManually` available for group lead UI in Plan 13-03
- Deadline columns populated on all new bookings — Plan 13-04 can read and display them
- No blockers

## Self-Check: PASSED

- FOUND: src/lib/validations/booking-invitation.ts
- FOUND: src/lib/actions/booking-invitations.ts
- FOUND: src/lib/actions/bookings.ts
- FOUND: .planning/phases/13-guest-registration-payment-deadlines/13-02-SUMMARY.md
- FOUND commit: 968e53a (Task 1)
- FOUND commit: cd90166 (Task 2)
- TypeScript: 0 errors

---
*Phase: 13-guest-registration-payment-deadlines*
*Completed: 2026-03-24*
