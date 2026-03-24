---
phase: 13-guest-registration-payment-deadlines
plan: 01
subsystem: database
tags: [postgres, supabase, migrations, typescript, rpc]

# Dependency graph
requires:
  - phase: 12-branding-copy-amenities-schema
    provides: amenities_schema migration and property_amenities join table

provides:
  - bookings.status constraint widened to include 'expired'
  - bookings.payment_deadline, activity_deadline, stripe_checkout_url columns with backfill
  - booking_invitations.full_name and phone columns
  - increment_booking_guest_count atomic RPC function (SECURITY DEFINER)
  - BookingStatus TypeScript type includes 'expired'
  - Booking and BookingInvitation interfaces reflect all new columns

affects:
  - 13-02-deadline-enforcement
  - 13-03-attendee-registration
  - 13-04-booking-detail-deadlines

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Atomic guest_count increment via SECURITY DEFINER SQL RPC function — avoids read-then-write race condition"
    - "Deadline backfill in migration body — idempotent WHERE payment_deadline IS NULL guard"

key-files:
  created:
    - supabase/migrations/20260324000001_guest_registration_deadlines.sql
  modified:
    - src/types/database.ts

key-decisions:
  - "increment_booking_guest_count uses SECURITY DEFINER SQL language for atomicity and max_guests guard via subquery — no application-level race condition possible"
  - "Deadline backfill scoped to WHERE payment_deadline IS NULL — safe to re-run, correct for existing pending bookings"
  - "GiST exclusion index unchanged — it already filters on status='confirmed', so expired bookings are automatically excluded from date-range blocking"

patterns-established:
  - "RPC functions for atomic counter increments: LANGUAGE sql SECURITY DEFINER with RETURNING clause"
  - "Migration ordering: constraint → columns → backfill → related table columns → functions"

requirements-completed: [PAY-01, PAY-05, PAY-06, PAY-08]

# Metrics
duration: 2min
completed: 2026-03-24
---

# Phase 13 Plan 01: Guest Registration & Payment Deadlines — Schema Foundation Summary

**PostgreSQL schema migration adding 'expired' status, payment/activity deadline columns, booking_invitations registration fields, and an atomic guest_count RPC function; TypeScript types updated to match.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-24T04:12:11Z
- **Completed:** 2026-03-24T04:13:17Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Migration file with 5 ordered sections: status constraint widen, deadline columns, backfill, invitation columns, atomic RPC function
- `increment_booking_guest_count` RPC eliminates read-then-write race condition on guest_count (flagged in STATE.md since prior phase)
- TypeScript compiles with zero errors after all type additions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create database migration for guest registration and deadlines** - `7d9f8a6` (feat)
2. **Task 2: Update TypeScript types to reflect schema changes** - `6c5d619` (feat)

## Files Created/Modified
- `supabase/migrations/20260324000001_guest_registration_deadlines.sql` - Schema migration: status constraint, deadline columns, backfill, invitation columns, RPC function
- `src/types/database.ts` - BookingStatus + 'expired', Booking + 3 new fields, BookingInvitation + 2 new fields

## Decisions Made
- `increment_booking_guest_count` uses `LANGUAGE sql SECURITY DEFINER` with a subquery guard on `max_guests` — prevents both race conditions and exceeding capacity in a single atomic statement
- Deadline backfill uses `WHERE payment_deadline IS NULL` guard making it safe to re-run without double-updating
- GiST exclusion index left unchanged — the existing `WHERE (status = 'confirmed')` partial filter already excludes expired bookings from date-range blocking without any migration change

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Migration will be applied to Supabase on next `supabase db push`.

## Next Phase Readiness

- Schema foundation complete — all Phase 13 subsequent plans (13-02 through 13-04) can proceed
- `increment_booking_guest_count` RPC is available in Supabase for use in `acceptInvitation` server action (Plan 13-03)
- No blockers

---
*Phase: 13-guest-registration-payment-deadlines*
*Completed: 2026-03-24*
