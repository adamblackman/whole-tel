---
phase: 12-branding-copy-amenities-schema
plan: 01
subsystem: ui
tags: [next.js, tailwind, shadcn, landing, branding, copy]

# Dependency graph
requires: []
provides:
  - Custom-Inclusive brand messaging across all homepage sections
  - New TakeoverSteps 3-step how-it-works component
  - Active vs Coming Soon destination card split (2 active, 4 coming soon)
  - bed_config added to FeaturedProperties local prop type (readied for Plan 02)
affects:
  - 12-02 (PropertyListingCard bed_config changes will consume updated FeaturedProperties type)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Coming Soon destinations rendered as non-clickable divs with Badge overlay rather than Link elements"
    - "TM symbol via &trade; HTML entity throughout landing copy"

key-files:
  created:
    - src/components/landing/TakeoverSteps.tsx
  modified:
    - src/components/landing/Hero.tsx
    - src/components/landing/BrandStory.tsx
    - src/components/landing/FeaturedProperties.tsx
    - src/components/landing/DestinationCards.tsx
    - src/components/landing/Testimonials.tsx
    - src/app/page.tsx

key-decisions:
  - "Miami moved from active to Coming Soon destinations — only Cabo San Lucas and Puerto Vallarta remain active"
  - "Custom-Inclusive messaging replaces all-inclusive language throughout hero and brand story"
  - "bed_config added to FeaturedProperties local prop type proactively to avoid type errors when Plan 02 ships"

patterns-established:
  - "Non-clickable destination cards: opacity-75 div with absolute Badge overlay (bg-white/90 text-zinc-700)"
  - "TakeoverSteps: Server Component with amber icon palette matching brand tropical luxury feel"

requirements-completed: [BRAND-01, BRAND-03, BRAND-04, BRAND-05, BRAND-06]

# Metrics
duration: 5min
completed: 2026-03-23
---

# Phase 12 Plan 01: Branding Copy & Landing Sections Summary

**Homepage overhauled with Custom-Inclusive messaging, new 3-step TakeoverSteps component, and 6-card destination grid splitting 2 active from 4 Coming Soon cards with badge overlay**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-23T20:47:06Z
- **Completed:** 2026-03-23T20:52:00Z
- **Tasks:** 2
- **Files modified:** 7 (6 modified + 1 created)

## Accomplishments

- Hero headline rewritten to Custom-Inclusive positioning with updated CTA ("Browse Whole-Tels™")
- New TakeoverSteps Server Component renders Browse/Customize/Arrive 3-step section with amber icon palette
- DestinationCards split into 2 active (Cabo, PV) + 4 Coming Soon (Miami, Palm Springs, LA, Las Vegas) with badge overlay
- FeaturedProperties type extended with bed_config to unblock Plan 02 PropertyListingCard changes
- All "hotel" references purged from landing components — zero "Browse Hotels" or "Featured Hotels" remain

## Task Commits

1. **Task 1: Update Hero, BrandStory, create TakeoverSteps, update page.tsx** - `aee20ca` (feat)
2. **Task 2: Update FeaturedProperties, DestinationCards, Testimonials** - `6859eca` (feat)

## Files Created/Modified

- `src/components/landing/TakeoverSteps.tsx` - New 3-step how-it-works Server Component with amber Lucide icons
- `src/components/landing/Hero.tsx` - Custom-Inclusive headline, Whole-Tel™ nav logo, Browse Whole-Tels™ CTA
- `src/components/landing/BrandStory.tsx` - Renamed heading to "The Whole-Tel™ Experience", Custom-Inclusive copy
- `src/components/landing/FeaturedProperties.tsx` - "Featured Whole-Tels™" heading, custom-inclusive subtitle, bed_config in type
- `src/components/landing/DestinationCards.tsx` - 2 active + 4 Coming Soon cards with Badge overlay
- `src/components/landing/Testimonials.tsx` - "hotel" replaced with "property", Whole-Tel™ applied
- `src/app/page.tsx` - TakeoverSteps imported and inserted after BrandStory, footer text updated

## Decisions Made

- Miami moved from active to Coming Soon — only properties actually live (Cabo, PV) show as clickable
- bed_config proactively added to FeaturedProperties local prop type to prevent type errors when Plan 02 lands
- TakeoverSteps uses amber (#amber-500) icon accent matching brand's tropical luxury palette

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — TypeScript compiled clean after both tasks.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All landing copy updated; Plan 02 (PropertyListingCard bed_config display) can proceed without type conflicts
- DestinationCards pattern established: adding new active destinations = move from comingSoonDestinations to activeDestinations array

## Self-Check: PASSED

- FOUND: src/components/landing/TakeoverSteps.tsx
- FOUND: src/components/landing/Hero.tsx
- FOUND: src/components/landing/BrandStory.tsx
- FOUND: src/components/landing/DestinationCards.tsx
- FOUND commit: aee20ca (Task 1)
- FOUND commit: 6859eca (Task 2)

---
*Phase: 12-branding-copy-amenities-schema*
*Completed: 2026-03-23*
