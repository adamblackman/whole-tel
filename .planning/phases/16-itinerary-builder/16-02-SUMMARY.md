---
phase: 16-itinerary-builder
plan: "02"
subsystem: guest-itinerary-builder
tags: [fullcalendar, server-actions, client-components, unit-tests, auto-save]
dependency_graph:
  requires: [16-01]
  provides: [guest-itinerary-ui, itinerary-server-actions, activity-picker, booking-page-link]
  affects: [bookings-page, itinerary-page]
tech_stack:
  added: ["@fullcalendar/core@6.1.20", "@fullcalendar/react@6.1.20", "@fullcalendar/timegrid@6.1.20", "@fullcalendar/interaction@6.1.20", "@fullcalendar/daygrid@6.1.20"]
  patterns: [fullcalendar-react-integration, optimistic-ui-with-useTransition, debounced-auto-save, timezone-aware-dateclick-handling, use-server-export-constraint]
key_files:
  created:
    - src/lib/actions/itinerary.ts
    - src/components/booking/ItineraryCalendar.tsx
    - src/components/booking/AddEventDialog.tsx
    - src/components/booking/ActivityPicker.tsx
    - src/app/(guest)/bookings/[bookingId]/itinerary/page.tsx
  modified:
    - src/lib/validations/itinerary-event.ts
    - src/lib/actions/itinerary.test.ts
    - src/components/booking/BookingCardClient.tsx
decisions:
  - "Pure helpers (isEventDateInRange, isDeadlinePassed) moved to itinerary-event.ts — Next.js 'use server' requires all exports to be async functions"
  - "400ms debounced auto-save via useTransition for optimistic UI without blocking re-renders"
  - "toDateStr/toTimeStr with Intl.DateTimeFormat for UTC-to-wall-clock conversion on dateClick events"
  - "Plan Itinerary link added to BookingCardClient (inside CollapsibleContent) — minimal change to existing component"
metrics:
  duration_minutes: 25
  completed_date: "2026-03-24"
  tasks_completed: 3
  files_created: 5
  files_modified: 3
---

# Phase 16 Plan 02: Itinerary Builder Guest UI Summary

**One-liner:** FullCalendar v6.1.20 guest itinerary builder with timezone-aware dateClick, debounced auto-save via useTransition, activity slot enforcement, and itinerary access link from the bookings page.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Install FullCalendar, Server Actions, itinerary page | cc1482b | itinerary.ts, itinerary.test.ts, [bookingId]/itinerary/page.tsx |
| 2 | ItineraryCalendar, AddEventDialog, ActivityPicker | 66c9a57 | ItineraryCalendar.tsx, AddEventDialog.tsx, ActivityPicker.tsx |
| 3 | Plan Itinerary link + fix 'use server' exports | 2809730 | BookingCardClient.tsx, itinerary-event.ts (helpers moved) |

## What Was Built

### Server Actions (src/lib/actions/itinerary.ts)
- `upsertItineraryEvent`: validates deadline + date range, upserts to DB, revalidates path
- `deleteItineraryEvent`: validates deadline, deletes by ID, revalidates path
- Both protected by verifySession() + explicit booking ownership query + Supabase RLS

### Validation Helpers (src/lib/validations/itinerary-event.ts)
- `isEventDateInRange(eventDate, checkIn, checkOut)`: checkout day is exclusive
- `isDeadlinePassed(deadline, now?)`: accepts optional `now` for deterministic tests
- 7 unit tests all pass

### ItineraryCalendar (Client Component)
- FullCalendar timeGridDay/dayGridMonth with validRange scoped to booking dates
- `toDateStr`/`toTimeStr` helpers using `Intl.DateTimeFormat` convert FullCalendar's UTC `DateClickArg.date` to property wall-clock time before pre-filling dialogs (prevents timezone bugs)
- Choose dialog forks to AddEventDialog (custom) or ActivityPicker (property activity)
- Optimistic UI: event added to state immediately, server save debounced 400ms
- isLocked disables dateClick/eventClick and shows read-only banner

### AddEventDialog
- Free-form title, date (pre-filled), start/end times, optional notes
- Validates end > start before calling onAdd

### ActivityPicker
- Lists property activities with name, description, duration, available slot count
- Two-step: select activity → select slot
- Slot end time = start + duration_min, capped by slot.end (ITIN-06 enforcement)
- Shows "No activities available" when empty

### Itinerary Page
- Server Component at /bookings/[bookingId]/itinerary
- Queries booking (confirmed + ownership), property, activities, events in 3 parallel-ready queries
- Locked banner when deadline passed

### BookingCardClient
- "Plan Itinerary" link for confirmed bookings (CalendarPlus icon, outline Button)
- Switches to "View Itinerary" when activity_deadline has passed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moved pure helpers out of 'use server' file**
- **Found during:** Task 3 — next build
- **Issue:** Next.js requires all exports in a `'use server'` file to be async functions. `isEventDateInRange` and `isDeadlinePassed` are synchronous.
- **Fix:** Moved both helpers to `src/lib/validations/itinerary-event.ts` (already the home for itinerary validation logic). Updated imports in `itinerary.ts`, `itinerary.test.ts`, and `page.tsx`.
- **Files modified:** itinerary-event.ts, itinerary.ts, itinerary.test.ts, page.tsx
- **Commit:** 2809730

## Test Results

```
Test Files: 3 passed (3)
Tests:      23 passed (23)
```

All 7 itinerary validation tests pass. Full `next build` passes with /bookings/[bookingId]/itinerary registered.

## Self-Check

Files verified to exist:
- src/lib/actions/itinerary.ts ✓
- src/lib/validations/itinerary-event.ts ✓
- src/components/booking/ItineraryCalendar.tsx ✓
- src/components/booking/AddEventDialog.tsx ✓
- src/components/booking/ActivityPicker.tsx ✓
- src/app/(guest)/bookings/[bookingId]/itinerary/page.tsx ✓
- src/components/booking/BookingCardClient.tsx (modified) ✓
