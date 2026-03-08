---
phase: 11-booking-enhancements
plan: 01
subsystem: ui, database, api
tags: [collapsible, pricing, server-actions, supabase, rls]

requires:
  - phase: 09-owner-property-tools
    provides: calculatePricing shared module, booking creation with pricing breakdown
provides:
  - booking_invitations table with RLS (foundation for Plan 02)
  - Expandable booking cards with full price breakdown
  - Guest count editing with server-side price recalculation
  - BookingInvitation type and Zod validation schemas
affects: [11-02-PLAN]

tech-stack:
  added: [radix-ui/collapsible via shadcn]
  patterns: [collapsible card pattern, inline editing with server action recalculation]

key-files:
  created:
    - supabase/migrations/20260308000004_booking_invitations.sql
    - src/components/booking/BookingDetails.tsx
    - src/components/booking/GuestCountEditor.tsx
    - src/components/booking/BookingCardClient.tsx
    - src/lib/actions/booking-updates.ts
    - src/lib/validations/booking-invitation.ts
  modified:
    - src/types/database.ts
    - src/app/(guest)/bookings/page.tsx

key-decisions:
  - "BookingCardClient wrapper handles collapsible state, keeping page.tsx as Server Component"
  - "Price breakdown shows stored values (not recalculated) for display consistency"
  - "Admin client used for guest count update to bypass RLS after auth verification"

patterns-established:
  - "Collapsible card: Server Component page passes data to client wrapper with Collapsible + detail component"
  - "Inline editor: useState toggle + useTransition for server action calls with loading state"

requirements-completed: [BOOK-08, BOOK-09]

duration: 3min
completed: 2026-03-08
---

# Phase 11 Plan 01: Booking Details & Guest Count Summary

**Expandable booking cards with full price breakdown and inline guest count editing via shared pricing recalculation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-08T07:39:43Z
- **Completed:** 2026-03-08T07:42:50Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Created booking_invitations migration with RLS policies (foundation for Plan 02 invite system)
- Built expandable booking cards showing subtotal, individual add-ons, processing fee, and total
- Implemented guest count editing restricted to confirmed bookings with full price recalculation

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration, types, shadcn Collapsible, and Zod schemas** - `8cff538` (feat)
2. **Task 2: Expandable BookingCard with price breakdown and guest count editor** - `0338059` (feat)

## Files Created/Modified
- `supabase/migrations/20260308000004_booking_invitations.sql` - booking_invitations table with RLS
- `src/types/database.ts` - Added BookingInvitation type, InvitationStatus, Database table entry
- `src/components/ui/collapsible.tsx` - shadcn Collapsible component (installed)
- `src/lib/validations/booking-invitation.ts` - Zod schemas for invitation and guest count
- `src/components/booking/BookingCardClient.tsx` - Client wrapper with Collapsible expand/collapse
- `src/components/booking/BookingDetails.tsx` - Price breakdown display with guest count edit trigger
- `src/components/booking/GuestCountEditor.tsx` - Inline +/- guest count editor with server action
- `src/lib/actions/booking-updates.ts` - updateGuestCount server action with pricing recalculation
- `src/app/(guest)/bookings/page.tsx` - Enhanced query with add-on joins, renders collapsible cards

## Decisions Made
- BookingCardClient wrapper component handles collapsible state while page.tsx stays as Server Component
- Price breakdown displays stored values (subtotal, add_ons_total, processing_fee, total) rather than recalculating, for consistency with what was actually charged
- Admin client used for booking update after verifySession() auth check, to bypass RLS for the write operation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added BookingCardClient wrapper component**
- **Found during:** Task 2 (BookingCard refactoring)
- **Issue:** Plan specified extracting BookingCard into a client component or wrapping with Collapsible. The header content includes server-rendered Link components, so a clean separation required a dedicated client wrapper that receives header as ReactNode prop.
- **Fix:** Created BookingCardClient.tsx as the collapsible wrapper, keeping header rendering in the server component BookingCard
- **Files modified:** src/components/booking/BookingCardClient.tsx
- **Verification:** TypeScript compiles, structure cleanly separates server/client concerns
- **Committed in:** 0338059 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary component extraction for clean server/client boundary. No scope creep.

## Issues Encountered
None

## User Setup Required
- [11-01 PENDING]: booking_invitations migration must be applied manually via Supabase Dashboard SQL Editor

## Next Phase Readiness
- booking_invitations table ready for Plan 02 invite system implementation
- BookingDetails component can be extended to show invitation status
- Guest count editor integrated and functional

---
*Phase: 11-booking-enhancements*
*Completed: 2026-03-08*
