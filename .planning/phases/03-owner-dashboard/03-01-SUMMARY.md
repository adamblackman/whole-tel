---
phase: 03-owner-dashboard
plan: "01"
subsystem: api
tags: [zod, server-actions, supabase, rls, next-js, typescript]

# Dependency graph
requires:
  - phase: 02-auth
    provides: requireOwner() DAL function and Supabase server client factory
provides:
  - Server Actions for property CRUD (createProperty, updateProperty, deleteProperty)
  - Server Actions for add-on CRUD (createAddOn, updateAddOn, deleteAddOn)
  - Zod validation schemas for property and add-on forms
  - ActionState shared return type
affects: [03-02, 03-03, 03-04, all dashboard UI plans]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Actions use requireOwner() as first call before any DB operation"
    - "owner_id always derived from requireOwner() return value, never from formData"
    - "Bound argument pattern: action.bind(null, id) for Server Actions with useActionState"
    - "revalidatePath called before redirect in all mutating actions"
    - "RLS is DB-layer defense; .eq('owner_id', user.id) is UI-layer defense (double defense)"
    - "Add-on actions omit manual owner check — RLS EXISTS subquery enforces property ownership"

key-files:
  created:
    - src/lib/validations/property.ts
    - src/lib/validations/add-on.ts
    - src/lib/actions/properties.ts
    - src/lib/actions/add-ons.ts
  modified: []

key-decisions:
  - "Zod v4 uses 'error' key (not 'errorMap') for custom enum error messages — plan was written against v3 API"
  - "amenities field accepted as comma-separated string from FormData, transformed to JSON array before DB insert"
  - "createAddOn returns success message instead of redirecting — stay on property detail page for inline management"
  - "deleteProperty and deleteAddOn use direct call pattern (no useActionState/prevState) — confirmation dialog buttons"

patterns-established:
  - "Pattern 1: All Server Actions call requireOwner() before any DB operation"
  - "Pattern 2: Bound IDs as first args, _prevState second, formData third for useActionState compatibility"
  - "Pattern 3: RLS enforces ownership at DB layer; application-layer .eq('owner_id') is secondary defense"

requirements-completed: [OWNER-01, OWNER-02, OWNER-03, OWNER-05, OWNER-06, OWNER-08]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 3 Plan 01: Server Actions and Validation Schemas Summary

**Six owner-scoped Server Actions (property + add-on CRUD) with Zod v4 schemas, bound-arg patterns, and double-layer ownership defense via requireOwner() + RLS**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-04T00:49:43Z
- **Completed:** 2026-03-04T00:51:30Z
- **Tasks:** 3 (+ 1 deviation fix)
- **Files modified:** 4

## Accomplishments
- Property CRUD Server Actions with owner_id always from requireOwner(), never from client input
- Add-on CRUD Server Actions with bound propertyId for property-scoped mutations
- Zod validation schemas with coerce for FormData string-to-number conversion and enum validation
- ActionState shared return type enabling consistent error propagation across all dashboard forms

## Task Commits

Each task was committed atomically:

1. **Task 1: Zod validation schemas** - `e8dbeee` (feat)
2. **Task 2: Property CRUD Server Actions** - `e502807` (feat)
3. **Task 3: Add-on CRUD Server Actions** - `cc25f3f` (feat)
4. **Deviation fix: Zod v4 API fix** - `7dbef84` (fix)

**Plan metadata:** (docs commit hash — pending)

## Files Created/Modified
- `src/lib/validations/property.ts` - PropertySchema with coerce for numeric fields, ActionState type
- `src/lib/validations/add-on.ts` - AddOnSchema with pricing_unit enum and max_quantity null transform
- `src/lib/actions/properties.ts` - createProperty, updateProperty, deleteProperty with 'use server'
- `src/lib/actions/add-ons.ts` - createAddOn, updateAddOn, deleteAddOn with 'use server'

## Decisions Made
- Zod v4 uses `error` callback key instead of `errorMap` for custom enum messages (v3 → v4 API change)
- amenities accepted as comma-separated FormData string and transformed to JSON array before Supabase insert
- createAddOn returns `{ message }` (no redirect) — add-ons managed inline on the property detail page
- deleteProperty and deleteAddOn are direct calls without useActionState (invoked from confirmation dialogs)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Zod v4 enum error API change**
- **Found during:** Verification after Task 1 and 3
- **Issue:** Plan used Zod v3 `errorMap` API: `z.enum([...], { errorMap: () => ({ message: '...' }) })`. Zod v4 (installed: 4.3.6) changed this to `error` callback: `{ error: () => '...' }`. TypeScript reported TS2769 overload mismatch.
- **Fix:** Updated `AddOnSchema` pricing_unit enum param from `errorMap` to `error` callback
- **Files modified:** `src/lib/validations/add-on.ts`
- **Verification:** `node node_modules/typescript/bin/tsc --noEmit` exits 0
- **Committed in:** `7dbef84`

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix necessary for TypeScript compilation. No scope creep. All planned artifacts delivered.

## Issues Encountered
- `npx tsc` binary broken (`node_modules/.bin/tsc` contains wrong relative require path). Used `node node_modules/typescript/bin/tsc` directly as workaround. Pre-existing issue unrelated to this plan's changes.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 6 Server Actions ready for use in dashboard UI pages (03-02 through 03-05)
- Forms can import PropertySchema/AddOnSchema for client-side validation display
- ActionState type exported from validations/property.ts for consistent form state typing
- requireOwner() pattern established — all subsequent dashboard actions must follow the same call-first convention

## Self-Check: PASSED

All created files exist on disk. All task commits verified in git log.

---
*Phase: 03-owner-dashboard*
*Completed: 2026-03-04*
