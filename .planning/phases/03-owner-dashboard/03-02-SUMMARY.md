---
phase: 03-owner-dashboard
plan: 02
subsystem: ui
tags: [supabase-storage, file-upload, server-actions, signed-url, next-image]

# Dependency graph
requires:
  - phase: 03-owner-dashboard
    provides: DAL requireOwner(), Supabase server/browser clients, property_photos schema

provides:
  - Server Actions for photo management (getSignedUploadUrl, savePhotoRecord, deletePhoto)
  - PhotoUploader Client Component with two-step signed URL upload pattern
  - next/image remotePatterns configured for Supabase Storage

affects: [03-owner-dashboard, 03-03-property-detail]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-step signed URL upload: Server Action generates URL -> browser uploads directly to Supabase Storage"
    - "Ownership gate before signed URL generation: property verified to belong to current user"
    - "Storage deletion non-blocking: log error but continue with DB record removal"

key-files:
  created:
    - src/lib/actions/photos.ts
    - src/components/dashboard/PhotoUploader.tsx
  modified:
    - next.config.ts

key-decisions:
  - "Storage paths use crypto.randomUUID() — avoids Date.now() collision risk under concurrent uploads"
  - "File input NOT inside a form — prevents accidental Server Action body routing (1MB limit)"
  - "Storage deletion failure is logged but non-blocking — DB record removal is the authoritative cleanup step"
  - "Supabase Storage hostname jxbafovfobsmqxjfjrqp.supabase.co added to next.config.ts remotePatterns"

patterns-established:
  - "Photo upload: never route file bytes through Server Action body — always use signed URL flow"
  - "Owner verification: getSignedUploadUrl checks property ownership before any signed URL is generated"
  - "Revalidation: both /dashboard/properties/{id} and /dashboard are revalidated after photo save/delete"

requirements-completed: [OWNER-04, OWNER-08]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 3 Plan 02: Photo Upload Infrastructure Summary

**Two-step signed URL photo upload flow: Server Actions verify ownership and generate Supabase Storage signed URLs; browser uploads directly to Storage; PhotoUploader Client Component manages the full lifecycle**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T19:49:42Z
- **Completed:** 2026-03-04T19:51:40Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Server Actions (`getSignedUploadUrl`, `savePhotoRecord`, `deletePhoto`) with ownership verification before any storage operation
- PhotoUploader Client Component using two-step upload (signed URL from server -> direct browser-to-Storage upload via `uploadToSignedUrl`)
- Configured `next.config.ts` remotePatterns for Supabase Storage URLs so `next/image` works without `unoptimized` prop

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Server Actions for photo management** - `5be7de2` (feat)
2. **Task 2: Create PhotoUploader Client Component** - `c76bf19` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/actions/photos.ts` - Server Actions: getSignedUploadUrl (ownership-gated), savePhotoRecord, deletePhoto
- `src/components/dashboard/PhotoUploader.tsx` - Client Component: full upload/display/delete lifecycle
- `next.config.ts` - Added Supabase Storage hostname to images.remotePatterns

## Decisions Made
- `crypto.randomUUID()` used for storage paths — avoids the `Date.now()` collision risk under concurrent uploads from same user
- File input is intentionally NOT inside a `<form>` to prevent any path that could route file bytes through a Server Action body (Next.js 1MB limit)
- Storage deletion in `deletePhoto` is best-effort — failures are logged but the DB record deletion proceeds regardless, as the DB row is the authoritative reference
- Added Supabase project hostname `jxbafovfobsmqxjfjrqp.supabase.co` to `next.config.ts` remotePatterns rather than using `unoptimized` prop — enables CDN optimization for property photos

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added Supabase Storage remotePatterns to next.config.ts**
- **Found during:** Task 2 (PhotoUploader implementation)
- **Issue:** next.config.ts was empty — next/image would refuse to serve Supabase Storage URLs without the hostname in remotePatterns
- **Fix:** Added `images.remotePatterns` entry for `jxbafovfobsmqxjfjrqp.supabase.co` with `/storage/v1/object/public/**` pathname
- **Files modified:** next.config.ts
- **Verification:** TypeScript compiles clean; no `unoptimized` prop needed in PhotoUploader
- **Committed in:** c76bf19 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Required for next/image to function with Supabase Storage URLs. No scope creep.

## Issues Encountered
- Pre-existing TypeScript error in `src/lib/validations/add-on.ts` (Zod `errorMap` API change) — out of scope, deferred. New files have zero TypeScript errors.

## User Setup Required
None - no external service configuration required for this plan. Supabase Storage bucket `property-photos` and RLS policies are required (should be set up from the 01-01 schema migration).

## Next Phase Readiness
- PhotoUploader component is ready to be embedded in the property detail page (Plan 03-03)
- Server Actions are fully typed and ownership-verified — safe to call from any owner dashboard page
- next/image is configured for Supabase Storage URLs

---
*Phase: 03-owner-dashboard*
*Completed: 2026-03-04*
