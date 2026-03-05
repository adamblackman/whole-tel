---
phase: 04-guest-browsing
plan: 03
subsystem: ui
tags: [next.js, supabase, yet-another-react-lightbox, lucide-react, tailwind, shadcn]

# Dependency graph
requires:
  - phase: 04-01
    provides: yet-another-react-lightbox installed, brand CSS tokens, (guest) route group layout

provides:
  - PhotoGallery client component with Airbnb-style 5-photo grid and lightbox
  - AmenityList server component mapping amenity strings to Lucide icons
  - AddOnCard server component with shadcn Card, Badge, pricing display
  - Property listing page at /properties/[propertyId] with two-column layout
  - Dynamic SEO metadata (title) via generateMetadata
  - 404 via notFound() for invalid property IDs

affects: [04-04-booking-widget, 05-guest-booking, guest-facing-pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Supabase nested select (* with related tables) for single-query page data fetch
    - Photo URLs constructed server-side from NEXT_PUBLIC_SUPABASE_URL + storage_path
    - Typed cast `as AddOnRow[]` for Supabase implicit-any join results
    - Grid layout with hero photo spanning md:col-span-2 md:row-span-2

key-files:
  created:
    - src/components/property/PhotoGallery.tsx
    - src/components/property/AmenityList.tsx
    - src/components/property/AddOnCard.tsx
    - src/app/(guest)/properties/[propertyId]/page.tsx
  modified: []

key-decisions:
  - "AddOnRow interface defined locally in page.tsx to type Supabase implicit-any add_ons join — prevents TypeScript error on array .map()"
  - "add_ons joined inline in single .select() call — avoids second round-trip to database"
  - "Photos sorted by display_order server-side before passing URLs to PhotoGallery — keeps photo ordering logic out of Client Component"
  - "Separator between page sections uses shadcn Separator — consistent visual rhythm without custom CSS"

patterns-established:
  - "Guest listing pages: single Supabase query with nested select, notFound() on miss, no verifySession()"
  - "PhotoGallery: slice to 5 display photos, show all overlay on 5th, full lightbox on any click"

requirements-completed: [PROP-01, PROP-02, PROP-03, PROP-05, PROP-06, ADDON-01, ADDON-02, ADDON-03, PAGE-04]

# Metrics
duration: 3min
completed: 2026-03-05
---

# Phase 04 Plan 03: Property Listing Page Summary

**Airbnb-style property detail page at /properties/[propertyId] with 5-photo grid + lightbox, amenity icon grid, add-on experience cards, and two-column desktop layout**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-05T02:20:01Z
- **Completed:** 2026-03-05T02:22:26Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- PhotoGallery client component: hero photo (50% width) + 2x2 grid, click-to-lightbox, "Show all N photos" overlay, empty-state placeholder with brand gradient
- AmenityList server component: 20+ amenity-to-Lucide-icon mappings, Check fallback, 2-3 column responsive grid
- AddOnCard server component: shadcn Card with Badge (per person / per booking), PartyPopper icon, formatted price
- Property listing page: parallel data fetch via single Supabase nested select, two-column layout (details + sticky price widget), dynamic SEO title, notFound() for invalid IDs

## Task Commits

1. **Task 1: Create PhotoGallery, AmenityList, and AddOnCard components** - `bf52074` (feat)
2. **Task 2: Build the property listing page with parallel data fetch** - `a39a6ba` (feat)

**Plan metadata:** _(to be added in final commit)_

## Files Created/Modified

- `src/components/property/PhotoGallery.tsx` - Client component: 5-photo Airbnb grid + yet-another-react-lightbox
- `src/components/property/AmenityList.tsx` - Server component: amenity string → Lucide icon mapping
- `src/components/property/AddOnCard.tsx` - Server component: add-on card with shadcn Card + Badge
- `src/app/(guest)/properties/[propertyId]/page.tsx` - Property listing page with full details, two-column layout

## Decisions Made

- `AddOnRow` interface typed locally in page.tsx — Supabase's joined select infers `any[]` for `add_ons`, requiring a typed cast to prevent TypeScript errors during build
- Single nested Supabase query (`* , property_photos(...), add_ons(...)`) — single round-trip for all page data, no Promise.all needed since it's one query
- Photo sorting happens server-side before constructing URLs — keeps client-side PhotoGallery purely presentational

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Typed cast for implicit-any Supabase join result**
- **Found during:** Task 2 (property listing page build)
- **Issue:** TypeScript error `Parameter 'addOn' implicitly has an 'any' type` when mapping `property.add_ons` — Supabase nested select returns loosely-typed array
- **Fix:** Added `AddOnRow` interface in page.tsx and cast `property.add_ons` as `AddOnRow[]`
- **Files modified:** `src/app/(guest)/properties/[propertyId]/page.tsx`
- **Verification:** `npx next build` succeeded with zero TypeScript errors
- **Committed in:** `a39a6ba` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 type error / implicit any)
**Impact on plan:** Minor type annotation fix, no scope creep. Plan executed as specified.

## Issues Encountered

None beyond the auto-fixed type error above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Property listing page fully operational for any property with a valid UUID
- PhotoGallery, AmenityList, AddOnCard ready for reuse across guest-facing views
- Pricing widget placeholder at right column ready to be replaced by booking date picker in Plan 04

---
*Phase: 04-guest-browsing*
*Completed: 2026-03-05*
