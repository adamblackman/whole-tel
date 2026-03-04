---
phase: 03-owner-dashboard
plan: 04
subsystem: ui
tags: [react, supabase, shadcn, next-js, server-components, client-components]

# Dependency graph
requires:
  - phase: 03-owner-dashboard
    provides: "03-03 property detail page, deleteProperty Server Action, requireOwner DAL"
provides:
  - "/dashboard/bookings page — owner-scoped bookings view with property JOIN"
  - "BookingsTable component — displays booking fields with status badges"
  - "DeletePropertyButton — AlertDialog confirmation before property delete"
  - "Danger Zone section on property detail page"
  - "Dashboard nav links for Properties and Bookings"
affects: [04-guest-browsing, 05-booking-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Supabase !inner JOIN for owner-scoped booking queries with .eq on joined table"
    - "Normalize Supabase FK join array to single object at page level for type safety"
    - "AlertDialog wrapping destructive Server Action calls from Client Components"
    - "useTransition for pending state during Server Action calls without form submission"

key-files:
  created:
    - src/components/dashboard/BookingsTable.tsx
    - src/components/dashboard/DeletePropertyButton.tsx
    - src/app/(owner)/dashboard/bookings/page.tsx
  modified:
    - src/app/(owner)/dashboard/layout.tsx
    - src/app/(owner)/dashboard/properties/[propertyId]/page.tsx

key-decisions:
  - "BookingRow type exported from BookingsTable for reuse in page-level normalization"
  - "Supabase !inner join returns array type at compile time but single object at runtime — normalize with map() at page level rather than unsafe cast"
  - "AlertDialogAction styled with explicit destructive classes — shadcn default variant may not apply destructive styles"

patterns-established:
  - "Danger Zone pattern: rounded border-destructive/20 section at bottom of detail pages for irreversible actions"
  - "Owner-scoped bookings: properties!inner JOIN + .eq('properties.owner_id', user.id) for dual UI+RLS enforcement"

requirements-completed: [OWNER-03, OWNER-07, OWNER-08]

# Metrics
duration: 8min
completed: 2026-03-04
---

# Phase 3 Plan 04: Bookings View and Property Delete Summary

**Owner bookings view at /dashboard/bookings with properties!inner JOIN, and destructive delete flow with AlertDialog confirmation in a Danger Zone section**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-04T20:00:36Z
- **Completed:** 2026-03-04T20:08:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- /dashboard/bookings fetches all bookings across all owner properties using Supabase !inner JOIN with owner_id filter at both UI and RLS layers
- BookingsTable renders check-in/out dates, guest count, property name, total, and status badge (Confirmed/Pending/Cancelled) with empty state
- DeletePropertyButton uses useTransition + AlertDialog to confirm before calling deleteProperty Server Action; property detail page now has a Danger Zone section

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BookingsTable component and bookings page** - `26bc618` (feat)
2. **Task 2: Create DeletePropertyButton and add it to property detail page** - `0ed03cb` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified
- `src/components/dashboard/BookingsTable.tsx` - Table component with status badges, empty state, and exported BookingRow type
- `src/app/(owner)/dashboard/bookings/page.tsx` - Server Component page that queries and normalizes owner bookings
- `src/components/dashboard/DeletePropertyButton.tsx` - Client Component with AlertDialog confirmation for property deletion
- `src/app/(owner)/dashboard/layout.tsx` - Added nav links for Properties and Bookings
- `src/app/(owner)/dashboard/properties/[propertyId]/page.tsx` - Added Danger Zone section with DeletePropertyButton

## Decisions Made
- Supabase infers `properties` as an array type in !inner JOINs even though it returns a single object at runtime. Rather than using an unsafe `as` cast, normalized with `.map()` at the page level, spreading each row into the `BookingRow` shape. Clean, explicit, TypeScript-safe.
- `AlertDialogAction` styled with explicit `bg-destructive text-destructive-foreground hover:bg-destructive/90` classes because the default shadcn variant may not apply destructive styling to AlertDialogAction (different from Button).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript type mismatch on Supabase !inner JOIN response**
- **Found during:** Task 1 (bookings page)
- **Issue:** Plan instructed casting via `Parameters<typeof BookingsTable>[0]['bookings']` but Supabase infers properties as `{ id: any; name: any; owner_id: any; }[]` (array), which is incompatible with the BookingRow `properties: { id: string; name: string }` (single object) shape
- **Fix:** Exported `BookingRow` type from BookingsTable, added explicit normalization with `.map()` in the page to flatten the array to a single object
- **Files modified:** src/components/dashboard/BookingsTable.tsx, src/app/(owner)/dashboard/bookings/page.tsx
- **Verification:** Next.js build passed with zero TypeScript errors
- **Committed in:** 26bc618 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — type mismatch)
**Impact on plan:** Auto-fix necessary for type safety. No scope creep.

## Issues Encountered
- `npx tsc` was broken due to a Node.js module resolution issue with the `node_modules/.bin/tsc` symlink. Used `node node_modules/next/dist/bin/next build` directly for TypeScript verification — identical validation, just a different invocation path.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 3 (Owner Dashboard) fully complete: owners can list, create, view, edit, manage photos, manage add-ons, view all bookings, and delete properties with confirmation
- Ready for Phase 4 (Guest Browsing) — property listings, search, and property detail pages for guests

## Self-Check: PASSED

- FOUND: src/components/dashboard/BookingsTable.tsx
- FOUND: src/components/dashboard/DeletePropertyButton.tsx
- FOUND: src/app/(owner)/dashboard/bookings/page.tsx
- FOUND: commit 26bc618 (Task 1)
- FOUND: commit 0ed03cb (Task 2)
- Build: PASSED (zero TypeScript errors, all routes rendered)

---
*Phase: 03-owner-dashboard*
*Completed: 2026-03-04*
