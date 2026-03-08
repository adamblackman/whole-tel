---
phase: 10-photo-management
plan: 02
subsystem: ui
tags: [supabase-storage, signed-url, next-image, photo-upload, experience]

# Dependency graph
requires:
  - phase: 10-photo-management/01
    provides: "Photo server actions infrastructure, signed URL pattern"
  - phase: 09-owner-property-tools
    provides: "AddOnForm, AddOnList, AddOnCard components"
provides:
  - "Experience photo upload via signed URL in AddOnForm"
  - "Hero image display on guest-facing AddOnCard"
  - "getExperienceUploadUrl, saveExperiencePhoto, removeExperiencePhoto server actions"
affects: [10-photo-management]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Experience photo upload using same signed URL pattern as property photos with experiences/ path prefix"]

key-files:
  created: []
  modified:
    - src/lib/actions/photos.ts
    - src/components/dashboard/AddOnForm.tsx
    - src/components/dashboard/AddOnList.tsx
    - src/components/property/AddOnCard.tsx
    - src/app/(owner)/dashboard/properties/[propertyId]/page.tsx
    - src/app/(guest)/properties/[propertyId]/page.tsx

key-decisions:
  - "Photo upload only available in edit mode (requires existing addOnId) -- cannot upload during create"
  - "Badge overlays on hero image with glass-morphism when photo present, stays in header when no photo"

patterns-established:
  - "Experience photo storage uses experiences/ path prefix to avoid collision with property photos"

requirements-completed: [PHOTO-04]

# Metrics
duration: 4min
completed: 2026-03-08
---

# Phase 10 Plan 02: Experience Photos Summary

**Signed URL photo upload in AddOnForm with hero image display on AddOnCard using experiences/ storage prefix**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-08T07:08:23Z
- **Completed:** 2026-03-08T07:12:30Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- AddOnForm now has photo upload with dashed-border upload area, thumbnail preview, and remove button
- AddOnCard renders hero image above card content when photo_url exists, falls back to text-only card
- Both owner dashboard and guest property pages query photo_url for add-ons

## Task Commits

Each task was committed atomically:

1. **Task 1: Experience photo server actions and AddOnForm upload** - `42dc281` (feat)
2. **Task 2: AddOnCard hero image display** - `fc1b8c8` (feat)

## Files Created/Modified
- `src/lib/actions/photos.ts` - Experience photo server actions (already added by Plan 01, no changes needed)
- `src/components/dashboard/AddOnForm.tsx` - Photo upload section with signed URL pattern, 10MB validation
- `src/components/dashboard/AddOnList.tsx` - Passes addOnId/propertyId and photo_url to AddOnForm
- `src/components/property/AddOnCard.tsx` - Hero image with aspect-video, badge overlay, graceful fallback
- `src/app/(owner)/dashboard/properties/[propertyId]/page.tsx` - Added photo_url to add_ons select
- `src/app/(guest)/properties/[propertyId]/page.tsx` - Added photo_url to add_ons select

## Decisions Made
- Photo upload only available when editing an existing add-on (requires addOnId for signed URL generation). Create flow does not show upload -- owner creates the add-on first, then edits to add photo.
- Badge placed on the hero image itself (glass-morphism overlay) when photo exists, to maximize visual impact of the Airbnb-style card layout.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added photo_url to Supabase queries**
- **Found during:** Task 1 (AddOnForm upload)
- **Issue:** Owner dashboard and guest property pages did not include photo_url in their add_ons select queries
- **Fix:** Added photo_url to both select strings
- **Files modified:** src/app/(owner)/dashboard/..., src/app/(guest)/properties/...
- **Verification:** TypeScript compiles, photo_url available in both contexts
- **Committed in:** 42dc281 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Necessary for photo data to flow to components. No scope creep.

## Issues Encountered
- Experience photo server actions were already added by Plan 01 execution (noted in plan as Wave 1 overlap). No conflict -- actions were identical to what was needed. Git showed no diff for photos.ts.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Experience photos fully wired end-to-end
- Ready for Plan 03 (sectioned guest gallery) and Plan 04 (drag-to-reorder)

---
*Phase: 10-photo-management*
*Completed: 2026-03-08*
