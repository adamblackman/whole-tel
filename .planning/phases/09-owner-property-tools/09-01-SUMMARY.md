---
phase: 09-owner-property-tools
plan: 01
subsystem: database
tags: [postgres, typescript, zod, pricing, jsonb, vitest]

requires:
  - phase: 08-fixes-rebrand
    provides: "Existing Property/AddOn types, PropertySchema, AddOnSchema"
provides:
  - "Database migration for bed_config, surcharge pair, tier pair columns"
  - "BedConfig TypeScript interface and DEFAULT_BED_CONFIG constant"
  - "Shared pricing module (calculatePricing) with full test coverage"
  - "Extended Zod schemas with nullable pair validation"
affects: [09-02, 09-03, owner-forms, pricing-widget, bookings]

tech-stack:
  added: [vitest]
  patterns: [shared-pricing-module, nullable-pair-validation, jsonb-typed-column]

key-files:
  created:
    - supabase/migrations/20260308000002_owner_property_tools.sql
    - src/lib/pricing.ts
    - src/lib/pricing.test.ts
  modified:
    - src/types/database.ts
    - src/lib/validations/property.ts
    - src/lib/validations/add-on.ts

key-decisions:
  - "Migration filename 20260308000002 (not 000001) to avoid collision with rebrand seed migration"
  - "Vitest installed as test runner for pure function testing"
  - "z.preprocess used for nullable number fields to prevent empty string -> 0 coercion"

patterns-established:
  - "Shared pricing module: all pricing math in lib/pricing.ts, consumed by both client and server"
  - "Nullable pair pattern: CHECK constraint + Zod refine enforcing both-null-or-both-set"
  - "JSONB typed column: BedConfig interface with DEFAULT_BED_CONFIG constant for typed access"

requirements-completed: [PROP-09, PROP-10, PROP-11, EXP-01]

duration: 3min
completed: 2026-03-08
---

# Phase 9 Plan 1: Foundation Layer Summary

**Database migration with bed_config JSONB, surcharge/tier nullable pairs, shared pricing module with 9 passing tests, and extended Zod schemas**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-08T06:24:27Z
- **Completed:** 2026-03-08T06:27:30Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Database migration with 7 ALTER TABLE/constraint statements for bed config, per-person surcharge, and tiered add-on pricing
- Pure function pricing module (calculatePricing) that eliminates price drift between PricingWidget and bookings.ts
- 9 test cases covering basic pricing, surcharge, tiered add-ons, backward compatibility, and processing fee calculation
- Extended Zod schemas with nullable pair enforcement preventing half-configured surcharge/tier settings

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration and TypeScript types** - `24afc48` (feat)
2. **Task 2 RED: Failing pricing tests** - `9053004` (test)
3. **Task 2 GREEN: Pricing module and Zod schemas** - `268175a` (feat)

## Files Created/Modified
- `supabase/migrations/20260308000002_owner_property_tools.sql` - Schema migration with bed_config, surcharge pair, tier pair
- `src/types/database.ts` - BedConfig interface, DEFAULT_BED_CONFIG, new fields on Property and AddOn
- `src/lib/pricing.ts` - Shared pricing calculation module (pure functions, no framework deps)
- `src/lib/pricing.test.ts` - 9 test cases for all pricing scenarios
- `src/lib/validations/property.ts` - Extended with bed config and surcharge fields
- `src/lib/validations/add-on.ts` - Extended with tiered pricing fields

## Decisions Made
- Migration filename changed to `20260308000002` to avoid collision with existing `20260308000001_rebrand_seed_data.sql`
- Installed vitest as dev dependency for pricing module tests
- Used `z.preprocess` for nullable number fields to correctly convert empty strings to null (not 0)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration filename collision**
- **Found during:** Task 1
- **Issue:** Plan specified `20260308000001` but that filename was already taken by rebrand seed migration
- **Fix:** Used `20260308000002` instead
- **Files modified:** Migration filename only
- **Verification:** No filename collision, migration file created successfully
- **Committed in:** 24afc48

**2. [Rule 3 - Blocking] Vitest not installed**
- **Found during:** Task 2 (TDD setup)
- **Issue:** No test runner in project dependencies
- **Fix:** Installed vitest as dev dependency
- **Files modified:** package.json, package-lock.json
- **Verification:** Tests run and pass
- **Committed in:** 9053004

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for task completion. No scope creep.

## Issues Encountered
None

## User Setup Required
- [09-01 PENDING]: Owner property tools migration must be applied manually via Dashboard SQL Editor (`supabase/migrations/20260308000002_owner_property_tools.sql`)

## Next Phase Readiness
- Foundation layer complete: types, validation, pricing module all ready
- Plan 09-02 (forms) and 09-03 (display) can proceed
- All SELECT query updates for new columns deferred to plans that modify those files

---
*Phase: 09-owner-property-tools*
*Completed: 2026-03-08*
