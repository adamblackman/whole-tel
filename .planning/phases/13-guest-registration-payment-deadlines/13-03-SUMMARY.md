---
phase: 13-guest-registration-payment-deadlines
plan: 03
subsystem: ui-components
tags: [react, typescript, next.js, booking, invitations, cron, vercel]

# Dependency graph
requires:
  - phase: 13-01
    provides: payment_deadline, activity_deadline, stripe_checkout_url columns; full_name, phone on booking_invitations
  - phase: 13-02
    provides: acceptInvitation with registration gating; addAttendeeManually server action; deadline column persistence

provides:
  - PaymentDeadlineCountdown client component with live 1s countdown (amber styling)
  - ManualAttendeeForm inline form for group lead attendee entry
  - BookingDetails extended with deadline section, expired banner, ManualAttendeeForm
  - GuestList extended to show full_name and phone for accepted invitations
  - Cron route GET /api/cron/expire-bookings with CRON_SECRET auth
  - vercel.json with 15-minute cron schedule

affects:
  - 13-04 (next plan in phase): booking detail deadlines

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "setInterval countdown in useEffect with cleanup on unmount — avoids memory leaks on page navigation"
    - "Vercel Cron route secured via CRON_SECRET Bearer token — standard Vercel pattern"
    - "Cron route uses createAdminClient for user-context-free DB update"

key-files:
  created:
    - src/components/booking/PaymentDeadlineCountdown.tsx
    - src/components/booking/ManualAttendeeForm.tsx
    - src/app/api/cron/expire-bookings/route.ts
    - vercel.json
  modified:
    - src/components/booking/BookingDetails.tsx
    - src/components/booking/GuestList.tsx
    - src/components/booking/BookingCardClient.tsx
    - src/app/(guest)/bookings/page.tsx

key-decisions:
  - "Countdown effect re-runs only when remaining hits 0 — avoids stale closure by recalculating from deadline timestamp directly in interval callback"
  - "Complete Payment CTA uses plain <a> tag instead of Next.js Link — Stripe Checkout is an external URL, Link is for internal routes only"
  - "Expired banner uses amber (not red) per CONTEXT.md: urgent but not alarming"
  - "ManualAttendeeForm only shown for confirmed bookings — matches InviteGuestForm existing gate logic"
  - "InvitationActions.tsx not replaced — Plan 02 already implemented a polished registration form with proper name+phone gating; no further UI change needed"

requirements-completed: [PAY-01, PAY-02, PAY-05, PAY-06, PAY-08]

# Metrics
duration: ~3min
completed: 2026-03-24
---

# Phase 13 Plan 03: UI Components for Deadline Display, Registration, and Booking Expiry Summary

**PaymentDeadlineCountdown live timer, ManualAttendeeForm inline entry, BookingDetails/GuestList extended with deadline/registration data, and Vercel Cron route for automated booking expiry.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-24T04:19:55Z
- **Completed:** 2026-03-24T04:22:42Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- `PaymentDeadlineCountdown`: 'use client' component with 1-second interval, amber `{h}h {mm}m {ss}s remaining` display, Clock icon, auto-transitions to "Payment window expired" in destructive color
- `ManualAttendeeForm`: inline form (not modal) with full_name/email/phone, client-side validation, `addAttendeeManually` server action call, loading state, error display
- `BookingDetails`: payment deadline section (countdown + Complete Payment CTA) for pending bookings; activity deadline date with Calendar icon for all bookings; amber expired banner; ManualAttendeeForm below InviteGuestForm for confirmed bookings
- `GuestList`: accepted invitations show full_name bold, email + phone muted below; non-accepted show email only (unchanged)
- `BookingCardClient`: new deadline/registration props threaded through to BookingDetails
- Bookings page: query expanded to select `payment_deadline`, `activity_deadline`, `stripe_checkout_url`, `full_name`, `phone`; expired status badge added
- Cron route: `GET /api/cron/expire-bookings` with Bearer CRON_SECRET auth, bulk-updates pending→expired where `payment_deadline < now()`, returns count
- `vercel.json`: `*/15 * * * *` cron schedule

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PaymentDeadlineCountdown and ManualAttendeeForm** - `00c9134` (feat)
2. **Task 2: Extend BookingDetails and GuestList with deadline display and registration data** - `a0d71b8` (feat)
3. **Task 3: Create Vercel Cron route for booking expiry and vercel.json** - `d75116c` (feat)

## Files Created/Modified

- `src/components/booking/PaymentDeadlineCountdown.tsx` - Live countdown timer with amber styling and Clock icon (NEW)
- `src/components/booking/ManualAttendeeForm.tsx` - Inline form for manual attendee entry with full client validation (NEW)
- `src/app/api/cron/expire-bookings/route.ts` - Vercel Cron GET route, CRON_SECRET auth, bulk expires overdue pending bookings (NEW)
- `vercel.json` - Cron schedule: every 15 minutes (NEW)
- `src/components/booking/BookingDetails.tsx` - Extended with PaymentDeadlineCountdown, Complete Payment CTA, activity deadline, expired banner, ManualAttendeeForm
- `src/components/booking/GuestList.tsx` - Extended props with full_name/phone; accepted invitations show registration data
- `src/components/booking/BookingCardClient.tsx` - Passes paymentDeadline, activityDeadline, stripeCheckoutUrl down to BookingDetails
- `src/app/(guest)/bookings/page.tsx` - Query expanded; expired StatusBadge variant added; new props passed to BookingCardClient

## Decisions Made

- `PaymentDeadlineCountdown` recalculates from `deadline` timestamp inside the interval callback (not from `remaining` state) — avoids stale closure and remains accurate across slow renders
- Complete Payment CTA is a plain `<a>` tag, not Next.js `<Link>` — Stripe Checkout URL is external
- Expired banner uses amber (not red) per phase CONTEXT.md: "urgent but not alarming"
- `InvitationActions.tsx` left as-is — Plan 02 already implemented the polished name+phone registration form; no further UI work needed

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

- `CRON_SECRET` env var must be set in Vercel project settings (and `.env.local` for local testing)
- Vercel Hobby plan: cron schedule falls back to once daily; Pro plan runs every 15 minutes

## Next Phase Readiness

- All PAY-01, PAY-02, PAY-05, PAY-06, PAY-08 requirements fulfilled
- Phase 13 plans 01-03 complete; plan 04 (booking detail deadlines) can proceed
- No blockers

## Self-Check: PASSED

- FOUND: src/components/booking/PaymentDeadlineCountdown.tsx
- FOUND: src/components/booking/ManualAttendeeForm.tsx
- FOUND: src/app/api/cron/expire-bookings/route.ts
- FOUND: vercel.json
- FOUND: src/components/booking/BookingDetails.tsx (modified)
- FOUND: src/components/booking/GuestList.tsx (modified)
- FOUND: src/components/booking/BookingCardClient.tsx (modified)
- FOUND: src/app/(guest)/bookings/page.tsx (modified)
- TypeScript: 0 errors
- FOUND commit: 00c9134 (Task 1)
- FOUND commit: a0d71b8 (Task 2)
- FOUND commit: d75116c (Task 3)

---
*Phase: 13-guest-registration-payment-deadlines*
*Completed: 2026-03-24*
