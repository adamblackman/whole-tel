---
phase: 12-branding-copy-amenities-schema
plan: "04"
subsystem: payments
tags: [stripe, pricing, hotel-tax, typescript]

# Dependency graph
requires:
  - phase: 12-branding-copy-amenities-schema
    provides: pricing module with PricingInput/PricingBreakdown interfaces
provides:
  - Hotel tax calculated in calculatePricing() as (accommodationSubtotal + perPersonSurcharge) * taxRate
  - Processing fee base includes hotelTax so Stripe total is correct
  - PricingWidget displays "Hotel Tax (X%)" line item when taxRate is set
  - bookings.ts includes conditional Hotel Tax Stripe line item
  - Per-person cost displayed on bookings list page for groups > 1 guest

affects: [booking-invitations, booking-updates, future-pricing-changes, stripe-webhook]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Hotel tax flows through calculatePricing() — not added externally — so canonical total is consistent across PricingWidget, Stripe line items, and processing fee calculation"
    - "All calculatePricing() callers pass taxRate: property.tax_rate != null ? Number(property.tax_rate) : null"
    - "Conditional Stripe line items use spread syntax: ...(condition ? [item] : [])"

key-files:
  created: []
  modified:
    - src/lib/pricing.ts
    - src/components/property/PricingWidget.tsx
    - src/lib/actions/bookings.ts
    - src/lib/actions/booking-invitations.ts
    - src/lib/actions/booking-updates.ts
    - src/app/(guest)/properties/[propertyId]/page.tsx
    - src/app/(guest)/bookings/page.tsx
    - src/lib/pricing.test.ts

key-decisions:
  - "hotelTax calculated on (accommodationSubtotal + perPersonSurcharge) only — not on cleaning fee or add-ons, matching typical hotel tax conventions"
  - "processingFee base includes hotelTax so Stripe charge total equals breakdown.total"
  - "taxRate: null in pricing.test.ts makeInput base — tests validate tax-free scenario remains correct"

patterns-established:
  - "Pricing module is single source of truth — all consumers (widget, server action, invitation acceptance, booking updates) call calculatePricing() identically"

requirements-completed: [PAY-07, PAY-09]

# Metrics
duration: 3min
completed: 2026-03-24
---

# Phase 12 Plan 04: Hotel Tax and Per-Person Cost Summary

**Hotel tax flowing through calculatePricing() with Stripe line item, PricingWidget display, and per-person cost on bookings list page**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-24T03:31:46Z
- **Completed:** 2026-03-24T03:34:48Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Extended `PricingInput` with `taxRate: number | null` and `PricingBreakdown` with `hotelTax: number` and `taxRate: number | null`
- `calculatePricing()` now computes `hotelTax = (accommodationSubtotal + perPersonSurcharge) * taxRate` and includes it in the `processingFee` base and `total`
- `PricingWidget` accepts `taxRate` prop, passes it to `calculatePricing`, and renders a "Hotel Tax (X%)" line item in the breakdown display
- `bookings.ts` fetches `tax_rate` from property, passes to `calculatePricing`, adds conditional Hotel Tax Stripe checkout line item
- Property detail page threads `taxRate` from DB to `PricingWidget`
- Bookings list page shows "Per person: $X" beneath the total for bookings with more than 1 guest
- Full build and TypeScript check pass with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend calculatePricing() with hotel tax and update PricingWidget** - `5c1c37e` (feat)
2. **Task 2: Update bookings.ts, property detail page, and bookings list page** - `c9a2a4a` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `src/lib/pricing.ts` - Added taxRate to PricingInput, hotelTax/taxRate to PricingBreakdown, updated calculatePricing logic
- `src/components/property/PricingWidget.tsx` - Added taxRate prop, passes to calculatePricing, renders Hotel Tax line item
- `src/lib/actions/bookings.ts` - Added tax_rate to property query, taxRate to calculatePricing call, Hotel Tax Stripe line item
- `src/lib/actions/booking-invitations.ts` - Added tax_rate to property query, taxRate to calculatePricing call
- `src/lib/actions/booking-updates.ts` - Added tax_rate to property query, taxRate to calculatePricing call
- `src/app/(guest)/properties/[propertyId]/page.tsx` - Added tax_rate to property query, taxRate prop to PricingWidget
- `src/app/(guest)/bookings/page.tsx` - Per-person cost display beneath total for guest_count > 1
- `src/lib/pricing.test.ts` - Added taxRate: null to makeInput base object

## Decisions Made
- Hotel tax applies only to accommodation and per-person surcharge, not to cleaning fee or add-ons — this follows typical hotel tax conventions where ancillary fees are excluded
- Processing fee is computed on the full subtotal including hotel tax, ensuring Stripe receives the correct total
- `taxRate: null` means no tax is applied (hotel submits from gross), matching the plan spec

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated booking-invitations.ts and booking-updates.ts callers**
- **Found during:** Task 1 (TypeScript check after pricing.ts change)
- **Issue:** `taxRate` was added as required to `PricingInput`, but `booking-invitations.ts` and `booking-updates.ts` also call `calculatePricing()` and were not listed in the plan's `files_modified`
- **Fix:** Added `tax_rate` to the property select queries and `taxRate: property.tax_rate != null ? Number(property.tax_rate) : null` to the `calculatePricing()` calls in both files
- **Files modified:** src/lib/actions/booking-invitations.ts, src/lib/actions/booking-updates.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** c9a2a4a (Task 2 commit)

**2. [Rule 3 - Blocking] Fixed pricing.test.ts makeInput base object**
- **Found during:** Task 1 (TypeScript check)
- **Issue:** `makeInput` used `Partial<PricingInput>` spread which left `taxRate` as `undefined`, incompatible with `number | null`
- **Fix:** Added `taxRate: null` to the base object in `makeInput`
- **Files modified:** src/lib/pricing.test.ts
- **Verification:** TypeScript check passes, existing test assertions remain correct (taxRate: null produces hotelTax: 0)
- **Committed in:** 5c1c37e (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary to propagate the required `taxRate` field through all `calculatePricing()` callers. No scope creep.

## Issues Encountered
None beyond the auto-fixed blocking issues above.

## User Setup Required
None - no external service configuration required. The `tax_rate` column is already in the DB schema from prior phases.

## Next Phase Readiness
- Hotel tax flows correctly through all pricing layers (widget display, Stripe checkout, booking totals recalculation)
- Per-person display active on both booking flow (PricingWidget) and confirmation (bookings list)
- Phase 12 plan 04 complete — all 4 plans in Phase 12 now complete

---
*Phase: 12-branding-copy-amenities-schema*
*Completed: 2026-03-24*
