---
phase: 04-guest-browsing
plan: "04"
subsystem: ui
tags: [react, shadcn, react-day-picker, calendar, pricing, supabase]

requires:
  - phase: 04-03-guest-browsing
    provides: Property listing page two-column layout with static pricing placeholder

provides:
  - Interactive PricingWidget Client Component with shadcn Calendar in range mode
  - Disabled dates logic respecting half-open [) booking interval for back-to-back bookings
  - Real-time price breakdown (nightly rate x nights, cleaning fee, total) on date selection
  - Property listing page fetches confirmed bookings in parallel and passes disabled dates to widget

affects:
  - 05-booking-flow
  - Phase 5 will add a "Reserve" button to PricingWidget that initiates Stripe Checkout

tech-stack:
  added: []
  patterns:
    - Client Component date picker state via useState<DateRange | undefined>
    - Disabled matcher array combining { before: Date } and booked { from, to } objects
    - Half-open [) interval: subtract 86400000ms from check_out to allow back-to-back bookings
    - Sticky widget via lg:sticky lg:top-8 on parent wrapper (keeps PricingWidget layout-agnostic)
    - Parallel data fetch via Promise.all in Server Component for property + bookings

key-files:
  created:
    - src/components/property/PricingWidget.tsx
  modified:
    - src/app/(guest)/properties/[propertyId]/page.tsx

key-decisions:
  - "PricingWidget uses numberOfMonths=1 — sidebar is 380px wide, two months would overflow"
  - "Sticky positioning on lg:sticky lg:top-8 wrapper div, not inside PricingWidget — keeps widget layout-agnostic for future reuse"
  - "disabledDates converts [) half-open bounds: subtracts 1 day from check_out so checkout day is selectable as next checkin"
  - "Number() wraps nightly_rate and cleaning_fee defensively against JSONB string edge cases from Supabase"

patterns-established:
  - "Booking date exclusion: subtract 86400000ms from check_out ISO string before constructing Date for disabled ranges"
  - "Parallel Server Component fetch: Promise.all([property query, bookings query]) reduces latency vs sequential"

requirements-completed:
  - PROP-04
  - PROP-07

duration: 2min
completed: 2026-03-05
---

# Phase 4 Plan 4: PricingWidget Summary

**shadcn Calendar date-range picker with confirmed-booking exclusions and real-time price breakdown (nights x rate + cleaning fee) in the property listing sidebar**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-05T02:24:32Z
- **Completed:** 2026-03-05T02:26:01Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created PricingWidget Client Component with react-day-picker v9 range mode calendar
- Past dates and confirmed booking ranges are disabled/unselectable
- Selecting check-in/check-out dates shows live breakdown: `$rate x N nights`, cleaning fee, total before taxes
- Property listing page now fetches confirmed bookings in parallel (Promise.all) and passes them as disabled date ranges

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PricingWidget** - `c77bfe3` (feat)
2. **Task 2: Integrate PricingWidget into property listing page** - `a2ca777` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/property/PricingWidget.tsx` - Client Component: DateRange state, Calendar with disabled past+booked dates, computed price breakdown
- `src/app/(guest)/properties/[propertyId]/page.tsx` - Added parallel bookings query, disabled dates construction with half-open [) interval logic, replaced static placeholder with PricingWidget

## Decisions Made

- `numberOfMonths={1}` used in sidebar widget — 380px wide column can't fit two months side by side
- Sticky wrapper pattern: `lg:sticky lg:top-8` on the parent `<div>`, not inside PricingWidget, so the component stays layout-agnostic
- `Number()` cast on `nightly_rate` and `cleaning_fee` is defensive against JSONB string edge cases even though Supabase JS client normally returns numbers
- Half-open `[)` interval honored: subtract 86400000ms from `check_out` so the checkout day isn't blocked, enabling back-to-back bookings

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PricingWidget is ready to receive a "Reserve" button in Phase 5 (booking flow)
- The widget exposes `dateRange` state locally; Phase 5 will need to either lift state or pass selected dates into a booking initiation flow
- Confirmed booking exclusion pattern is established and reusable for any booking-aware calendar in the app

## Self-Check: PASSED

- `src/components/property/PricingWidget.tsx` — FOUND
- `src/app/(guest)/properties/[propertyId]/page.tsx` — FOUND
- `.planning/phases/04-guest-browsing/04-04-SUMMARY.md` — FOUND
- Commit `c77bfe3` (Task 1) — FOUND
- Commit `a2ca777` (Task 2) — FOUND

---
*Phase: 04-guest-browsing*
*Completed: 2026-03-05*
