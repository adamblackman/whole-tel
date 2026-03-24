---
phase: 16-itinerary-builder
plan: 01
subsystem: itinerary
tags: [database, vitest, zod, server-actions, owner-ui]
dependency_graph:
  requires: []
  provides: [property_activities table, itinerary_events table, ActivitySchema, ItineraryEventSchema, createActivity, updateActivity, deleteActivity, ActivityEditor, activities page]
  affects: [src/types/database.ts, src/app/(owner)/dashboard/properties/[propertyId]/edit/page.tsx]
tech_stack:
  added: [vitest]
  patterns: [TDD scaffolds, Server Actions with Zod validation, shadcn Dialog for inline forms]
key_files:
  created:
    - vitest.config.ts
    - src/lib/validations/activity.test.ts
    - src/lib/actions/itinerary.test.ts
    - supabase/migrations/20260324000003_itinerary_schema.sql
    - src/lib/validations/activity.ts
    - src/lib/validations/itinerary-event.ts
    - src/lib/actions/activities.ts
    - src/components/dashboard/ActivityEditor.tsx
    - src/app/(owner)/dashboard/properties/[propertyId]/activities/page.tsx
  modified:
    - src/types/database.ts (added timezone, PropertyActivity, ItineraryEvent, TimeSlot)
    - src/app/(owner)/dashboard/properties/[propertyId]/edit/page.tsx (Manage Activities link)
decisions:
  - Zod v4 uses error.issues not error.errors — fixed in activities.ts Server Actions
  - available_slots stored as JSON.stringify(array) when writing to Supabase JSONB column
  - owner_id verification for activities relies entirely on RLS EXISTS subquery (no extra query in action)
  - Input type="time" returns HH:MM matching the regex pattern so no normalization needed
metrics:
  duration_seconds: 532
  completed_date: "2026-03-24"
  tasks_completed: 4
  files_created: 9
  files_modified: 2
---

# Phase 16 Plan 01: Itinerary Schema, Types, and Owner Activity Management Summary

**One-liner:** Vitest config + SQL migration with RLS + ActivitySchema/ItineraryEventSchema + three CRUD Server Actions + ActivityEditor Dialog UI with dynamic time slot form at /dashboard/properties/[id]/activities.

## What Was Built

The complete data and owner-management foundation for the itinerary feature:

1. **Vitest config** — Node environment + @ alias, test infrastructure ready for entire milestone
2. **SQL migration** — `property_activities` and `itinerary_events` tables with RLS (public read, owner write via EXISTS subquery, guest write on own bookings), `timezone` column on properties, two performance indexes
3. **TypeScript types** — `PropertyActivity`, `ItineraryEvent`, `TimeSlot` interfaces added to database.ts; `timezone` field on `Property`
4. **Zod schemas** — `ActivitySchema` with `TimeSlotSchema` (HH:MM regex + end-after-start refinement), `ItineraryEventSchema` — validated by 7 unit tests
5. **Server Actions** — `createActivity`, `updateActivity`, `deleteActivity` with verifySession + Zod + revalidatePath; ownership enforced by RLS
6. **ActivityEditor** — Client component with shadcn Dialog for create/edit, dynamic slot list, delete with confirmation, useTransition for pending states
7. **Activities page** — Server Component at `/dashboard/properties/[id]/activities` with parallel data fetching
8. **Edit page link** — "Manage Activities" button with CalendarPlus icon linking from property edit page

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Zod v4 API change: errors vs issues**
- **Found during:** Task 2
- **Issue:** `parsed.error.errors` does not exist in Zod v4 — the property is `parsed.error.issues`
- **Fix:** Changed both error access sites in `activities.ts` to use `.issues[0]?.message`
- **Files modified:** `src/lib/actions/activities.ts`
- **Commit:** 63c976c

## Decisions Made

- Zod v4 uses `error.issues` not `error.errors` — consistent with how other actions in the codebase handle this
- `available_slots` passed through `JSON.stringify()` on write — Supabase client expects a plain value for JSONB columns
- RLS ownership check uses EXISTS subquery on properties.owner_id — no extra owner verification query needed in Server Actions (same pattern as Phase 15 property_amenities)
- Input `type="time"` browser API natively returns HH:MM 24h format — matches TimeSlotSchema regex exactly with no normalization

## Test Results

```
Test Files  3 passed (3)
Tests       22 passed (22)
```

All 7 real ActivitySchema/TimeSlotSchema assertions pass. itinerary.test.ts stubs pass as placeholders for Plan 02.

## Build Status

`npx next build` succeeds. `/dashboard/properties/[propertyId]/activities` route visible in build output.

## Self-Check: PASSED

Files verified:
- vitest.config.ts: FOUND
- supabase/migrations/20260324000003_itinerary_schema.sql: FOUND
- src/types/database.ts (PropertyActivity interface): FOUND
- src/lib/validations/activity.ts: FOUND
- src/lib/validations/itinerary-event.ts: FOUND
- src/lib/actions/activities.ts: FOUND
- src/components/dashboard/ActivityEditor.tsx: FOUND
- src/app/(owner)/dashboard/properties/[propertyId]/activities/page.tsx: FOUND

Commits verified:
- ec61d4a: chore(16-01): Vitest config and test scaffolds
- 7ba33e8: feat(16-01): itinerary schema, TypeScript types, Zod validations
- 63c976c: feat(16-01): owner activity CRUD Server Actions
- c9b351d: feat(16-01): ActivityEditor component, activities page, edit page link
