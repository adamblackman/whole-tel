---
phase: 09-owner-property-tools
plan: 03
subsystem: ui
tags: [pricing, react, supabase, stripe, bed-config, tiered-pricing]

# Dependency graph
requires:
  - phase: 09-01
    provides: "shared pricing module (lib/pricing.ts), DB columns (bed_config, guest_threshold, per_person_rate, included_guests, per_person_above)"
provides:
  - "PricingWidget using shared calculatePricing with surcharge and tier display"
  - "AddOnCard with tiered pricing info"
  - "Booking server action using shared calculatePricing (price parity with widget)"
  - "Bed configuration display on listing and owner pages"
  - "Per-person surcharge display in price breakdown"
affects: [guest-booking-flow, owner-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: ["shared pricing module consumed by both client widget and server action"]

key-files:
  created: []
  modified:
    - src/components/property/PricingWidget.tsx
    - src/lib/actions/bookings.ts
    - src/app/(guest)/properties/[propertyId]/page.tsx
    - src/components/property/AddOnCard.tsx
    - src/app/(owner)/dashboard/properties/[propertyId]/page.tsx

key-decisions:
  - "Store accommodation + surcharge as subtotal in bookings table (no dedicated surcharge column)"
  - "Separate Stripe line items for accommodation, surcharge, cleaning fee, each add-on, processing fee"

patterns-established:
  - "PricingWidget and bookings.ts both import calculatePricing from lib/pricing.ts -- single source of truth"
  - "Bed config displayed with BED_TYPE_LABELS map and filtered entries for non-zero counts"

requirements-completed: [PROP-09, PROP-10, PROP-11, EXP-01]

# Metrics
duration: 4min
completed: 2026-03-08
---

# Phase 9 Plan 3: Guest-Facing Pricing Refactor Summary

**Refactored PricingWidget and booking action to shared calculatePricing(), added bed config display and tiered add-on pricing info**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-08T06:29:44Z
- **Completed:** 2026-03-08T06:33:26Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Eliminated price drift between PricingWidget and booking server action by using shared calculatePricing()
- Added per-person surcharge line in price breakdown when guest count exceeds threshold
- Added bed configuration display with icons on listing page and owner detail page
- Added tiered pricing info on add-on toggles and AddOnCard component
- Separated Stripe line items for granular checkout display (accommodation, surcharge, cleaning, add-ons, fee)

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor PricingWidget and bookings action to use shared pricing module** - `42e9b2c` (feat)
2. **Task 2: Add bed config display to listing page and tier info to AddOnCard** - `eb329af` (feat)

## Files Created/Modified
- `src/components/property/PricingWidget.tsx` - Uses calculatePricing(), shows surcharge line and tier info on add-on toggles
- `src/lib/actions/bookings.ts` - Uses calculatePricing() for server-side pricing, separate Stripe line items
- `src/app/(guest)/properties/[propertyId]/page.tsx` - Bed config display, passes surcharge/tier props to PricingWidget
- `src/components/property/AddOnCard.tsx` - Shows tier pricing info when included_guests is set
- `src/app/(owner)/dashboard/properties/[propertyId]/page.tsx` - Bed config and surcharge info display

## Decisions Made
- Store accommodation + surcharge as subtotal in bookings table since there is no dedicated surcharge column
- Separate Stripe line items for each pricing component (accommodation, surcharge, cleaning fee, per add-on, processing fee) for clarity in checkout

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All guest-facing pricing display and booking action now use shared pricing module
- Bed config, surcharge, and tiered add-on pricing fully integrated
- Ready for any remaining Phase 9 plans or Phase 10

---
*Phase: 09-owner-property-tools*
*Completed: 2026-03-08*

## Self-Check: PASSED
