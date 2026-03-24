---
phase: 12-branding-copy-amenities-schema
plan: 02
subsystem: ui
tags: [branding, copy, react, nextjs, typescript]

# Dependency graph
requires:
  - phase: 12-branding-copy-amenities-schema
    provides: Plan 01 branding updates to landing page components
provides:
  - TM-branded Whole-Tel text across all non-landing pages (nav, about, bookings, contact, signup, login)
  - Miami removed from destination filter and valid destinations
  - Bed config breakdown display on property listing cards (King x2, Queen x1 format)
  - bed_config field added to browse page Supabase query
affects: [Phase 13, Phase 15]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "formatBedConfig helper: sparse object to human-readable string with BED_LABELS lookup and count display"
    - "TM symbol as HTML entity &trade; in JSX for correct rendering across browsers"

key-files:
  created: []
  modified:
    - src/components/GuestNav.tsx
    - src/app/layout.tsx
    - src/app/(guest)/about/page.tsx
    - src/app/(guest)/bookings/page.tsx
    - src/app/(guest)/properties/page.tsx
    - src/app/(guest)/contact/page.tsx
    - src/app/(auth)/signup/SignupForm.tsx
    - src/app/(auth)/login/LoginForm.tsx
    - src/components/browse/DestinationFilter.tsx
    - src/components/browse/PropertyListingCard.tsx

key-decisions:
  - "Miami removed from both VALID_DESTINATIONS allowlist and DestinationFilter DESTINATIONS array simultaneously to prevent stranded filter state"
  - "bed_config field required (not optional) in PropertyListingCardProps so TypeScript enforces query completeness at compile time"
  - "formatBedConfig falls back to property.bedrooms bed when all bed counts are zero, ensuring graceful degradation for legacy data"
  - "contact/page.tsx uses unicode escape \\u2122 in metadata title string (not &trade; HTML entity) since metadata is not JSX"

patterns-established:
  - "BED_LABELS lookup + formatBedConfig: reusable pattern for rendering JSONB bed_config as human-readable summary"

requirements-completed: [BRAND-02, BRAND-07, BRAND-08]

# Metrics
duration: 15min
completed: 2026-03-24
---

# Phase 12 Plan 02: TM Branding and Bed Config Display Summary

**TM symbol applied across all non-landing pages, Miami removed from destinations, property cards show bed type breakdown (King x2, Queen x1) with Supabase query updated**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-24T03:14:00Z
- **Completed:** 2026-03-24T03:29:42Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- All public-facing "Whole-Tel" references in non-landing pages now carry the TM symbol via `&trade;` HTML entity
- Miami removed from `VALID_DESTINATIONS` in properties/page.tsx and `DESTINATIONS` in DestinationFilter.tsx — filter and allowlist stay in sync
- Property listing cards display "King x2, Queen x1" format via `formatBedConfig` helper instead of generic bed count
- Browse page Supabase query updated to include `bed_config` column
- Layout.tsx metadata updated: "Custom-Inclusive Group Getaways" replaces "All-Inclusive Group Hotels", Miami removed from description

## Task Commits

Each task was committed atomically:

1. **Task 1: TM branding and hotel removal across all non-landing pages** - `ee46f5b` (feat)
2. **Task 2: Add bed config display to PropertyListingCard** - `5b8d285` (feat)

## Files Created/Modified

- `src/components/GuestNav.tsx` - Nav brand text and Browse link now carry TM symbol
- `src/app/layout.tsx` - Root metadata updated to Custom-Inclusive copy, Miami removed
- `src/app/(guest)/about/page.tsx` - Heading, brand story, destinations (2-col grid, no Miami), CTA all updated with TM and Custom-Inclusive language
- `src/app/(guest)/bookings/page.tsx` - Empty state "Browse Hotels" link updated to Whole-Tels TM
- `src/app/(guest)/properties/page.tsx` - Metadata title, h1, subtitle, VALID_DESTINATIONS (Miami removed), bed_config query column, empty state copy all updated
- `src/app/(guest)/contact/page.tsx` - Metadata title updated with TM unicode character
- `src/app/(auth)/signup/SignupForm.tsx` - CardDescription updated with TM symbol
- `src/app/(auth)/login/LoginForm.tsx` - "New to Whole-Tel?" link updated with TM symbol
- `src/components/browse/DestinationFilter.tsx` - Miami entry removed from DESTINATIONS array
- `src/components/browse/PropertyListingCard.tsx` - bed_config prop added to interface, BED_LABELS + formatBedConfig helper added, bed display replaced with formatted output

## Decisions Made

- Miami removed simultaneously from both the filter component and the server-side allowlist to prevent a "Miami" filter query bypassing the allowlist check via stale URL state.
- `bed_config` made a required field (not optional) on `PropertyListingCardProps` so TypeScript enforces that any caller must pass it — compiler catches missing columns in Supabase select.
- `formatBedConfig` falls back to `{property.bedrooms} bed` when all counts are zero, gracefully handling properties with default `{king:0,...}` config.
- HTML entity `&trade;` used in JSX contexts; unicode escape `\u2122` used in non-JSX metadata strings.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript compiled clean on first pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All branding and copy changes for Phase 12 are complete across plans 01 and 02
- DestinationFilter and VALID_DESTINATIONS are in sync with two destinations (Cabo, Puerto Vallarta)
- Property cards ready to display bed config breakdown once real property data is seeded with bed_config values
- Phase 13 (deadline enforcement) can proceed; no blockers from this plan

---
*Phase: 12-branding-copy-amenities-schema*
*Completed: 2026-03-24*
