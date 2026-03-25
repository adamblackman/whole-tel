'use client'

import { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import dayGridPlugin from '@fullcalendar/daygrid'
import type { EventClickArg, EventInput } from '@fullcalendar/core'

import { upsertItineraryEvent, deleteItineraryEvent } from '@/lib/actions/itinerary'
import { AddEventDialog } from './AddEventDialog'
import { ActivityPicker } from './ActivityPicker'
import type { ItineraryEvent, AddOn } from '@/types/database'

// ---------------------------------------------------------------------------
// Timezone-aware helpers (Research Pitfall 3 — never store raw UTC as wall clock)
// ---------------------------------------------------------------------------

function toDateStr(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

function toTimeStr(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

// ---------------------------------------------------------------------------
// Converter: ItineraryEvent -> FullCalendar EventInput
// ---------------------------------------------------------------------------

function toCalendarEvent(event: ItineraryEvent): EventInput {
  return {
    id: event.id,
    title: event.title,
    start: `${event.event_date}T${event.start_time}`,
    end: `${event.event_date}T${event.end_time}`,
    extendedProps: {
      activityId: event.activity_id,
      notes: event.notes,
      isCustom: !event.activity_id,
    },
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ItineraryCalendarProps {
  bookingId: string
  checkIn: string
  checkOut: string
  timezone: string
  initialEvents: ItineraryEvent[]
  activities: AddOn[]
  isLocked: boolean
  onEventsChange?: (activityIds: string[]) => void
}

// ---------------------------------------------------------------------------
// Dialog state union
// ---------------------------------------------------------------------------

type DialogState =
  | { type: 'none' }
  | { type: 'choose'; date: string; time: string }
  | { type: 'custom'; date: string; time: string }
  | { type: 'activity'; date: string }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ItineraryCalendar({
  bookingId,
  checkIn,
  checkOut,
  timezone,
  initialEvents,
  activities,
  isLocked,
  onEventsChange,
}: ItineraryCalendarProps) {
  const [events, setEvents] = useState<EventInput[]>(
    initialEvents.map(toCalendarEvent)
  )
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const calendarRef = useRef<FullCalendar>(null)

  // Notify parent of activity changes (outside render cycle to avoid setState-during-render)
  useEffect(() => {
    if (!onEventsChange) return
    const ids = events
      .map(e => (e.extendedProps as { activityId?: string | null })?.activityId)
      .filter((id): id is string => id != null)
    onEventsChange([...new Set(ids)])
  }, [events, onEventsChange])

  // Debounced auto-save (400ms)
  const scheduleSave = useCallback(
    (fn: () => Promise<{ error?: string; id?: string }>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        startTransition(async () => {
          const result = await fn()
          if (result.error) setSaveError(result.error)
          else setSaveError(null)
        })
      }, 400)
    },
    []
  )

  // Handle calendar date click — convert UTC Date to wall-clock time in property timezone
  const handleDateClick = useCallback(
    (arg: DateClickArg) => {
      if (isLocked) return
      const date = toDateStr(arg.date, timezone)
      const time = toTimeStr(arg.date, timezone)
      setDialog({ type: 'choose', date, time })
    },
    [isLocked, timezone]
  )

  // Handle event click — confirm then delete
  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      if (isLocked) return
      const confirmed = window.confirm(
        `Remove "${arg.event.title}" from your itinerary?`
      )
      if (!confirmed) return

      const eventId = arg.event.id
      setEvents((prev) => prev.filter((e) => e.id !== eventId))
      scheduleSave(() => deleteItineraryEvent(bookingId, eventId))
    },
    [isLocked, bookingId, scheduleSave]
  )

  // Add event (from either dialog) — optimistic + auto-save
  const handleAddEvent = useCallback(
    (
      newEvent: {
        title: string
        eventDate: string
        startTime: string
        endTime: string
        notes?: string
        activityId?: string | null
      },
      id: string
    ) => {
      const calEvent: EventInput = {
        id,
        title: newEvent.title,
        start: `${newEvent.eventDate}T${newEvent.startTime}`,
        end: `${newEvent.eventDate}T${newEvent.endTime}`,
        extendedProps: {
          activityId: newEvent.activityId ?? null,
          isCustom: !newEvent.activityId,
        },
      }
      setEvents((prev) => [...prev, calEvent])

      // Navigate to the event's date in day view so it's visible
      const api = calendarRef.current?.getApi()
      if (api) {
        api.gotoDate(newEvent.eventDate)
        if (api.view.type !== 'timeGridDay') {
          api.changeView('timeGridDay', newEvent.eventDate)
        }
      }

      scheduleSave(() =>
        upsertItineraryEvent(bookingId, {
          id,
          activityId: newEvent.activityId ?? null,
          title: newEvent.title,
          eventDate: newEvent.eventDate,
          startTime: newEvent.startTime,
          endTime: newEvent.endTime,
          notes: newEvent.notes,
        })
      )
    },
    [bookingId, scheduleSave]
  )

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        {isLocked ? (
          <p className="text-sm text-muted-foreground italic">Read-only — deadline passed</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click a time slot to add an event
          </p>
        )}
        {isPending && (
          <p className="text-xs text-muted-foreground animate-pulse">Saving...</p>
        )}
      </div>

      {saveError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
          <p className="text-sm text-destructive">{saveError}</p>
        </div>
      )}

      {/* FullCalendar */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, interactionPlugin, dayGridPlugin]}
          initialView="timeGridDay"
          initialDate={checkIn}
          validRange={{ start: checkIn, end: checkOut }}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridDay,dayGridMonth',
          }}
          navLinks
          navLinkDayClick="timeGridDay"
          events={events}
          allDaySlot={false}
          slotMinTime="06:00:00"
          slotMaxTime="24:00:00"
          height="auto"
          dateClick={isLocked ? undefined : handleDateClick}
          eventClick={isLocked ? undefined : handleEventClick}
        />
      </div>

      {/* Choose dialog (custom vs. activity) */}
      {dialog.type === 'choose' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-xl shadow-xl p-6 space-y-4 w-80">
            <h3 className="font-semibold text-lg">What would you like to add?</h3>
            <p className="text-sm text-muted-foreground">
              {dialog.date} at {dialog.time}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="w-full rounded-lg border p-3 text-sm font-medium hover:bg-accent transition-colors text-left"
                onClick={() =>
                  setDialog({
                    type: 'custom',
                    date: (dialog as { type: 'choose'; date: string; time: string }).date,
                    time: (dialog as { type: 'choose'; date: string; time: string }).time,
                  })
                }
              >
                Custom Event
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  Free-form title, date, and time
                </p>
              </button>
              <button
                type="button"
                className="w-full rounded-lg border p-3 text-sm font-medium hover:bg-accent transition-colors text-left"
                onClick={() =>
                  setDialog({
                    type: 'activity',
                    date: (dialog as { type: 'choose'; date: string; time: string }).date,
                  })
                }
              >
                Property Activity
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  Choose from scheduled experiences
                </p>
              </button>
            </div>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:underline w-full text-center"
              onClick={() => setDialog({ type: 'none' })}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Custom Event dialog */}
      <AddEventDialog
        open={dialog.type === 'custom'}
        onOpenChange={(open) => {
          if (!open) setDialog({ type: 'none' })
        }}
        date={dialog.type === 'custom' ? dialog.date : ''}
        time={dialog.type === 'custom' ? dialog.time : ''}
        timezone={timezone}
        onAdd={(event) => {
          const id = crypto.randomUUID()
          handleAddEvent(event, id)
        }}
      />

      {/* Activity Picker dialog */}
      <ActivityPicker
        open={dialog.type === 'activity'}
        onOpenChange={(open) => {
          if (!open) setDialog({ type: 'none' })
        }}
        activities={activities}
        date={dialog.type === 'activity' ? dialog.date : ''}
        timezone={timezone}
        onAdd={(event) => {
          const id = crypto.randomUUID()
          handleAddEvent(
            {
              title: event.title,
              eventDate: event.eventDate,
              startTime: event.startTime,
              endTime: event.endTime,
              activityId: event.activityId,
            },
            id
          )
        }}
      />
    </div>
  )
}
