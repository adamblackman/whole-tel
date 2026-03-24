# Phase 16: Itinerary Builder - Research

**Researched:** 2026-03-24
**Domain:** FullCalendar v6 + Supabase time slot data model + Next.js App Router auto-save
**Confidence:** HIGH

## Summary

Phase 16 adds an interactive, day-by-day activity calendar for guests within their booked dates, plus an owner-facing time slot configuration UI for property activities. The locked decision to use FullCalendar v6.1.20 (React 19 peer dep verified) is correct and well-supported. Times are stored as wall clock TIME values (HH:MM) paired with a `property.timezone` column (not yet in schema — must be added) and never as raw TIMESTAMPTZ from the browser.

The feature requires two new database tables: `property_activities` (owner-configured activities with available time slots) and `itinerary_events` (per-booking scheduled items, covering both property activities and custom guest events). Auto-save on every change is implemented client-side via a `useTransition` debounce pattern calling a Server Action — the same pattern AmenitiesEditor uses but triggered automatically rather than by an explicit Save button.

FullCalendar must be rendered inside a `'use client'` component. Its CSS is self-injected via JS in v6 — no manual CSS import or `next.config.js` webpack ignoring required (improved from v5). The `validRange` prop constrains calendar navigation to the booking's check-in/check-out window.

**Primary recommendation:** Two-table schema (activities + itinerary_events), FullCalendar timeGrid view scoped with `validRange`, auto-save via debounced `useTransition` Server Action, wall clock TIME storage with property timezone column.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ITIN-01 | Owner can add activities/experiences with time/length and available time slots (e.g., boat ride 9:30–12, 1–4, 5–7; dinner 2hrs, any time 5pm or later) | `property_activities` table with `available_slots` JSONB array of `{start: "HH:MM", end: "HH:MM"}` objects, validated by Zod schema in Server Action |
| ITIN-02 | Interactive calendar-based itinerary builder within booked dates for guests | FullCalendar v6 `timeGridDay` view with `validRange` set to booking dates, wrapped in `'use client'` component |
| ITIN-03 | Guest can add property activities to specific days/time slots | `eventClick` or dialog flow: guest picks activity, picks slot → inserts `itinerary_events` row via Server Action |
| ITIN-04 | Guest can add custom events (e.g., "pool day 11am–5pm") | "Add custom event" form/dialog with free-form title, start/end times → inserts `itinerary_events` row with `activity_id = NULL` |
| ITIN-05 | Calendar view displays full itinerary with all scheduled activities | FullCalendar `events` prop populated from `itinerary_events` query, using `extendedProps` for metadata |
| ITIN-06 | Activity time slot availability respects windows set by the hotel | `selectAllow` callback filters against `available_slots` on the chosen activity; slots outside windows are not selectable |
| ITIN-07 | Itinerary auto-saves and persists per booking | State mutations call Server Action inside `useTransition`; debounce of 400ms prevents excessive DB writes; data loads on mount from Supabase Server Component |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@fullcalendar/react` | 6.1.20 | React calendar component | Locked decision; React 19 peer dep confirmed |
| `@fullcalendar/core` | 6.1.20 | FullCalendar peer dep (required) | Must install alongside `@fullcalendar/react` in v6 |
| `@fullcalendar/timegrid` | 6.1.20 | Time-based day/week grid view | Provides `timeGridDay` and `timeGridWeek` views |
| `@fullcalendar/interaction` | 6.1.20 | Click/select interaction | Required for `dateClick`, `select`, `selectable` prop |
| `@fullcalendar/daygrid` | 6.1.20 | Day grid for overview | Optional: `dayGridMonth` overview if desired |
| `date-fns` | 4.1.0 (already in project) | Date arithmetic | Already installed; use for booking date math |
| `zod` | 4.3.6 (already in project) | Schema validation | Validate activity slot Zod schemas in Server Actions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `shadcn/ui Dialog` | already in project | Add-event modal | Guest adds custom event or picks activity time slot |
| `shadcn/ui Select` | already in project | Time slot picker | Dropdown for available slot selection |
| `lucide-react` | already in project | Icons in event display | CalendarPlus, Clock, MapPin for itinerary UI |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| FullCalendar | react-big-calendar | FullCalendar is locked decision; react-big-calendar has weaker TypeScript support |
| JSONB available_slots | Separate slots table | JSONB is simpler for read-only slot arrays; a join table is only needed if slots need independent IDs |
| Server Action auto-save | Supabase Realtime | Realtime is out of scope; Server Actions match the project's existing mutation pattern |

**Installation:**
```bash
npm install @fullcalendar/core @fullcalendar/react @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/daygrid
```

All four packages must be the same version. Use `@6.1.20` to pin to the confirmed React 19 compatible version.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (guest)/bookings/[bookingId]/
│   │   └── itinerary/
│   │       └── page.tsx          # Server Component — loads booking + itinerary data
│   └── (owner)/dashboard/properties/[propertyId]/
│       └── activities/
│           └── page.tsx          # Server Component — loads property activities
├── components/
│   ├── booking/
│   │   ├── ItineraryCalendar.tsx # 'use client' — FullCalendar wrapper, auto-save
│   │   ├── AddEventDialog.tsx    # 'use client' — modal for adding events
│   │   └── ActivityPicker.tsx    # 'use client' — slot selection UI for property activities
│   └── dashboard/
│       └── ActivityEditor.tsx    # 'use client' — owner creates/edits activities with slots
└── lib/
    ├── actions/
    │   ├── activities.ts         # createActivity, updateActivity, deleteActivity (owner)
    │   └── itinerary.ts          # upsertItineraryEvent, deleteItineraryEvent (guest)
    └── validations/
        ├── activity.ts           # Zod schema: name, duration_min, available_slots
        └── itinerary-event.ts    # Zod schema: booking_id, activity_id?, title, start_time, end_time, date
```

### Pattern 1: FullCalendar in Next.js App Router

**What:** FullCalendar is a browser-only library. It must live in a `'use client'` component. In v6, CSS is self-injected — no webpack config changes needed.

**When to use:** Any page that renders the calendar.

**Example:**
```typescript
// Source: https://fullcalendar.io/docs/react
'use client'

import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import dayGridPlugin from '@fullcalendar/daygrid'
import type { EventInput, DateSelectArg } from '@fullcalendar/core'

interface ItineraryCalendarProps {
  checkIn: string   // '2026-04-10' — YYYY-MM-DD
  checkOut: string  // '2026-04-14'
  events: EventInput[]
  onEventAdd: (event: EventInput) => void
  onEventRemove: (eventId: string) => void
}

export function ItineraryCalendar({
  checkIn, checkOut, events, onEventAdd, onEventRemove
}: ItineraryCalendarProps) {
  return (
    <FullCalendar
      plugins={[timeGridPlugin, interactionPlugin, dayGridPlugin]}
      initialView="timeGridDay"
      initialDate={checkIn}
      validRange={{ start: checkIn, end: checkOut }}
      headerToolbar={{
        left: 'prev,next',
        center: 'title',
        right: 'timeGridDay,timeGridWeek',
      }}
      events={events}
      selectable={true}
      selectMirror={true}
      height="auto"
      allDaySlot={false}
      slotMinTime="06:00:00"
      slotMaxTime="24:00:00"
    />
  )
}
```

### Pattern 2: Scoping Calendar to Booking Dates

**What:** `validRange` grays out dates outside the booking window and prevents navigation past check-in/check-out.

**When to use:** Always for the guest itinerary builder.

**Example:**
```typescript
// Source: https://fullcalendar.io/docs/validRange
<FullCalendar
  validRange={{
    start: booking.check_in,   // 'YYYY-MM-DD' — FullCalendar accepts ISO date strings
    end: booking.check_out,    // exclusive end date (check-out day itself is grayed)
  }}
  initialDate={booking.check_in}
/>
```

### Pattern 3: Time Slot Validation via selectAllow

**What:** `selectAllow` callback provides programmatic control over which times the guest can select. Use it to restrict activity slots to the windows configured by the owner.

**When to use:** When adding a property activity that has specific available time windows (ITIN-06).

**Example:**
```typescript
// Source: https://fullcalendar.io/docs/date-clicking-selecting
const selectAllow = (selectInfo: DateSpanApi) => {
  // selectInfo.start and selectInfo.end are Date objects
  const startHHMM = toHHMM(selectInfo.start) // e.g., "09:30"
  const endHHMM = toHHMM(selectInfo.end)     // e.g., "12:00"

  return activity.available_slots.some(slot =>
    startHHMM >= slot.start && endHHMM <= slot.end
  )
}

<FullCalendar selectAllow={selectAllow} selectable={true} />
```

### Pattern 4: Auto-save with useTransition

**What:** Every calendar change immediately calls a Server Action via `useTransition`. A debounce prevents write-on-every-keystroke for text fields in the add-event dialog.

**When to use:** ITIN-07 — itinerary auto-saves on every change.

**Example:**
```typescript
// Matches the project's existing AmenitiesEditor pattern
'use client'
import { useTransition, useCallback } from 'react'
import { useRef } from 'react'
import { upsertItineraryEvent } from '@/lib/actions/itinerary'

export function ItineraryCalendar({ bookingId, initialEvents }) {
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveEvent = useCallback((event: EventInput) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        await upsertItineraryEvent(bookingId, event)
      })
    }, 400)
  }, [bookingId])
}
```

### Pattern 5: Wall Clock Time Storage

**What:** Event times are stored as PostgreSQL `TIME` (HH:MM:SS) and a date as `DATE`, NOT as `TIMESTAMPTZ`. This prevents timezone drift when guests and owners are in different timezones. The property's timezone column determines how times display.

**When to use:** All `itinerary_events` rows. Never store as browser-local TIMESTAMPTZ.

**Example:**
```sql
-- Storage shape in itinerary_events:
event_date   DATE NOT NULL,           -- '2026-04-11'
start_time   TIME NOT NULL,           -- '09:30:00'
end_time     TIME NOT NULL,           -- '12:00:00'
-- NOT: started_at TIMESTAMPTZ (browser timezone leaks in)
```

```typescript
// Converting FullCalendar Date objects to wall clock strings:
function toDateStr(d: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  // returns 'YYYY-MM-DD'
}
function toTimeStr(d: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
  // returns 'HH:MM' — add ':00' for seconds if needed
}
```

### Anti-Patterns to Avoid

- **Storing TIMESTAMPTZ from browser:** Never use `new Date().toISOString()` directly from a browser `Date` object for event times. Always convert through the property's timezone using `Intl.DateTimeFormat`. STATE.md decision is explicit on this.
- **Drag-to-reorder:** Out of scope. Do not enable `editable={true}` on the FullCalendar component — this activates drag-and-drop which is explicitly excluded from v1.2.
- **Rendering FullCalendar in Server Component:** Will throw — FullCalendar uses DOM APIs. Always `'use client'`.
- **Single `available_slots` TEXT column:** Never store slot arrays as comma-separated text. Use JSONB array of `{start, end}` objects for queryability and type safety.
- **Loading add-ons table as activities:** Activities for the itinerary are distinct from booking add-ons (one-time purchases). They need their own `property_activities` table with duration and slot configuration, not the existing `add_ons` table.

---

## Database Schema Design

### New Tables Required

```sql
-- property_activities: Owner-configured activities with available time slots
CREATE TABLE property_activities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  duration_min    int NOT NULL CHECK (duration_min > 0),  -- e.g., 150 for 2.5 hours
  -- JSONB array of {start: "HH:MM", end: "HH:MM"} objects
  -- e.g., [{"start":"09:30","end":"12:00"},{"start":"13:00","end":"16:00"}]
  available_slots jsonb NOT NULL DEFAULT '[]',
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- itinerary_events: Per-booking scheduled items (property activities or custom)
CREATE TABLE itinerary_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  activity_id     uuid REFERENCES property_activities(id) ON DELETE SET NULL,
  -- activity_id NULL = custom guest event
  title           text NOT NULL,
  event_date      date NOT NULL,
  start_time      time NOT NULL,
  end_time        time NOT NULL,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT check_event_times CHECK (end_time > start_time)
);

-- timezone column on properties (not yet in schema)
ALTER TABLE properties ADD COLUMN timezone text NOT NULL DEFAULT 'America/New_York';
```

### RLS Policies Required

```sql
-- property_activities: public read, owner-scoped write (same pattern as amenities)
ALTER TABLE property_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property activities are publicly readable"
  ON property_activities FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Property owner can manage their activities"
  ON property_activities FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM properties
            WHERE properties.id = property_id
              AND properties.owner_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM properties
            WHERE properties.id = property_id
              AND properties.owner_id = (SELECT auth.uid()))
  );

-- itinerary_events: guest-scoped write, read by guest + property owner
ALTER TABLE itinerary_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guests can manage their own itinerary events"
  ON itinerary_events FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM bookings
            WHERE bookings.id = booking_id
              AND bookings.guest_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM bookings
            WHERE bookings.id = booking_id
              AND bookings.guest_id = (SELECT auth.uid()))
  );

CREATE POLICY "Owners can view itinerary events for their property bookings"
  ON itinerary_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN properties ON properties.id = bookings.property_id
      WHERE bookings.id = booking_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendar grid with time axis | Custom CSS grid with time slots | FullCalendar `@fullcalendar/timegrid` | Handles DST, scroll, resize, overlapping events, mobile touch |
| Date range navigation constraints | Manual prev/next button disabling | FullCalendar `validRange` prop | Built-in gray-out and button disabling |
| Time slot selection UI | Custom time picker with slot filtering | FullCalendar `selectAllow` callback | FullCalendar handles pointer events and selection state |
| Timezone date conversion | moment-timezone / manual offset math | `Intl.DateTimeFormat` with `timeZone` option | Already available in Node.js 18+, no extra dependency |

**Key insight:** FullCalendar handles 90% of the hard calendar UX work. The phase effort is primarily data modeling and the slot-constraint logic, not building calendar UI primitives.

---

## Common Pitfalls

### Pitfall 1: FullCalendar SSR crash
**What goes wrong:** Importing FullCalendar directly in a Server Component or a module that is server-rendered throws `ReferenceError: document is not defined`.
**Why it happens:** FullCalendar accesses DOM APIs during module load.
**How to avoid:** Mark the calendar component `'use client'` at the top. If needed, use `next/dynamic` with `ssr: false` as a fallback, but `'use client'` is preferred and cleaner.
**Warning signs:** Build error mentioning `document`, `window`, or `requestAnimationFrame` in a FullCalendar module path.

### Pitfall 2: All FullCalendar packages must match versions exactly
**What goes wrong:** Mixed versions (e.g., `@fullcalendar/core@6.1.15` + `@fullcalendar/react@6.1.20`) cause a blank calendar or "property of undefined" errors.
**Why it happens:** FullCalendar packages are tightly coupled internally.
**How to avoid:** Install all four packages simultaneously with an explicit version pin: `npm install @fullcalendar/core@6.1.20 @fullcalendar/react@6.1.20 @fullcalendar/timegrid@6.1.20 @fullcalendar/interaction@6.1.20`.
**Warning signs:** White/blank calendar area, console errors about missing plugins.

### Pitfall 3: Timezone drift in itinerary event storage
**What goes wrong:** A guest in PST selects "9:30 AM" for a boat ride. The browser `Date` object stores `2026-04-11T17:30:00.000Z` (UTC). When the property owner in CST views it, it appears as "11:30 AM" instead of "9:30 AM local property time".
**Why it happens:** `new Date()` and `Date.toISOString()` always return UTC.
**How to avoid:** Convert FullCalendar's `DateSelectArg.start` (a `Date` object) through `Intl.DateTimeFormat` using the property's `timezone` string before storing. Store as `event_date: DATE + start_time: TIME`, not as TIMESTAMPTZ.
**Warning signs:** Times appearing shifted by timezone offset; tests passing in UTC but failing in local dev.

### Pitfall 4: Using `editable={true}` on FullCalendar (activates DnD)
**What goes wrong:** Setting `editable={true}` enables drag-to-move and resize on events, which is explicitly out of scope for v1.2.
**Why it happens:** `editable` is a single prop that controls all event interaction.
**How to avoid:** Leave `editable` at its default `false`. Deletion via event click → confirm dialog is the supported pattern.
**Warning signs:** Events becoming draggable in the UI.

### Pitfall 5: activity_deadline enforcement in itinerary actions
**What goes wrong:** Guest modifies itinerary after the `activity_deadline` has passed.
**Why it happens:** No server-side enforcement of the deadline in the Server Action.
**How to avoid:** In `upsertItineraryEvent` and `deleteItineraryEvent` Server Actions, query `bookings.activity_deadline` and return an error if `now() > activity_deadline`.

### Pitfall 6: No check that itinerary_events.event_date is within booking range
**What goes wrong:** A user crafts a request (or a FullCalendar bug) to create an event outside the booking dates.
**Why it happens:** `validRange` is a client-side constraint; the server action must independently validate.
**How to avoid:** In `upsertItineraryEvent`, assert `event_date BETWEEN bookings.check_in AND bookings.check_out - 1` before inserting.

---

## Code Examples

### FullCalendar EventInput from itinerary_events row

```typescript
// Source: https://fullcalendar.io/docs/event-object
import type { EventInput } from '@fullcalendar/core'

function toCalendarEvent(row: ItineraryEventRow, timezone: string): EventInput {
  return {
    id: row.id,
    title: row.title,
    // FullCalendar accepts ISO date+time strings
    // Combine date + time using wall clock values — timezone is a display concern only
    start: `${row.event_date}T${row.start_time}`,  // '2026-04-11T09:30:00'
    end:   `${row.event_date}T${row.end_time}`,    // '2026-04-11T12:00:00'
    extendedProps: {
      activityId: row.activity_id,
      notes: row.notes,
      isCustom: row.activity_id === null,
    },
  }
}
```

### Server Action: upsertItineraryEvent

```typescript
// Pattern: matches existing upsertPropertyAmenities in src/lib/actions/amenities.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'

export async function upsertItineraryEvent(
  bookingId: string,
  payload: {
    id?: string
    activityId: string | null
    title: string
    eventDate: string   // 'YYYY-MM-DD'
    startTime: string   // 'HH:MM:SS'
    endTime: string     // 'HH:MM:SS'
    notes?: string
  }
): Promise<{ error?: string; id?: string }> {
  const user = await verifySession()
  const supabase = await createClient()

  // 1. Verify ownership: booking belongs to this guest
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, check_in, check_out, activity_deadline')
    .eq('id', bookingId)
    .eq('guest_id', user.id)
    .single()

  if (!booking) return { error: 'Booking not found.' }

  // 2. Activity deadline enforcement
  if (booking.activity_deadline && new Date() > new Date(booking.activity_deadline)) {
    return { error: 'Activity booking deadline has passed.' }
  }

  // 3. Date range validation
  if (payload.eventDate < booking.check_in || payload.eventDate > booking.check_out) {
    return { error: 'Event date must be within booking dates.' }
  }

  // 4. Upsert
  const { data, error } = await supabase
    .from('itinerary_events')
    .upsert({
      id: payload.id,
      booking_id: bookingId,
      activity_id: payload.activityId,
      title: payload.title,
      event_date: payload.eventDate,
      start_time: payload.startTime,
      end_time: payload.endTime,
      notes: payload.notes ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/bookings/${bookingId}/itinerary`)
  return { id: data.id }
}
```

### Available Slots JSON shape (property_activities)

```typescript
// Zod schema for available_slots validation
import { z } from 'zod'

const TimeSlotSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM'),
  end:   z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM'),
}).refine(s => s.end > s.start, { message: 'End must be after start' })

export const ActivitySchema = z.object({
  name:            z.string().min(1).max(100),
  description:     z.string().max(500).optional(),
  duration_min:    z.number().int().min(15).max(1440),
  available_slots: z.array(TimeSlotSchema).min(1),
})

export type ActivityInput = z.infer<typeof ActivitySchema>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual CSS import in next.config.js for FullCalendar | CSS self-injected via JS; no config needed | FullCalendar v6.0 | Simpler Next.js integration |
| FullCalendar rendered via Preact adapter | FullCalendar v6 native React; SSR + StrictMode supported | FullCalendar v6.0 | No `ssr: false` dynamic import required (just `'use client'`) |
| `moment.js` or `luxon` for timezone math | `Intl.DateTimeFormat` (native) | Node.js 18+ (2022) | Zero-dependency timezone conversion |

**Deprecated/outdated:**
- `@fullcalendar/moment-timezone`: Deprecated — use `Intl.DateTimeFormat` instead. No extra package needed.
- `next.config.js` webpack transpile rule for FullCalendar: Not needed in v6. Removing if present from older project configs.

---

## Open Questions

1. **Property timezone UX: how does the owner set it?**
   - What we know: A `timezone` column needs to be added to `properties`. STATE.md says times are stored as wall clock TIME with `property.timezone`.
   - What's unclear: Should the property edit form add a timezone picker? Or do we default to a reasonable value (e.g., `'America/New_York'`) and skip the UX for v1.2?
   - Recommendation: Add the column with a sensible default (`'America/New_York'`), add a minimal text input or select in the PropertyForm for it in Phase 16 Plan 1, but keep it optional. IANA timezone strings are the standard (e.g., `'America/Cancun'`, `'America/Los_Angeles'`). A select with ~20 common US/Mexico timezones is sufficient.

2. **itinerary_events upsert: use `id`-based upsert or insert+delete?**
   - What we know: Supabase `.upsert()` with an `id` field handles insert-or-update in one call.
   - What's unclear: For auto-save on a new event (no `id` yet), the first save inserts and returns the ID. Subsequent saves pass the ID back for update. The client must track this returned ID.
   - Recommendation: Client state holds `localId` (UUID generated client-side via `crypto.randomUUID()`) from the moment the dialog opens. Pass this as `id` to upsert on first save — PostgreSQL will insert since it's new, and subsequent saves will update.

3. **Guest itinerary access: should it be accessible from the bookings page as a tab/link?**
   - What we know: Bookings page (`/bookings`) shows booking cards with details. Itinerary builder needs its own focused page at `/bookings/[bookingId]/itinerary`.
   - What's unclear: Whether the route structure uses a new page or a tab within BookingCardClient.
   - Recommendation: Separate page at `/bookings/[bookingId]/itinerary`. Add an "Plan Itinerary" link/button to BookingDetails or BookingCardClient for confirmed bookings within their activity deadline.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 |
| Config file | none detected (check vitest.config.ts) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ITIN-01 | ActivitySchema Zod validation rejects invalid slots | unit | `npx vitest run src/lib/validations/activity.test.ts` | ❌ Wave 0 |
| ITIN-06 | Slot time validation: slot outside available window rejected | unit | `npx vitest run src/lib/validations/activity.test.ts` | ❌ Wave 0 |
| ITIN-07 | upsertItineraryEvent rejects events past activity_deadline | unit | `npx vitest run src/lib/actions/itinerary.test.ts` | ❌ Wave 0 |
| ITIN-07 | upsertItineraryEvent rejects events outside booking date range | unit | `npx vitest run src/lib/actions/itinerary.test.ts` | ❌ Wave 0 |
| ITIN-02–05 | Calendar renders, events display, add-event dialog | manual | browser test | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/validations/activity.test.ts` — covers ITIN-01, ITIN-06 (slot validation logic)
- [ ] `src/lib/actions/itinerary.test.ts` — covers ITIN-07 (deadline + date range guards)
- [ ] Vitest config: check if `vitest.config.ts` exists; create if missing

---

## Sources

### Primary (HIGH confidence)
- [FullCalendar React docs](https://fullcalendar.io/docs/react) — React 19 peer deps, `'use client'`, v6 CSS handling
- [FullCalendar validRange docs](https://fullcalendar.io/docs/validRange) — booking date scoping API
- [FullCalendar event object docs](https://fullcalendar.io/docs/event-object) — EventInput properties, extendedProps
- [npm @fullcalendar/react](https://www.npmjs.com/package/@fullcalendar/react) — confirmed v6.1.20, React 16.7–19 peer dep range
- Existing codebase (AmenitiesEditor.tsx, add-ons.ts, amenities.ts) — established patterns for Server Actions, useTransition, Zod validation

### Secondary (MEDIUM confidence)
- [FullCalendar date-clicking-selecting docs](https://fullcalendar.io/docs/date-clicking-selecting) — selectAllow, selectConstraint
- [FullCalendar v6 upgrade notes](https://fullcalendar.io/docs/upgrading-from-v5) — CSS self-injection, Next.js improvements

### Tertiary (LOW confidence)
- WebSearch result: FullCalendar + Next.js App Router integration — confirms `'use client'` approach is standard community pattern

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — FullCalendar version confirmed in STATE.md + npm; packages verified on FullCalendar official docs
- Architecture: HIGH — two-table schema follows established project patterns (property_amenities, booking_add_ons); RLS mirrors existing owner-scoped policies
- Pitfalls: HIGH — SSR pitfall verified against FullCalendar v6 docs; timezone pitfall is explicit STATE.md requirement; others derived from schema analysis
- Time slot validation: MEDIUM — `selectAllow` documented but the specific HH:MM comparison implementation is derived pattern, not official example

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (FullCalendar stable release; 30-day window appropriate)
