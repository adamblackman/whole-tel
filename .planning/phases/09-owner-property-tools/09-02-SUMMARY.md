---
phase: 09-owner-property-tools
plan: 02
subsystem: ui
tags: [react, forms, server-actions, supabase, jsonb]

requires:
  - phase: 09-01
    provides: "BedConfig type, PropertySchema with bed/surcharge fields, AddOnSchema with tier fields, database columns"
provides:
  - "PropertyForm with bed configuration inputs and per-person surcharge fields"
  - "AddOnForm with tiered pricing inputs"
  - "Server actions that persist bed_config JSONB and surcharge/tier nullable pairs"
  - "Edit page loads and passes all new fields to forms"
affects: [09-03, guest-booking-flow]

tech-stack:
  added: []
  patterns:
    - "Bed config rendered via mapped array of tuples for DRY form fields"
    - "JSONB built from individual form fields in server action (form-only fields stripped before DB insert)"

key-files:
  created: []
  modified:
    - src/components/dashboard/PropertyForm.tsx
    - src/components/dashboard/AddOnForm.tsx
    - src/lib/actions/properties.ts
    - src/app/(owner)/dashboard/properties/[propertyId]/edit/page.tsx
    - src/app/(owner)/dashboard/properties/[propertyId]/page.tsx

key-decisions:
  - "Bed config inputs rendered via mapped tuple array rather than 5 separate blocks"
  - "AddOn server action needs no changes -- existing spread pattern passes new Zod fields through"

patterns-established:
  - "Tuple-mapped form fields: array of [name, label, defaultValue] rendered via .map() for repetitive inputs"

requirements-completed: [PROP-09, PROP-10, PROP-11, EXP-01]

duration: 3min
completed: 2026-03-08
---

# Phase 9 Plan 2: Owner Forms Summary

**PropertyForm bed config + surcharge sections and AddOnForm tiered pricing fields with server action persistence**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-08T06:29:48Z
- **Completed:** 2026-03-08T06:32:46Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- PropertyForm now renders 5 bed type number inputs (King, Queen, Double, Twin, Bunk) in a responsive grid
- PropertyForm has per-person pricing section with guest threshold and rate-per-person fields
- AddOnForm has tiered pricing section with included guests and per-person-above fields
- Server actions build bed_config JSONB from individual form fields before Supabase insert/update
- Edit page selects and passes bed_config, guest_threshold, per_person_rate to PropertyForm
- Property detail page selects included_guests and per_person_above for add-on edit forms

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend PropertyForm with bed config and surcharge fields** - `d51bdf2` (feat)
2. **Task 2: Extend AddOnForm with tiered pricing fields** - `76124e3` (feat)

## Files Created/Modified
- `src/components/dashboard/PropertyForm.tsx` - Added bed config section (5 inputs) and per-person pricing section (2 inputs + helper text)
- `src/components/dashboard/AddOnForm.tsx` - Added tiered pricing section (2 inputs + helper text)
- `src/lib/actions/properties.ts` - Destructure bed_* fields, build bed_config JSONB, pass surcharge fields
- `src/app/(owner)/dashboard/properties/[propertyId]/edit/page.tsx` - Added bed_config, guest_threshold, per_person_rate to select query
- `src/app/(owner)/dashboard/properties/[propertyId]/page.tsx` - Added included_guests, per_person_above to add_ons select

## Decisions Made
- Bed config inputs rendered via mapped tuple array for DRY code rather than 5 separate input blocks
- AddOn server action unchanged -- existing `...parsed.data` spread pattern automatically includes new Zod-validated fields

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added included_guests/per_person_above to property detail add-ons select**
- **Found during:** Task 2 (AddOnForm tiered pricing)
- **Issue:** Property detail page only selected basic add-on fields, missing new tier columns needed for edit forms
- **Fix:** Added `included_guests, per_person_above` to the add_ons() select in property detail page
- **Files modified:** src/app/(owner)/dashboard/properties/[propertyId]/page.tsx
- **Verification:** Fields now available in add-on edit initialData
- **Committed in:** 76124e3 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for edit mode to pre-fill tier fields. No scope creep.

## Issues Encountered

Pre-existing TypeScript error in PricingWidget.tsx (AddOnItem type mismatch in guest property page) -- logged to deferred-items.md. Not caused by this plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All owner form inputs complete for bed config, surcharge, and tier pricing
- Plan 09-03 can build guest-facing display using data now persisted by these forms
- PricingWidget type mismatch should be resolved in Plan 09-03

---
*Phase: 09-owner-property-tools*
*Completed: 2026-03-08*
